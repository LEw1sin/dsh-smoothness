/**
 * Save / Load (存档 / 读档) — browser half.
 *
 * Adds one `/` command contribution. The popup lists saved handoffs and a
 * Save action; saving asks the Host to summarize the live Session, loading
 * opens a new Session with the handoff already in its composer.
 */
window.__ModuleLoader__.load({
  id: '@lew1sin/dsh-save-load',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-save-load';
    const BASE = 'api/dsh-save-load';

    const zh = {
      'command.label': '存档 / 读档',
      'command.description': '把当前会话整理成交接手册，或从已保存的手册继续新会话。',
      'group.save': '存档',
      'group.load': '读档',
      'option.save': '存档当前会话',
      'option.saveDetail': '总结已完成、未完成、踩过的坑、注意事项与用户偏好，生成交接手册。',
      'option.loadDetail': '在新会话中打开这份交接手册（会预填到输入框，按 Enter 开始）。',
      'option.untitled': '未命名交接',
      'search.placeholder': '搜索交接手册…',
      'search.empty': '还没有交接手册，先存档当前会话。',
      'search.noResults': '没有匹配的交接手册。',
      'confirm.title': '存档当前会话？',
      'confirm.description': '这会调用当前模型生成交接手册，并把内容写入本机的存档目录。源会话不会被修改。',
      'confirm.ack': '我了解这会调用模型并写入本地存档',
      'confirm.cancel': '取消',
      'confirm.confirm': '存档',
      'error.request': '存档 / 读档请求失败',
      'error.noWorkspace': '当前客户端不支持新建会话。',
      'error.save': '存档失败',
      'error.load': '读档失败',
      'status.savingTitle': '正在存档…',
      'status.savingDetail': '正在生成交接手册。你可以继续工作；完成前不要重复点击存档。',
      'status.successTitle': '存档完成',
      'status.updatedTitle': '存档已更新',
      'status.reusedTitle': '已经存过档',
      'status.reusedDetail': '这个会话自上次存档后没有新进展，复用已有交接手册。',
      'status.errorTitle': '存档失败',
      'status.close': '关闭存档状态',
      'status.noTitle': '交接手册',

    };

    const en = {
      'command.label': 'Archive / Load',
      'command.description': 'Save this session as a handoff manual, or continue from a saved handoff in a new session.',
      'group.save': 'Archive',
      'group.load': 'Saved handoffs',
      'option.save': 'Archive this session',
      'option.saveDetail': 'Summarize completed work, unfinished work, pitfalls, cautions, and user preferences into a handoff manual.',
      'option.loadDetail': 'Open a new session with this handoff prefilled; press Enter to start the relay.',
      'option.untitled': 'Untitled handoff',
      'search.placeholder': 'Search saved handoffs…',
      'search.empty': 'No saved handoffs yet. Archive this session first.',
      'search.noResults': 'No matching handoffs.',
      'confirm.title': 'Archive this session?',
      'confirm.description': 'This calls the current model to write a handoff manual and stores it in the local archive directory. The source session is not modified.',
      'confirm.ack': 'I understand this calls the model and writes a local archive',
      'confirm.cancel': 'Cancel',
      'confirm.confirm': 'Archive',
      'error.request': 'The Save / Load request failed',
      'error.noWorkspace': 'This client cannot open a new session.',
      'error.save': 'Archiving failed',
      'error.load': 'Loading failed',
      'status.savingTitle': 'Archiving session…',
      'status.savingDetail': 'Writing the handoff manual. You can keep working; do not click Save again before it finishes.',
      'status.successTitle': 'Handoff saved',
      'status.updatedTitle': 'Handoff updated',
      'status.reusedTitle': 'Already archived',
      'status.reusedDetail': 'No new events since the last archive; reusing the existing handoff.',
      'status.errorTitle': 'Archive failed',
      'status.close': 'Close archive status',
      'status.noTitle': 'Handoff',

    };

    const statusState = { value: null, listeners: new Set(), timer: null };

    /**
     * Publish one floating archive status.
     * @param next - status or null to dismiss.
     */
    function publishStatus(next) {
      if (statusState.timer !== null) {
        clearTimeout(statusState.timer);
        statusState.timer = null;
      }
      statusState.value = next;
      for (const listener of statusState.listeners) listener(next);
      if (next !== null && next.phase === 'success') {
        statusState.timer = setTimeout(() => publishStatus(null), 7000);
      }
    }

    /** Subscribe the overlay to the module-level status. */
    function useStatus() {
      const [value, setValue] = React.useState(statusState.value);
      React.useEffect(() => {
        const listener = (next) => setValue(next);
        statusState.listeners.add(listener);
        setValue(statusState.value);
        return () => {
          statusState.listeners.delete(listener);
        };
      }, []);
      return value;
    }

    /**
     * Floating archive status window.
     * @param props - slot props, including the locale translator.
     * @returns the status card or null.
     */
    function StatusOverlay({ t }) {
      const value = useStatus();
      if (value === null) return null;
      return h(
        'div',
        {
          className: 'dshsl-status',
          'data-phase': value.phase,
          role: 'status',
          'aria-live': 'polite',
        },
        h(
          'div',
          { className: 'dshsl-status-head' },
          h('span', { className: 'dshsl-status-title' }, value.title),
          h(
            'button',
            {
              type: 'button',
              className: 'dshsl-status-close',
              title: t('status.close'),
              'aria-label': t('status.close'),
              onClick: () => publishStatus(null),
            },
            '×',
          ),
        ),
        h('div', { className: 'dshsl-status-detail' }, value.detail),
        value.phase === 'saving' ? h('div', { className: 'dshsl-status-progress' }, h('span')) : null,
      );
    }

    const STATUS_CSS = `
.dshsl-status {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 80;
  width: min(360px, calc(100vw - 32px));
  box-sizing: border-box;
  display: grid;
  gap: 8px;
  padding: 12px 14px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 12px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--dsw-alias-bg-base) 50%, transparent);
  pointer-events: auto;
}
.dshsl-status[data-phase='error'] { border-color: var(--dsw-alias-state-error-primary); }
.dshsl-status-head { display: flex; align-items: center; gap: 8px; }
.dshsl-status-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; }
.dshsl-status-close {
  flex: none;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.dshsl-status-close:hover { background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); }
.dshsl-status-detail {
  color: var(--dsw-alias-label-secondary);
  font-size: 12px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.dshsl-status-progress {
  height: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-1);
}
.dshsl-status-progress span {
  display: block;
  width: 40%;
  height: 100%;
  border-radius: inherit;
  background: var(--dsw-alias-brand-primary);
  animation: dshsl-progress 1.3s ease-in-out infinite;
}
@keyframes dshsl-progress {
  0% { transform: translateX(-110%); }
  100% { transform: translateX(360%); }
}
@media (max-width: 720px) {
  .dshsl-status { right: 12px; left: 12px; bottom: 12px; width: auto; }
}
`;

    /**
     * The `/` command icon.
     * @param props - icon props.
     * @returns an archive glyph.
     */
    function ArchiveIcon(props) {
      const size = props?.size ?? 16;
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.7,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z' }),
        h('path', { d: 'M4 7.5 12 12l8-4.5M12 12v9' }),
      );
    }

    return {
      inject: ['locale', 'commandUi', 'slots'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-save-load: dictionaries');
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = '@lew1sin/dsh-save-load';
          tag.textContent = STATUS_CSS;
          document.head.appendChild(tag);
          return () => tag.remove();
        }, 'dsh-save-load: status styles');
        ctx.effect(() => () => {
          if (statusState.timer !== null) clearTimeout(statusState.timer);
          statusState.listeners.clear();
        }, 'dsh-save-load: status lifecycle');
        const t = ctx.locale.bind(NS);
        const commandUi = ctx.get('commandUi');
        if (commandUi === undefined) {
          console.warn('[dsh-save-load] commandUi is not mounted; the / command is unavailable');
          return;
        }

        /**
         * Call one authenticated Save / Load route.
         * @param action - route suffix.
         * @param payload - JSON body.
         * @returns parsed JSON.
         */
        async function request(action, payload) {
          const response = await fetch(`${BASE}.${action}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify(payload),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) {
            throw new Error(typeof data?.error === 'string' ? data.error : `${t('error.request')} (${response.status})`);
          }
          return data;
        }

        const savesInFlight = new Map();

        /**
         * Archive the Session once; repeated calls share the in-flight request
         * and the Host additionally reuses an unchanged archive.
         * @param sessionId - source Session.
         */
        async function archiveSession(sessionId) {
          const current = savesInFlight.get(sessionId);
          if (current !== undefined) {
            publishStatus({
              phase: 'saving',
              title: t('status.savingTitle'),
              detail: t('status.savingDetail'),
            });
            return current;
          }
          publishStatus({
            phase: 'saving',
            title: t('status.savingTitle'),
            detail: t('status.savingDetail'),
          });
          const job = request('save', { sessionId })
            .then((data) => {
              const title = typeof data?.archive?.title === 'string' && data.archive.title !== '' ? data.archive.title : t('status.noTitle');
              if (data?.reused === true) {
                publishStatus({ phase: 'success', title: t('status.reusedTitle'), detail: `${t('status.reusedDetail')} · ${title}` });
              } else if (data?.updated === true) {
                publishStatus({ phase: 'success', title: t('status.updatedTitle'), detail: title });
              } else {
                publishStatus({ phase: 'success', title: t('status.successTitle'), detail: title });
              }
              return data;
            })
            .catch((error) => {
              publishStatus({
                phase: 'error',
                title: t('status.errorTitle'),
                detail: error instanceof Error ? error.message : String(error),
              });
            })
            .finally(() => {
              if (savesInFlight.get(sessionId) === job) savesInFlight.delete(sessionId);
            });
          savesInFlight.set(sessionId, job);
          return job;
        }

        /**
         * Build the composer text that starts the relay.
         * @param data - Host load response.
         * @returns prompt text.
         */
        function continuationPrompt(data) {
          const archive = data.archive ?? {};
          const title = typeof archive.title === 'string' && archive.title !== '' ? archive.title : t('option.untitled');
          return `You are taking over from an archived DeepSeek Harness session.

Read this handoff carefully. Before changing files or running the next task, state briefly what is already done, what remains, and your first next step.

Archive: ${title}
---
${String(data.manual ?? '').trim()}
---
`;
        }

        ctx.effect(
          () =>
            commandUi.register({
              name: 'handoff',
              label: () => t('command.label'),
              description: () => t('command.description'),
              icon: ArchiveIcon,
              available: () => true,
              ui: {
                kind: 'popupSelect',
                searchMode: 'substring',
                searchLabels: () => ({
                  placeholder: t('search.placeholder'),
                  empty: t('search.empty'),
                  noResults: t('search.noResults'),
                }),
                async options(session, signal) {
                  if (signal.aborted) return [];
                  const data = await request('list', { sessionId: session.sessionId });
                  const archives = Array.isArray(data?.archives) ? data.archives : [];
                  const options = [
                    {
                      id: 'save',
                      label: t('option.save'),
                      detail: t('option.saveDetail'),
                      group: { name: 'save', label: t('group.save') },
                      confirmation: {
                        title: t('confirm.title'),
                        description: t('confirm.description'),
                        acknowledgeLabel: t('confirm.ack'),
                        cancelLabel: t('confirm.cancel'),
                        confirmLabel: t('confirm.confirm'),
                      },
                    },
                  ];
                  for (const archive of archives) {
                    if (typeof archive?.id !== 'string' || archive.id === '') continue;
                    const date = typeof archive.createdAt === 'number' && archive.createdAt > 0 ? new Date(archive.createdAt).toLocaleString() : '';
                    const detail = [t('option.loadDetail'), date, typeof archive.cwd === 'string' ? archive.cwd : ''].filter((part) => part !== '').join(' · ');
                    options.push({
                      id: `load:${archive.id}`,
                      label: typeof archive.title === 'string' && archive.title !== '' ? archive.title : t('option.untitled'),
                      detail,
                      group: { name: 'load', label: t('group.load') },
                    });
                  }
                  return options;
                },
                async onSelect(option, session) {
                  if (option.id === 'save') {
                    await archiveSession(session.sessionId);
                    return;
                  }
                  if (!option.id.startsWith('load:')) return;
                  const archiveId = option.id.slice('load:'.length);
                  const data = await request('load', { archiveId });
                  const ui = ctx.get('uiWorkspace');
                  if (ui === undefined || typeof ui.startSession !== 'function') throw new Error(t('error.noWorkspace'));
                  ui.startSession(undefined, { prompt: continuationPrompt(data), whenDraftExists: 'replace' });
                },
              },
            }),
          'dsh-save-load: / command',
        );
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'dsh-save-load-status',
              order: 46,
              locale: NS,
            },
            StatusOverlay,
          ),
        );
      },
    };
  },
});
