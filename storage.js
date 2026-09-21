// 本地存储层：只负责 localStorage 的读写，不含业务规则。
window.RuleStorage = (() => {
  const LIBRARY_KEY = "zfl18-boardgame-rule-cards";
  const REVIEW_KEY = "zfl18-boardgame-review-queue";

  function read(key, fallback) {
    const saved = localStorage.getItem(key);
    if (!saved) return structuredClone(fallback);
    try {
      return { ...structuredClone(fallback), ...JSON.parse(saved) };
    } catch {
      return structuredClone(fallback);
    }
  }

  function loadLibrary(defaultState) {
    return read(LIBRARY_KEY, defaultState);
  }

  function saveLibrary(state) {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(state));
  }

  // 复习队列存储：active 为进行中的队列，history 为已冻结/已停止的快照，旧记录只增不改。
  function loadReviewStore() {
    return read(REVIEW_KEY, { active: null, history: [] });
  }

  function saveReviewStore(store) {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(store));
  }

  return { loadLibrary, saveLibrary, loadReviewStore, saveReviewStore };
})();
