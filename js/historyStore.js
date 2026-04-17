/**
 * historyStore.js — プリント設定の履歴・お気に入り（localStorage）
 */
(function (global) {
  const LS_HISTORY = 'homePrint_historyPresets_v1';
  const LS_FAVORITES = 'homePrint_favoritePresets_v1';

  const FREE_HISTORY_MAX = 3;
  const FREE_FAVORITE_MAX = 1;

  const CONTENT_LABELS = {
    joshi: '助詞',
    hiragana: '五十音',
    maze: 'めいろ',
    maze_hiragana: 'ひらがな迷路',
    narabikae: '並び替え',
    sentence: '文章問題',
    custom: 'カスタム',
  };

  const LEVEL_LABELS = {
    beginner: '初級',
    intermediate: '中級',
    advanced: '上級',
  };

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v == null ? fallback : v;
    } catch (_e) {
      return fallback;
    }
  }

  function readLS(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null || raw === '') return fallback;
      return safeParse(raw, fallback);
    } catch (_e) {
      return fallback;
    }
  }

  function writeLS(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_e) {
      /* ignore */
    }
  }

  function newId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return global.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  function normalizeWords(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map((w) => String(w || '').trim()).filter(Boolean).slice(0, 8);
  }

  /**
   * @param {object} partial
   * @returns {object}
   */
  function normalizePreset(partial) {
    const p = partial && typeof partial === 'object' ? partial : {};
    return {
      id: typeof p.id === 'string' && p.id ? p.id : newId(),
      createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now(),
      title: typeof p.title === 'string' ? p.title : '',
      content: typeof p.content === 'string' ? p.content : 'joshi',
      level: typeof p.level === 'string' ? p.level : 'beginner',
      count: typeof p.count === 'number' && p.count > 0 ? p.count : 6,
      customMode: p.customMode === 'copy' ? 'copy' : 'trace',
      studentName: p.studentName === 'no' ? 'no' : 'yes',
      dateField: p.dateField === 'no' ? 'no' : 'yes',
      includeKatakana: !!p.includeKatakana,
      kanaMode: ['mix', 'hiragana', 'katakana'].includes(p.kanaMode) ? p.kanaMode : 'mix',
      includeAnswersSheet: !!p.includeAnswersSheet,
      customWords: normalizeWords(p.customWords),
      sourceHistoryId: typeof p.sourceHistoryId === 'string' ? p.sourceHistoryId : '',
      favoritedAt: typeof p.favoritedAt === 'number' ? p.favoritedAt : 0,
    };
  }

  function buildAutoTitle(state) {
    const c = CONTENT_LABELS[state.content] || state.content;
    const lv =
      state.content === 'custom'
        ? state.customMode === 'copy'
          ? '視写'
          : 'なぞり'
        : LEVEL_LABELS[state.level] || state.level;
    return `${c}・${lv}・${state.count}問`;
  }

  function getHistoryList() {
    const raw = readLS(LS_HISTORY, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => normalizePreset(x)).sort((a, b) => b.createdAt - a.createdAt);
  }

  function saveHistoryList(list) {
    writeLS(LS_HISTORY, list);
  }

  function getFavoriteList() {
    const raw = readLS(LS_FAVORITES, []);
    if (!Array.isArray(raw)) return [];
    return raw.map((x) => normalizePreset(x)).sort((a, b) => (b.favoritedAt || b.createdAt) - (a.favoritedAt || a.createdAt));
  }

  function saveFavoriteList(list) {
    writeLS(LS_FAVORITES, list);
  }

  /**
   * 生成成功時に呼ぶ。新しい履歴を先頭に追加し、無料は件数制限で古いものを削除（お気に入りは別キーのため残る）
   * @param {object} partial
   * @param {boolean} isPro
   */
  function pushHistory(partial, isPro) {
    const entry = normalizePreset({
      ...partial,
      id: newId(),
      createdAt: Date.now(),
    });
    if (!entry.title || !String(entry.title).trim()) {
      entry.title = buildAutoTitle(entry);
    }
    let list = getHistoryList();
    list = [entry, ...list.filter((e) => e.id !== entry.id)];
    if (!isPro && list.length > FREE_HISTORY_MAX) {
      list = list.slice(0, FREE_HISTORY_MAX);
    }
    saveHistoryList(list);
    return entry;
  }

  function updateHistoryTitle(id, title) {
    const list = getHistoryList();
    const idx = list.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    list[idx] = { ...list[idx], title: String(title || '').trim() || buildAutoTitle(list[idx]) };
    saveHistoryList(list);
    return list[idx];
  }

  function findHistoryById(id) {
    return getHistoryList().find((e) => e.id === id) || null;
  }

  function isHistoryFavorited(historyId) {
    return getFavoriteList().some(
      (f) => f.sourceHistoryId === historyId || (!f.sourceHistoryId && f.id === historyId)
    );
  }

  /**
   * 履歴1件をお気に入りにコピー追加／トグル削除
   * @returns {{ ok: boolean, error?: string, favorited?: boolean }}
   */
  function toggleFavoriteFromHistory(historyEntry, isPro) {
    const h = normalizePreset(historyEntry);
    const favs = getFavoriteList();
    const existingIdx = favs.findIndex((f) => f.sourceHistoryId === h.id || (!f.sourceHistoryId && f.id === h.id));
    if (existingIdx >= 0) {
      favs.splice(existingIdx, 1);
      saveFavoriteList(favs);
      return { ok: true, favorited: false };
    }
    if (!isPro && favs.length >= FREE_FAVORITE_MAX) {
      return {
        ok: false,
        error: 'free_favorite_limit',
        favorited: false,
      };
    }
    const copy = normalizePreset({
      ...h,
      id: newId(),
      sourceHistoryId: h.id,
      favoritedAt: Date.now(),
      title: h.title || buildAutoTitle(h),
    });
    saveFavoriteList([copy, ...favs]);
    return { ok: true, favorited: true };
  }

  function removeFavorite(favoriteId) {
    const favs = getFavoriteList().filter((f) => f.id !== favoriteId);
    saveFavoriteList(favs);
  }

  function updateFavoriteTitle(id, title) {
    const favs = getFavoriteList();
    const idx = favs.findIndex((f) => f.id === id);
    if (idx < 0) return null;
    const base = favs[idx];
    favs[idx] = {
      ...base,
      title: String(title || '').trim() || buildAutoTitle(base),
    };
    saveFavoriteList(favs);
    return favs[idx];
  }

  global.PrintHistory = {
    LS_HISTORY,
    LS_FAVORITES,
    FREE_HISTORY_MAX,
    FREE_FAVORITE_MAX,
    newId,
    normalizePreset,
    buildAutoTitle,
    getHistoryList,
    getFavoriteList,
    pushHistory,
    updateHistoryTitle,
    findHistoryById,
    isHistoryFavorited,
    toggleFavoriteFromHistory,
    removeFavorite,
    updateFavoriteTitle,
    CONTENT_LABELS,
    LEVEL_LABELS,
  };
})(typeof window !== 'undefined' ? window : globalThis);
