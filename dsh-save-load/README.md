# Save / Load (存档 / 读档)

A DSH bundle that turns a long Session into a handoff manual and continues the
work in a fresh Session.

## What it does

- Adds **Archive / Load** (`存档 / 读档`) to the `/` command menu.
- **Archive**: summarizes the live Session into a handoff manual covering what
  is done, what remains, pitfalls, cautions, user preferences, key files, and
  commands. A floating status window reports progress. The manual is stored
  under `$DSH_HOME/storages/dsh-save-load/archives/`. Repeated clicks share one
  in-flight request; an unchanged Session reuses its archive, and a later save
  with new events updates that same archive rather than creating duplicates.
- **Load**: opens a new Session with the selected handoff placed in the
  composer. Press Enter in the new Session to start the relay.
- The archive is plain JSON, local to the Host, and never written into the
  source Session log.

## Install

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-save-load"
```

Restart the Web host, then refresh the page. Requires DeepSeek Harness
`>=0.2.1-rc.3 <0.3.0`.

## Layout

| File | Role |
|---|---|
| `index.js` | Host half: authenticated list/save/load routes, transcript snapshot, model summary, local archive storage. |
| `client.js` | Browser half: `/` command contribution, Save / Load popup, locale dictionaries. |
| `cordis.patch.yml` | Inserts the `dsh-save-load` Host row. |
| `locale/*.json` | Plugin Manager title and description. |

## Limits

- Archiving calls the Session's current model (or the profile default); a
  session without a model or transcript cannot be archived.
- Load prefills a new Session's composer rather than submitting immediately, so
  the user can review the handoff before the new agent starts.
- Archives are process-independent files, but they are not encrypted; treat the
  archive directory as private user data.
