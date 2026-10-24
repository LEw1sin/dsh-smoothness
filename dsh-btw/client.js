/**
 * Side Chat (旁聊) — browser half.
 *
 * A small floating panel plus a composer-dock launcher. It posts questions to
 * this package's authenticated Host route and renders the streamed answer. The
 * side thread lives only in this page; it is never inserted into the main
 * conversation.
 */
window.__ModuleLoader__.load({
  id: '@lew1sin/dsh-btw',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-btw';
    const ROUTE = 'api/dsh-btw.ask';

    const zh = {
      'launcher.label': '旁聊',
      'launcher.hint': '就当前会话旁聊提问，不写入主会话',
      'panel.title': '旁聊',
      'panel.subtitle': '只读 · 不写入主会话',
      'panel.close': '关闭旁聊',
      'panel.clear': '清空这段旁聊',
      'empty.title': '想了解什么？',
      'empty.body': '我能看到主会话最近的工作记录。可以问进度、报错、下一步，也可以随便聊点别的。主会话不会被打扰。',
      'suggest.progress': '现在进展到哪了？',
      'suggest.recent': '刚才那步为什么失败？',
      'suggest.chat': '陪我聊点别的',
      'composer.placeholder': '问进度，或者聊点别的…',
      'composer.send': '发送',
      'composer.stop': '停止生成',
      'composer.hint': 'Enter 发送 · Shift+Enter 换行 · 仅旁聊可见',
      'thread.stopped': '已停止',
      'thread.retry': '重试',
      'thread.thinking': '正在读取会话…',
      'thread.empty': '（模型没有返回内容）',
    };

    const en = {
      'launcher.label': 'Side chat',
      'launcher.hint': 'Ask about this session without touching the main conversation',
      'panel.title': 'Side chat',
      'panel.subtitle': 'Read-only · not saved to the main chat',
      'panel.close': 'Close side chat',
      'panel.clear': 'Clear this side chat',
      'empty.title': 'What would you like to know?',
      'empty.body': 'I can see the recent work in this session. Ask about progress, errors, or next steps — or just chat about something else. The main conversation stays untouched.',
      'suggest.progress': 'Where does it stand now?',
      'suggest.recent': 'Why did that last step fail?',
      'suggest.chat': 'Let’s talk about something else',
      'composer.placeholder': 'Ask about progress, or just chat…',
      'composer.send': 'Send',
      'composer.stop': 'Stop generating',
      'composer.hint': 'Enter to send · Shift+Enter for a new line · side chat only',
      'thread.stopped': 'Stopped',
      'thread.retry': 'Retry',
      'thread.thinking': 'Reading the session…',
      'thread.empty': '(The model returned no text.)',
    };

    const SUGGESTIONS = ['suggest.progress', 'suggest.recent', 'suggest.chat'];

    const CSS = `
.dshbtw-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 22px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}
.dshbtw-trigger:hover {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dshbtw-trigger[data-open='true'] {
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
}
.dshbtw-trigger-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.dshbtw-panel {
  position: fixed;
  right: 20px;
  bottom: 118px;
  width: 384px;
  max-width: calc(100vw - 32px);
  height: min(560px, calc(100vh - 170px));
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  overflow: hidden;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 16px;
  box-shadow: 0 18px 48px color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent);
  font-family: inherit;
  animation: dshbtw-rise 170ms ease-out;
}
@keyframes dshbtw-rise {
  from { opacity: 0; transform: translateY(10px) scale(0.985); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dshbtw-panel { animation: none; }
}
@media (max-width: 720px) {
  .dshbtw-panel {
    right: 8px;
    left: 8px;
    width: auto;
    bottom: 96px;
    height: min(520px, calc(100vh - 140px));
  }
}
.dshbtw-head {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 11px 10px 10px 13px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.dshbtw-mark {
  width: 27px;
  height: 27px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 9px;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent);
}
.dshbtw-heading {
  min-width: 0;
}
.dshbtw-title {
  font-size: 13px;
  font-weight: 600;
  line-height: 1.25;
}
.dshbtw-sub {
  margin-top: 1px;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshbtw-actions {
  display: flex;
  gap: 2px;
  margin-left: auto;
}
.dshbtw-iconbtn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dshbtw-iconbtn:hover:not(:disabled) {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dshbtw-iconbtn:disabled {
  opacity: 0.4;
  cursor: default;
}
.dshbtw-thread {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  overflow-y: auto;
  scrollbar-width: thin;
}
.dshbtw-empty {
  margin: auto;
  padding: 18px 10px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
}
.dshbtw-empty > svg {
  color: var(--dsw-alias-brand-primary);
  opacity: 0.85;
}
.dshbtw-empty h4 {
  margin: 10px 0 6px;
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  font-weight: 600;
}
.dshbtw-empty p {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
}
.dshbtw-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  margin-top: 14px;
}
.dshbtw-chip {
  padding: 5px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 11px;
  cursor: pointer;
}
.dshbtw-chip:hover {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.dshbtw-msg {
  max-width: 88%;
  padding: 8px 10px;
  border-radius: 12px;
  font-size: 12.5px;
  line-height: 1.62;
  word-break: break-word;
  white-space: pre-wrap;
}
.dshbtw-msg.user {
  align-self: flex-end;
  border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 22%, transparent);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
}
.dshbtw-msg.assistant {
  align-self: flex-start;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.dshbtw-msg.error {
  border-color: var(--dsw-alias-state-error-primary);
}
.dshbtw-text pre {
  margin: 6px 0;
  padding: 8px;
  overflow-x: auto;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 8px;
  background: var(--dsw-alias-bg-layer-2);
  font-size: 11.5px;
  white-space: pre;
}
.dshbtw-text code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11.5px;
}
.dshbtw-msg-error {
  margin-top: 4px;
  color: var(--dsw-alias-state-error-primary);
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.dshbtw-msg-note {
  margin-top: 4px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}
.dshbtw-retry {
  margin-top: 6px;
  padding: 3px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dshbtw-retry:hover {
  background: var(--dsw-alias-bg-layer-2);
}
.dshbtw-dots {
  display: inline-flex;
  gap: 3px;
  align-items: center;
  height: 13px;
}
.dshbtw-dots i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--dsw-alias-label-secondary);
  animation: dshbtw-bounce 1.1s infinite ease-in-out;
}
.dshbtw-dots i:nth-child(2) { animation-delay: 0.14s; }
.dshbtw-dots i:nth-child(3) { animation-delay: 0.28s; }
@keyframes dshbtw-bounce {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
.dshbtw-compose {
  padding: 9px 10px 8px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.dshbtw-inputwrap {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 5px 5px 5px 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-base);
}
.dshbtw-inputwrap:focus-within {
  border-color: var(--dsw-alias-border-l2);
}
.dshbtw-input {
  flex: 1;
  min-height: 28px;
  max-height: 120px;
  padding: 5px 0;
  border: none;
  outline: none;
  resize: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12.5px;
  line-height: 1.5;
}
.dshbtw-input::placeholder {
  color: var(--dsw-alias-label-secondary);
}
.dshbtw-send {
  width: 28px;
  height: 28px;
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-brand-primary);
  cursor: pointer;
}
.dshbtw-send:hover:not(:disabled) {
  border-color: var(--dsw-alias-brand-primary);
}
.dshbtw-send:disabled {
  opacity: 0.45;
  cursor: default;
}
.dshbtw-stop {
  color: var(--dsw-alias-state-error-primary);
}
.dshbtw-hint {
  margin-top: 6px;
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
  text-align: center;
}
`;

    const EMPTY_THREAD = Object.freeze({ messages: Object.freeze([]), busy: false });

    /* ------------------------------------------------------------------ */
    /* store                                                              */
    /* ------------------------------------------------------------------ */

    function createStore() {
      let state = { open: false, sessionId: null, threads: {} };
      const listeners = new Set();
      const controllers = new Map();

      const notify = () => {
        for (const listener of Array.from(listeners)) {
          try {
            listener();
          } catch {
            // One broken subscriber must not stop the others.
          }
        }
      };
      const commit = (next) => {
        state = next;
        notify();
      };
      const threadOf = (sid) => state.threads[String(sid)] ?? EMPTY_THREAD;
      const updateThread = (sid, mutate) => {
        const key = String(sid);
        const current = threadOf(key);
        const next = mutate(current);
        if (next === current) return;
        commit({ ...state, threads: { ...state.threads, [key]: next } });
      };

      const finishLast = (sid, patch) => {
        updateThread(sid, (current) => {
          if (current.messages.length === 0) return current;
          const messages = current.messages.slice();
          const last = messages[messages.length - 1];
          if (last.role !== 'assistant') return current;
          if (last.status !== 'streaming' && patch.status === 'done') return current;
          messages[messages.length - 1] = { ...last, ...patch };
          return { ...current, messages };
        });
      };

      const appendDelta = (sid, text) => {
        updateThread(sid, (current) => {
          if (current.messages.length === 0) return current;
          const messages = current.messages.slice();
          const last = messages[messages.length - 1];
          if (last.role !== 'assistant') return current;
          messages[messages.length - 1] = { ...last, text: last.text + text };
          return { ...current, messages };
        });
      };

      const applyEvent = (sid, event) => {
        if (event === null || typeof event !== 'object') return;
        if (event.type === 'delta' && typeof event.text === 'string') {
          appendDelta(sid, event.text);
        } else if (event.type === 'done') {
          finishLast(sid, { status: 'done' });
        } else if (event.type === 'aborted') {
          finishLast(sid, { status: 'stopped' });
        } else if (event.type === 'error') {
          finishLast(sid, {
            status: 'error',
            error: typeof event.message === 'string' && event.message !== '' ? event.message : 'unknown error',
          });
        }
      };

      const send = async (sid, rawQuestion) => {
        const key = String(sid ?? '');
        const question = String(rawQuestion ?? '').trim();
        if (key === '' || question === '' || threadOf(key).busy) return;

        updateThread(key, (current) => ({
          ...current,
          busy: true,
          messages: [
            ...current.messages,
            { role: 'user', text: question },
            { role: 'assistant', text: '', status: 'streaming', error: null },
          ],
        }));

        const controller = new AbortController();
        controllers.set(key, controller);

        try {
          const response = await fetch(ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sessionId: key, question }),
            signal: controller.signal,
          });
          if (!response.ok) {
            throw new Error(await readErrorDetail(response));
          }
          await readNdjson(response, (event) => applyEvent(key, event));
        } catch (error) {
          if (controller.signal.aborted) {
            finishLast(key, { status: 'stopped' });
          } else {
            finishLast(key, {
              status: 'error',
              error: error instanceof Error ? error.message : String(error),
            });
          }
        } finally {
          controllers.delete(key);
          finishLast(key, { status: 'done' });
          updateThread(key, (current) => (current.busy ? { ...current, busy: false } : current));
        }
      };

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        setSession(sid) {
          const key = sid === null || sid === undefined ? null : String(sid);
          if (state.sessionId === key) return;
          commit({ ...state, sessionId: key });
        },
        toggle(sid) {
          const key = String(sid);
          if (state.open && state.sessionId === key) commit({ ...state, open: false });
          else commit({ ...state, open: true, sessionId: key });
        },
        close() {
          if (!state.open) return;
          commit({ ...state, open: false });
        },
        open(sid) {
          commit({ ...state, open: true, sessionId: String(sid) });
        },
        send,
        stop(sid) {
          controllers.get(String(sid))?.abort();
        },
        clear(sid) {
          const key = String(sid);
          controllers.get(key)?.abort();
          controllers.delete(key);
          const threads = { ...state.threads };
          delete threads[key];
          commit({ ...state, threads });
          void fetch(ROUTE, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sessionId: key, reset: true }),
          }).catch(() => {
            // The local thread is already cleared; forgetting Host memory is best effort.
          });
        },
        retry(sid) {
          const key = String(sid);
          const current = threadOf(key);
          if (current.busy) return;
          const messages = current.messages.slice();
          while (messages.length > 0 && messages[messages.length - 1].role === 'assistant') messages.pop();
          const last = messages[messages.length - 1];
          if (last === undefined || last.role !== 'user') return;
          messages.pop();
          updateThread(key, () => ({ messages, busy: false }));
          void send(key, last.text);
        },
        dispose() {
          for (const controller of controllers.values()) controller.abort();
          controllers.clear();
          listeners.clear();
        },
      };
    }

    const store = createStore();

    function useStore() {
      const [value, setValue] = React.useState(store.get());
      React.useEffect(() => {
        const unsubscribe = store.subscribe(() => setValue(store.get()));
        setValue(store.get());
        return unsubscribe;
      }, []);
      return value;
    }

    /* ------------------------------------------------------------------ */
    /* wire helpers                                                       */
    /* ------------------------------------------------------------------ */

    async function readNdjson(response, onEvent) {
      if (response.body === null) return;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf('\n');
          while (newline !== -1) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            if (line !== '') {
              try {
                onEvent(JSON.parse(line));
              } catch {
                // A malformed line is skipped; the stream keeps flowing.
              }
            }
            newline = buffer.indexOf('\n');
          }
        }
        const tail = buffer.trim();
        if (tail !== '') {
          try {
            onEvent(JSON.parse(tail));
          } catch {
            // Ignore an incomplete tail.
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // The stream was already cancelled.
        }
      }
    }

    async function readErrorDetail(response) {
      const text = await response.text().catch(() => '');
      if (text === '') return `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(text);
        const message = parsed?.error ?? parsed?.message;
        if (typeof message === 'string' && message !== '') return message;
      } catch {
        // Plain text detail.
      }
      return text;
    }

    /* ------------------------------------------------------------------ */
    /* view helpers                                                       */
    /* ------------------------------------------------------------------ */

    function tr(t, key) {
      try {
        const value = typeof t === 'function' ? t(key) : undefined;
        if (typeof value === 'string' && value !== key) return value;
      } catch {
        // Fall back to the English copy.
      }
      return en[key] ?? key;
    }

    function icon(name, size) {
      const common = {
        viewBox: '0 0 24 24',
        width: size,
        height: size,
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.7,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        'aria-hidden': true,
        focusable: false,
      };
      if (name === 'send') {
        return h('svg', common, h('path', { d: 'M4.5 11.6 20 4l-6.2 16-2.5-6.6L4.5 11.6Z' }));
      }
      if (name === 'stop') {
        return h('svg', common, h('rect', { x: 7, y: 7, width: 10, height: 10, rx: 2, fill: 'currentColor', stroke: 'none' }));
      }
      if (name === 'x') {
        return h('svg', common, h('path', { d: 'M6 6l12 12M18 6 6 18' }));
      }
      if (name === 'trash') {
        return h(
          'svg',
          common,
          h('path', { d: 'M4 7h16M9 7V5h6v2M6.5 7l.8 12h9.4l.8-12M10 11v4M14 11v4' }),
        );
      }
      return h(
        'svg',
        common,
        h('path', { d: 'M20.5 11.4a8 8 0 0 1-8.2 7.9 9.5 9.5 0 0 1-3.6-.7L3.5 20l1.3-3.7a7.6 7.6 0 0 1-1.1-3.9 8 8 0 0 1 8.2-7.9 8 8 0 0 1 8.6 6.9Z' }),
        h('path', { d: 'M11.8 8.2l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z' }),
      );
    }

    function renderRichText(text) {
      const value = String(text ?? '');
      if (value === '') return null;
      const segments = value.split('```');
      if (segments.length === 1) return value;
      return segments.map((segment, index) => {
        if (index % 2 === 1) {
          const code = segment.replace(/^[a-zA-Z0-9_+-]*\n/, '');
          return h('pre', { key: `code-${index}` }, h('code', null, code));
        }
        return segment === '' ? null : h('span', { key: `text-${index}` }, segment);
      });
    }

    /* ------------------------------------------------------------------ */
    /* launcher                                                           */
    /* ------------------------------------------------------------------ */

    function BtwLauncher(props) {
      const t = props.t;
      const sessionId = props.sessionId;
      const state = useStore();
      React.useEffect(() => {
        if (sessionId !== undefined && sessionId !== null) store.setSession(sessionId);
      }, [sessionId]);
      const open = state.open && state.sessionId === String(sessionId);
      return h(
        'button',
        {
          type: 'button',
          className: 'dshbtw-trigger',
          'data-open': open ? 'true' : 'false',
          'aria-expanded': open,
          'aria-label': tr(t, 'launcher.label'),
          title: tr(t, 'launcher.hint'),
          onClick: () => store.toggle(sessionId),
        },
        icon('spark', 13),
        h('span', { className: 'dshbtw-trigger-label' }, tr(t, 'launcher.label')),
        open ? h('i', { className: 'dshbtw-trigger-dot' }) : null,
      );
    }

    /* ------------------------------------------------------------------ */
    /* panel                                                              */
    /* ------------------------------------------------------------------ */

    function BtwPanel(props) {
      const t = props.t;
      const state = useStore();
      if (!state.open || state.sessionId === null) return null;
      return h(BtwPanelView, { t, sessionId: state.sessionId });
    }

    function BtwPanelView({ t, sessionId }) {
      const state = useStore();
      const thread = state.threads[String(sessionId)] ?? EMPTY_THREAD;
      const [draft, setDraft] = React.useState('');
      const inputRef = React.useRef(null);
      const scrollRef = React.useRef(null);
      const lastMessage = thread.messages[thread.messages.length - 1];

      React.useEffect(() => {
        setDraft('');
        const timer = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(timer);
      }, [sessionId]);

      React.useEffect(() => {
        const node = scrollRef.current;
        if (node !== null) node.scrollTop = node.scrollHeight;
      }, [thread.messages.length, lastMessage?.text, thread.busy]);

      const submit = () => {
        const value = draft.trim();
        if (value === '' || thread.busy) return;
        setDraft('');
        if (inputRef.current !== null) inputRef.current.style.height = 'auto';
        void store.send(sessionId, value);
      };

      const onChange = (event) => {
        setDraft(event.target.value);
        const node = event.currentTarget;
        node.style.height = 'auto';
        node.style.height = `${Math.min(node.scrollHeight, 120)}px`;
      };

      const onKeyDown = (event) => {
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
          event.preventDefault();
          submit();
        }
      };

      const onPanelKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          store.close();
        }
      };

      const header = h(
        'div',
        { className: 'dshbtw-head' },
        h('div', { className: 'dshbtw-mark' }, icon('spark', 15)),
        h(
          'div',
          { className: 'dshbtw-heading' },
          h('div', { className: 'dshbtw-title' }, tr(t, 'panel.title')),
          h('div', { className: 'dshbtw-sub' }, tr(t, 'panel.subtitle')),
        ),
        h(
          'div',
          { className: 'dshbtw-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'dshbtw-iconbtn',
              title: tr(t, 'panel.clear'),
              'aria-label': tr(t, 'panel.clear'),
              disabled: thread.messages.length === 0 && !thread.busy,
              onClick: () => store.clear(sessionId),
            },
            icon('trash', 14),
          ),
          h(
            'button',
            {
              type: 'button',
              className: 'dshbtw-iconbtn',
              title: tr(t, 'panel.close'),
              'aria-label': tr(t, 'panel.close'),
              onClick: () => store.close(),
            },
            icon('x', 15),
          ),
        ),
      );

      const empty =
        thread.messages.length === 0
          ? h(
              'div',
              { className: 'dshbtw-empty' },
              icon('spark', 26),
              h('h4', null, tr(t, 'empty.title')),
              h('p', null, tr(t, 'empty.body')),
              h(
                'div',
                { className: 'dshbtw-chips' },
                SUGGESTIONS.map((key) =>
                  h(
                    'button',
                    {
                      key,
                      type: 'button',
                      className: 'dshbtw-chip',
                      onClick: () => void store.send(sessionId, tr(t, key)),
                    },
                    tr(t, key),
                  ),
                ),
              ),
            )
          : thread.messages.map((message, index) => {
              const isUser = message.role === 'user';
              const isError = message.status === 'error';
              const streaming = message.status === 'streaming';
              return h(
                'div',
                {
                  key: `${message.role}-${index}`,
                  className: `dshbtw-msg ${isUser ? 'user' : 'assistant'}${isError ? ' error' : ''}`,
                  'data-role': message.role,
                },
                streaming && message.text === ''
                  ? h('span', { className: 'dshbtw-dots', 'aria-label': tr(t, 'thread.thinking') }, h('i'), h('i'), h('i'))
                  : h(
                      'div',
                      { className: 'dshbtw-text' },
                      message.text === '' && !isError ? tr(t, 'thread.empty') : renderRichText(message.text),
                    ),
                isError && message.error
                  ? h('div', { className: 'dshbtw-msg-error' }, message.error)
                  : null,
                message.status === 'stopped' ? h('div', { className: 'dshbtw-msg-note' }, tr(t, 'thread.stopped')) : null,
                isError && !thread.busy
                  ? h(
                      'button',
                      { type: 'button', className: 'dshbtw-retry', onClick: () => store.retry(sessionId) },
                      tr(t, 'thread.retry'),
                    )
                  : null,
              );
            });

      const threadView = h(
        'div',
        { className: 'dshbtw-thread', ref: scrollRef, role: 'log', 'aria-live': 'polite', 'aria-busy': thread.busy },
        empty,
      );

      const composer = h(
        'div',
        { className: 'dshbtw-compose' },
        h(
          'div',
          { className: 'dshbtw-inputwrap' },
          h('textarea', {
            ref: inputRef,
            className: 'dshbtw-input',
            rows: 1,
            value: draft,
            placeholder: tr(t, 'composer.placeholder'),
            'aria-label': tr(t, 'composer.placeholder'),
            onChange,
            onKeyDown,
          }),
          thread.busy
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dshbtw-send dshbtw-stop',
                  title: tr(t, 'composer.stop'),
                  'aria-label': tr(t, 'composer.stop'),
                  onClick: () => store.stop(sessionId),
                },
                icon('stop', 12),
              )
            : h(
                'button',
                {
                  type: 'button',
                  className: 'dshbtw-send',
                  title: tr(t, 'composer.send'),
                  'aria-label': tr(t, 'composer.send'),
                  disabled: draft.trim() === '',
                  onClick: submit,
                },
                icon('send', 14),
              ),
        ),
        h('div', { className: 'dshbtw-hint' }, tr(t, 'composer.hint')),
      );

      return h(
        'section',
        {
          className: 'dshbtw-panel',
          role: 'dialog',
          'aria-label': tr(t, 'panel.title'),
          onKeyDown: onPanelKeyDown,
        },
        header,
        threadView,
        composer,
      );
    }

    /* ------------------------------------------------------------------ */
    /* plugin                                                             */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-btw: dictionaries');
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = '@lew1sin/dsh-btw';
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            tag.remove();
          };
        }, 'dsh-btw: styles');
        ctx.effect(() => () => store.dispose(), 'dsh-btw: side-chat lifecycle');
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'dsh-btw-launcher',
              order: 15,
              locale: NS,
            },
            BtwLauncher,
          ),
        );
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'dsh-btw-panel',
              order: 40,
              locale: NS,
            },
            BtwPanel,
          ),
        );
      },
    };
  },
});
