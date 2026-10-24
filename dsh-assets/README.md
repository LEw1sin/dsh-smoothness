# Assets (资产)

A session-scoped asset browser for DeepSeek Harness. It sits to the right of
**Side chat** below the composer and lists installed **plugins**, their bundled
**skills**, standalone **skills**, and **rules**. Every asset has a one-line
summary and a switch; a switch that is on enables that asset for the current
Session.

## What it shows

- **Skills** — two sections. **用户技能包** holds user projects discovered from
  their skills (Agent Reach, Moli, HyperFrames, IndexTTS, and future installs);
  **DSH预设** holds every other skill. Both list all skills whether or not the
  current Session enables them. Hovering a pack lists its skills; each skill
  has its own switch and state.
- **Rules** — `AGENTS.md` / `CLAUDE.md`, `RULE.md`, and `.dsh/rules`,
  `.agents/rules`, `.cursor/rules` files. `AGENTS.md` / `CLAUDE.md` are owned by
  DSH's workspace-instructions layer and shown read-only; extra rule files are
  switchable.

## Install

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-assets"
```

Restart the Web host, then refresh the page. Requires DeepSeek Harness
`>=0.2.1-rc.3 <0.3.0`.

## What a switch does

- **Skill off** — the skill is removed from the Session's model-facing skill
  catalog and the `skill` tool refuses it. The Session's own scope is filtered,
  so other Sessions are unaffected.
- **Plugin off** — all skills attributed to that plugin are off for this
  Session. Hover the plugin to see exactly which skills that affects.
- **Rule off** — the rule file is no longer injected into the Session's system
  prompt context. This takes effect on the next model step.
- **All on** — clears every per-Session exclusion.

Toggles are stored per Session under `$DSH_HOME/storages/dsh-assets/state.json`.
They are session policy, not profile configuration: the plugin itself stays
installed globally.

## Grouping

User-installed projects are discovered from skill provenance: frontmatter `metadata.homepage` / `repository` / `project` / `version`, a repository URL that matches a skill prefix, a non-generic prefix shared by at least two skills, and cross-skill `../<skill>/` references. No project list is compiled into the plugin. A project version or type is shown only when the project declares it in metadata. Their skills form project skill packs; **every other skill is DSH-provided** and forms one **DSH presets** skill pack, enabled or not. The Skills tab lists the user packs under **用户技能包** and the DSH pack under **DSH预设**. Within each pack, skills keep their individual switches.

1. A skill whose provider or file path names an installed plugin.
2. A skill whose name or description matches the plugin's brand.
3. Skills that reference each other through `../<skill>/` paths (for example,
   the HyperFrames skills all reference the `hyperframes` skill).
4. A shared first name segment (`moli-*`, `office-*`) when at least two skills
   share it.

A cluster of two or more skills without an owning plugin is shown as a **skill
pack**, so a plugin-like collection such as HyperFrames still gets one card with
all of its skills.

## Requirements and limits

- DeepSeek Harness `>=0.2.1-rc.3 <0.3.0`, Web UI.
- `connection`, `sessions`, `skills`, `pluginManager`, `systemPrompt`, and
  `agents` must be mounted (the shipped Web profile has them).
- The catalog lists **global** skills; skills registered only inside an agent
  preset are not listed.
- A plugin with no skills or rules has no switchable session asset; its switch
  is disabled.
- Rule content is injected as system-prompt context, capped at 24,000
  characters; very large rule files are skipped.
- The per-Session policy lives outside the Session log, so replaying a log does
  not restore it.
