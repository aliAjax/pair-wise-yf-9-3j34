// 规则领域层：规则卡片的结构、版本、筛选与统计逻辑。
window.RuleCards = (() => {
  const RULE_TYPES = [
    { key: "forgets", label: "容易忘的规则" },
    { key: "disputes", label: "常见争议" },
    { key: "setup", label: "开局准备" },
    { key: "scoring", label: "计分提醒" }
  ];

  // 卡片带 id 和 version：修改只产生新版本，已冻结快照里的旧版本不受影响。
  function createCard(text) {
    return { id: crypto.randomUUID(), version: 1, text: String(text) };
  }

  function asCard(item) {
    if (item && typeof item === "object") {
      return {
        id: item.id || crypto.randomUUID(),
        version: Number(item.version) || 1,
        text: String(item.text ?? "")
      };
    }
    return createCard(item);
  }

  // 兼容旧存档：规则原本是纯字符串，迁移为带版本的卡片对象。
  function migrateGames(games) {
    return games.map((game) => {
      const next = { ...game };
      for (const { key } of RULE_TYPES) {
        next[key] = (Array.isArray(next[key]) ? next[key] : []).map(asCard);
      }
      return next;
    });
  }

  function getAllRules(game) {
    return RULE_TYPES.flatMap(({ key }) => game[key].map((card) => card.text));
  }

  function getRuleCards(game) {
    return RULE_TYPES.flatMap(({ key, label }) =>
      game[key].map((card, index) => ({ key, label, index, card }))
    );
  }

  function daysSince(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return Math.max(0, Math.floor((Date.now() - date) / 86400000));
  }

  function fitsPlayers(game, playerCount) {
    return playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
  }

  // 编辑即升版本，返回修改后的卡片；内容没变则返回 null。
  function editCard(game, key, index, text) {
    const card = game[key][index];
    if (!card || card.text === text) return null;
    card.text = text;
    card.version += 1;
    return card;
  }

  return {
    RULE_TYPES,
    createCard,
    migrateGames,
    getAllRules,
    getRuleCards,
    daysSince,
    fitsPlayers,
    editCard
  };
})();
