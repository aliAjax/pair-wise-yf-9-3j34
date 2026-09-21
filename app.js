const cards = (...texts) => texts.map((text) => RuleCards.createCard(text));

const defaultState = {
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
      forgets: cards("商站建造前先确认道路或水路连接", "袋中随从抽完后不是重洗弃堆，而是从已回袋内容继续抽"),
      disputes: cards("事件顺序和玩家动作结算先后", "科技板是否能替代所有同类随从"),
      setup: cards("按人数放置货物板块", "每位玩家拿起始随从、商人和个人板"),
      scoring: cards("货物分数", "商站和市民乘区块", "金币和建筑剩余加分")
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
      forgets: cards("联邦连接时卫星数量和能量消耗要一起核对", "研究升到顶必须拿对应科技板限制"),
      disputes: cards("被动充能是否能拒绝", "星球改造费用受哪些能力影响"),
      setup: cards("随机终局计分板和回合得分板", "按种族设置起始资源和母星"),
      scoring: cards("终局计分板", "科技轨排名", "联邦和建筑分")
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
      forgets: cards("每轮结束先铺墙再补工厂展示区", "地板线扣分后清空对应砖"),
      disputes: cards("同色砖放置限制是否看整面墙", "中央区起始玩家标记是否必须拿"),
      setup: cards("按人数放工厂圆盘", "每个圆盘补4块砖"),
      scoring: cards("横竖相邻即时分", "完整行列和颜色终局加分")
    }
  ]
};

let state = RuleStorage.loadLibrary(defaultState);
state.games = RuleCards.migrateGames(state.games);
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

const reviewStore = RuleStorage.loadReviewStore();
ReviewQueue.validateAgainstGames(reviewStore, state.games);

let queueMessage = "";

const els = {
  searchInput: document.querySelector("#searchInput"),
  playerFilter: document.querySelector("#playerFilter"),
  complexityFilter: document.querySelector("#complexityFilter"),
  sortMode: document.querySelector("#sortMode"),
  gameForm: document.querySelector("#gameForm"),
  nameInput: document.querySelector("#nameInput"),
  minPlayersInput: document.querySelector("#minPlayersInput"),
  maxPlayersInput: document.querySelector("#maxPlayersInput"),
  durationInput: document.querySelector("#durationInput"),
  complexityInput: document.querySelector("#complexityInput"),
  lastPlayedInput: document.querySelector("#lastPlayedInput"),
  coverInput: document.querySelector("#coverInput"),
  gameList: document.querySelector("#gameList"),
  detailView: document.querySelector("#detailView"),
  gameCount: document.querySelector("#gameCount"),
  ruleCount: document.querySelector("#ruleCount"),
  staleGame: document.querySelector("#staleGame"),
  visibleCount: document.querySelector("#visibleCount"),
  partyPlayersInput: document.querySelector("#partyPlayersInput"),
  buildQueueBtn: document.querySelector("#buildQueueBtn"),
  queueStatus: document.querySelector("#queueStatus"),
  queueView: document.querySelector("#queueView"),
  historyView: document.querySelector("#historyView")
};

function saveState() {
  RuleStorage.saveLibrary(state);
}

function getFilteredGames() {
  const keyword = els.searchInput.value.trim();
  const player = els.playerFilter.value;
  const complexity = els.complexityFilter.value;
  const games = state.games.filter((game) => {
    const text = `${game.name}${RuleCards.getAllRules(game).join("")}`;
    const matchesKeyword = !keyword || text.includes(keyword);
    const matchesPlayer = player === "all" || RuleCards.fitsPlayers(game, Number(player));
    const matchesComplexity = complexity === "all" || game.complexity === complexity;
    return matchesKeyword && matchesPlayer && matchesComplexity;
  });

  if (els.sortMode.value === "name") return games.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  if (els.sortMode.value === "complexity") {
    const rank = { 轻: 1, 中: 2, 重: 3 };
    return games.sort((a, b) => rank[b.complexity] - rank[a.complexity]);
  }
  return games.sort((a, b) => RuleCards.daysSince(b.lastPlayed) - RuleCards.daysSince(a.lastPlayed));
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + RuleCards.getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => RuleCards.daysSince(b.lastPlayed) - RuleCards.daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${RuleCards.daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = getFilteredGames();
  els.visibleCount.textContent = `${games.length}个匹配`;
  els.gameList.innerHTML =
    games
      .map((game) => {
        const selected = game.id === state.selectedId ? "selected" : "";
        return `
          <article class="game-card ${selected}" data-game-id="${game.id}">
            <div class="cover">
              ${
                game.cover
                  ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />`
                  : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`
              }
              <span class="stale-ribbon">${RuleCards.daysSince(game.lastPlayed)}天未玩</span>
            </div>
            <div class="game-body">
              <h3>${escapeHtml(game.name)}</h3>
              <div class="game-meta">
                <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
                <span class="pill">${game.duration}分钟</span>
                <span class="pill heavy">${escapeHtml(game.complexity)}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join("") || `<p class="empty">没有符合筛选的桌游。</p>`;
}

function renderDetail() {
  const game = state.games.find((item) => item.id === state.selectedId) || state.games[0];
  if (!game) {
    els.detailView.innerHTML = `<p class="empty">先添加一个桌游。</p>`;
    return;
  }
  state.selectedId = game.id;
  els.detailView.innerHTML = `
    <div class="quick-card">
      <div class="detail-cover">
        ${game.cover ? `<img src="${game.cover}" alt="${escapeHtml(game.name)}封面" />` : `<span>${escapeHtml(game.name.slice(0, 2))}</span>`}
      </div>
      <div>
        <h2>${escapeHtml(game.name)}</h2>
        <div class="game-meta">
          <span class="pill">${game.minPlayers}-${game.maxPlayers}人</span>
          <span class="pill">${game.duration}分钟</span>
          <span class="pill heavy">${escapeHtml(game.complexity)}</span>
          <span class="pill">${RuleCards.daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${renderRuleSection("容易忘的规则", "forgets", game.forgets)}
      ${renderRuleSection("常见争议", "disputes", game.disputes)}
      ${renderRuleSection("开局准备", "setup", game.setup)}
      ${renderRuleSection("计分提醒", "scoring", game.scoring)}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          <option value="forgets">容易忘的规则</option>
          <option value="disputes">常见争议</option>
          <option value="setup">开局准备</option>
          <option value="scoring">计分提醒</option>
        </select>
        <textarea id="ruleTextInput" rows="3" placeholder="补充一条聚会前要看的提醒" required></textarea>
        <button class="primary" type="submit">加入规则卡片</button>
      </form>
      <div class="detail-actions">
        <button id="playedTodayBtn" type="button">标记今天玩过</button>
        <button id="deleteGameBtn" type="button">删除桌游</button>
      </div>
    </div>
  `;
}

function renderRuleSection(title, key, items) {
  return `
    <section class="rule-section">
      <h3>${title}</h3>
      <ul class="rule-list">
        ${
          items
            .map(
              (card, index) => `
                <li>
                  <span>${escapeHtml(card.text)}<em class="version">v${card.version}</em></span>
                  <span class="rule-actions">
                    <button type="button" title="编辑（生成新版本）" data-edit-key="${key}" data-rule-index="${index}">✎</button>
                    <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
                  </span>
                </li>
              `
            )
            .join("") || `<li><span>暂无内容。</span></li>`
        }
      </ul>
    </section>
  `;
}

function renderQueue() {
  const session = reviewStore.active;
  if (!session) {
    els.queueStatus.textContent = "暂无进行中的复习";
    els.queueView.innerHTML = queueMessage
      ? `<p class="empty">${escapeHtml(queueMessage)}</p>`
      : `<p class="empty">输入本局人数后生成复习队列，人数不合适的桌游会先被筛掉。</p>`;
  } else {
    const missing = ReviewQueue.getMissing(session);
    const ready = session.cards.length - missing.length;
    els.queueStatus.textContent = `${session.playerCount}人局 · 已就绪 ${ready}/${session.cards.length}`;
    const groups = [];
    for (const card of session.cards) {
      let group = groups.find((item) => item.gameId === card.gameId);
      if (!group) {
        group = { gameId: card.gameId, gameName: card.gameName, cards: [] };
        groups.push(group);
      }
      group.cards.push(card);
    }
    els.queueView.innerHTML = `
      ${
        session.excludedGames.length
          ? `<p class="excluded-note">已按 ${session.playerCount} 人筛掉：${session.excludedGames.map(escapeHtml).join("、")}（人数不符）</p>`
          : ""
      }
      ${groups
        .map(
          (group) => `
        <div class="queue-game">
          <h3>${escapeHtml(group.gameName)}</h3>
          ${group.cards
            .map(
              (card) => `
            <div class="queue-card">
              <label class="queue-check">
                <input type="checkbox" data-card-key="${card.key}" ${card.checked ? "checked" : ""} />
                <span>
                  <span class="pill">${card.typeLabel}</span><em class="version">v${card.version}</em>
                  ${escapeHtml(card.text)}
                </span>
              </label>
              <textarea rows="2" placeholder="填写争议结论（必填）" data-conclusion-key="${card.key}">${escapeHtml(card.conclusion)}</textarea>
            </div>
          `
            )
            .join("")}
        </div>
      `
        )
        .join("")}
      <div class="queue-footer">
        <button id="completeQueueBtn" class="primary" type="button" ${ReviewQueue.canComplete(session) ? "" : "disabled"}>完成本次复习并冻结快照</button>
        ${
          missing.length
            ? `<span class="missing-hint">还有 ${missing.length} 张卡片未勾选或未填写争议结论，整次不能完成。</span>`
            : `<span class="ready-hint">全部就绪，可以冻结本次快照。</span>`
        }
      </div>
    `;
  }
  renderHistory();
}

function renderHistory() {
  if (!reviewStore.history.length) {
    els.historyView.innerHTML = "";
    return;
  }
  els.historyView.innerHTML = `
    <h3>复习快照（冻结后不可改）</h3>
    ${reviewStore.history
      .map(
        (item) => `
      <article class="history-item">
        <div class="panel-head">
          <strong>${item.playerCount}人局 · ${item.cards.length}张卡片</strong>
          <span class="pill ${item.status === "completed" ? "done" : "stopped"}">${item.status === "completed" ? "已完成" : "已停止"}</span>
        </div>
        <p class="history-meta">生成 ${formatTime(item.createdAt)}${item.completedAt ? ` · 完成 ${formatTime(item.completedAt)}` : ""}</p>
        ${item.stopReason ? `<p class="stop-reason">${escapeHtml(item.stopReason)}</p>` : ""}
        <details>
          <summary>查看快照内容</summary>
          <ul class="rule-list">
            ${item.cards
              .map(
                (card) => `
              <li>
                <span>[${escapeHtml(card.gameName)} · ${card.typeLabel} · v${card.version}] ${escapeHtml(card.text)}${
                  card.conclusion ? `<br><em class="conclusion">争议结论：${escapeHtml(card.conclusion)}</em>` : ""
                }</span>
              </li>
            `
              )
              .join("")}
          </ul>
        </details>
      </article>
    `
      )
      .join("")}
  `;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

function renderAll() {
  saveState();
  RuleStorage.saveReviewStore(reviewStore);
  renderSummary();
  renderList();
  renderDetail();
  renderQueue();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve) => {
    if (!file) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

async function addGame(event) {
  event.preventDefault();
  const minPlayers = Number(els.minPlayersInput.value);
  const maxPlayers = Math.max(minPlayers, Number(els.maxPlayersInput.value));
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = {
    id: crypto.randomUUID(),
    name: els.nameInput.value.trim(),
    minPlayers,
    maxPlayers,
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover,
    forgets: cards("本局开始前先补充容易忘的规则。"),
    disputes: [],
    setup: cards("整理组件并按人数调整初始设置。"),
    scoring: cards("确认终局计分项和即时得分项。")
  };
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function buildQueue() {
  const playerCount = Number(els.partyPlayersInput.value);
  if (!playerCount) return;
  const suitable = state.games.filter((game) => RuleCards.fitsPlayers(game, playerCount));
  const excluded = state.games.filter((game) => !RuleCards.fitsPlayers(game, playerCount));
  const cardTotal = suitable.reduce((sum, game) => sum + RuleCards.getRuleCards(game).length, 0);
  if (!suitable.length) {
    queueMessage = `${playerCount}人局没有合适的桌游，队列未生成。`;
    renderAll();
    return;
  }
  if (!cardTotal) {
    queueMessage = "合适的桌游还没有任何规则卡片，先补充卡片再生成队列。";
    renderAll();
    return;
  }
  queueMessage = "";
  if (reviewStore.active) {
    ReviewQueue.stopSession(reviewStore, "已生成新的复习队列，原队列停止。");
  }
  reviewStore.active = ReviewQueue.createSession(
    suitable,
    playerCount,
    excluded.map((game) => game.name)
  );
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);
els.buildQueueBtn.addEventListener("click", buildQueue);

els.gameList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-game-id]");
  if (!card) return;
  state.selectedId = card.dataset.gameId;
  renderAll();
});

els.detailView.addEventListener("submit", (event) => {
  if (event.target.id !== "ruleForm") return;
  event.preventDefault();
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;
  const key = document.querySelector("#ruleTypeInput").value;
  const text = document.querySelector("#ruleTextInput").value.trim();
  if (!text) return;
  game[key].push(RuleCards.createCard(text));
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const editButton = event.target.closest("[data-edit-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    const key = ruleButton.dataset.ruleKey;
    const index = Number(ruleButton.dataset.ruleIndex);
    game[key].splice(index, 1);
    renderAll();
  }

  if (editButton) {
    const key = editButton.dataset.editKey;
    const index = Number(editButton.dataset.ruleIndex);
    const card = game[key][index];
    if (!card) return;
    const text = prompt("修改规则卡片（保存后生成新版本，已冻结快照不变）", card.text);
    if (text && text.trim() && RuleCards.editCard(game, key, index, text.trim())) {
      renderAll();
    }
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    ReviewQueue.handleGameRemoved(reviewStore, game);
    renderAll();
  }
});

els.queueView.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-card-key]");
  const conclusion = event.target.closest("[data-conclusion-key]");
  if (checkbox) ReviewQueue.toggleCard(reviewStore, checkbox.dataset.cardKey);
  if (conclusion) ReviewQueue.setConclusion(reviewStore, conclusion.dataset.conclusionKey, conclusion.value);
  if (checkbox || conclusion) renderAll();
});

els.queueView.addEventListener("click", (event) => {
  if (!event.target.closest("#completeQueueBtn")) return;
  // 有卡片缺勾选或争议结论时 canComplete 为 false，队列、统计和桌游数据保持原样。
  if (!ReviewQueue.canComplete(reviewStore.active)) return;
  ReviewQueue.completeSession(reviewStore);
  renderAll();
});

setDefaultDate();
renderAll();
