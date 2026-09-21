// 队列业务：聚会前复习队列的生成、进度、完成冻结与停止
const ReviewQueue = (() => {
  function activeSession(sessions) {
    return sessions.find((session) => session.status === "active") || null;
  }

  function nextVersion(sessions) {
    return sessions.reduce((max, session) => Math.max(max, session.version || 0), 0) + 1;
  }

  // 生成队列时按人数筛掉不合适的桌游，并把必复习卡片快照进本次队列
  function createSession(state, playerCount) {
    if (activeSession(state.sessions)) {
      return { error: "已有进行中的复习队列，请先完成或中止。" };
    }
    const eligible = state.games.filter((game) => Rules.fitsPlayers(game, playerCount));
    const excluded = state.games
      .filter((game) => !Rules.fitsPlayers(game, playerCount))
      .map((game) => ({ name: game.name, minPlayers: game.minPlayers, maxPlayers: game.maxPlayers }));
    if (!eligible.length) {
      return { error: `没有适合 ${playerCount} 人局的桌游。` };
    }

    const games = eligible.map((game) => ({
      gameId: game.id,
      name: game.name,
      cards: Rules.getMustReviewCards(game).map((card) => ({
        id: crypto.randomUUID(),
        ...card,
        checked: false,
        conclusion: ""
      }))
    }));
    const totalCards = games.reduce((sum, game) => sum + game.cards.length, 0);
    if (!totalCards) {
      return { error: "适合的桌游暂无任何必复习卡片。" };
    }

    const session = {
      id: crypto.randomUUID(),
      version: nextVersion(state.sessions),
      playerCount,
      status: "active",
      createdAt: new Date().toISOString(),
      completedAt: "",
      stoppedAt: "",
      stopReason: "",
      excluded,
      games
    };
    state.sessions.push(session);
    return { session };
  }

  function allCards(session) {
    return session.games.flatMap((game) => game.cards);
  }

  function cardReady(card) {
    return card.checked && card.conclusion.trim().length > 0;
  }

  function progress(session) {
    const cards = allCards(session);
    const total = cards.length;
    const checked = cards.filter((card) => card.checked).length;
    const concluded = cards.filter((card) => card.conclusion.trim()).length;
    const done = cards.filter(cardReady).length;
    return { total, checked, concluded, done, ready: total > 0 && done === total };
  }

  // 任一张卡片未勾选或未填争议结论，整次都不能完成
  function canComplete(session) {
    return session.status === "active" && progress(session).ready;
  }

  function findCard(session, cardId) {
    return allCards(session).find((card) => card.id === cardId) || null;
  }

  function toggleCard(session, cardId) {
    if (session.status !== "active") return false;
    const card = findCard(session, cardId);
    if (!card) return false;
    card.checked = !card.checked;
    return true;
  }

  function setConclusion(session, cardId, text) {
    if (session.status !== "active") return false;
    const card = findCard(session, cardId);
    if (!card) return false;
    card.conclusion = text;
    return true;
  }

  // 完成后冻结本次快照，旧记录不再被修改
  function complete(session) {
    if (!canComplete(session)) return false;
    session.status = "completed";
    session.completedAt = new Date().toISOString();
    deepFreeze(session);
    return true;
  }

  function stop(session, reason) {
    if (session.status !== "active") return false;
    session.status = "stopped";
    session.stoppedAt = new Date().toISOString();
    session.stopReason = reason;
    deepFreeze(session);
    return true;
  }

  // 桌游从收藏移除时，包含它的未完成队列停止并说明原因
  function stopForRemovedGame(sessions, game) {
    const active = activeSession(sessions);
    if (!active) return null;
    if (!active.games.some((item) => item.gameId === game.id)) return null;
    stop(active, `桌游《${game.name}》已从收藏移除，本次复习队列无法继续。`);
    return active;
  }

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  }

  return {
    activeSession,
    createSession,
    progress,
    canComplete,
    toggleCard,
    setConclusion,
    complete,
    stop,
    stopForRemovedGame
  };
})();
