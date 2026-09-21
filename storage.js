// 本地存储业务：只负责状态在 localStorage 的读写，不关心业务结构
const AppStorage = (() => {
  const STORAGE_KEY = "zfl18-boardgame-rule-cards";

  function load(defaultState) {
    const fallback = structuredClone(defaultState);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return fallback;
    try {
      return { ...fallback, ...JSON.parse(saved) };
    } catch {
      return fallback;
    }
  }

  function save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  return { STORAGE_KEY, load, save };
})();
