/**
 * Assets (资产) — Host half.
 *
 * Lists the skills, rules, and plugins installed in this DSH profile, adds a
 * one-sentence summary to each, groups bundled skills under their plugin or
 * skill pack, and keeps per-Session enablement. Disabled skills are hidden from
 * the Session's model catalog by a scoped skill provider; enabled rule files are
 * injected as per-request system-prompt context.
 */

import { execFile as execFileCb } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { promisify } from 'node:util';

const LIST_PATH = '/api/dsh-assets.list';
const TOGGLE_PATH = '/api/dsh-assets.toggle';
const UPDATE_PATH = '/api/dsh-assets.update';
const RESOLVE_PATH = '/api/dsh-assets.resolve';
const CHANGELOG_PATH = '/api/dsh-assets.changelog';
const MAX_LOG_ENTRIES = 200;
const GIT_TIMEOUT_MS = 60_000;
const GIT_FETCH_TIMEOUT_MS = 180_000;
const INDEX_TTL_MS = 30_000;
const MAX_SKILL_BYTES = 131_072;
const MAX_RULE_BYTES = 65_536;
const MAX_RULE_TEXT = 24_000;
const MAX_RULE_FILES = 100;
const MAX_STATE_SESSIONS = 200;
const STATE_TTL_MS = 90 * 24 * 60 * 60 * 1000;
const PROVIDER_NAME = 'dsh-assets-session-filter';

/**
 * Bundled `find-skills` skill (from vercel-labs/skills). It is declared so the
 * catalog lists it, and the update flow reuses its matching rules to resolve an
 * official GitHub repository for locally installed skills that declare no
 * origin of their own.
 */
const FIND_SKILLS_BODY = `# Find Skills

Find the official GitHub repository that publishes an agent skill.

1. Search GitHub repositories with the skill name tokens and the skill's domain:
   \`api.github.com/search/repositories?q=<name tokens> in:name,description\`, sorted by stars.
2. Score candidates: the repository name should contain the skill name (hyphens,
   spaces, or concatenated); penalize forks. Ignore unrelated tutorial or
   awesome-list repositories.
3. Prefer the most-starred repository whose name matches; when nothing matches
   the name, report no match instead of guessing.
4. Report the exact \`https://github.com/<owner>/<repo>\` URL and the match reason.
5. Never install, clone, or modify anything without the user's approval.`;
const FIND_SKILLS_SKILL = {
  name: 'find-skills',
  description: 'Find the official GitHub repository that publishes an agent skill matching a name or description. Use when a locally installed skill needs an update source, or when the user asks to find a skill for a task.',
  whenToUse: 'A locally installed skill has no declared origin and needs updates, or the user wants to discover skills on GitHub.',
  content: FIND_SKILLS_BODY,
  source: 'runtime',
  invocation: { modelInvocable: true, userInvocable: true },
};

const GENERIC_STEMS = new Set([
  'add', 'agent', 'asset', 'auto', 'chat', 'code', 'create', 'dsh', 'edit', 'find',
  'get', 'goal', 'list', 'loop', 'make', 'model', 'new', 'open', 'plugin',
  'read', 'review', 'rule', 'run', 'send', 'session', 'set', 'share', 'skill',
  'status', 'tool', 'update', 'use', 'workspace', 'write',
]);

const BUILTIN_PRESETS = new Set(['standard', 'ptc', 'minimal', 'cordis']);

const GENERIC_ALIASES = new Set([
  'app', 'base', 'bundle', 'chat', 'client', 'core', 'host', 'plugin', 'server',
  'session', 'tools', 'ui', 'web',
]);

export const name = 'dsh-assets';

export const inject = ['connection', 'sessions', 'skills', 'pluginManager', 'systemPrompt', 'agents'];

/**
 * Register the asset catalog routes, the per-Session skill filter, and the rule
 * context.
 * @param ctx - Host context with Connection, Sessions, Skills, Plugin Manager, Prompt, and Agents.
 */
export function apply(ctx) {
  const runtime = createRuntime(ctx);

  ctx.effect(() => {
    runtime.start();
    return () => runtime.dispose();
  }, 'dsh-assets: runtime');

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: LIST_PATH,
        methods: ['GET'],
        requestBody: 'buffered',
        fetch: (request) => runtime.handleList(request),
      }),
    'dsh-assets: list route',
  );

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: TOGGLE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => runtime.handleToggle(request),
      }),
    'dsh-assets: toggle route',
  );

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: UPDATE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => runtime.handleUpdate(request),
      }),
    'dsh-assets: update route',
  );

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: RESOLVE_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => runtime.handleResolve(request),
      }),
    'dsh-assets: resolve route',
  );

  ctx.effect(
    () =>
      ctx.connection.fetch.register({
        path: CHANGELOG_PATH,
        methods: ['POST'],
        requestBody: 'buffered',
        fetch: (request) => runtime.handleChangelog(request),
      }),
    'dsh-assets: changelog route',
  );

  ctx.effect(
    () =>
      ctx.systemPrompt.context({
        name: 'dsh-assets.rules',
        order: 900,
        text: (assembly) => runtime.rulesText(assembly?.scope),
      }),
    'dsh-assets: rule context',
  );

  ctx.effect(
    () => {
      try {
        return ctx.skills.register(FIND_SKILLS_SKILL);
      } catch (error) {
        ctx.logger?.warn?.(`[dsh-assets] could not register find-skills: ${String(error?.message ?? error)}`);
        return undefined;
      }
    },
    'dsh-assets: find-skills skill',
  );

  ctx.effect(() => {
    const disposers = [];

    const track = (agent) => {
      if (agent === null || typeof agent !== 'object') return;
      const sessionId = String(agent.id ?? '');
      if (sessionId === '' || runtime.providers.has(sessionId)) return;
      const agentCtx = agent.ctx;
      const registry = agentCtx === undefined || typeof agentCtx.get !== 'function' ? undefined : agentCtx.get('skills');
      if (registry === undefined) return;
      try {
        let registeredControl;
        const dispose = agentCtx.effect(
          () => {
            const undo = registry.registerProvider((control) => {
              registeredControl = control;
              runtime.providers.set(sessionId, control);
              return {
                name: PROVIDER_NAME,
                list: (options) => runtime.providerList(sessionId, options),
                get: (candidate, options) => runtime.providerGet(sessionId, candidate, options),
              };
            });
            return () => {
              if (runtime.providers.get(sessionId) === registeredControl) runtime.providers.delete(sessionId);
              undo();
            };
          },
          'dsh-assets: session skill filter',
        );
        disposers.push(dispose);
        runtime.providerDisposers.set(sessionId, dispose);
      } catch (error) {
        runtime.warn(`could not register the skill filter for ${sessionId}`, error);
      }
    };

    for (const agent of ctx.agents.list()) {
      track(agent);
      if (isRootAgent(ctx, agent)) {
        void runtime.ensureIndex(String(agent.id)).catch((error) => {
          runtime.warn(`could not build the asset index for ${String(agent.id)}`, error);
        });
      }
    }

    const off = ctx.on('agent/created', async ({ agent }) => {
      track(agent);
      if (isRootAgent(ctx, agent)) {
        try {
          await runtime.ensureIndex(String(agent.id));
        } catch (error) {
          runtime.warn(`could not build the asset index for ${String(agent.id)}`, error);
        }
      }
    });

    return () => {
      off();
      for (const dispose of disposers) {
        try {
          dispose();
        } catch {
          // The agent may already be disposed.
        }
      }
      runtime.providers.clear();
      runtime.providerDisposers.clear();
    };
  }, 'dsh-assets: per-session filters');
}

/* -------------------------------------------------------------------------- */
/* skill updates                                                             */
/* -------------------------------------------------------------------------- */

const execFileAsync = promisify(execFileCb);

/** Run one git command inside a skill directory. */
async function gitIn(dir, args, timeoutMs = GIT_TIMEOUT_MS) {
  try {
    const { stdout } = await execFileAsync('git', ['-C', dir, ...args], { timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 });
    return { ok: true, out: String(stdout ?? '').trim() };
  } catch (error) {
    return { ok: false, out: String(error?.stdout ?? '').trim(), err: String(error?.stderr ?? error?.message ?? 'git failed').trim() };
  }
}

/** Run a raw git command with a working directory (clone support). */
async function gitRaw(args, cwd, timeoutMs = GIT_FETCH_TIMEOUT_MS) {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd, timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024 });
    return { ok: true, out: String(stdout ?? '').trim() };
  } catch (error) {
    return { ok: false, out: String(error?.stdout ?? '').trim(), err: String(error?.stderr ?? error?.message ?? 'git failed').trim() };
  }
}

/** Read the frontmatter origin a skill declares in its SKILL.md. */
async function readSkillOrigin(dir) {
  try {
    const raw = await fs.readFile(path.join(dir, 'SKILL.md'), 'utf8');
    const frontmatter = parseFrontmatter(raw).data;
    const metadata = frontmatter.metadata !== null && typeof frontmatter.metadata === 'object' ? frontmatter.metadata : {};
    const url = String(metadata.homepage ?? metadata.repository ?? metadata.repo ?? '').trim();
    return { url };
  } catch {
    return { url: '' };
  }
}

/** Split a git log into short change lines. */
function splitChanges(value) {
  const text = String(value ?? '').trim();
  if (text === '') return [];
  return text.split('\n').filter((line) => line !== '').slice(0, 20);
}

/** Shorten a commit id for display. */
function shortCommit(value) {
  return String(value ?? '').slice(0, 8);
}

/** GitHub repository matching for skills that declare no origin. */
const originCache = new Map();

export async function findSkillOrigin(skillName) {
  if (originCache.has(skillName)) return originCache.get(skillName);
  const promise = (async () => {
    const tokens = String(skillName).toLowerCase().split(/[-_]/).filter((token) => token.length > 1);
    if (tokens.length === 0) return null;
    const query = `${tokens.join(' ')} in:name,description`;
    try {
      const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=8`, {
        headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-assets' },
      });
      if (!response.ok) return null;
      const data = await response.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      const flat = tokens.join('');
      let best = null;
      let bestScore = 0;
      for (const item of items) {
        const full = String(item?.full_name ?? '').toLowerCase();
        const name = String(item?.name ?? '').toLowerCase();
        const description = String(item?.description ?? '').toLowerCase();
        let score = 0;
        if (name === flat || name === tokens.join('-') || name === tokens.join('_')) score += 120;
        if (full.includes(flat)) score += 80;
        for (const token of tokens) {
          if (full.includes(token)) score += 20;
          if (description.includes(token)) score += 8;
        }
        if (item?.fork === true) score -= 40;
        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      }
      if (best === null) return null;
      const name = String(best.name ?? '').toLowerCase();
      const nameMatches = tokens.every((token) => name.includes(token)) || name === flat;
      if (!nameMatches || bestScore < 120) return null;
      return { url: String(best.html_url ?? ''), name: String(best.full_name ?? '') };
    } catch {
      return null;
    }
  })();
  originCache.set(skillName, promise);
  return promise;
}

/** Inspect one user skill's update state without changing files. */
export async function inspectSkillUpdate(row) {
  const dir = row.path;
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) return { ...row, state: 'error', message: 'skill directory is missing' };
  } catch {
    return { ...row, state: 'error', message: 'skill directory is missing' };
  }
  const inGit = await gitIn(dir, ['rev-parse', '--is-inside-work-tree']);
  if (inGit.ok && inGit.out === 'true') return inspectGitSkill(row);
  const meta = await readSkillOrigin(dir);
  if (meta.url !== '') {
    return { ...row, state: 'conflict', cloneMode: true, source: meta.url, local: 'local', remote: 'remote', dirty: true, diverged: false, changes: [], message: 'local copy without git history; updating replaces it with the official copy' };
  }
  const origin = await findSkillOrigin(row.skill);
  if (origin === null) {
    return { ...row, state: 'no-source', message: 'no git remote, no metadata.homepage/repository, and find-skills found no match' };
  }
  return { ...row, state: 'conflict', cloneMode: true, source: origin.url, local: 'local', remote: 'remote', dirty: true, diverged: false, changes: [], message: `matched via find-skills: ${origin.name}` };
}

/** Inspect one git-based skill. */
async function inspectGitSkill(row) {
  const dir = row.path;
  const urlResult = await gitIn(dir, ['remote', 'get-url', 'origin']);
  let source = urlResult.ok ? urlResult.out : (await readSkillOrigin(dir)).url;
  if (source === '') return { ...row, state: 'no-source', message: 'no git remote and no metadata.homepage/repository' };
  const fetched = await gitIn(dir, ['fetch', 'origin'], GIT_FETCH_TIMEOUT_MS);
  if (!fetched.ok) return { ...row, state: 'error', source, message: fetched.err || 'git fetch failed' };
  const branch = (await gitIn(dir, ['rev-parse', '--abbrev-ref', 'HEAD'])).out;
  const local = (await gitIn(dir, ['rev-parse', 'HEAD'])).out;
  const remoteRef = branch === '' || branch === 'HEAD' ? 'FETCH_HEAD' : `refs/remotes/origin/${branch}`;
  const remote = await gitIn(dir, ['rev-parse', remoteRef]);
  if (!remote.ok) return { ...row, state: 'error', source, local, message: remote.err || 'remote revision missing' };
  const status = await gitIn(dir, ['status', '--porcelain']);
  const dirty = status.out !== '';
  if (local === remote.out) {
    return { ...row, state: 'up-to-date', source, local, remote: remote.out, dirty, diverged: false, changes: [] };
  }
  const ancestor = await gitIn(dir, ['merge-base', '--is-ancestor', local, remote.out]);
  const changes = splitChanges((await gitIn(dir, ['log', '--oneline', '--no-merges', `${local}..${remote.out}`])).out);
  if (dirty || !ancestor.ok) {
    return { ...row, state: 'conflict', source, local, remote: remote.out, dirty, diverged: !ancestor.ok, changes, message: dirty && !ancestor.ok ? 'local changes and diverged history' : dirty ? 'uncommitted local changes' : 'local and remote history diverged' };
  }
  const merged = await gitIn(dir, ['merge', '--ff-only', remote.out]);
  if (!merged.ok) return { ...row, state: 'conflict', source, local, remote: remote.out, dirty: false, diverged: false, changes, message: merged.err || 'fast-forward merge failed' };
  return { ...row, state: 'updated', source, local, remote: remote.out, dirty: false, diverged: false, changes };
}

/** Apply the choice the user made for one conflict. */
export async function applySkillResolution(row, choice) {
  if (choice === 'keep-local') return { ...row, state: 'kept-local' };
  if (row.cloneMode === true) {
    if (choice === 'take-remote') return cloneReplace(row);
    return { ...row, state: 'kept-local' };
  }
  if (choice === 'take-remote') {
    const reset = await gitIn(row.path, ['reset', '--hard', row.remote]);
    if (!reset.ok) return { ...row, state: 'error', message: reset.err };
    return { ...row, state: 'took-remote' };
  }
  if (choice === 'stash') {
    const stash = await gitIn(row.path, ['stash', 'push', '-u', '-m', `dsh-assets ${Date.now()}`]);
    const stashed = stash.ok && !stash.out.includes('No local changes');
    const reset = await gitIn(row.path, ['reset', '--hard', row.remote]);
    if (!reset.ok) {
      if (stashed) await gitIn(row.path, ['stash', 'pop']);
      return { ...row, state: 'error', message: reset.err };
    }
    return { ...row, state: 'stashed', stashed };
  }
  return { ...row, state: 'error', message: `unknown choice ${choice}` };
}

/** Replace a non-git skill directory with the official copy, keeping local deps. */
async function cloneReplace(row) {
  const temp = `${row.path}.dsh-update-${process.pid}-${Date.now()}`;
  const clone = await gitRaw(['clone', '--depth', '1', row.source, temp]);
  if (!clone.ok) return { ...row, state: 'error', message: clone.err };
  try {
    await fs.cp(temp, row.path, {
      recursive: true,
      force: true,
      filter: (src) => {
        const rel = path.relative(temp, src);
        const top = rel === '' ? '' : rel.split(path.sep)[0];
        return top !== '.venv' && top !== 'node_modules';
      },
    });
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
    return { ...row, state: 'error', message: String(error?.message ?? error) };
  }
  const commit = (await gitIn(temp, ['rev-parse', 'HEAD'])).out;
  await fs.rm(temp, { recursive: true, force: true }).catch(() => {});
  return { ...row, state: 'took-remote', remote: commit };
}

/** Project the fields the browser dialog renders. */
function publicUpdateResult(result) {
  return {
    skill: result.skill,
    project: result.project,
    state: result.state,
    source: result.source,
    local: shortCommit(result.local),
    remote: shortCommit(result.remote),
    dirty: result.dirty === true,
    diverged: result.diverged === true,
    cloneMode: result.cloneMode === true,
    stashed: result.stashed === true,
    changes: Array.isArray(result.changes) ? result.changes : [],
    message: result.message,
  };
}

/* -------------------------------------------------------------------------- */
/* runtime                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Create the process-local asset runtime.
 * @param ctx - Host context.
 * @returns route handlers, catalog builder, state owner, and provider callbacks.
 */
function createRuntime(ctx) {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const statePath = path.join(home, 'storages', 'dsh-assets', 'state.json');
  const indexes = new Map();
  const building = new Map();
  const providers = new Map();
  const providerDisposers = new Map();
  let state = { version: 1, sessions: {} };
  let ready = Promise.resolve();
  let writeTimer = null;
  let disposed = false;
  const providerDepth = new Map();
  const discovering = new Set();
  const offs = [];

  const emptySession = () => ({ disabledSkills: [], disabledRules: [], disabledPlugins: [], updatedAt: 0 });

  const warn = (message, error) => {
    try {
      ctx.logger?.warn?.(`[dsh-assets] ${message}${error === undefined ? '' : `: ${errorMessage(error)}`}`);
    } catch {
      // Logging must never break a request.
    }
  };

  async function load() {
    try {
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      const raw = await fs.readFile(statePath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && parsed.version === 1 && parsed.sessions !== null && typeof parsed.sessions === 'object') {
        state = { version: 1, sessions: parsed.sessions };
        pruneState();
      }
    } catch (error) {
      if (error?.code !== 'ENOENT') warn('could not read the saved session state', error);
    }
  }

  function pruneState() {
    const now = Date.now();
    const entries = Object.entries(state.sessions);
    for (const [id, value] of entries) {
      if (value === null || typeof value !== 'object' || !Number.isFinite(value.updatedAt) || now - value.updatedAt > STATE_TTL_MS) {
        delete state.sessions[id];
      }
    }
    const remaining = Object.entries(state.sessions);
    if (remaining.length > MAX_STATE_SESSIONS) {
      remaining.sort((left, right) => (left[1].updatedAt ?? 0) - (right[1].updatedAt ?? 0));
      for (const [id] of remaining.slice(0, remaining.length - MAX_STATE_SESSIONS)) delete state.sessions[id];
    }
  }

  function scheduleSave() {
    if (disposed) return;
    if (writeTimer !== null) clearTimeout(writeTimer);
    writeTimer = setTimeout(() => {
      writeTimer = null;
      void saveNow();
    }, 200);
    writeTimer.unref?.();
  }

  async function saveNow() {
    try {
      await fs.mkdir(path.dirname(statePath), { recursive: true });
      const temp = `${statePath}.${process.pid}.tmp`;
      await fs.writeFile(temp, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
      await fs.rename(temp, statePath);
    } catch (error) {
      warn('could not save the session state', error);
    }
  }

  function sessionState(sessionId) {
    const value = state.sessions[String(sessionId)];
    return value === null || typeof value !== 'object' ? emptySession() : value;
  }

  function ensureSession(sessionId) {
    const key = String(sessionId);
    const current = state.sessions[key];
    if (current !== null && typeof current === 'object') {
      for (const field of ['disabledSkills', 'disabledRules', 'disabledPlugins']) {
        if (!Array.isArray(current[field])) current[field] = [];
      }
      return current;
    }
    const created = emptySession();
    state.sessions[key] = created;
    return created;
  }

  function start() {
    ready = load();
    offs.push(
      ctx.on('plugin-manager/changed', () => {
        indexes.clear();
      }),
    );
  }

  async function dispose() {
    disposed = true;
    for (const off of offs) {
      try {
        off();
      } catch {
        // Listener already removed.
      }
    }
    offs.length = 0;
    if (writeTimer !== null) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    await saveNow();
    indexes.clear();
    building.clear();
    providers.clear();
  }

  function resolveCwd(session) {
    try {
      const workingDirectory = ctx.get('workingDirectory');
      if (workingDirectory !== undefined) return workingDirectory.get(session);
    } catch {
      // Fall back to the Session header.
    }
    return session?.header?.cwd ?? process.cwd();
  }

  async function ensureIndex(sessionId, options = {}) {
    await ready;
    const id = String(sessionId);
    const session = ctx.sessions.get(id);
    if (session === undefined) throw httpError(404, 'this session is not live in the Host');
    const cwd = resolveCwd(session);
    const existing = indexes.get(id);
    if (
      options.refresh !== true &&
      existing !== undefined &&
      existing.cwd === cwd &&
      Date.now() - existing.builtAt < INDEX_TTL_MS
    ) {
      return existing;
    }
    const active = building.get(id);
    if (active !== undefined) return active;
    const promise = buildIndex(id, cwd)
      .then((index) => {
        indexes.set(id, index);
        return index;
      })
      .finally(() => {
        building.delete(id);
      });
    building.set(id, promise);
    return promise;
  }

/**
 * Read the skills the user installed themselves: the Codex registry at
 * `~/.cursor/skills` symlinks every user-installed skill, while skills shipped
 * with the environment never appear there. Matches by link name and resolved
 * target path.
 * @param skills - the Session's skill summaries.
 * @returns skill names the user installed.
 */
async function loadUserSkillNames(skills) {
  const names = new Set();
  const registryDir = path.join(os.homedir(), '.cursor', 'skills');
  let entries;
  try {
    entries = await fs.readdir(registryDir, { withFileTypes: true });
  } catch {
    return names;
  }
  for (const entry of entries) {
    if (!entry.isSymbolicLink()) continue;
    names.add(entry.name);
    try {
      const target = await fs.realpath(path.join(registryDir, entry.name));
      for (const skill of skills) {
        if (typeof skill.path !== 'string' || skill.path === '') continue;
        try {
          if ((await fs.realpath(skill.path)) === target) names.add(skill.name);
        } catch {
          // A skill path that no longer resolves is skipped.
        }
      }
    } catch {
      // A broken link contributes its name only.
    }
  }
  return names;
}

  async function buildIndex(sessionId, cwd) {
    discovering.add(sessionId);
    try {
      return await buildIndexInner(sessionId, cwd);
    } finally {
      discovering.delete(sessionId);
    }
  }

  async function buildIndexInner(sessionId, cwd) {
    const agent = ctx.agents.get(sessionId);
    const skills = await ctx.skills
      .list(agent === undefined ? { cwd } : { scope: agent, cwd })
      .catch((error) => {
        warn('could not list skills', error);
        return [];
      });
    const seenSkills = new Set(skills.map((skill) => skill.name));
    const sessionCatalog = ctx.get('sessionSkillCatalog');
    if (sessionCatalog !== undefined) {
      try {
        const listed = await sessionCatalog.list({ sessionId }, new AbortController().signal);
        for (const entry of listed?.skills ?? []) {
          if (seenSkills.has(entry.name)) continue;
          seenSkills.add(entry.name);
          skills.push({
            name: entry.name,
            description: entry.description,
            whenToUse: entry.whenToUse,
            path: entry.path,
            source: 'custom',
            provider: 'session-skill-catalog',
            invocation: { modelInvocable: entry.modelInvocable === true, userInvocable: true },
          });
        }
      } catch (error) {
        warn('could not read the session skill catalog', error);
      }
    }
    const globalSkills = await ctx.skills.list({ cwd }).catch(() => []);
    const globalNames = new Set(globalSkills.map((skill) => skill.name));
    const contents = new Map();
    for (const skill of skills) {
      if (typeof skill.path !== 'string' || skill.path === '') continue;
      contents.set(skill.name, await readTextCapped(skill.path, MAX_SKILL_BYTES));
    }

    let bundles = [];
    try {
      bundles = await ctx.pluginManager.listBundles();
    } catch (error) {
      warn('could not list plugin bundles', error);
    }

    const plugins = bundles
      .filter((bundle) => bundle !== null && typeof bundle === 'object' && bundle.availability !== 'missing')
      .map(toPlugin);

    let presets = [];
    try {
      const registry = ctx.get('agentPresets');
      const roster = registry === undefined ? undefined : await registry.remoteExportList();
      presets = (roster?.presets ?? []).map(toPreset);
    } catch (error) {
      warn('could not list agent presets', error);
    }

    const rules = await discoverRules(cwd);
    const userInstalled = await loadUserSkillNames(skills);
    const projects = discoverProjectGroups(skills, contents, userInstalled);
    const dshSkills = skills.filter((skill) => !projects.bySkill.has(skill.name));
    const dshPack = dshSkills.length === 0
      ? undefined
      : {
          kind: 'pack',
          id: 'pack:dsh-presets',
          title: 'DSH presets',
          summary: 'Skills shipped with DeepSeek Harness.',
          dsh: true,
          skillIds: dshSkills.map((skill) => skill.name),
        };
    const clusters = dshPack === undefined ? [...projects.clusters] : [...projects.clusters, dshPack];
    const skillGroup = new Map([
      ...projects.skillGroup,
      ...dshSkills.map((skill) => [skill.name, { groupId: 'pack:dsh-presets', kind: 'pack' }]),
    ]);

    return {
      sessionId,
      cwd,
      builtAt: Date.now(),
      skills,
      contents,
      plugins,
      presets,
      rules,
      clusters,
      skillGroup,
      ungrouped: [],
      scopedOnly: new Map(skills.map((skill) => [skill.name, !globalNames.has(skill.name)])),
    };
  }

  async function catalog(sessionId, options = {}) {
    const index = await ensureIndex(sessionId, { refresh: options.refresh === true });
    return serializeIndex(index, options.locale ?? 'en', sessionState(sessionId));
  }

  function providerEnabled(sessionId, skillName) {
    const saved = state.sessions[String(sessionId)];
    if (saved === undefined || saved === null) return true;
    if (Array.isArray(saved.disabledSkills) && saved.disabledSkills.includes(skillName)) return false;
    const group = indexes.get(String(sessionId))?.skillGroup?.get(skillName);
    if (group?.pluginId !== undefined && Array.isArray(saved.disabledPlugins) && saved.disabledPlugins.includes(group.pluginId)) {
      return false;
    }
    return true;
  }

  async function providerList(sessionId, options) {
    await ready;
    const depthKey = String(sessionId);
    if ((providerDepth.get(depthKey) ?? 0) > 0) return [];
    providerDepth.set(depthKey, 1);
    try {
      const cwd = options?.cwd;
      const skills = await ctx.skills.list({ cwd, signal: options?.signal });
      const saved = state.sessions[String(sessionId)];
      const plain = saved === undefined || saved === null || (
        (!Array.isArray(saved.disabledSkills) || saved.disabledSkills.length === 0) &&
        (!Array.isArray(saved.disabledPlugins) || saved.disabledPlugins.length === 0)
      );
      if (plain) return skills.map(toCandidate);
      if (discovering.has(String(sessionId))) return skills.map(toCandidate);

      const index = indexes.get(String(sessionId));
      const globalCandidates = skills.map((skill) => {
        const enabled = providerEnabled(sessionId, skill.name);
        return {
          ...skill,
          provider: PROVIDER_NAME,
          rank: 1000,
          locator: { name: skill.name },
          invocation: enabled
            ? skill.invocation
            : { modelInvocable: false, userInvocable: false },
        };
      });
      if (index === undefined || index.scopedOnly === undefined) return globalCandidates;

      const scopedCandidates = [];
      for (const skill of index.skills) {
        if (index.scopedOnly.get(skill.name) !== true) continue;
        if (providerEnabled(sessionId, skill.name)) continue;
        scopedCandidates.push({
          ...skill,
          provider: PROVIDER_NAME,
          rank: 1000,
          locator: { name: skill.name },
          invocation: { modelInvocable: false, userInvocable: false },
        });
      }
      return [...globalCandidates, ...scopedCandidates];
    } finally {
      providerDepth.delete(depthKey);
    }
  }

  async function providerGet(sessionId, candidate, options) {
    await ready;
    if (!providerEnabled(sessionId, candidate.name)) return undefined;
    return ctx.skills.get(candidate.name, { cwd: options?.cwd, signal: options?.signal });
  }

  function rulesText(scope) {
    const sessionId = scope?.id === undefined || scope?.id === null ? '' : String(scope.id);
    if (sessionId === '') return '';
    const index = indexes.get(sessionId);
    if (index === undefined) return '';
    const saved = sessionState(sessionId);
    const disabled = Array.isArray(saved.disabledRules) ? saved.disabledRules : [];
    const enabled = index.rules.filter((rule) => rule.readOnly !== true && !disabled.includes(rule.id));
    if (enabled.length === 0) return '';

    const parts = [
      '<system-reminder>',
      'The user enabled the following session rules in the Assets panel. Follow them as user-provided guidance for this session.',
      '',
    ];
    let spent = 0;
    for (const rule of enabled) {
      const block = `### ${rule.title} (${rule.path})\n${escapeReminder(rule.content)}`;
      if (spent + block.length > MAX_RULE_TEXT && parts.length > 4) {
        parts.push(`(${enabled.length} rules; the rest were omitted to stay within the session budget.)`);
        break;
      }
      parts.push(block, '');
      spent += block.length;
    }
    parts.push('</system-reminder>');
    return parts.join('\n');
  }

  async function toggle(sessionId, kind, id, enabled, locale) {
    await ready;
    const sid = String(sessionId);
    const session = ctx.sessions.get(sid);
    if (session === undefined) throw httpError(404, 'this session is not live in the Host');
    const index = await ensureIndex(sid);
    const saved = ensureSession(sid);
    const value = String(id ?? '');

    if (kind === 'all') {
      saved.disabledSkills = [];
      saved.disabledRules = [];
      saved.disabledPlugins = [];
    } else if (kind === 'skill') {
      if (!index.skills.some((skill) => skill.name === value)) throw httpError(400, 'unknown skill');
      setDisabled(saved.disabledSkills, value, enabled !== true);
    } else if (kind === 'plugin') {
      if (!index.plugins.some((plugin) => plugin.id === value)) throw httpError(400, 'unknown plugin');
      setDisabled(saved.disabledPlugins, value, enabled !== true);
    } else if (kind === 'pack') {
      const cluster = index.clusters.find((entry) => (entry.kind === 'pack' || entry.kind === 'project') && entry.id === value);
      if (cluster === undefined) throw httpError(400, 'unknown skill pack');
      for (const skillId of cluster.skillIds) setDisabled(saved.disabledSkills, skillId, enabled !== true);
    } else if (kind === 'rule') {
      if (!index.rules.some((rule) => rule.id === value)) throw httpError(400, 'unknown rule');
      setDisabled(saved.disabledRules, value, enabled !== true);
    } else {
      throw httpError(400, 'unknown asset kind');
    }

    saved.updatedAt = Date.now();
    scheduleSave();
    const control = providers.get(sid);
    try {
      control?.invalidate();
    } catch {
      // The provider is being replaced or disposed.
    }
    return serializeIndex(index, locale ?? 'en', saved);
  }

  async function handleList(request) {
    try {
      const url = new URL(request.url);
      const sessionId = url.searchParams.get('sessionId') ?? '';
      if (sessionId === '') return jsonResponse(400, { error: 'sessionId is required' });
      const locale = normalizeLocale(url.searchParams.get('locale'));
      const refresh = url.searchParams.get('refresh') === '1';
      const data = await catalog(sessionId, { locale, refresh });
      return jsonResponse(200, data);
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function handleToggle(request) {
    try {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse(400, { error: 'invalid JSON body' });
      }
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : '';
      const kind = typeof payload?.kind === 'string' ? payload.kind : '';
      const id = typeof payload?.id === 'string' ? payload.id : '';
      const enabled = payload?.enabled === true;
      const locale = normalizeLocale(payload?.locale);
      if (sessionId === '') return jsonResponse(400, { error: 'sessionId is required' });
      if (kind === '') return jsonResponse(400, { error: 'kind is required' });
      const data = await toggle(sessionId, kind, id, enabled, locale);
      return jsonResponse(200, data);
    } catch (error) {
      return errorResponse(error);
    }
  }

  const updateLogPath = path.join(home, 'storages', 'dsh-assets', 'update-log.json');

  async function readUpdateLog() {
    try {
      const raw = await fs.readFile(updateLogPath, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed !== null && typeof parsed === 'object' && Array.isArray(parsed.entries)) return parsed.entries;
    } catch (error) {
      if (error?.code !== 'ENOENT') warn('could not read the update log', error);
    }
    return [];
  }

  async function appendUpdateLog(entries) {
    const next = [...entries, ...(await readUpdateLog())].slice(0, MAX_LOG_ENTRIES);
    try {
      await fs.mkdir(path.dirname(updateLogPath), { recursive: true });
      await fs.writeFile(updateLogPath, `${JSON.stringify({ version: 1, entries: next }, null, 2)}\n`, 'utf8');
    } catch (error) {
      warn('could not write the update log', error);
    }
  }

  function logEntry(result) {
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      time: Date.now(),
      skill: result.skill,
      project: result.project,
      action: result.state,
      source: result.source,
      from: shortCommit(result.local),
      to: shortCommit(result.remote),
      changes: Array.isArray(result.changes) ? result.changes : [],
      message: result.message,
    };
  }

  async function listUserProjects(sessionId) {
    const index = await ensureIndex(sessionId, { refresh: true });
    const skillByName = new Map(index.skills.map((skill) => [skill.name, skill]));
    const rows = [];
    for (const cluster of index.clusters) {
      if (cluster.kind !== 'project') continue;
      for (const name of cluster.skillIds) {
        const skill = skillByName.get(name);
        if (skill === undefined || typeof skill.path !== 'string' || skill.path === '') continue;
        rows.push({ project: cluster.title, skill: skill.name, summary: skill.description, path: skill.path });
      }
    }
    return rows;
  }

  async function handleUpdate(request) {
    try {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse(400, { error: 'invalid JSON body' });
      }
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : '';
      if (sessionId === '') return jsonResponse(400, { error: 'sessionId is required' });
      const rows = await listUserProjects(sessionId);
      const results = [];
      const log = [];
      for (const row of rows) {
        const result = await inspectSkillUpdate(row);
        if (result.state === 'updated') log.push(logEntry(result));
        results.push(publicUpdateResult(result));
      }
      if (log.length > 0) await appendUpdateLog(log);
      return jsonResponse(200, { results });
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function handleResolve(request) {
    try {
      let payload;
      try {
        payload = await request.json();
      } catch {
        return jsonResponse(400, { error: 'invalid JSON body' });
      }
      const sessionId = typeof payload?.sessionId === 'string' ? payload.sessionId : '';
      const skillName = typeof payload?.skill === 'string' ? payload.skill : '';
      const choice = typeof payload?.choice === 'string' ? payload.choice : '';
      if (sessionId === '') return jsonResponse(400, { error: 'sessionId is required' });
      if (skillName === '') return jsonResponse(400, { error: 'skill is required' });
      const rows = await listUserProjects(sessionId);
      const row = rows.find((entry) => entry.skill === skillName);
      if (row === undefined) return jsonResponse(404, { error: 'skill not found in user skill packs' });
      const current = await inspectSkillUpdate(row);
      if (current.state !== 'conflict') return jsonResponse(200, { result: publicUpdateResult(current) });
      const result = await applySkillResolution(current, choice);
      if (result.state === 'updated' || result.state === 'took-remote' || result.state === 'stashed' || result.state === 'kept-local') {
        await appendUpdateLog([logEntry(result)]);
      }
      return jsonResponse(200, { result: publicUpdateResult(result) });
    } catch (error) {
      return errorResponse(error);
    }
  }

  async function handleChangelog(request) {
    try {
      return jsonResponse(200, { entries: await readUpdateLog() });
    } catch (error) {
      return errorResponse(error);
    }
  }

  return {
    start,
    dispose,
    ensureIndex,
    catalog,
    toggle,
    rulesText,
    providerList,
    providerGet,
    handleList,
    handleToggle,
    handleUpdate,
    handleResolve,
    handleChangelog,
    providers,
    providerDisposers,
    warn,
  };
}

/* -------------------------------------------------------------------------- */
/* catalog                                                                    */
/* -------------------------------------------------------------------------- */

/** Convert one bundle record into the catalog's plugin shape. */
function toPlugin(bundle) {
  const name = String(bundle.name ?? '');
  const rows = Array.isArray(bundle.rows) ? bundle.rows.map((row) => String(row.moduleName ?? '')).filter(Boolean) : [];
  return {
    id: name,
    name,
    title: bundle.meta?.title,
    description: bundle.meta?.description,
    rawDescription: typeof bundle.description === 'string' ? bundle.description : '',
    version: typeof bundle.version === 'string' ? bundle.version : undefined,
    profileEnabled: bundle.enabled === true,
    installed: bundle.installed === true,
    core: bundle.availability === 'installation',
    optional: bundle.optional === true,
    removable: bundle.removable === true,
    rows,
    source: bundle.source,
    error: bundle.error?.code,
  };
}

/** Convert one agent-preset roster row into the catalog's preset shape. */
function toPreset(preset) {
  const id = String(preset.id ?? '');
  return {
    id,
    title: typeof preset.name === 'string' && preset.name !== '' ? preset.name : id,
    description: typeof preset.description === 'string' ? preset.description : '',
    isDefault: preset.isDefault === true,
    broken: typeof preset.broken === 'string' ? preset.broken : undefined,
    core: BUILTIN_PRESETS.has(id),
  };
}

/** Project global skill summaries into filter-provider candidates. */
function toCandidate(skill) {
  return {
    ...skill,
    provider: PROVIDER_NAME,
    rank: 1000,
    locator: { name: skill.name },
  };
}

/** Serialize one built index for the browser under the active session state. */
function serializeIndex(index, locale, saved) {
  const disabledSkills = Array.isArray(saved.disabledSkills) ? saved.disabledSkills : [];
  const disabledRules = Array.isArray(saved.disabledRules) ? saved.disabledRules : [];
  const disabledPlugins = Array.isArray(saved.disabledPlugins) ? saved.disabledPlugins : [];

  const pluginById = new Map(index.plugins.map((plugin) => [plugin.id, plugin]));
  const skillByName = new Map(index.skills.map((skill) => [skill.name, skill]));
  const clusterSkillIds = new Map();
  for (const cluster of index.clusters) {
    if (cluster.kind !== 'plugin') continue;
    const list = clusterSkillIds.get(cluster.pluginId) ?? [];
    list.push(...cluster.skillIds);
    clusterSkillIds.set(cluster.pluginId, list);
  }

  const isSkillEnabled = (skill) => {
    const group = index.skillGroup.get(skill.name);
    if (group?.pluginId !== undefined) {
      const plugin = pluginById.get(group.pluginId);
      if (plugin?.profileEnabled === false) return false;
      if (disabledPlugins.includes(group.pluginId)) return false;
    }
    if (disabledSkills.includes(skill.name)) return false;
    return true;
  };

  const skills = index.skills.map((skill) => {
    const group = index.skillGroup.get(skill.name);
    return {
      id: skill.name,
      name: skill.name,
      title: skill.name,
      summary: firstSentence(skill.description || index.contents.get(skill.name) || ''),
      provider: skill.provider,
      source: skill.source,
      path: skill.path,
      groupId: group?.groupId ?? null,
      groupKind: group?.kind ?? 'skill',
      pluginId: group?.pluginId ?? null,
      scopedOnly: index.scopedOnly?.get(skill.name) === true,
      enabled: isSkillEnabled(skill),
      modelInvocable: skill.invocation?.modelInvocable !== false,
      userInvocable: skill.invocation?.userInvocable !== false,
    };
  });
  const skillView = new Map(skills.map((skill) => [skill.name, skill]));

  const plugins = [];
  for (const plugin of index.plugins) {
    const ids = [...new Set(clusterSkillIds.get(plugin.id) ?? [])];
    const children = ids.map((id) => skillView.get(id)).filter(Boolean);
    const enabledCount = children.filter((skill) => skill.enabled).length;
    plugins.push({
      id: plugin.id,
      name: plugin.name,
      title: localized(plugin.title, locale) || plugin.name,
      summary: firstSentence(localized(plugin.description, locale) || plugin.rawDescription || `Installed DeepSeek Harness plugin.`),
      version: plugin.version,
      profileEnabled: plugin.profileEnabled,
      installed: plugin.installed,
      core: plugin.core,
      optional: plugin.optional,
      removable: plugin.removable,
      error: plugin.error,
      source: plugin.source,
      toggleable: children.length > 0 && plugin.profileEnabled && plugin.error === undefined,
      sessionEnabled: children.length > 0 && enabledCount === children.length,
      mixed: children.length > 0 && enabledCount > 0 && enabledCount < children.length,
      skillIds: children.map((skill) => skill.id),
      skillCount: children.length,
    });
  }

  const projects = index.clusters
    .filter((cluster) => cluster.kind === 'project')
    .map((cluster) => {
      const children = cluster.skillIds.map((id) => skillView.get(id)).filter(Boolean);
      const enabledCount = children.filter((skill) => skill.enabled).length;
      return {
        id: cluster.id,
        projectId: cluster.projectId,
        title: cluster.title,
        summary: locale === 'zh' ? cluster.summaryZh || cluster.summary : cluster.summary,
        kindLabel: cluster.kindLabel,
        version: cluster.version,
        project: true,
        toggleable: children.length > 0,
        sessionEnabled: children.length > 0 && enabledCount === children.length,
        mixed: children.length > 0 && enabledCount > 0 && enabledCount < children.length,
        skillIds: children.map((skill) => skill.id),
        skillCount: children.length,
      };
    });

  const packs = index.clusters
    .filter((cluster) => cluster.kind === 'pack')
    .map((cluster) => {
      const children = cluster.skillIds.map((id) => skillView.get(id)).filter(Boolean);
      const enabledCount = children.filter((skill) => skill.enabled).length;
      return {
        id: cluster.id,
        title: cluster.title,
        summary: cluster.summary,
        dsh: cluster.dsh === true,
        toggleable: children.length > 0,
        sessionEnabled: children.length > 0 && enabledCount === children.length,
        mixed: children.length > 0 && enabledCount > 0 && enabledCount < children.length,
        skillIds: children.map((skill) => skill.id),
        skillCount: children.length,
      };
    });

  const ungrouped = skills.filter((skill) => skill.groupId === null);

  const rules = index.rules.map((rule) => ({
    id: rule.id,
    title: rule.title,
    summary: firstSentence(rule.description || rule.content || rule.path),
    path: rule.path,
    scope: rule.scope,
    readOnly: rule.readOnly === true,
    managedBy: rule.readOnly === true ? 'dsh' : 'assets',
    enabled: rule.readOnly === true ? true : !disabledRules.includes(rule.id),
    bytes: rule.bytes,
  }));

  const presets = (index.presets ?? []).map((preset) => ({
    id: preset.id,
    title: preset.title,
    summary: firstSentence(preset.description || `Agent preset ${preset.title}.`),
    isDefault: preset.isDefault === true,
    broken: preset.broken,
    core: preset.core === true,
  }));

  return {
    sessionId: index.sessionId,
    cwd: index.cwd,
    builtAt: index.builtAt,
    plugins,
    presets,
    projects,
    packs,
    skills,
    ungrouped,
    rules,
    counts: {
      plugins: plugins.length,
      toggleablePlugins: plugins.filter((plugin) => plugin.toggleable).length,
      skills: skills.length,
      enabledSkills: skills.filter((skill) => skill.enabled).length,
      packs: packs.length,
      presets: presets.length,
      projects: projects.length,
      rules: rules.length,
      enabledRules: rules.filter((rule) => rule.enabled).length,
    },
  };
}

/* -------------------------------------------------------------------------- */
/* clustering                                                                 */
/* -------------------------------------------------------------------------- */

/** Last path segment of an owner/repo identity. */
function repoName(repo) {
  return String(repo).split('/')[1] ?? '';
}

/** Normalize a Git host URL to owner/repo, optionally requiring the repo name. */
function repoFromText(value, requiredName) {
  const text = String(value ?? '');
  const pattern = /(?:github\.com|gitlab\.com|bitbucket\.org)[/:]([^/\s]+)\/([^/\s#?]+)/gi;
  for (const match of text.matchAll(pattern)) {
    const name = match[2].replace(/\.git$/i, '').toLowerCase();
    if (requiredName !== undefined && name !== requiredName) continue;
    return `${match[1].toLowerCase()}/${name}`;
  }
  return '';
}

/** First non-generic segment of a skill name, used as a project prefix. */
function projectStem(name) {
  const stem = String(name).split(/[-_]/)[0].toLowerCase();
  return stem.length >= 3 && !GENERIC_STEMS.has(stem) ? stem : '';
}

/** Pick the casing a project's documentation uses for its own name. */
function projectDisplayName(base, contents) {
  const key = String(base).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (key === '') return titleCase(base);
  const counts = new Map();
  for (const text of contents.values()) {
    for (const token of String(text).match(/[A-Za-z][A-Za-z0-9]*/g) ?? []) {
      if (token.toLowerCase() === key) counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  let upper = '';
  let upperCount = 0;
  let lower = '';
  let lowerCount = 0;
  for (const [token, count] of counts) {
    if (/[A-Z]/.test(token)) {
      if (count > upperCount) {
        upper = token;
        upperCount = count;
      }
    } else if (count > lowerCount) {
      lower = token;
      lowerCount = count;
    }
  }
  if (upper !== '') return upper;
  if (lower !== '') return lower;
  return titleCase(base);
}

/** Read the project identity a skill declares or references. */
function projectMetadata(skill, contents) {
  const content = contents.get(skill.name) ?? '';
  const frontmatter = parseFrontmatter(content).data;
  const metadata = frontmatter.metadata !== null && typeof frontmatter.metadata === 'object' ? frontmatter.metadata : {};
  const declared = String(metadata.project ?? metadata.package ?? '').trim();
  const declaredRepo = repoFromText(metadata.homepage ?? metadata.repository ?? metadata.repo ?? '');
  const stem = projectStem(skill.name);
  const contentRepo = stem === '' ? '' : repoFromText(content, stem);
  return {
    projectName: declared,
    repo: declaredRepo || contentRepo,
    version: String(metadata.version ?? '').trim(),
    kind: String(metadata.kind ?? metadata.type ?? '').trim(),
    description: String(metadata.description ?? '').trim(),
    stem,
  };
}

/**
 * Discover user-installed projects from skill provenance. A project is seeded
 * by explicit frontmatter metadata, a repository URL that matches a skill's
 * prefix, or a non-generic prefix shared by at least two user skills;
 * cross-skill references extend the group. Skills without a project identity
 * remain DSH-provided.
 */
export function discoverProjectGroups(skills, contents, userInstalled = new Set()) {
  const candidates = skills.filter((skill) => skill.source === 'user-agents' || skill.source === 'custom');
  const parent = new Map(candidates.map((skill) => [skill.name, skill.name]));
  const find = (name) => {
    let current = name;
    while (parent.get(current) !== current) current = parent.get(current);
    while (parent.get(name) !== current) {
      const next = parent.get(name);
      parent.set(name, current);
      name = next;
    }
    return current;
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a === b) return;
    const registry = rootRegistry.get(a) === true || rootRegistry.get(b) === true;
    parent.set(b, a);
    if (registry) rootRegistry.set(a, true);
    rootRegistry.delete(b);
  };
  const seedRoots = new Set();
  const rootRegistry = new Map();
  const markSeed = (name) => seedRoots.add(find(name));
  const markRegistry = (name) => {
    rootRegistry.set(find(name), true);
    markSeed(name);
  };
  const metadata = new Map();
  const explicit = new Map();
  const prefixes = new Map();

  for (const skill of candidates) {
    const info = projectMetadata(skill, contents);
    metadata.set(skill.name, info);
    let key = '';
    if (info.repo !== '') key = `repo:${info.repo}`;
    else if (info.projectName !== '') key = `project:${info.projectName.toLowerCase()}`;
    if (key !== '') {
      const names = explicit.get(key) ?? [];
      names.push(skill.name);
      explicit.set(key, names);
    }
    if (info.stem !== '') {
      const names = prefixes.get(info.stem) ?? [];
      names.push(skill.name);
      prefixes.set(info.stem, names);
    }
  }

  for (const names of explicit.values()) {
    for (const name of names.slice(1)) union(names[0], name);
    markSeed(names[0]);
  }
  for (const names of prefixes.values()) {
    if (names.length < 2) continue;
    for (const name of names.slice(1)) union(names[0], name);
    markSeed(names[0]);
  }
  for (const skill of candidates) {
    if (userInstalled.has(skill.name)) markRegistry(skill.name);
  }

  const names = candidates.map((skill) => skill.name);
  for (let round = 0; round < 3; round += 1) {
    for (const skill of candidates) {
      const content = contents.get(skill.name) ?? '';
      for (const other of names) {
        if (other === skill.name) continue;
        const linked = content.includes(`../${other}/`) || content.includes(`/${other})`) || content.includes(`/${other}/`);
        if (!linked) continue;
        const a = find(skill.name);
        const b = find(other);
        if (a === b) continue;
        const aSeed = seedRoots.has(a);
        const bSeed = seedRoots.has(b);
        if (aSeed && bSeed && rootRegistry.get(a) !== true && rootRegistry.get(b) !== true) continue;
        if (aSeed || bSeed) {
          union(a, b);
          markSeed(a);
          markSeed(b);
        }
      }
    }
  }

  const groups = new Map();
  for (const skill of candidates) {
    const root = find(skill.name);
    if (!seedRoots.has(root)) continue;
    const members = groups.get(root) ?? [];
    members.push(skill);
    groups.set(root, members);
  }

  const clusters = [];
  const bySkill = new Map();
  for (const members of groups.values()) {
    const stemCounts = new Map();
    for (const skill of members) {
      const stem = metadata.get(skill.name).stem;
      if (stem !== '') stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
    }
    const projectStem = [...stemCounts.entries()]
      .filter(([, count]) => count >= 2)
      .sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
    const representative = members.find((skill) => metadata.get(skill.name).stem === projectStem) ?? members[0];
    const info = metadata.get(representative.name);
    const base = info.projectName !== '' ? info.projectName : info.repo !== '' ? repoName(info.repo) : projectStem !== '' ? projectStem : members.length === 1 ? representative.name : info.stem;
    const title = info.projectName !== '' ? info.projectName : projectDisplayName(base, contents);
    const id = projectSlug(title);
    const version = members.map((skill) => metadata.get(skill.name).version).find((value) => value !== '') ?? '';
    const kindLabel = members.map((skill) => metadata.get(skill.name).kind).find((value) => value !== '') ?? '';
    const description = members.map((skill) => metadata.get(skill.name).description).find((value) => value !== '');
    const cluster = {
      kind: 'project',
      id: `project:${id}`,
      projectId: id,
      title,
      summary: description !== undefined && description !== '' ? description : representative.summary,
      version,
      kindLabel,
      skillIds: members.map((skill) => skill.name),
    };
    clusters.push(cluster);
    for (const skill of members) bySkill.set(skill.name, cluster);
  }

  return {
    clusters,
    bySkill,
    skillGroup: new Map([...bySkill].map(([name, cluster]) => [name, { groupId: cluster.id, kind: 'project' }])),
  };
}

/** Normalize a display name into a stable project id. */
function projectSlug(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'project';
}

/**
 * Group the skill catalog by owning plugin, mutual references, and shared name
 * prefixes; unmatched groups of two or more become a skill pack.
 */
export function clusterSkills(skills, contents, plugins) {
  const names = new Set(skills.map((skill) => skill.name));
  const parent = new Map(skills.map((skill) => [skill.name, skill.name]));

  const find = (name) => {
    let current = name;
    for (;;) {
      const next = parent.get(current);
      if (next === undefined || next === current) return current;
      current = next;
    }
  };
  const union = (left, right) => {
    const a = find(left);
    const b = find(right);
    if (a !== b) parent.set(a, b);
  };

  for (const skill of skills) {
    const content = contents.get(skill.name) ?? '';
    for (const match of content.matchAll(/\.\.\/([a-z0-9][a-z0-9-]*)\//g)) {
      if (names.has(match[1])) union(skill.name, match[1]);
    }
  }

  const stems = new Map();
  for (const skill of skills) {
    const stem = skill.name.split('-')[0];
    if (stem.length < 4 || GENERIC_STEMS.has(stem)) continue;
    const list = stems.get(stem) ?? [];
    list.push(skill.name);
    stems.set(stem, list);
  }
  for (const list of stems.values()) {
    if (list.length < 2) continue;
    for (const name of list) union(name, list[0]);
  }

  const groups = new Map();
  for (const skill of skills) {
    const root = find(skill.name);
    const list = groups.get(root) ?? [];
    list.push(skill);
    groups.set(root, list);
  }

  const aliases = buildPluginAliases(plugins);
  const assignments = new Map();
  for (const skill of skills) {
    const matched = matchPlugin(skill, contents.get(skill.name) ?? '', aliases);
    if (matched !== undefined) assignments.set(skill.name, matched);
  }

  const clusters = [];
  const skillGroup = new Map();
  for (const [root, members] of groups) {
    const votes = new Map();
    for (const member of members) {
      const pluginId = assignments.get(member.name);
      if (pluginId === undefined) continue;
      votes.set(pluginId, (votes.get(pluginId) ?? 0) + 1);
    }
    let pluginId;
    let best = 0;
    for (const [candidate, count] of votes) {
      if (count > best) {
        best = count;
        pluginId = candidate;
      }
    }
    const majority = pluginId !== undefined && best >= Math.ceil(members.length / 2);
    if (majority) {
      clusters.push({ kind: 'plugin', pluginId, skillIds: members.map((member) => member.name) });
      for (const member of members) {
        skillGroup.set(member.name, { groupId: pluginId, kind: 'plugin', pluginId });
      }
      continue;
    }
    if (members.length >= 2) {
      const stemCounts = new Map();
      for (const member of members) {
        const stem = member.name.split('-')[0];
        if (stem.length < 3) continue;
        stemCounts.set(stem, (stemCounts.get(stem) ?? 0) + 1);
      }
      let packKey = root;
      let bestCount = 0;
      for (const [stem, count] of stemCounts) {
        if (count > bestCount) {
          bestCount = count;
          packKey = stem;
        }
      }
      if (bestCount < 2) packKey = root;
      const rootSkill =
        members.find((member) => member.name === packKey) ??
        members.find((member) => member.name.startsWith(`${packKey}-`)) ??
        members[0];
      const packId = `pack:${packKey}`;
      const skillIds = members.map((member) => member.name);
      clusters.push({
        kind: 'pack',
        id: packId,
        title: titleCase(packKey),
        summary: firstSentence(rootSkill.description || contents.get(rootSkill.name) || ''),
        skillIds,
      });
      for (const member of members) {
        skillGroup.set(member.name, { groupId: packId, kind: 'pack' });
      }
      continue;
    }
    skillGroup.set(members[0].name, { groupId: null, kind: 'skill' });
  }

  return { clusters, skillGroup };
}

/** Build the plugin alias table used to attribute a skill to its owner. */
function buildPluginAliases(plugins) {
  const result = [];
  for (const plugin of plugins) {
    const base = plugin.name.replace(/^@[^/]+\//, '');
    const brand = base.replace(/^dsh-/, '').replace(/-(plugin|bundle)$/, '');
    const aliases = new Set([plugin.name, base, brand]);
    for (const row of plugin.rows) {
      const segment = row.split('/').pop() ?? '';
      if (segment.length >= 3 && !GENERIC_ALIASES.has(segment)) aliases.add(segment);
    }
    result.push({
      id: plugin.id,
      core: plugin.core === true,
      aliases: [...aliases].filter((alias) => alias.length >= 3 && !GENERIC_ALIASES.has(alias)),
    });
  }
  return result;
}

/** Score one skill against the plugin alias table and return the winner. */
function matchPlugin(skill, content, aliases) {
  const provider = String(skill.provider ?? '').toLowerCase();
  const filePath = String(skill.path ?? '').toLowerCase();
  const name = skill.name.toLowerCase();
  const haystack = `${skill.description ?? ''}\n${content}`.toLowerCase();
  let best = 0;
  let bestId;
  for (const plugin of aliases) {
    let score = 0;
    for (const alias of plugin.aliases) {
      const value = alias.toLowerCase();
      if (provider === value || provider.includes(value)) score = Math.max(score, 100);
      if (filePath.includes(`/${value}/`) || filePath.includes(`node_modules/${value}`)) score = Math.max(score, 80);
      if (plugin.core !== true) {
        if (name === value || name.startsWith(`${value}-`)) score = Math.max(score, 60);
        if (value.length >= 4 && wordTest(haystack, value)) score = Math.max(score, 30);
      }
    }
    if (score > best) {
      best = score;
      bestId = plugin.id;
    }
  }
  return best >= 30 ? bestId : undefined;
}

/* -------------------------------------------------------------------------- */
/* rules                                                                      */
/* -------------------------------------------------------------------------- */

/** Discover user, project, and managed rule files for one working directory. */
export async function discoverRules(cwd) {
  const home = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  const agentsHome = process.env.DSH_AGENTS_HOME || path.join(os.homedir(), '.agents');
  const projectRoot = await findProjectRoot(cwd);
  const files = new Map();

  const add = (filePath, scope, readOnly) => {
    const resolved = path.resolve(filePath);
    if (files.has(resolved)) return;
    files.set(resolved, { path: resolved, scope, readOnly });
  };

  add(path.join(home, 'AGENTS.md'), 'user', true);
  add(path.join(agentsHome, 'AGENTS.md'), 'user', true);

  for (const directory of ancestorChain(projectRoot, cwd)) {
    for (const name of ['AGENTS.md', 'CLAUDE.md', 'AGENTS.local.md', 'CLAUDE.local.md']) {
      add(path.join(directory, name), 'project', true);
    }
  }

  for (const directory of uniqueDirectories([projectRoot, cwd])) {
    add(path.join(directory, 'RULE.md'), 'project', false);
    for (const subdirectory of ['.dsh/rules', '.agents/rules', '.cursor/rules']) {
      const entries = await listRuleDirectory(path.join(directory, subdirectory));
      for (const entry of entries) add(entry, 'project', false);
    }
  }

  const rules = [];
  for (const file of files.values()) {
    if (rules.length >= MAX_RULE_FILES) break;
    const content = await readTextCapped(file.path, MAX_RULE_BYTES);
    if (content.trim() === '') continue;
    const parsed = parseFrontmatter(content);
    const firstHeading = /^#{1,6}\s+(.+)$/m.exec(parsed.body)?.[1];
    const title = cleanInline(parsed.data.name || firstHeading || path.basename(file.path, path.extname(file.path)));
    rules.push({
      id: file.path,
      path: file.path,
      scope: file.scope,
      readOnly: file.readOnly === true,
      title: clip(title, 120),
      description: cleanInline(parsed.data.description || firstSentence(parsed.body)),
      content: parsed.body,
      bytes: Buffer.byteLength(content, 'utf8'),
    });
  }

  rules.sort((left, right) => {
    if (left.scope !== right.scope) return left.scope === 'project' ? -1 : 1;
    if (left.readOnly !== right.readOnly) return left.readOnly ? 1 : -1;
    return left.title.localeCompare(right.title);
  });
  return rules;
}

async function findProjectRoot(cwd) {
  let directory = path.resolve(cwd);
  for (;;) {
    try {
      await fs.access(path.join(directory, '.git'));
      return directory;
    } catch {
      // Keep climbing.
    }
    const parent = path.dirname(directory);
    if (parent === directory) return path.resolve(cwd);
    directory = parent;
  }
}

function ancestorChain(projectRoot, cwd) {
  const resolvedCwd = path.resolve(cwd);
  const resolvedRoot = path.resolve(projectRoot);
  const chain = [];
  let directory = resolvedCwd;
  for (;;) {
    chain.unshift(directory);
    if (directory === resolvedRoot) break;
    const parent = path.dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  if (chain[0] !== resolvedRoot) chain.unshift(resolvedRoot);
  return chain;
}

function uniqueDirectories(values) {
  return [...new Set(values.map((value) => path.resolve(value)))];
}

async function listRuleDirectory(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!/\.(md|markdown|mdc)$/i.test(entry.name)) continue;
      files.push(path.join(directory, entry.name));
    }
    return files;
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------- */
/* small helpers                                                              */
/* -------------------------------------------------------------------------- */

/** First sentence, stripped of Markdown noise and capped. */
export function firstSentence(value, limit = 180) {
  const text = String(value ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#*_>`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text === '') return '';
  const match = /^(.{1,240}?[.!?。！？])(?:\s|$)/.exec(text);
  const sentence = match === null ? text : match[1];
  return clip(sentence, limit);
}

/** Parse a leading YAML frontmatter block, tolerating simple scalar values. */
export function parseFrontmatter(value) {
  const text = String(value ?? '');
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return { data: {}, body: text };
  const end = text.indexOf('\n---', 4);
  if (end === -1) return { data: {}, body: text };
  const raw = text.slice(4, end);
  const data = {};
  let section = '';
  for (const line of raw.split(/\r?\n/)) {
    const top = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (top !== null) {
      section = top[2] === '' ? top[1] : '';
      data[top[1]] = top[2].replace(/^['"]|['"]$/g, '').trim();
      continue;
    }
    const nested = /^\s+([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (nested === null || section === '') continue;
    if (typeof data[section] !== 'object' || data[section] === null) data[section] = {};
    data[section][nested[1]] = nested[2].replace(/^['"]|['"]$/g, '').trim();
  }
  return { data, body: text.slice(end + 4) };
}

export function clip(value, limit) {
  const text = String(value ?? '');
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}…`;
}

function cleanInline(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function titleCase(value) {
  const text = String(value ?? '').replace(/[-_]+/g, ' ').trim();
  return text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function localized(value, locale) {
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return '';
  const key = String(locale ?? 'en');
  return value[key] ?? value.zh ?? value.en ?? '';
}

function normalizeLocale(value) {
  const text = typeof value === 'string' ? value.toLowerCase() : '';
  if (text.startsWith('zh')) return 'zh';
  return 'en';
}

function wordTest(haystack, word) {
  let index = haystack.indexOf(word);
  while (index !== -1) {
    const before = index === 0 ? ' ' : haystack[index - 1];
    const after = index + word.length >= haystack.length ? ' ' : haystack[index + word.length];
    if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
    index = haystack.indexOf(word, index + 1);
  }
  return false;
}

function setDisabled(list, value, disabled) {
  const index = list.indexOf(value);
  if (disabled && index === -1) list.push(value);
  if (!disabled && index !== -1) list.splice(index, 1);
}

function escapeReminder(value) {
  return String(value ?? '').replace(/<\/?system-reminder>/gi, (tag) => tag.replace('<', '&lt;'));
}

async function readTextCapped(filePath, limit) {
  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile() || stat.size > limit) return '';
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function isRootAgent(ctx, agent) {
  try {
    return ctx.agents.roots().some((root) => String(root.id) === String(agent.id));
  } catch {
    return false;
  }
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function errorResponse(error) {
  const status = typeof error?.status === 'number' ? error.status : 500;
  return jsonResponse(status, { error: errorMessage(error) });
}

function jsonResponse(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}
