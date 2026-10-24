# Side Chat

Side Chat adds a small side conversation to the current DeepSeek Harness Session,
in the spirit of Claude Code's `/btw`: ask what the main agent is doing, why a
step failed, or just talk about something else, without adding anything to the
main conversation.


## What you get

- A **Side chat** pill below the composer.
- A floating panel that streams answers while you keep the main task running.
- A read-only snapshot of the Session: recent user and assistant messages, tool
  calls and results, the latest todo list, and whether a turn is running.
- Per-Session side threads in Host memory, so follow-up questions keep context.

The main Session is never written to: no user message, assistant message, tool
call, or token enters its log or its next model request.

## Use it

1. Open a Session and find **Side chat** below the composer.
2. Ask about progress (`Where does it stand now?`), a failure (`Why did that
   last step fail?`), or anything unrelated.
3. Press Enter to send, Shift+Enter for a new line. Stop a long answer, retry a
   failed one, or clear the side thread.

The panel is available in every live Session. It uses the Session's current
model; before the first model request it falls back to the profile default.

## What it can and cannot do

- It can read the snapshot described above and answer from it.
- It cannot run tools, edit files, or change the main Session. If you ask it to
  do work, it will point you back to the main assistant.
- Side-chat turns are deliberately ephemeral: they are not written to the
  Session log, cannot be replayed from it, and are cleared when the Host
  restarts. Reloading the page clears the visible thread only.

## Privacy

The snapshot is sent to the model provider configured for the Session, under the
same account and provider route the main conversation uses. It is bounded to the
most recent events; older entries are dropped first. No files are uploaded and no
tool is executed by Side Chat.

## Requirements

- DeepSeek Harness `>=0.2.1-rc.3 <0.3.0`.
- The Web UI (the panel uses the composer dock and the frame overlay).
- A mounted `llm` provider and the `connection`, `sessions` services, all present
  in the shipped Web profile.

## Install

```sh
dsh plugin --profile web add <package name>
```

The package is plain JavaScript with no build step; a Git install works too:

```sh
dsh plugin --profile web add github:<owner>/<repo>#<commit>
```

After installation, refresh the Web UI if the pill is not visible yet.
