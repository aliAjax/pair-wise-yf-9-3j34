// 规则业务：桌游收藏、规则卡片与筛选逻辑
const Rules = (() => {
  const RULE_SECTIONS = [
    { key: "forgets", label: "容易忘的规则" },
    { key: "disputes", label: "常见争议" },
    { key: "setup", label: "开局准备" },
    { key: "scoring", label: "计分提醒" }
  ];

  // 必复习卡片只取「容易忘的规则」和「常见争议」两类
  const MUST_REVIEW_KEYS = ["forgets", "disputes"];

  function createDefaultState() {
    return {
      selectedId: "",
      games: [
        {
          id: crypto.randomUUID(),
          name: "奥尔良",
          minPlayers: 2,
          maxPlayers: 4,
          duration: 90,
          complexity: "中",
          lastPlayed: "2025-11-20",
          cover: "",
          forgets: ["商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"],
          disputes: ["事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"],
          setup: ["按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"],
          scoring: ["货物分数", "商站和市民乘区块", "金币和建筑剩余加分"]
        },
        {
          id: crypto.randomUUID(),
          name: "盖亚计划",
          minPlayers: 1,
          maxPlayers: 4,
          duration: 150,
          complexity: "重",
          lastPlayed: "2025-08-02",
          cover: "",
          forgets: ["联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"],
          disputes: ["被动充能是否能拒绝", "星球改造费用受哪些能力影响"],
          setup: ["随机终局计分板和回合得分板", "按种族设置起始资源和母星"],
          scoring: ["终局计分板", "科技轨排名", "联邦和建筑分"]
        },
        {
          id: crypto.randomUUID(),
          name: "花砖物语",
          minPlayers: 2,
          maxPlayers: 4,
          duration: 45,
          complexity: "轻",
          lastPlayed: "2026-03-15",
          cover: "",
          forgets: ["每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"],
          disputes: ["同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"],
          setup: ["按人数放工厂圆盘", "每个圆盘补4块砖"],
          scoring: ["横竖相邻即时分", "完整行列和颜色终局加分"]
        }
      ],
      sessions: []
    };
  }

  function createGame({ name, minPlayers, maxPlayers, duration, complexity, lastPlayed, cover }) {
    return {
      id: crypto.randomUUID(),
      name,
      minPlayers,
      maxPlayers: Math.max(minPlayers, maxPlayers),
      duration,
      complexity,
      lastPlayed,
      cover,
      forgets: ["本局开始前先补充容易忘的规则。"],
      disputes: [],
      setup: ["整理组件并按人数调整初始设置。"],
      scoring: ["确认终局计分项和即时得分项。"]
    };
  }

  function getAllRules(game) {
    return [...game.forgets, ...game.disputes, ...game.setup, ...game.scoring];
  }

  function getMustReviewCards(game) {
    return RULE_SECTIONS.filter((section) => MUST_REVIEW_KEYS.includes(section.key)).flatMap((section) =>
      game[section.key].map((text) => ({ type: section.key, typeLabel: section.label, text }))
    );
  }

  function addRule(game, key, text) {
    game[key].push(text);
  }

  function removeRule(game, key, index) {
    game[key].splice(index, 1);
  }

  function fitsPlayers(game, playerCount) {
    return playerCount >= game.minPlayers && playerCount <= game.maxPlayers;
  }

  function daysSince(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return Math.max(0, Math.floor((Date.now() - date) / 86400000));
  }

  function filterGames(games, { keyword, player, complexity, sortMode }) {
    const filtered = games.filter((game) => {
      const text = `${game.name}${getAllRules(game).join("")}`;
      const matchesKeyword = !keyword || text.includes(keyword);
      const matchesPlayer = player === "all" || fitsPlayers(game, Number(player));
      const matchesComplexity = complexity === "all" || game.complexity === complexity;
      return matchesKeyword && matchesPlayer && matchesComplexity;
    });

    if (sortMode === "name") return filtered.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    if (sortMode === "complexity") {
      const rank = { 轻: 1, 中: 2, 重: 3 };
      return filtered.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
    }
    return filtered.sort((a, b) => daysSince(b.lastPlayed) - daysSince(a.lastPlayed));
  }

  return {
    RULE_SECTIONS,
    MUST_REVIEW_KEYS,
    createDefaultState,
    createGame,
    getAllRules,
    getMustReviewCards,
    addRule,
    removeRule,
    fitsPlayers,
    daysSince,
    filterGames
  };
})();
