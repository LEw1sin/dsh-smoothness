# Side Chat (旁聊)

A DSH bundle that adds a read-only side conversation to the current Session, in
the spirit of Claude Code's `/btw`.

## What it does

- Adds a **旁聊 / Side chat** pill below the composer.
- Opens a floating panel where you can ask about the current Session's progress,
  errors, or next steps — or just chat about something else.
- The Host snapshots the live Session log (recent user/assistant messages, tool
  calls and results, turn state) and asks the configured model with that snapshot
  as read-only context.
- Answers stream into the panel. Nothing is appended to the Session log, so the
  main conversation and its next model request are untouched.
- Recent side-chat turns are remembered per Session in Host memory (the latest
  four), so follow-up questions keep their thread. Restarting the Host clears
  them; reloading the page clears only the visible thread.

## Install

```sh
dsh plugin --profile web add "github:LEw1sin/dsh-smoothness#path:/dsh-btw"
```

Restart the Web host, then refresh the page. Requires DeepSeek Harness
`>=0.2.1-rc.3 <0.3.0`.

## Layout

| File | Role |
|---|---|
| `index.js` | Host half: authenticated `POST /api/dsh-btw.ask` Fetch route, Session snapshot, model call, NDJSON stream. |
| `client.js` | Browser half: composer-dock launcher, `shell.overlay` panel, locale dictionaries, in-page side threads. |
| `cordis.patch.yml` | Inserts the `dsh-btw` Host row. |
| `locale/*.json` | Plugin Manager title and description. |

## Notes and limits

- The side-chat calls are intentionally ephemeral: they are not written to the
  Session log, so they cannot be replayed from it.
- The model cannot act for the main agent: no tools, no file access, no Session
  writes. It can only read the snapshot.
- The snapshot is bounded to the most recent events; older turns are dropped
  first. The panel shows the model's answer, not the raw snapshot.
- The default model is the Session's current model; before the Session's first
  request it falls back to the profile's default model.
