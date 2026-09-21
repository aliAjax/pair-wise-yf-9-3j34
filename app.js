// 界面层：DOM 渲染与事件绑定。业务逻辑见 rules.js（规则）、queue.js（复习队列）、storage.js（本地存储）
let state = AppStorage.load(Rules.createDefaultState());
if (!state.selectedId) state.selectedId = state.games[0]?.id || "";

let queueNotice = "";

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
  queueView: document.querySelector("#queueView")
};

function saveState() {
  AppStorage.save(state);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(iso) {
  if (!iso) return "-";
  const date = new Date(iso);
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function renderSummary() {
  const allRuleCount = state.games.reduce((sum, game) => sum + Rules.getAllRules(game).length, 0);
  const stale = [...state.games].sort((a, b) => Rules.daysSince(b.lastPlayed) - Rules.daysSince(a.lastPlayed))[0];
  els.gameCount.textContent = state.games.length;
  els.ruleCount.textContent = allRuleCount;
  els.staleGame.textContent = stale ? `${Rules.daysSince(stale.lastPlayed)}天` : "-";
}

function renderList() {
  const games = Rules.filterGames(state.games, {
    keyword: els.searchInput.value.trim(),
    player: els.playerFilter.value,
    complexity: els.complexityFilter.value,
    sortMode: els.sortMode.value
  });
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
              <span class="stale-ribbon">${Rules.daysSince(game.lastPlayed)}天未玩</span>
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
          <span class="pill">${Rules.daysSince(game.lastPlayed)}天未玩</span>
        </div>
      </div>
      ${Rules.RULE_SECTIONS.map((section) => renderRuleSection(section.label, section.key, game[section.key])).join("")}
      <form class="add-rule" id="ruleForm">
        <select id="ruleTypeInput">
          ${Rules.RULE_SECTIONS.map((section) => `<option value="${section.key}">${section.label}</option>`).join("")}
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
              (item, index) => `
                <li>
                  <span>${escapeHtml(item)}</span>
                  <button type="button" title="删除" data-rule-key="${key}" data-rule-index="${index}">×</button>
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
  const session = ReviewQueue.activeSession(state.sessions);
  const notice = queueNotice ? `<p class="queue-notice">${escapeHtml(queueNotice)}</p>` : "";
  const body = session ? renderActiveSession(session) : renderSessionStarter();
  els.queueView.innerHTML = notice + body + renderHistory();
  if (session) refreshQueueProgress();
}

function renderSessionStarter() {
  const presetPlayers = els.playerFilter.value === "all" ? 4 : Number(els.playerFilter.value);
  return `
    <form id="sessionForm" class="session-form">
      <label>
        本局人数
        <input id="sessionPlayersInput" type="number" min="1" max="12" value="${presetPlayers}" required />
      </label>
      <button class="primary" type="submit">生成复习队列</button>
      <p class="hint">按人数筛掉不合适的桌游，并快照当前的必复习卡片（容易忘的规则 + 常见争议）。</p>
    </form>
  `;
}

function renderActiveSession(session) {
  const excluded = session.excluded.length
    ? `<p class="hint">已按 ${session.playerCount} 人筛掉：${session.excluded
        .map((game) => `${escapeHtml(game.name)}（${game.minPlayers}-${game.maxPlayers}人）`)
        .join("、")}</p>`
    : "";
  return `
    <div class="session-head">
      <div class="session-title">
        <strong>第${session.version}次复习 · ${session.playerCount}人局</strong>
        <span class="tag active">进行中</span>
      </div>
      <span id="queueProgress" class="queue-progress"></span>
    </div>
    ${excluded}
    ${session.games.map(renderSessionGame).join("")}
    <div class="session-actions">
      <button id="completeSessionBtn" class="primary" type="button">完成复习并冻结快照</button>
      <button id="stopSessionBtn" type="button">中止本次复习</button>
      <p id="completeHint" class="hint"></p>
    </div>
  `;
}

function renderSessionGame(sessionGame) {
  return `
    <section class="queue-game">
      <h3>${escapeHtml(sessionGame.name)}</h3>
      ${sessionGame.cards.map(renderReviewCard).join("") || `<p class="empty">该游戏暂无必复习卡片。</p>`}
    </section>
  `;
}

function renderReviewCard(card) {
  return `
    <div class="review-card" data-card-id="${card.id}">
      <label class="review-check">
        <input type="checkbox" data-card-check="${card.id}" ${card.checked ? "checked" : ""} />
        <span class="pill">${card.typeLabel}</span>
        <span class="review-text">${escapeHtml(card.text)}</span>
      </label>
      <input
        type="text"
        class="conclusion-input"
        data-card-conclusion="${card.id}"
        value="${escapeHtml(card.conclusion)}"
        placeholder="争议结论：填写本次复习达成一致的裁定"
      />
      <span class="card-flags" data-card-flags="${card.id}"></span>
    </div>
  `;
}

function renderHistory() {
  const past = state.sessions.filter((session) => session.status !== "active").sort((a, b) => b.version - a.version);
  const items = past.length ? past.map(renderHistoryItem).join("") : `<p class="empty">还没有已完成或已停止的复习记录。</p>`;
  return `
    <div class="queue-history">
      <h3>历史快照</h3>
      <p class="hint">已完成的快照会冻结：之后修改卡片只会生成新版本，旧记录不变。</p>
      ${items}
    </div>
  `;
}

function renderHistoryItem(session) {
  const cardCount = session.games.reduce((sum, game) => sum + game.cards.length, 0);
  if (session.status === "stopped") {
    const stopped = ReviewQueue.progress(session);
    return `
      <div class="history-item">
        <div class="history-line">
          <strong>第${session.version}次 · ${session.playerCount}人局</strong>
          <span class="tag stopped">已停止</span>
          <span class="history-meta">${formatTime(session.stoppedAt)} · 停止前完成 ${stopped.done}/${stopped.total} 张</span>
        </div>
        <p class="stop-reason">停止原因：${escapeHtml(session.stopReason)}</p>
      </div>
    `;
  }
  return `
    <details class="history-item">
      <summary>
        <strong>第${session.version}次 · ${session.playerCount}人局</strong>
        <span class="tag done">已完成</span>
        <span class="history-meta">${formatTime(session.completedAt)} · ${session.games.length}个桌游 / ${cardCount}张卡片</span>
      </summary>
      ${session.games
        .map(
          (game) => `
            <div class="snapshot-game">
              <h4>${escapeHtml(game.name)}</h4>
              <ul class="snapshot-list">
                ${game.cards
                  .map(
                    (card) => `
                      <li>
                        <span class="pill">${card.typeLabel}</span>
                        <span>${escapeHtml(card.text)}</span>
                        <span class="conclusion">争议结论：${escapeHtml(card.conclusion)}</span>
                      </li>
                    `
                  )
                  .join("")}
              </ul>
            </div>
          `
        )
        .join("")}
    </details>
  `;
}

// 只更新进度、标记和完成按钮，不整体重绘，避免输入结论时丢失焦点
function refreshQueueProgress() {
  const session = ReviewQueue.activeSession(state.sessions);
  if (!session) return;
  const current = ReviewQueue.progress(session);
  const progressEl = document.querySelector("#queueProgress");
  if (progressEl) {
    progressEl.textContent = `${current.done}/${current.total} 张完成（已勾选 ${current.checked}，已填结论 ${current.concluded}）`;
  }
  session.games
    .flatMap((game) => game.cards)
    .forEach((card) => {
      const missing = [];
      if (!card.checked) missing.push("未勾选");
      if (!card.conclusion.trim()) missing.push("未填结论");
      const flags = document.querySelector(`[data-card-flags="${card.id}"]`);
      if (flags) flags.textContent = missing.join(" · ");
      const row = document.querySelector(`[data-card-id="${card.id}"]`);
      if (row) {
        row.classList.toggle("is-done", missing.length === 0);
        row.classList.toggle("is-missing", missing.length > 0);
      }
    });
  const completeButton = document.querySelector("#completeSessionBtn");
  if (completeButton) completeButton.disabled = !ReviewQueue.canComplete(session);
  const hint = document.querySelector("#completeHint");
  if (hint) {
    hint.textContent = current.ready
      ? "全部卡片已勾选并填写争议结论，可以完成并冻结快照。"
      : `还有 ${current.total - current.done} 张卡片未勾选或未填争议结论，整次复习不能完成。`;
  }
}

function renderAll() {
  saveState();
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
  const cover = await readFileAsDataUrl(els.coverInput.files[0]);
  const game = Rules.createGame({
    name: els.nameInput.value.trim(),
    minPlayers: Number(els.minPlayersInput.value),
    maxPlayers: Number(els.maxPlayersInput.value),
    duration: Number(els.durationInput.value),
    complexity: els.complexityInput.value,
    lastPlayed: els.lastPlayedInput.value,
    cover
  });
  state.games.unshift(game);
  state.selectedId = game.id;
  els.gameForm.reset();
  setDefaultDate();
  renderAll();
}

function setDefaultDate() {
  const date = new Date();
  date.setMonth(date.getMonth() - 2);
  els.lastPlayedInput.value = date.toISOString().slice(0, 10);
}

els.searchInput.addEventListener("input", renderAll);
els.playerFilter.addEventListener("change", renderAll);
els.complexityFilter.addEventListener("change", renderAll);
els.sortMode.addEventListener("change", renderAll);
els.gameForm.addEventListener("submit", addGame);

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
  Rules.addRule(game, key, text);
  renderAll();
});

els.detailView.addEventListener("click", (event) => {
  const ruleButton = event.target.closest("[data-rule-key]");
  const playedButton = event.target.closest("#playedTodayBtn");
  const deleteButton = event.target.closest("#deleteGameBtn");
  const game = state.games.find((item) => item.id === state.selectedId);
  if (!game) return;

  if (ruleButton) {
    Rules.removeRule(game, ruleButton.dataset.ruleKey, Number(ruleButton.dataset.ruleIndex));
    renderAll();
  }

  if (playedButton) {
    game.lastPlayed = new Date().toISOString().slice(0, 10);
    renderAll();
  }

  if (deleteButton) {
    state.games = state.games.filter((item) => item.id !== game.id);
    state.selectedId = state.games[0]?.id || "";
    const stopped = ReviewQueue.stopForRemovedGame(state.sessions, game);
    queueNotice = stopped ? stopped.stopReason : "";
    renderAll();
  }
});

els.queueView.addEventListener("submit", (event) => {
  if (event.target.id !== "sessionForm") return;
  event.preventDefault();
  const playerCount = Number(document.querySelector("#sessionPlayersInput").value);
  const result = ReviewQueue.createSession(state, playerCount);
  if (result.error) {
    queueNotice = result.error;
  } else {
    const total = result.session.games.reduce((sum, game) => sum + game.cards.length, 0);
    queueNotice = `已生成第${result.session.version}次复习队列：${result.session.games.length}个桌游、${total}张必复习卡片。`;
  }
  renderAll();
});

els.queueView.addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-card-check]");
  if (!checkbox) return;
  const session = ReviewQueue.activeSession(state.sessions);
  if (!session) return;
  ReviewQueue.toggleCard(session, checkbox.dataset.cardCheck);
  saveState();
  refreshQueueProgress();
});

els.queueView.addEventListener("input", (event) => {
  const input = event.target.closest("[data-card-conclusion]");
  if (!input) return;
  const session = ReviewQueue.activeSession(state.sessions);
  if (!session) return;
  ReviewQueue.setConclusion(session, input.dataset.cardConclusion, input.value);
  saveState();
  refreshQueueProgress();
});

els.queueView.addEventListener("click", (event) => {
  const session = ReviewQueue.activeSession(state.sessions);
  if (!session) return;

  if (event.target.closest("#completeSessionBtn")) {
    queueNotice = ReviewQueue.complete(session)
      ? `第${session.version}次复习已完成，快照已冻结。`
      : "还有卡片未勾选或未填争议结论，整次复习不能完成。";
    renderAll();
    return;
  }

  if (event.target.closest("#stopSessionBtn")) {
    ReviewQueue.stop(session, "已手动中止，本次复习不计入完成。");
    queueNotice = "本次复习已中止。";
    renderAll();
  }
});

setDefaultDate();
renderAll();
