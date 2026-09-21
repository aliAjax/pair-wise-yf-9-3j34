// 队列状态层：复习队列的创建、勾选、结论、完成冻结与停止。
window.ReviewQueue = (() => {
  // 生成队列时把卡片文本和版本快照进队列，之后改卡片不影响本次队列。
  function createSession(games, playerCount, excludedNames) {
    const cards = [];
    for (const game of games) {
      for (const { key, label, card } of RuleCards.getRuleCards(game)) {
        cards.push({
          key: `${game.id}:${card.id}`,
          gameId: game.id,
          gameName: game.name,
          type: key,
          typeLabel: label,
          cardId: card.id,
          version: card.version,
          text: card.text,
          checked: false,
          conclusion: ""
        });
      }
    }
    return {
      id: crypto.randomUUID(),
      playerCount,
      excludedGames: excludedNames || [],
      createdAt: new Date().toISOString(),
      status: "active",
      stopReason: "",
      completedAt: "",
      cards
    };
  }

  function findCard(session, cardKey) {
    return session?.cards.find((card) => card.key === cardKey);
  }

  function toggleCard(store, cardKey) {
    if (store.active?.status !== "active") return;
    const card = findCard(store.active, cardKey);
    if (card) card.checked = !card.checked;
  }

  function setConclusion(store, cardKey, text) {
    if (store.active?.status !== "active") return;
    const card = findCard(store.active, cardKey);
    if (card) card.conclusion = text;
  }

  // 必复习卡片必须既勾选又填写争议结论，缺任意一项都算未完成。
  function getMissing(session) {
    if (!session) return [];
    return session.cards.filter((card) => !card.checked || !card.conclusion.trim());
  }

  function canComplete(session) {
    return (
      !!session &&
      session.status === "active" &&
      session.cards.length > 0 &&
      getMissing(session).length === 0
    );
  }

  // 完成即冻结：快照进入 history，旧记录此后不再改动。
  function completeSession(store) {
    if (!canComplete(store.active)) return null;
    const snapshot = {
      ...store.active,
      status: "completed",
      completedAt: new Date().toISOString(),
      cards: store.active.cards.map((card) => ({ ...card }))
    };
    store.history.unshift(snapshot);
    store.active = null;
    return snapshot;
  }

  function stopSession(store, reason) {
    if (store.active?.status !== "active") return false;
    const stopped = {
      ...store.active,
      status: "stopped",
      stopReason: reason,
      cards: store.active.cards.map((card) => ({ ...card }))
    };
    store.history.unshift(stopped);
    store.active = null;
    return true;
  }

  // 桌游从收藏移除时，引用它的未完成队列停止并记录原因。
  function handleGameRemoved(store, game) {
    if (!store.active) return false;
    if (!store.active.cards.some((card) => card.gameId === game.id)) return false;
    return stopSession(store, `桌游「${game.name}」已从收藏移除，本次复习队列停止。`);
  }

  // 启动时校验：存档里的队列若引用了已不存在的桌游，同样停止并说明原因。
  function validateAgainstGames(store, games) {
    if (!store.active) return;
    const ids = new Set(games.map((game) => game.id));
    const missing = new Map();
    for (const card of store.active.cards) {
      if (!ids.has(card.gameId)) missing.set(card.gameId, card.gameName);
    }
    if (missing.size) {
      stopSession(store, `桌游「${[...missing.values()].join("」「")}」已从收藏移除，本次复习队列停止。`);
    }
  }

  return {
    createSession,
    toggleCard,
    setConclusion,
    getMissing,
    canComplete,
    completeSession,
    stopSession,
    handleGameRemoved,
    validateAgainstGames
  };
})();
