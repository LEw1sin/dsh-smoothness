# dsh-smoothness

Two small, focused plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`) that make long agent sessions easier to follow:

| Plugin | What it does |
|---|---|
| **dsh-btw** (旁聊 / Side Chat) | A side conversation about the current Session. Ask about progress, errors, or next steps — or just chat — without writing anything into the main conversation. |
| **dsh-assets** (资产 / Assets) | A session-scoped browser for installed skills, rules, and plugins. Every asset gets a one-line summary and a switch; plugin-owned skills are grouped under their plugin and listed on hover. |

Both plugins are plain JavaScript, install from GitHub with no build step, and only add UI/context to the **Web** profile.

## Install

Requirements:

- DeepSeek Harness `>=0.2.1-rc.3 <0.3.0`
- the Web profile (`dsh web`)
- npm/pnpm available to `dsh plugin`

Install both from this repository with the GitHub subdirectory form:

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-btw"
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-assets"
```

Or install only one of them. The commands use pnpm's `path:` selector, so no root package is required.

After installation, restart the Web host (or let the running profile reload), then refresh the page. A `旁聊` / `Side chat` button and an `资产` / `Assets` button appear below the composer, in that order.

To pin a commit:

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#<commit>&path:/dsh-btw"
```

Uninstall:

```sh
dsh plugin --profile web remove @lew1sin/dsh-btw
dsh plugin --profile web remove @lew1sin/dsh-assets
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

- Tabs for **Plugins**, **Skills**, and **Rules** with one-sentence summaries.
- DSH's built-in agent presets, plugins, skills, and rules are collected under one collapsible **DSH presets** folder; clicking it reveals what ships with DeepSeek Harness. It starts collapsed and sits after your own assets.
- Your own plugins, skill packs, and skills are listed directly, including preset-scoped user skills such as Moli and Agent Reach.
- Skills are grouped by owning plugin, by `../skill` references, or by shared name prefix; a plugin-like collection such as HyperFrames becomes one card with its bundled skills on hover.
- Every row has a session-scoped switch. Disabled skills disappear from that Session's model catalog; disabled rule files stop being injected into its system-prompt context; disabling a plugin disables its attributed skills.
- `AGENTS.md` / `CLAUDE.md` are shown as DSH-managed and read-only, so they are never double-injected.
- Per-Session state lives under `$DSH_HOME/storages/dsh-assets/state.json`; it is policy, not profile configuration.

See [dsh-assets/README.md](dsh-assets/README.md) for details and limits.

## Repository layout

```text
dsh-smoothness/
├── dsh-btw/       # Side Chat bundle (Host + Web client)
└── dsh-assets/    # Assets bundle (Host + Web client)
```

Each directory is a complete `dsh.bundle` package with its own `cordis.patch.yml`, locale files, and icon. There is no root runtime package.

## Discovery

Use the [`dsh-plugin`](https://github.com/topics/dsh-plugin) topic for discovery — the convention recommended by the DeepSeek Harness README and CONTRIBUTING guide. Add it under **About → Topics** on this repository.

## License

MIT. See [LICENSE](LICENSE).
