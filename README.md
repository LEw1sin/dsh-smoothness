# dsh-smoothness

Three small, focused plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that make long agent sessions easier to follow:

| Plugin | What it does |
|---|---|
| **dsh-btw** (旁聊 / Side Chat) | A side conversation about the current Session. Ask about progress, errors, or next steps — or just chat — without writing anything into the main conversation. |
| **dsh-assets** (资产 / Assets) | A session-scoped browser for installed skills and rules. Every asset gets a one-line summary and a switch; user projects and DSH presets are separate skill packs. |
| **dsh-save-load** (存档 / 读档) | A `/` command that archives a long Session as a handoff manual, then loads a saved manual into a fresh Session. |

All three plugins are plain JavaScript, install from GitHub with no build step, and only add UI/context to the **Web** profile. Their UI ships in native English and Chinese.

## Install

Requirements:

- DeepSeek Harness `>=0.2.1-rc.3 <0.3.0`
- the Web profile (`dsh web`)
- npm/pnpm available to `dsh plugin`

Install all three from this repository with the GitHub subdirectory form:

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-btw"
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-assets"
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-save-load"
```

Or install a subset of them. The commands use pnpm's `path:` selector, so no root package is required.

After installation, restart the Web host (or let the running profile reload), then refresh the page. A `旁聊` / `Side chat` button and an `资产` / `Assets` button appear below the composer, and `存档 / 读档` (`Archive / Load`) appears in the `/` command menu.

To pin a commit:

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#<commit>&path:/dsh-btw"
```

Uninstall:

```sh
dsh plugin --profile web remove @lew1sin/dsh-btw
dsh plugin --profile web remove @lew1sin/dsh-assets
dsh plugin --profile web remove @lew1sin/dsh-save-load
```

Do not install the same plugin from both a local checkout and this repository in one profile: both copies declare the same loader row and the profile will refuse to compose.

## dsh-btw — Side Chat

- A floating side-chat panel, opened from the composer dock.
- The Host snapshots the current live Session (recent messages, tool calls/results, todo list, turn state) and answers with the Session's current model.
- Answers stream; side threads are kept per Session in Host memory.
- Nothing is appended to the Session log: the main conversation and its next request are untouched.
- The model is read-only: no tools, no file edits, no Session writes.

See [dsh-btw/README.md](dsh-btw/README.md) for details and limits.

## dsh-assets — Assets

- Two tabs: **Skills** and **Rules**. DSH already has its own plugin inventory, so Assets does not duplicate plugin rows.
- **Skills** has two sections: **用户技能包** (user-installed projects such as Agent Reach, Moli, HyperFrames, IndexTTS, and wallstreet-explainer) and **DSH预设** (every other skill). A skill counts as user-installed when Codex's registry (`~/.cursor/skills`) symlinks it or when its own provenance (metadata, repository URL, shared prefix, cross-references) identifies it, so plain local skills like wallstreet-explainer appear without any metadata. Skill packs start collapsed; click a pack to reveal its child skills. Both sections list skills whether or not this Session has them enabled, and each skill shows its current state.
- The **用户技能包** header carries **Update** and **Update log** buttons. Update pulls the latest commit from each skill's official GitHub repository; when a local skill has local modifications (or diverged history) the panel opens a conflict dialog offering **keep local**, **take the official remote**, or **stash then update**. Skills with no declared origin are matched through the bundled `find-skills` skill (GitHub repository search by name), and the update history is recorded under `$DSH_HOME/storages/dsh-assets/update-log.json`.
- Your own projects are discovered dynamically from the installed skills: explicit `metadata.homepage` / `repository` / `project` / `version` frontmatter, a repository URL matching a skill's prefix, a non-generic prefix shared by at least two skills, or cross-skill `../<skill>` references. No project list is compiled into the plugin, so a new project install appears after the catalog refreshes; versions and types appear only when the project declares them in metadata.
- Every skill row has a session-scoped switch. Disabled skills disappear from that Session's model catalog; disabled rule files stop being injected into its system-prompt context.
- `AGENTS.md` / `CLAUDE.md` are shown as DSH-managed and read-only, so they are never double-injected.
- Per-Session state lives under `$DSH_HOME/storages/dsh-assets/state.json`; it is policy, not profile configuration.

See [dsh-assets/README.md](dsh-assets/README.md) for details and limits.

## dsh-save-load — Save / Load

- Adds **Archive / Load** (`存档 / 读档`) to the `/` command menu.
- **Archive** summarizes the live Session into a handoff manual: completed work, unfinished work and next steps, pitfalls, cautions, user preferences, key files, and current state. A floating status window reports progress. Repeated clicks share one in-flight archive; one unchanged Session reuses its existing archive, and a later save with new events updates that same archive instead of creating a duplicate.
- **Load** opens a new Session with the selected handoff already in the composer; press Enter to start the relay.
- Archives are local JSON files under `$DSH_HOME/storages/dsh-save-load/archives/`. The source Session log is never modified.

See [dsh-save-load/README.md](dsh-save-load/README.md) for details and limits.

## Repository layout

```text
dsh-smoothness/
├── dsh-btw/        # Side Chat bundle (Host + Web client)
├── dsh-assets/     # Assets bundle (Host + Web client)
└── dsh-save-load/  # Save / Load bundle (Host + Web client)
```

Each directory is a complete `dsh.bundle` package with its own `cordis.patch.yml`, locale files, and icon. There is no root runtime package.

## Discovery

Use the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic for discovery — the convention recommended by the DeepSeek Harness README and CONTRIBUTING guide. Add it under **About → Topics** on this repository.

## License

MIT. See [LICENSE](LICENSE).
