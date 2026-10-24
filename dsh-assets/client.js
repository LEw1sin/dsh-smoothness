/**
 * Assets (资产) — browser half.
 *
 * A composer-dock launcher opens a session-scoped asset browser: installed
 * plugins, their bundled skills, standalone skills, and rule files. Every row
 * has a switch; the Host owns the per-Session policy and applies it to the
 * model's skill catalog and rule context.
 */
window.__ModuleLoader__.load({
  id: '@lew1sin/dsh-assets',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const NS = 'dsh-assets';
    const LIST_PATH = 'api/dsh-assets.list';
    const TOGGLE_PATH = 'api/dsh-assets.toggle';

    const zh = {
      'launcher.label': '资产',
      'launcher.hint': '查看并启用本会话的技能、规则与插件',
      'panel.title': '资产',
      'panel.subtitle': '按会话启用 · 只影响当前会话',
      'panel.close': '关闭资产面板',
      'panel.refresh': '刷新资产',
      'panel.allOn': '全部启用',
      'panel.search': '搜索技能、规则或插件…',
      'panel.loading': '正在读取资产…',
      'panel.emptyTitle': '没有匹配的资产',
      'panel.emptyBody': '换个关键词，或刷新后重试。',
      'panel.errorTitle': '资产加载失败',
      'panel.errorRetry': '重试',
      'panel.hint': '开关只影响当前会话，模型下一轮生效。',
      'panel.session': '本会话',
      'tabs.plugins': '插件',
      'tabs.skills': '技能',
      'tabs.rules': '规则',
      'badge.core': 'DSH 提供',
      'badge.optional': '可选',
      'badge.profileOff': '已停用',
      'badge.error': '异常',
      'badge.pack': '技能包',
      'badge.dshManaged': 'DSH 管理',
      'badge.user': '用户',
      'badge.project': '项目',
      'badge.session': '本会话',
      'badge.profile': 'Profile',
      'badge.readOnly': '只读',
      'badge.preset': '预设',
      'folder.dsh': 'DSH 自带',
      'folder.hint': 'DeepSeek Harness 内置的插件、技能与规则',
      'section.myPlugins': '我的插件',
      'section.myPacks': '我的技能包',
      'section.mySkills': '我的技能',
      'section.myRules': '我的规则',
      'unit.skills': '个技能',
      'unit.rules': '条规则',
      'row.bundledSkills': '包含的技能',
      'row.profileLevel': 'Profile 级插件，没有可切换的会话资产',
      'row.profileDisabled': '该插件在 Profile 中已停用',
      'row.noSkills': '没有技能',
      'row.togglePlugin': '在本会话启用此插件及其技能',
      'row.toggleSkill': '在本会话启用此技能',
      'row.toggleRule': '在本会话启用此规则',
      'row.togglePack': '在本会话启用此技能包',
      'row.readOnlyHint': '由 DSH 工作区指令加载，不能按会话关闭',
      'skills.ungrouped': '未归类的技能',
      'skills.groupHint': '悬停查看包含的技能，点击展开',
      'rules.project': '项目规则',
      'rules.user': '用户规则',
      'footer.enabled': '已启用',
      'footer.of': '/',
      'footer.allOnDone': '已全部启用',
      'error.prefix': '开关失败：',
    };

    const en = {
      'launcher.label': 'Assets',
      'launcher.hint': 'Browse and enable skills, rules, and plugins for this session',
      'panel.title': 'Assets',
      'panel.subtitle': 'Session-scoped · this session only',
      'panel.close': 'Close assets',
      'panel.refresh': 'Refresh assets',
      'panel.allOn': 'Enable all',
      'panel.search': 'Search skills, rules, or plugins…',
      'panel.loading': 'Reading assets…',
      'panel.emptyTitle': 'No matching assets',
      'panel.emptyBody': 'Try another search, or refresh.',
      'panel.errorTitle': 'Could not load assets',
      'panel.errorRetry': 'Retry',
      'panel.hint': 'Toggles apply to this session only and take effect on the next model step.',
      'panel.session': 'This session',
      'tabs.plugins': 'Plugins',
      'tabs.skills': 'Skills',
      'tabs.rules': 'Rules',
      'badge.core': 'DSH',
      'badge.optional': 'Optional',
      'badge.profileOff': 'Disabled',
      'badge.error': 'Error',
      'badge.pack': 'Skill pack',
      'badge.dshManaged': 'DSH-managed',
      'badge.user': 'User',
      'badge.project': 'Project',
      'badge.session': 'This session',
      'badge.profile': 'Profile',
      'badge.readOnly': 'Read-only',
      'badge.preset': 'Preset',
      'folder.dsh': 'Provided by DSH',
      'folder.hint': 'Plugins, skills, and rules shipped with DeepSeek Harness',
      'section.myPlugins': 'My plugins',
      'section.myPacks': 'My skill packs',
      'section.mySkills': 'My skills',
      'section.myRules': 'My rules',
      'unit.skills': 'skills',
      'unit.rules': 'rules',
      'row.bundledSkills': 'Bundled skills',
      'row.profileLevel': 'Profile-level plugin; no switchable session assets',
      'row.profileDisabled': 'This plugin is disabled in the profile',
      'row.noSkills': 'No skills',
      'row.togglePlugin': 'Enable this plugin and its skills for this session',
      'row.toggleSkill': 'Enable this skill for this session',
      'row.toggleRule': 'Enable this rule for this session',
      'row.togglePack': 'Enable this skill pack for this session',
      'row.readOnlyHint': 'Loaded by DSH workspace instructions; not switchable per session',
      'skills.ungrouped': 'Ungrouped skills',
      'skills.groupHint': 'Hover for bundled skills; click to expand',
      'rules.project': 'Project rules',
      'rules.user': 'User rules',
      'footer.enabled': 'Enabled',
      'footer.of': '/',
      'footer.allOnDone': 'All enabled',
      'error.prefix': 'Toggle failed: ',
    };

    const CSS = `
.dshast-trigger {
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
.dshast-trigger:hover {
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
}
.dshast-trigger[data-open='true'] {
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 10%, transparent);
}
.dshast-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 24px;
  background: color-mix(in srgb, var(--dsw-alias-bg-base) 58%, transparent);
  backdrop-filter: blur(3px);
  pointer-events: auto;
}
.dshast-modal {
  width: min(840px, calc(100vw - 48px));
  height: min(760px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 18px;
  box-shadow: 0 24px 72px color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent);
  font-family: inherit;
  animation: dshast-rise 160ms ease-out;
}
@keyframes dshast-rise {
  from { opacity: 0; transform: translateY(8px) scale(0.99); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .dshast-modal { animation: none; }
}
@media (max-width: 720px) {
  .dshast-backdrop { padding: 0; }
  .dshast-modal { width: 100vw; height: 100vh; border-radius: 0; }
}
.dshast-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 14px 12px 18px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.dshast-mark {
  width: 32px;
  height: 32px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 10px;
  color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 13%, transparent);
}
.dshast-heading { min-width: 0; }
.dshast-title { font-size: 14px; font-weight: 600; line-height: 1.25; }
.dshast-sub {
  margin-top: 2px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11px;
  line-height: 1.3;
}
.dshast-head-actions { display: flex; gap: 2px; margin-left: auto; }
.dshast-iconbtn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
}
.dshast-iconbtn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.dshast-tabs {
  display: flex;
  gap: 2px;
  padding: 8px 14px 0;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
}
.dshast-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px 9px;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}
.dshast-tab[data-active='true'] {
  color: var(--dsw-alias-label-primary);
  border-bottom-color: var(--dsw-alias-brand-primary);
}
.dshast-tab-count {
  min-width: 16px;
  padding: 1px 5px;
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font-size: 10px;
  text-align: center;
}
.dshast-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-overlay);
}
.dshast-search {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  height: 30px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 9px;
  background: var(--dsw-alias-bg-base);
  color: var(--dsw-alias-label-secondary);
}
.dshast-search:focus-within { border-color: var(--dsw-alias-border-l2); }
.dshast-search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 12px;
}
.dshast-search input::placeholder { color: var(--dsw-alias-label-secondary); }
.dshast-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px 12px;
  scrollbar-width: thin;
}
.dshast-section { margin: 8px 4px 4px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; letter-spacing: 0.04em; text-transform: uppercase; }
.dshast-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px;
  border-radius: 11px;
  border: 1px solid transparent;
}
.dshast-row:hover { background: var(--dsw-alias-bg-layer-1); }
.dshast-row + .dshast-row { margin-top: 2px; }
.dshast-icon {
  width: 30px;
  height: 30px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
}
.dshast-row[data-kind='plugin'] .dshast-icon { color: var(--dsw-alias-brand-primary); }
.dshast-row[data-kind='skill'] .dshast-icon { color: var(--dsw-alias-state-success-primary); }
.dshast-row[data-kind='rule'] .dshast-icon { color: var(--dsw-alias-state-warn-primary); }
.dshast-main { flex: 1; min-width: 0; }
.dshast-row-title-line { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.dshast-row-title {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-primary);
  font-size: 12.5px;
  font-weight: 600;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dshast-mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
.dshast-summary {
  margin-top: 2px;
  color: var(--dsw-alias-label-secondary);
  font-size: 11.5px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.dshast-meta { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; margin-top: 5px; }
.dshast-badge {
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 9.5px;
  line-height: 1.5;
  white-space: nowrap;
}
.dshast-badge[data-tone='brand'] { color: var(--dsw-alias-brand-primary); border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 30%, transparent); }
.dshast-badge[data-tone='warn'] { color: var(--dsw-alias-state-warn-primary); }
.dshast-badge[data-tone='error'] { color: var(--dsw-alias-state-error-primary); }
.dshast-skill-chip {
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-secondary);
  font: inherit;
  font-size: 9.5px;
  cursor: pointer;
}
.dshast-skill-chip:hover { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-border-l2); }
.dshast-side { display: flex; align-items: center; gap: 6px; flex: none; padding-top: 2px; }
.dshast-switch {
  position: relative;
  width: 30px;
  height: 18px;
  flex: none;
  padding: 0;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 999px;
  background: var(--dsw-alias-bg-layer-2);
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease;
}
.dshast-switch[data-checked='true'] {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
}
.dshast-switch[data-mixed='true'] {
  border-color: var(--dsw-alias-brand-primary);
  background: color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, var(--dsw-alias-bg-layer-2));
}
.dshast-knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dsw-alias-bg-base);
  transition: transform 120ms ease;
}
.dshast-switch[data-checked='true'] .dshast-knob,
.dshast-switch[data-mixed='true'] .dshast-knob { transform: translateX(12px); }
.dshast-switch:disabled { opacity: 0.45; cursor: default; }
.dshast-folder-row { cursor: pointer; }
.dshast-folder-row[data-kind='folder'] .dshast-icon { color: var(--dsw-alias-brand-primary); }
.dshast-chevron {
  display: flex;
  align-items: center;
  color: var(--dsw-alias-label-secondary);
  transition: transform 120ms ease;
}
.dshast-folder-row[data-open='true'] .dshast-chevron { transform: rotate(90deg); }
.dshast-folder-body {
  margin-left: 24px;
  padding-left: 8px;
  border-left: 1px dashed var(--dsw-alias-border-l1);
}
.dshast-child {
  margin-left: 30px;
  padding-left: 10px;
  border-left: 1px solid var(--dsw-alias-border-l1);
}
.dshast-child .dshast-row { padding: 7px 8px; }
.dshast-child .dshast-icon { width: 24px; height: 24px; border-radius: 7px; }
.dshast-meta > .dshast-badge {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dshast-popover {
  position: fixed;
  z-index: 80;
  width: 320px;
  max-height: 260px;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 11px;
  background: var(--dsw-alias-bg-overlay);
  box-shadow: 0 16px 40px color-mix(in srgb, var(--dsw-alias-bg-base) 55%, transparent);
  scrollbar-width: thin;
}
.dshast-popover-title { color: var(--dsw-alias-label-primary); font-size: 11px; font-weight: 600; margin-bottom: 6px; }
.dshast-popover-item { padding: 5px 6px; border-radius: 7px; }
.dshast-popover-item:hover { background: var(--dsw-alias-bg-layer-1); }
.dshast-popover-name { color: var(--dsw-alias-label-primary); font-size: 11px; font-weight: 600; }
.dshast-popover-summary { margin-top: 1px; color: var(--dsw-alias-label-secondary); font-size: 10.5px; line-height: 1.45; }
.dshast-empty {
  margin: 48px auto;
  max-width: 320px;
  color: var(--dsw-alias-label-secondary);
  text-align: center;
  font-size: 12px;
  line-height: 1.6;
}
.dshast-empty h4 { margin: 0 0 6px; color: var(--dsw-alias-label-primary); font-size: 13px; }
.dshast-foot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font-size: 10.5px;
}
.dshast-foot strong { color: var(--dsw-alias-label-primary); font-weight: 600; }
.dshast-foot .dshast-hint { margin-left: auto; text-align: right; }
.dshast-allbtn {
  padding: 4px 9px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 7px;
  background: var(--dsw-alias-bg-overlay);
  color: var(--dsw-alias-label-primary);
  font: inherit;
  font-size: 10.5px;
  cursor: pointer;
}
.dshast-allbtn:hover:not(:disabled) { border-color: var(--dsw-alias-border-l2); }
.dshast-allbtn:disabled { opacity: 0.45; cursor: default; }
.dshast-error { padding: 4px 14px 8px; color: var(--dsw-alias-state-error-primary); font-size: 10.5px; }
.dshast-loading { padding: 40px; color: var(--dsw-alias-label-secondary); text-align: center; font-size: 12px; }
`;

    const EMPTY_DATA = Object.freeze({
      plugins: Object.freeze([]),
      packs: Object.freeze([]),
      skills: Object.freeze([]),
      ungrouped: Object.freeze([]),
      rules: Object.freeze([]),
      counts: Object.freeze({ plugins: 0, skills: 0, enabledSkills: 0, packs: 0, rules: 0, enabledRules: 0 }),
    });

    /* ------------------------------------------------------------------ */
    /* store                                                              */
    /* ------------------------------------------------------------------ */

    function createStore(getLocale) {
      let state = {
        open: false,
        sessionId: null,
        tab: 'plugins',
        query: '',
        data: null,
        loading: false,
        error: null,
        pending: {},
        loadedAt: 0,
      };
      const listeners = new Set();
      let requestSeq = 0;
      let disposed = false;

      const notify = () => {
        for (const listener of Array.from(listeners)) {
          try {
            listener();
          } catch {
            // One subscriber must not break the others.
          }
        }
      };
      const set = (patch) => {
        state = { ...state, ...patch };
        notify();
      };

      const load = async (sessionId, force = false) => {
        const key = String(sessionId);
        if (disposed || key === '') return;
        const cached = state.data;
        if (!force && cached !== null && cached.sessionId === key && Date.now() - state.loadedAt < 30_000) return;
        set({ loading: true, error: null });
        try {
          const query = new URLSearchParams({ sessionId: key, locale: getLocale(), refresh: force ? '1' : '0' });
          const response = await fetch(`${LIST_PATH}?${query.toString()}`, { credentials: 'same-origin' });
          if (!response.ok) throw new Error(await readError(response));
          const data = await response.json();
          if (disposed || state.sessionId !== key) return;
          set({ data, loading: false, loadedAt: Date.now(), error: null });
        } catch (error) {
          if (disposed || state.sessionId !== key) return;
          set({ loading: false, error: messageOf(error) });
        }
      };

      const change = async (kind, id, enabled) => {
        const sessionId = state.sessionId;
        if (sessionId === null || sessionId === '') return;
        const pendingKey = `${kind}:${id}`;
        if (state.pending[pendingKey] === true) return;
        const seq = ++requestSeq;
        set({
          pending: { ...state.pending, [pendingKey]: true },
          error: null,
          data: applyToggle(state.data, kind, id, enabled),
        });
        try {
          const response = await fetch(TOGGLE_PATH, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sessionId, kind, id, enabled, locale: getLocale() }),
          });
          if (!response.ok) throw new Error(await readError(response));
          const data = await response.json();
          if (disposed || state.sessionId !== sessionId) return;
          if (seq === requestSeq) set({ data, loadedAt: Date.now(), error: null });
        } catch (error) {
          if (disposed || state.sessionId !== sessionId) return;
          set({ error: messageOf(error) });
          void load(sessionId, true);
        } finally {
          const pending = { ...state.pending };
          delete pending[pendingKey];
          set({ pending });
        }
      };

      return {
        get: () => state,
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        open(sessionId) {
          const key = String(sessionId);
          if (state.open && state.sessionId === key) {
            set({ open: false });
            return;
          }
          set({ open: true, sessionId: key, tab: state.tab ?? 'plugins' });
          void load(key);
        },
        close() {
          if (!state.open) return;
          set({ open: false });
        },
        setSession(sessionId) {
          const key = sessionId === null || sessionId === undefined ? null : String(sessionId);
          if (state.sessionId === key) return;
          set({ sessionId: key, data: null, loadedAt: 0 });
          if (state.open && key !== null) void load(key);
        },
        setTab(tab) {
          if (state.tab === tab) return;
          set({ tab });
        },
        setQuery(query) {
          if (state.query === query) return;
          set({ query });
        },
        refresh() {
          if (state.sessionId !== null) void load(state.sessionId, true);
        },
        toggle(kind, id, enabled) {
          void change(kind, id, enabled);
        },
        allOn() {
          void change('all', '', true);
        },
        dispose() {
          disposed = true;
          listeners.clear();
        },
      };
    }

    let localeService = null;
    const store = createStore(readLocale);

    function readLocale() {
      try {
        const value = localeService?.getLocale?.();
        const active = value?.active;
        return typeof active === 'string' && active.startsWith('zh') ? 'zh' : 'en';
      } catch {
        return 'en';
      }
    }

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
    /* messages and icons                                                 */
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

    function messageOf(error) {
      return error instanceof Error ? error.message : String(error);
    }

    async function readError(response) {
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
      if (name === 'assets') {
        return h(
          'svg',
          common,
          h('rect', { x: 3.5, y: 3.5, width: 7, height: 7, rx: 1.6 }),
          h('rect', { x: 13.5, y: 3.5, width: 7, height: 7, rx: 1.6 }),
          h('rect', { x: 3.5, y: 13.5, width: 7, height: 7, rx: 1.6 }),
          h('rect', { x: 13.5, y: 13.5, width: 7, height: 7, rx: 1.6 }),
        );
      }
      if (name === 'plugin') {
        return h(
          'svg',
          common,
          h('path', { d: 'M12 3.2 20 7v10l-8 3.8L4 17V7l8-3.8Z' }),
          h('path', { d: 'M4.4 7.4 12 11l7.6-3.6M12 11v10' }),
        );
      }
      if (name === 'skill') {
        return h(
          'svg',
          common,
          h('path', { d: 'M13 3 5 13.2h5l-1 7.8 8-10.2h-5l1-7.8Z' }),
        );
      }
      if (name === 'rule') {
        return h(
          'svg',
          common,
          h('path', { d: 'M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z' }),
          h('path', { d: 'M14 3.8V8h4M8.5 12h7M8.5 15.5h5' }),
        );
      }
      if (name === 'close') {
        return h('svg', common, h('path', { d: 'M6 6l12 12M18 6 6 18' }));
      }
      if (name === 'refresh') {
        return h('svg', common, h('path', { d: 'M20 11a8 8 0 1 0-2.4 6.2M20 5v6h-6' }));
      }
      if (name === 'search') {
        return h('svg', common, h('circle', { cx: 11, cy: 11, r: 6.2 }), h('path', { d: 'M15.5 15.5 20 20' }));
      }
      if (name === 'chevron') {
        return h('svg', common, h('path', { d: 'M9 6l6 6-6 6' }));
      }
      if (name === 'lock') {
        return h(
          'svg',
          common,
          h('rect', { x: 5, y: 10.5, width: 14, height: 9.5, rx: 2 }),
          h('path', { d: 'M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5' }),
        );
      }
      if (name === 'folder') {
        return h(
          'svg',
          common,
          h('path', { d: 'M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2l2 2H18a2.5 2.5 0 0 1 2.5 2.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z' }),
          h('path', { d: 'M3.8 10h16.4' }),
        );
      }
      if (name === 'pack') {
        return h(
          'svg',
          common,
          h('path', { d: 'M12 3 3.8 7.2 12 11.4l8.2-4.2L12 3Z' }),
          h('path', { d: 'M3.8 12 12 16.2l8.2-4.2M3.8 16.8 12 21l8.2-4.2' }),
        );
      }
      return h('svg', common, h('circle', { cx: 12, cy: 12, r: 7 }));
    }

    /* ------------------------------------------------------------------ */
    /* launcher                                                           */
    /* ------------------------------------------------------------------ */

    function AssetsLauncher(props) {
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
          className: 'dshast-trigger',
          'data-open': open ? 'true' : 'false',
          'aria-expanded': open,
          'aria-label': tr(t, 'launcher.label'),
          title: tr(t, 'launcher.hint'),
          onClick: () => store.open(sessionId),
        },
        icon('assets', 13),
        h('span', null, tr(t, 'launcher.label')),
      );
    }

    /* ------------------------------------------------------------------ */
    /* panel                                                              */
    /* ------------------------------------------------------------------ */

    function AssetsPanel(props) {
      const t = props.t;
      const state = useStore();
      if (!state.open || state.sessionId === null) return null;
      return h(AssetsModal, { t });
    }

    function AssetsModal({ t }) {
      const state = useStore();
      const data = state.data ?? EMPTY_DATA;
      const [collapsed, setCollapsed] = React.useState({ 'dsh:plugins': true, 'dsh:skills': true, 'dsh:rules': true });
      const searchRef = React.useRef(null);

      React.useEffect(() => {
        const timer = setTimeout(() => searchRef.current?.focus(), 40);
        return () => clearTimeout(timer);
      }, []);

      const query = state.query.trim().toLowerCase();
      const matches = (value) => query === '' || String(value ?? '').toLowerCase().includes(query);
      const skillById = new Map(data.skills.map((skill) => [skill.id, skill]));

      const plugins = data.plugins
        .filter((plugin) => {
          if (query === '') return true;
          if (matches(plugin.title) || matches(plugin.name) || matches(plugin.summary)) return true;
          return plugin.skillIds.some((id) => {
            const skill = skillById.get(id);
            return skill !== undefined && (matches(skill.name) || matches(skill.summary));
          });
        })
        .sort((left, right) => {
          if (left.core !== right.core) return left.core ? 1 : -1;
          return left.title.localeCompare(right.title);
        });

      const packs = data.packs.filter((pack) => {
        if (query === '') return true;
        if (matches(pack.title) || matches(pack.summary)) return true;
        return pack.skillIds.some((id) => {
          const skill = skillById.get(id);
          return skill !== undefined && (matches(skill.name) || matches(skill.summary));
        });
      });

      const skillGroups = [];
      for (const plugin of data.plugins) {
        if (plugin.skillIds.length === 0) continue;
        const children = plugin.skillIds.map((id) => skillById.get(id)).filter(Boolean);
        const visible = query === '' || matches(plugin.title) || matches(plugin.summary) || children.some((skill) => matches(skill.name) || matches(skill.summary));
        if (visible) skillGroups.push({ kind: 'plugin', id: plugin.id, title: plugin.title, summary: plugin.summary, children, toggleable: plugin.toggleable, sessionEnabled: plugin.sessionEnabled, mixed: plugin.mixed, isDsh: plugin.core === true, pending: state.pending[`plugin:${plugin.id}`] === true });
      }
      for (const pack of data.packs) {
        const children = pack.skillIds.map((id) => skillById.get(id)).filter(Boolean);
        const visible = query === '' || matches(pack.title) || matches(pack.summary) || children.some((skill) => matches(skill.name) || matches(skill.summary));
        if (visible) skillGroups.push({ kind: 'pack', id: pack.id, title: pack.title, summary: pack.summary, children, toggleable: pack.toggleable, sessionEnabled: pack.sessionEnabled, mixed: pack.mixed, isDsh: children.length > 0 && children.every((skill) => skill.source === 'bundled'), pending: state.pending[`pack:${pack.id}`] === true });
      }
      const ungrouped = data.ungrouped.filter((skill) => query === '' || matches(skill.name) || matches(skill.summary) || matches(skill.provider));

      const rules = data.rules.filter((rule) => query === '' || matches(rule.title) || matches(rule.summary) || matches(rule.path));

      const isDshSkill = (skill) => skill.source === 'bundled' || skill.source === 'project-dsh' || skill.source === 'runtime';
      const dshPlugins = plugins.filter((plugin) => plugin.core === true);
      const userPlugins = plugins.filter((plugin) => plugin.core !== true);
      const dshGroups = skillGroups.filter((group) => group.isDsh === true);
      const userGroups = skillGroups.filter((group) => group.isDsh !== true);
      const dshUngrouped = ungrouped.filter((skill) => isDshSkill(skill));
      const userUngrouped = ungrouped.filter((skill) => !isDshSkill(skill));
      const dshRules = rules.filter((rule) => rule.readOnly === true || rule.managedBy === 'dsh');
      const userRules = rules.filter((rule) => rule.readOnly !== true && rule.managedBy !== 'dsh');

      const toggleCollapsed = (id) => {
        setCollapsed((current) => ({ ...current, [id]: current[id] !== true }));
      };

      const body =
        state.loading && state.data === null
          ? h('div', { className: 'dshast-loading' }, tr(t, 'panel.loading'))
          : state.data === null
            ? h(
                'div',
                { className: 'dshast-empty' },
                h('h4', null, tr(t, 'panel.errorTitle')),
                h('p', null, state.error ?? tr(t, 'panel.emptyBody')),
                h(
                  'button',
                  { type: 'button', className: 'dshast-allbtn', onClick: () => store.refresh() },
                  tr(t, 'panel.errorRetry'),
                ),
              )
            : state.tab === 'plugins'
              ? renderPluginsTab(t, { userPlugins, dshPlugins, userGroups, userUngrouped, state, skillById, collapsed, toggleCollapsed })
              : state.tab === 'skills'
                ? renderSkillsTab(t, { userGroups, userUngrouped, dshGroups, dshUngrouped, state, collapsed, toggleCollapsed })
                : renderRulesTab(t, { userRules, dshRules, state, collapsed, toggleCollapsed });

      const allEnabled =
        data.counts.enabledSkills === data.counts.skills &&
        data.counts.enabledRules === data.counts.rules &&
        (data.counts.skills > 0 || data.counts.rules > 0);

      return h(
        'div',
        {
          className: 'dshast-backdrop',
          role: 'presentation',
          onClick: (event) => {
            if (event.target === event.currentTarget) store.close();
          },
        },
        h(
          'section',
          {
            className: 'dshast-modal',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': tr(t, 'panel.title'),
            onClick: (event) => event.stopPropagation(),
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                store.close();
              }
            },
          },
          h(
            'header',
            { className: 'dshast-head' },
            h('div', { className: 'dshast-mark' }, icon('assets', 17)),
            h(
              'div',
              { className: 'dshast-heading' },
              h('div', { className: 'dshast-title' }, tr(t, 'panel.title')),
              h('div', { className: 'dshast-sub' }, tr(t, 'panel.subtitle')),
            ),
            h(
              'div',
              { className: 'dshast-head-actions' },
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshast-iconbtn',
                  title: tr(t, 'panel.refresh'),
                  'aria-label': tr(t, 'panel.refresh'),
                  onClick: () => store.refresh(),
                },
                icon('refresh', 15),
              ),
              h(
                'button',
                {
                  type: 'button',
                  className: 'dshast-iconbtn',
                  title: tr(t, 'panel.close'),
                  'aria-label': tr(t, 'panel.close'),
                  onClick: () => store.close(),
                },
                icon('close', 15),
              ),
            ),
          ),
          h(
            'nav',
            { className: 'dshast-tabs', role: 'tablist' },
            tab(t, state, 'plugins', data.counts.plugins),
            tab(t, state, 'skills', data.counts.skills),
            tab(t, state, 'rules', data.counts.rules),
          ),
          h(
            'div',
            { className: 'dshast-toolbar' },
            h(
              'label',
              { className: 'dshast-search' },
              icon('search', 13),
              h('input', {
                ref: searchRef,
                value: state.query,
                placeholder: tr(t, 'panel.search'),
                'aria-label': tr(t, 'panel.search'),
                onChange: (event) => store.setQuery(event.target.value),
              }),
            ),
          ),
          h('div', { className: 'dshast-body' }, body),
          state.error !== null && state.data !== null
            ? h('div', { className: 'dshast-error' }, state.error)
            : null,
          h(
            'footer',
            { className: 'dshast-foot' },
            h('span', null, tr(t, 'badge.session')),
            h('span', null, '·'),
            h(
              'span',
              null,
              `${tr(t, 'footer.enabled')} `,
              h('strong', null, `${data.counts.enabledSkills}/${data.counts.skills}`),
              ` ${tr(t, 'unit.skills')} · `,
              h('strong', null, `${data.counts.enabledRules}/${data.counts.rules}`),
              ` ${tr(t, 'unit.rules')}`,
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dshast-allbtn',
                disabled: allEnabled,
                onClick: () => store.allOn(),
              },
              allEnabled ? tr(t, 'footer.allOnDone') : tr(t, 'panel.allOn'),
            ),
            h('span', { className: 'dshast-hint' }, tr(t, 'panel.hint')),
          ),
        ),
      );
    }

    function tab(t, state, id, count) {
      return h(
        'button',
        {
          type: 'button',
          role: 'tab',
          className: 'dshast-tab',
          'data-active': state.tab === id ? 'true' : 'false',
          'aria-selected': state.tab === id,
          onClick: () => store.setTab(id),
        },
        tr(t, `tabs.${id}`),
        h('span', { className: 'dshast-tab-count' }, String(count)),
      );
    }

    function sectionTitle(t, key) {
      return h('div', { className: 'dshast-section' }, tr(t, key));
    }

    function pluginRow(t, plugin, state, skillById) {
      return h(PluginRow, {
        key: plugin.id,
        t,
        plugin,
        skills: plugin.skillIds.map((id) => skillById.get(id)).filter(Boolean),
        pending: state.pending[`plugin:${plugin.id}`] === true,
      });
    }

    function skillGroupNodes(t, groups, collapsed, toggleCollapsed, state) {
      const nodes = [];
      for (const group of groups) {
        const isCollapsed = collapsed[group.id] === true;
        nodes.push(
          h(SkillGroupRow, {
            key: group.id,
            t,
            group,
            collapsed: isCollapsed,
            onToggleCollapse: () => toggleCollapsed(group.id),
          }),
        );
        if (!isCollapsed) {
          for (const skill of group.children) {
            nodes.push(
              h(SkillRow, {
                key: `${group.id}:${skill.id}`,
                t,
                skill,
                pending: state.pending[`skill:${skill.id}`] === true,
                parentOff: group.sessionEnabled === false && group.mixed !== true,
                child: true,
              }),
            );
          }
        }
      }
      return nodes;
    }

    function ungroupedNodes(t, skills, state, title) {
      const nodes = [];
      if (skills.length === 0) return nodes;
      if (title !== undefined) nodes.push(sectionTitle(t, title));
      for (const skill of skills) {
        nodes.push(
          h(SkillRow, {
            key: `solo:${skill.id}`,
            t,
            skill,
            pending: state.pending[`skill:${skill.id}`] === true,
            parentOff: false,
            child: false,
          }),
        );
      }
      return nodes;
    }

    function renderPluginsTab(t, options) {
      const { userPlugins, dshPlugins, userGroups, userUngrouped, state, skillById, collapsed, toggleCollapsed } = options;
      const userPacks = userGroups.filter((group) => group.kind === 'pack');
      const nodes = [];

      if (userPlugins.length > 0) {
        nodes.push(sectionTitle(t, 'section.myPlugins'));
        for (const plugin of userPlugins) nodes.push(pluginRow(t, plugin, state, skillById));
      }
      if (userPacks.length > 0) {
        nodes.push(sectionTitle(t, 'section.myPacks'));
        for (const group of userPacks) {
          nodes.push(
            h(SkillGroupRow, {
              key: `preview:${group.id}`,
              t,
              group,
              collapsed: true,
              onToggleCollapse: () => store.setTab('skills'),
            }),
          );
        }
      }
      if (userUngrouped.length > 0) {
        nodes.push(sectionTitle(t, 'section.mySkills'));
        for (const skill of userUngrouped) {
          nodes.push(
            h(SkillRow, {
              key: `plugins:solo:${skill.id}`,
              t,
              skill,
              pending: state.pending[`skill:${skill.id}`] === true,
              parentOff: false,
              child: false,
            }),
          );
        }
      }

      if (dshPlugins.length > 0) {
        const key = 'dsh:plugins';
        nodes.push(
          h(
            FolderRow,
            {
              key,
              t,
              title: 'folder.dsh',
              count: dshPlugins.length,
              open: collapsed[key] !== true,
              onToggle: () => toggleCollapsed(key),
            },
            dshPlugins.map((plugin) => pluginRow(t, plugin, state, skillById)),
          ),
        );
      }

      return nodes.length === 0 ? emptyState(t) : nodes;
    }

    function renderSkillsTab(t, options) {
      const { userGroups, userUngrouped, dshGroups, dshUngrouped, state, collapsed, toggleCollapsed } = options;
      const nodes = [];

      if (userGroups.length > 0) {
        nodes.push(sectionTitle(t, 'section.myPacks'));
        nodes.push(...skillGroupNodes(t, userGroups, collapsed, toggleCollapsed, state));
      }
      if (userUngrouped.length > 0) {
        nodes.push(...ungroupedNodes(t, userUngrouped, state, 'section.mySkills'));
      }

      if (dshGroups.length > 0 || dshUngrouped.length > 0) {
        const key = 'dsh:skills';
        const children = [
          ...skillGroupNodes(t, dshGroups, collapsed, toggleCollapsed, state),
          ...ungroupedNodes(t, dshUngrouped, state, 'skills.ungrouped'),
        ];
        const dshSkillCount = dshGroups.reduce((count, group) => count + group.children.length, 0) + dshUngrouped.length;
        nodes.push(
          h(
            FolderRow,
            {
              key,
              t,
              title: 'folder.dsh',
              count: dshSkillCount,
              open: collapsed[key] !== true,
              onToggle: () => toggleCollapsed(key),
            },
            children,
          ),
        );
      }

      return nodes.length === 0 ? emptyState(t) : nodes;
    }

    function renderRulesTab(t, options) {
      const { userRules, dshRules, state, collapsed, toggleCollapsed } = options;
      const nodes = [];
      if (userRules.length > 0) {
        nodes.push(sectionTitle(t, 'section.myRules'));
        nodes.push(...renderRules(t, userRules, state));
      }
      if (dshRules.length > 0) {
        const key = 'dsh:rules';
        nodes.push(
          h(
            FolderRow,
            {
              key,
              t,
              title: 'folder.dsh',
              count: dshRules.length,
              open: collapsed[key] !== true,
              onToggle: () => toggleCollapsed(key),
            },
            renderRules(t, dshRules, state),
          ),
        );
      }
      return nodes.length === 0 ? emptyState(t) : nodes;
    }

    function renderRules(t, rules, state) {
      return rules.map((rule) =>
        h(RuleRow, {
          key: rule.id,
          t,
          rule,
          pending: state.pending[`rule:${rule.id}`] === true,
        }),
      );
    }

    function FolderRow({ t, title, count, open, onToggle, children }) {
      return h(
        'div',
        { className: 'dshast-folder' },
        h(
          'div',
          {
            className: 'dshast-row dshast-folder-row',
            'data-kind': 'folder',
            'data-open': open ? 'true' : 'false',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': open,
            onClick: onToggle,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onToggle();
              }
            },
          },
          h('div', { className: 'dshast-icon' }, icon('folder', 15)),
          h(
            'div',
            { className: 'dshast-main' },
            h(
              'div',
              { className: 'dshast-row-title-line' },
              h('span', { className: 'dshast-row-title' }, tr(t, title)),
              h('span', { className: 'dshast-badge', 'data-tone': 'brand' }, String(count)),
            ),
            h('div', { className: 'dshast-summary' }, tr(t, 'folder.hint')),
          ),
          h('span', { className: 'dshast-chevron' }, icon('chevron', 13)),
        ),
        open ? h('div', { className: 'dshast-folder-body' }, children) : null,
      );
    }

    function emptyState(t) {
      return h(
        'div',
        { className: 'dshast-empty' },
        h('h4', null, tr(t, 'panel.emptyTitle')),
        h('p', null, tr(t, 'panel.emptyBody')),
      );
    }

    /* ------------------------------------------------------------------ */
    /* rows                                                               */
    /* ------------------------------------------------------------------ */

    function PluginRow({ t, plugin, skills, pending }) {
      const [expanded, setExpanded] = React.useState(false);
      const popover = useSkillPopover(t, skills);
      const disabled = !plugin.toggleable;
      const reason = !plugin.profileEnabled
        ? tr(t, 'row.profileDisabled')
        : plugin.skillCount === 0
          ? tr(t, 'row.profileLevel')
          : tr(t, 'row.togglePlugin');
      return h(
        'div',
        { className: 'dshast-row', 'data-kind': 'plugin' },
        h('div', { className: 'dshast-icon' }, icon('plugin', 15)),
        h(
          'div',
          { className: 'dshast-main' },
          h(
            'div',
            { className: 'dshast-row-title-line' },
            h('span', { className: 'dshast-row-title' }, plugin.title),
            plugin.core ? h('span', { className: 'dshast-badge' }, tr(t, 'badge.core')) : null,
            plugin.optional ? h('span', { className: 'dshast-badge' }, tr(t, 'badge.optional')) : null,
            !plugin.profileEnabled ? h('span', { className: 'dshast-badge', 'data-tone': 'warn' }, tr(t, 'badge.profileOff')) : null,
            plugin.error !== undefined ? h('span', { className: 'dshast-badge', 'data-tone': 'error' }, tr(t, 'badge.error')) : null,
          ),
          h('div', { className: 'dshast-summary' }, plugin.summary),
          h(
            'div',
            { className: 'dshast-meta' },
            plugin.version !== undefined ? h('span', { className: 'dshast-badge' }, `v${plugin.version}`) : null,
            plugin.skillCount > 0
              ? h(
                  'button',
                  {
                    type: 'button',
                    className: 'dshast-skill-chip',
                    title: tr(t, 'skills.groupHint'),
                    onMouseEnter: popover.show,
                    onMouseLeave: popover.scheduleClose,
                    onFocus: popover.show,
                    onBlur: popover.scheduleClose,
                    onClick: () => setExpanded((value) => !value),
                  },
                  `${plugin.skillCount} ${tr(t, 'unit.skills')}`,
                )
              : h('span', { className: 'dshast-badge' }, tr(t, 'row.noSkills')),
            h('span', { className: 'dshast-badge' }, tr(t, 'badge.profile')),
          ),
          expanded && skills.length > 0
            ? h(
                'div',
                { className: 'dshast-child' },
                skills.map((skill) =>
                  h(SkillRow, {
                    key: skill.id,
                    t,
                    skill,
                    pending: false,
                    parentOff: plugin.sessionEnabled === false && plugin.mixed !== true,
                    child: true,
                  }),
                ),
              )
            : null,
        ),
        h(
          'div',
          { className: 'dshast-side' },
          h(Switch, {
            checked: plugin.sessionEnabled,
            mixed: plugin.mixed,
            disabled: disabled || pending,
            label: reason,
            onChange: (next) => store.toggle('plugin', plugin.id, next),
          }),
        ),
        popover.node,
      );
    }

    function SkillGroupRow({ t, group, collapsed, onToggleCollapse }) {
      const popover = useSkillPopover(t, group.children);
      return h(
        'div',
        { className: 'dshast-row', 'data-kind': 'pack' },
        h('div', { className: 'dshast-icon' }, icon(group.kind === 'plugin' ? 'plugin' : 'pack', 15)),
        h(
          'div',
          { className: 'dshast-main' },
          h(
            'div',
            { className: 'dshast-row-title-line' },
            h('span', { className: 'dshast-row-title' }, group.title),
            h('span', { className: 'dshast-badge', 'data-tone': 'brand' }, group.kind === 'plugin' ? tr(t, 'badge.session') : tr(t, 'badge.pack')),
          ),
          h('div', { className: 'dshast-summary' }, group.summary),
          h(
            'div',
            { className: 'dshast-meta' },
            h(
              'button',
              {
                type: 'button',
                className: 'dshast-skill-chip',
                onMouseEnter: popover.show,
                onMouseLeave: popover.scheduleClose,
                onFocus: popover.show,
                onBlur: popover.scheduleClose,
                onClick: onToggleCollapse,
              },
              `${group.children.length} ${tr(t, 'unit.skills')} ${collapsed ? '▸' : '▾'}`,
            ),
          ),
        ),
        h(
          'div',
          { className: 'dshast-side' },
          h(Switch, {
            checked: group.sessionEnabled,
            mixed: group.mixed,
            disabled: !group.toggleable || group.pending,
            label: tr(t, 'row.togglePack'),
            onChange: (next) => store.toggle(group.kind, group.id, next),
          }),
        ),
        popover.node,
      );
    }

    function SkillRow({ t, skill, pending, parentOff, child }) {
      const disabled = parentOff || pending;
      return h(
        'div',
        { className: 'dshast-row', 'data-kind': 'skill' },
        h('div', { className: 'dshast-icon' }, icon('skill', child ? 13 : 15)),
        h(
          'div',
          { className: 'dshast-main' },
          h(
            'div',
            { className: 'dshast-row-title-line' },
            h('span', { className: `dshast-row-title ${child ? 'dshast-mono' : ''}` }, skill.name),
            skill.userInvocable ? h('span', { className: 'dshast-badge' }, tr(t, 'badge.session')) : null,
            skill.scopedOnly ? h('span', { className: 'dshast-badge', 'data-tone': 'brand' }, tr(t, 'badge.preset')) : null,
            skill.modelInvocable ? null : h('span', { className: 'dshast-badge' }, 'user-only'),
          ),
          h('div', { className: 'dshast-summary' }, skill.summary),
          h(
            'div',
            { className: 'dshast-meta' },
            skill.source !== undefined ? h('span', { className: 'dshast-badge' }, skill.source) : null,
            skill.provider !== undefined ? h('span', { className: 'dshast-badge' }, skill.provider) : null,
          ),
        ),
        h(
          'div',
          { className: 'dshast-side' },
          h(Switch, {
            checked: skill.enabled,
            mixed: false,
            disabled,
            label: tr(t, 'row.toggleSkill'),
            onChange: (next) => store.toggle('skill', skill.id, next),
          }),
        ),
      );
    }

    function RuleRow({ t, rule, pending }) {
      return h(
        'div',
        { className: 'dshast-row', 'data-kind': 'rule' },
        h('div', { className: 'dshast-icon' }, icon(rule.readOnly ? 'lock' : 'rule', 15)),
        h(
          'div',
          { className: 'dshast-main' },
          h(
            'div',
            { className: 'dshast-row-title-line' },
            h('span', { className: 'dshast-row-title' }, rule.title),
            h('span', { className: 'dshast-badge' }, tr(t, rule.scope === 'user' ? 'badge.user' : 'badge.project')),
            rule.readOnly ? h('span', { className: 'dshast-badge', 'data-tone': 'warn' }, tr(t, 'badge.dshManaged')) : null,
          ),
          h('div', { className: 'dshast-summary' }, rule.summary),
          h(
            'div',
            { className: 'dshast-meta' },
            h('span', { className: 'dshast-badge dshast-mono' }, rule.path),
            rule.readOnly ? h('span', { className: 'dshast-badge' }, tr(t, 'badge.readOnly')) : null,
          ),
        ),
        h(
          'div',
          { className: 'dshast-side' },
          h(Switch, {
            checked: rule.enabled,
            mixed: false,
            disabled: rule.readOnly || pending,
            label: rule.readOnly ? tr(t, 'row.readOnlyHint') : tr(t, 'row.toggleRule'),
            onChange: (next) => store.toggle('rule', rule.id, next),
          }),
        ),
      );
    }

    function Switch({ checked, mixed, disabled, label, onChange }) {
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          className: 'dshast-switch',
          'data-checked': checked ? 'true' : 'false',
          'data-mixed': mixed ? 'true' : 'false',
          'aria-checked': checked,
          'aria-label': label,
          title: label,
          disabled,
          onClick: () => onChange(!checked),
        },
        h('span', { className: 'dshast-knob' }),
      );
    }

    /* ------------------------------------------------------------------ */
    /* hover cards                                                        */
    /* ------------------------------------------------------------------ */

    function useSkillPopover(t, skills) {
      const [anchor, setAnchor] = React.useState(null);
      const timer = React.useRef(null);

      const cancelClose = () => {
        if (timer.current !== null) {
          clearTimeout(timer.current);
          timer.current = null;
        }
      };

      const close = () => {
        setAnchor(null);
      };

      const scheduleClose = () => {
        cancelClose();
        timer.current = setTimeout(() => {
          timer.current = null;
          setAnchor(null);
        }, 140);
      };

      React.useEffect(() => () => cancelClose(), []);

      const show = (event) => {
        cancelClose();
        const rect = event.currentTarget.getBoundingClientRect();
        const width = 320;
        const height = 260;
        const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8));
        const top = rect.bottom + height + 12 <= window.innerHeight ? rect.bottom + 8 : Math.max(8, rect.top - height - 8);
        setAnchor({ left, top });
      };

      return {
        show,
        scheduleClose,
        node:
          anchor === null || skills.length === 0
            ? null
            : h(
                'div',
                {
                  className: 'dshast-popover',
                  style: { left: `${anchor.left}px`, top: `${anchor.top}px` },
                  role: 'tooltip',
                  onMouseEnter: cancelClose,
                  onMouseLeave: scheduleClose,
                },
                h('div', { className: 'dshast-popover-title' }, tr(t, 'row.bundledSkills')),
                skills.slice(0, 20).map((skill) =>
                  h(
                    'div',
                    { key: skill.id, className: 'dshast-popover-item' },
                    h('div', { className: 'dshast-popover-name' }, skill.name),
                    h('div', { className: 'dshast-popover-summary' }, skill.summary),
                  ),
                ),
                skills.length > 20
                  ? h('div', { className: 'dshast-popover-summary' }, `+${skills.length - 20}`)
                  : null,
              ),
      };
    }

    /* ------------------------------------------------------------------ */
    /* optimistic state                                                   */
    /* ------------------------------------------------------------------ */

    function applyToggle(data, kind, id, enabled) {
      if (data === null || data === undefined) return data;
      const next = {
        ...data,
        plugins: data.plugins.map((plugin) => ({ ...plugin })),
        packs: data.packs.map((pack) => ({ ...pack })),
        skills: data.skills.map((skill) => ({ ...skill })),
        ungrouped: data.ungrouped.map((skill) => ({ ...skill })),
        rules: data.rules.map((rule) => ({ ...rule })),
        counts: { ...data.counts },
      };
      const skillById = new Map(next.skills.map((skill) => [skill.id, skill]));

      if (kind === 'skill') {
        const skill = skillById.get(id);
        if (skill !== undefined) skill.enabled = enabled;
      } else if (kind === 'plugin') {
        const plugin = next.plugins.find((entry) => entry.id === id);
        if (plugin !== undefined) {
          plugin.sessionEnabled = enabled;
          for (const skillId of plugin.skillIds) {
            const skill = skillById.get(skillId);
            if (skill !== undefined) skill.enabled = enabled;
          }
        }
      } else if (kind === 'pack') {
        const pack = next.packs.find((entry) => entry.id === id);
        if (pack !== undefined) {
          pack.sessionEnabled = enabled;
          for (const skillId of pack.skillIds) {
            const skill = skillById.get(skillId);
            if (skill !== undefined) skill.enabled = enabled;
          }
        }
      } else if (kind === 'rule') {
        const rule = next.rules.find((entry) => entry.id === id);
        if (rule !== undefined) rule.enabled = enabled;
      } else if (kind === 'all') {
        for (const skill of next.skills) skill.enabled = true;
        for (const rule of next.rules) rule.enabled = true;
        for (const plugin of next.plugins) plugin.sessionEnabled = plugin.skillIds.length > 0;
        for (const pack of next.packs) pack.sessionEnabled = true;
      }

      for (const group of [...next.plugins, ...next.packs]) {
        if (!Array.isArray(group.skillIds) || group.skillIds.length === 0) continue;
        const children = group.skillIds.map((skillId) => skillById.get(skillId)).filter(Boolean);
        const enabledCount = children.filter((skill) => skill.enabled).length;
        group.sessionEnabled = enabledCount === children.length;
        group.mixed = enabledCount > 0 && enabledCount < children.length;
      }
      next.ungrouped = next.skills.filter((skill) => skill.groupId === null);
      next.counts.enabledSkills = next.skills.filter((skill) => skill.enabled).length;
      next.counts.enabledRules = next.rules.filter((rule) => rule.enabled).length;
      return next;
    }

    /* ------------------------------------------------------------------ */
    /* plugin                                                             */
    /* ------------------------------------------------------------------ */

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        localeService = ctx.locale;
        ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-assets: dictionaries');
        ctx.effect(() => {
          const tag = document.createElement('style');
          tag.dataset.plugin = '@lew1sin/dsh-assets';
          tag.textContent = CSS;
          document.head.appendChild(tag);
          return () => {
            tag.remove();
          };
        }, 'dsh-assets: styles');
        ctx.effect(() => () => store.dispose(), 'dsh-assets: lifecycle');
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            {
              name: 'conversation.composer.dock',
              id: 'dsh-assets-launcher',
              order: 16,
              locale: NS,
            },
            AssetsLauncher,
          ),
        );
        ctx.slots.inject('shell.overlay', () =>
          ctx.slots.register(
            {
              name: 'shell.overlay',
              id: 'dsh-assets-panel',
              order: 45,
              locale: NS,
            },
            AssetsPanel,
          ),
        );
      },
    };
  },
});
