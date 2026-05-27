const state = {
  chapters: [],
  activeChapter: null,
  learning: null,
  health: null,
  contentReady: false,
  readerContext: null,
  profile: JSON.parse(localStorage.getItem("englishCoachProfile") || "{}")
};

const TRACK_LABELS = {
  listening: "听力",
  speaking: "口语",
  vocabulary: "词汇",
  reading: "阅读",
  writing: "写作",
  ai: "AI 辅助",
  understanding: "认知复盘"
};

const STATUS_LABELS = {
  not_started: "未开始",
  in_progress: "进行中",
  completed: "已完成",
  reviewed: "已复盘"
};

const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (/^!\[/.test(line)) continue;
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMarkdown(list[1])}</li>`);
      continue;
    }
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  if (inList) html.push("</ul>");
  return html.join("");
}

function inlineMarkdown(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, "$1");
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || `Request failed: ${response.status}`);
  }
  return data;
}

function getWeakAreas() {
  return Array.from($$('input[name="weakArea"]:checked')).map(el => el.value);
}

function currentProfile() {
  return {
    level: $("#level").value,
    goal: $("#goal").value.trim(),
    minutes: Number($("#minutes").value || 45),
    weakAreas: getWeakAreas(),
    scenario: $("#scenario").value
  };
}

function loadProfile(profile = state.profile) {
  $("#level").value = profile.level || "B1";
  $("#goal").value = profile.goal || "提升听说读写综合能力";
  $("#minutes").value = profile.minutes || 45;
  $("#scenario").value = profile.scenario || "daily";
  $$('input[name="weakArea"]').forEach(el => {
    el.checked = (profile.weakAreas || []).includes(el.value);
  });
}

function setContentReady(ready) {
  state.contentReady = ready;
  $$(".needs-content").forEach(el => {
    el.disabled = !ready;
  });
  $$(".chapter-item").forEach(el => {
    el.disabled = !ready;
  });
}

function showSetupBanner(health) {
  const banner = $("#setupBanner");
  if (health.contentRootExists) {
    banner.classList.add("hidden");
    return;
  }

  banner.classList.remove("hidden");
  banner.innerHTML = `
    <div class="setup-inner">
      <h2>未找到英语学习指南内容</h2>
      <p>请把 <code>english-coach-agent</code> 与 <code>English-level-up-tips</code> 放在同一 workspace 目录下，然后重新启动。</p>
      <p><strong>Windows PowerShell</strong></p>
      <pre>New-Item -ItemType Directory -Force english-coach-workspace | Out-Null
Set-Location english-coach-workspace
git clone https://github.com/gloweaseco-leo/english-coach-agent.git
git clone https://github.com/byoungd/English-level-up-tips.git
Set-Location english-coach-agent
npm start</pre>
      <p><strong>macOS / Linux</strong></p>
      <pre>mkdir -p english-coach-workspace && cd english-coach-workspace
git clone https://github.com/gloweaseco-leo/english-coach-agent.git
git clone https://github.com/byoungd/English-level-up-tips.git
cd english-coach-agent && npm start</pre>
      <p class="muted">当前检测路径：<code>${escapeHtml(health.contentRoot)}</code></p>
      <p class="warn">本工具基于 CC BY-NC 4.0 指南，仅限非商业学习用途。</p>
    </div>
  `;
}

async function saveProfile() {
  state.profile = currentProfile();
  localStorage.setItem("englishCoachProfile", JSON.stringify(state.profile));
  try {
    await api("/api/profile", { method: "POST", body: JSON.stringify(state.profile) });
    addMessage("agent", "学习档案已保存（本地 + 服务端）。后续计划和建议会按此档案生成。");
  } catch (error) {
    addMessage("agent", `档案已保存到浏览器，但服务端同步失败：${error.message}`);
  }
}

function renderCoachMeta(health) {
  const el = $("#coachMeta");
  if (!health) {
    el.classList.add("hidden");
    return;
  }
  const modeLabels = {
    local: "Local Rule",
    openai: "OpenAI-compatible",
    ollama: "Ollama"
  };
  el.classList.remove("hidden");
  el.innerHTML = `
    <span>Coach Mode: <strong>${escapeHtml(modeLabels[health.coachMode] || health.coachMode)}</strong></span>
    <span>RAG chunks: ${health.rag?.chunks ?? 0}</span>
    <span>Provider: ${health.providerReady ? "就绪" : "未就绪"}</span>
  `;
}

function renderProviderWarning(health, chatWarning) {
  const el = $("#providerWarning");
  const msg = chatWarning || health?.providerWarning;
  if (!msg) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.textContent = msg;
}

function addMessage(role, text, references = [], meta = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;
  let metaHtml = "";
  if (role === "agent" && meta.provider) {
    const modeLabels = { local: "Local Rule", openai: "OpenAI-compatible", ollama: "Ollama" };
    metaHtml = `<div class="msg-meta">${escapeHtml(modeLabels[meta.provider] || meta.provider)} · RAG${meta.fallbackUsed ? " · fallback" : ""}</div>`;
  }
  wrapper.innerHTML = `${metaHtml}<pre>${escapeHtml(text)}</pre>`;
  if (references.length) {
    const refs = document.createElement("div");
    refs.className = "refs";
    refs.innerHTML = references.map(ref => `
      <button class="ref" data-path="${escapeHtml(ref.path)}" data-snippet="${escapeHtml(ref.summary || "")}" data-title="${escapeHtml(ref.title || ref.label || "")}">
        <strong>${escapeHtml(ref.label || ref.title)}</strong>
        ${ref.heading ? `<span class="ref-heading">${escapeHtml(ref.heading)}</span>` : ""}
        <span class="ref-path">${escapeHtml(ref.path)}</span>
        <p>${escapeHtml(ref.summary)}</p>
      </button>
    `).join("");
    wrapper.appendChild(refs);
  }
  $("#messages").appendChild(wrapper);
  $("#messages").scrollIntoView({ block: "end", behavior: "smooth" });
}

function switchTab(name) {
  $$(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });
  $$(".view").forEach(view => {
    view.classList.toggle("active", view.id === name);
  });
}

async function loadChapters() {
  if (!state.contentReady) {
    $("#chapters").innerHTML = `<p class="muted">请先配置 English-level-up-tips 内容。</p>`;
    return;
  }
  const data = await api("/api/chapters");
  state.chapters = data.chapters;
  $("#chapters").innerHTML = state.chapters.map(chapter => `
    <button class="chapter-item" data-path="${escapeHtml(chapter.path)}">
      ${escapeHtml(chapter.label || chapter.title)}
    </button>
  `).join("");
}

async function openChapter(path, context = null) {
  if (!state.contentReady) return;
  const data = await api(`/api/chapter?path=${encodeURIComponent(path)}`);
  state.activeChapter = data.path;
  state.readerContext = context;
  $("#readerTitle").textContent = data.title;
  $("#readerPath").textContent = data.path;

  const banner = $("#readerRefBanner");
  if (context?.fromRef) {
    banner.classList.remove("hidden");
    banner.innerHTML = `
      <strong>来自聊天引用</strong>
      <span>${escapeHtml(context.title || data.title)}</span>
      ${context.snippet ? `<p class="ref-snippet">${escapeHtml(context.snippet)}</p>` : ""}
    `;
  } else {
    banner.classList.add("hidden");
    banner.innerHTML = "";
  }

  $("#readerContent").innerHTML = markdownToHtml(data.markdown);
  $$(".chapter-item").forEach(button => {
    button.classList.toggle("active", button.dataset.path === data.path);
  });
  switchTab("reader");
}

function renderTodayTask(containerId, todayData) {
  const el = document.getElementById(containerId);
  if (!todayData || todayData.status === "no_plan") {
    el.classList.add("hidden");
    el.innerHTML = "";
    return;
  }

  el.classList.remove("hidden");

  if (todayData.status === "completed") {
    el.innerHTML = `
      <h3>今日任务</h3>
      <p>${escapeHtml(todayData.message)}</p>
    `;
    return;
  }

  const task = todayData.task;
  el.innerHTML = `
    <h3>今日任务 · Day ${task.day}</h3>
    <p><strong>${escapeHtml(task.title)}</strong> · ${task.minutes} 分钟 · ${STATUS_LABELS[task.status]}</p>
    <ul>${task.instructions.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    <p class="muted">输出要求：${escapeHtml(task.outputRequirement)}</p>
    <div class="task-actions">
      ${task.status === "not_started" ? `<button data-task-action="start" data-task-id="${escapeHtml(task.id)}">开始任务</button>` : ""}
      ${task.status === "in_progress" ? `<button data-task-action="complete" data-task-id="${escapeHtml(task.id)}">标记完成</button>` : ""}
      <button data-path="${escapeHtml(task.chapter)}" class="needs-content">打开章节</button>
      <button data-go-practice="${escapeHtml(task.id)}">去提交练习</button>
    </div>
  `;
}

function renderPlanStats(learning) {
  const statsEl = $("#planStats");
  if (!learning?.activePlan) {
    statsEl.classList.add("hidden");
    return;
  }
  statsEl.classList.remove("hidden");
  $("#progressFill").style.width = `${learning.progress || 0}%`;
  $("#progressText").textContent = `${learning.progress || 0}%`;
  $("#statCompletedDays").textContent = String(learning.stats?.completedDays || 0);
  $("#statStreak").textContent = `${learning.stats?.streak || 0} 天`;
}

function renderPlanList(learning) {
  const tasks = learning?.activePlan?.tasks || [];
  if (!tasks.length) {
    $("#planList").innerHTML = `<p class="muted">还没有任务，点击「生成」创建计划。</p>`;
    return;
  }

  $("#planList").innerHTML = tasks.map(task => `
    <article class="plan-card status-${task.status}">
      <div class="plan-card-head">
        <h3>Day ${task.day} · ${escapeHtml(TRACK_LABELS[task.track] || task.track)}</h3>
        <span class="status-badge">${STATUS_LABELS[task.status]}</span>
      </div>
      <p><strong>${escapeHtml(task.title)}</strong></p>
      <p>${task.minutes} 分钟 · ${escapeHtml(task.outputRequirement)}</p>
      <ul class="task-instructions">${task.instructions.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
      ${task.reflection ? `<p class="reflection">复盘：${escapeHtml(task.reflection)}</p>` : ""}
      <div class="task-actions">
        ${task.status === "not_started" ? `<button data-task-action="start" data-task-id="${escapeHtml(task.id)}">开始</button>` : ""}
        ${task.status === "in_progress" ? `<button data-task-action="complete" data-task-id="${escapeHtml(task.id)}">完成</button>` : ""}
        ${task.status === "completed" || task.kind === "review" ? `<button data-task-action="reflect" data-task-id="${escapeHtml(task.id)}" class="reflect-btn">填写复盘</button>` : ""}
        <button data-path="${escapeHtml(task.chapter)}" class="needs-content">章节</button>
        <button data-go-practice="${escapeHtml(task.id)}">练习</button>
      </div>
    </article>
  `).join("");

  setContentReady(state.contentReady);
}

async function refreshLearningState() {
  state.learning = await api("/api/state");
  if (state.learning.profile) {
    state.profile = state.learning.profile;
    loadProfile(state.profile);
    localStorage.setItem("englishCoachProfile", JSON.stringify(state.profile));
  }
  if (state.learning.activePlan) {
    $("#planOverview").textContent = `${state.learning.activePlan.days} 天计划 · 创建于 ${new Date(state.learning.activePlan.createdAt).toLocaleDateString()}`;
  }
  renderPlanStats(state.learning);
  renderTodayTask("todayCoach", state.learning.todayTask);
  renderTodayTask("todayPlan", state.learning.todayTask);
  renderPlanList(state.learning);
}

async function updateTaskAction(taskId, action, reflection = "") {
  await api("/api/task", {
    method: "POST",
    body: JSON.stringify({ taskId, action, reflection })
  });
  await refreshLearningState();
}

async function sendChat(event) {
  event.preventDefault();
  const message = $("#message").value.trim();
  if (!message) return;
  $("#message").value = "";
  addMessage("user", message);
  try {
    const data = await api("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, profile: currentProfile() })
    });
    if (data.providerWarning) renderProviderWarning(state.health, data.providerWarning);
    if (data.contentWarning) renderProviderWarning(state.health, data.contentWarning);
    addMessage("agent", data.reply, data.references || [], {
      provider: data.provider,
      fallbackUsed: data.fallbackUsed
    });
  } catch (error) {
    addMessage("agent", `请求失败：${error.message}`);
  }
}

async function searchChapters() {
  const q = $("#searchQuery").value.trim();
  if (!q || !state.contentReady) return;
  const data = await api(`/api/search?q=${encodeURIComponent(q)}`);
  const box = $("#searchResults");
  if (!data.results?.length) {
    box.innerHTML = `<p class="muted">没有命中结果。</p>`;
    return;
  }
  box.innerHTML = data.results.map(ref => `
    <button class="ref search-hit" data-path="${escapeHtml(ref.path)}" data-snippet="${escapeHtml(ref.summary || "")}" data-title="${escapeHtml(ref.title || ref.label || "")}">
      <strong>${escapeHtml(ref.label || ref.title)} · ${escapeHtml(ref.heading || "")}</strong>
      <span class="ref-path">${escapeHtml(ref.path)} · score ${ref.score?.toFixed?.(1) ?? ref.score}</span>
      <p>${escapeHtml(ref.summary)}</p>
    </button>
  `).join("");
}

async function makePlan() {
  const body = {
    ...currentProfile(),
    days: Number($("#days").value || 14)
  };
  const data = await api("/api/plan", {
    method: "POST",
    body: JSON.stringify(body)
  });
  $("#planOverview").textContent = data.overview;
  await refreshLearningState();
  switchTab("plan");
  addMessage("agent", `已生成 ${body.days} 天学习计划。请到「计划」页查看今日任务并开始训练。`);
}

function renderReviewStructured(data) {
  const box = $("#reviewStructured");
  if (!data.score && data.score !== 0) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.innerHTML = `
    <div class="review-score">完成度：${data.score}/100</div>
    <p><strong>摘要</strong>：${escapeHtml(data.summary)}</p>
    ${data.issues?.length ? `
      <div class="review-section">
        <strong>问题清单</strong>
        <ul>${data.issues.map(i => `<li><em>${escapeHtml(i.title)}</em> — ${escapeHtml(i.suggestion)}</li>`).join("")}</ul>
      </div>` : ""}
    ${data.revisionChecklist?.length ? `
      <div class="review-section">
        <strong>修订清单</strong>
        <ol>${data.revisionChecklist.map(i => `<li>${escapeHtml(i)}</li>`).join("")}</ol>
      </div>` : ""}
    <p class="next-action"><strong>下一步</strong>：${escapeHtml(data.nextAction)}</p>
  `;
}

async function reviewPracticeSubmit() {
  const data = await api("/api/review", {
    method: "POST",
    body: JSON.stringify({
      type: $("#practiceType").value,
      focus: $("#practiceFocus").value,
      text: $("#practiceText").value,
      taskId: $("#practiceTaskId").value || undefined
    })
  });
  $("#reviewResult").textContent = data.feedback;
  renderReviewStructured(data);
  await refreshLearningState();
}

function bindEvents() {
  document.addEventListener("click", async event => {
    const tab = event.target.closest(".tab");
    if (tab) switchTab(tab.dataset.tab);

    const ref = event.target.closest(".ref");
    if (ref) {
      openChapter(ref.dataset.path, {
        fromRef: true,
        title: ref.dataset.title,
        snippet: ref.dataset.snippet
      });
      return;
    }

    const chapterBtn = event.target.closest("[data-path]");
    if (chapterBtn && !chapterBtn.classList.contains("tab") && !chapterBtn.classList.contains("ref")) {
      openChapter(chapterBtn.dataset.path);
      return;
    }

    const taskBtn = event.target.closest("[data-task-action]");
    if (taskBtn) {
      const taskId = taskBtn.dataset.taskId;
      const action = taskBtn.dataset.taskAction;
      if (action === "reflect") {
        const reflection = window.prompt("填写本次任务复盘（可中文）：", "");
        if (reflection === null) return;
        await updateTaskAction(taskId, action, reflection);
      } else {
        await updateTaskAction(taskId, action);
      }
      return;
    }

    const practiceBtn = event.target.closest("[data-go-practice]");
    if (practiceBtn) {
      $("#practiceTaskId").value = practiceBtn.dataset.goPractice;
      switchTab("practice");
    }
  });

  $("#chatForm").addEventListener("submit", sendChat);
  $("#saveProfile").addEventListener("click", saveProfile);
  $("#makePlan").addEventListener("click", makePlan);
  $("#quickPlan").addEventListener("click", makePlan);
  $("#searchBtn").addEventListener("click", () => {
    searchChapters().catch(error => {
      $("#searchResults").innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
    });
  });
  $("#searchQuery").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      event.preventDefault();
      $("#searchBtn").click();
    }
  });
  $("#reviewPractice").addEventListener("click", () => {
    reviewPracticeSubmit().catch(error => {
      $("#reviewResult").textContent = `请求失败：${error.message}`;
    });
  });
}

async function init() {
  loadProfile();
  bindEvents();

  state.health = await api("/api/health");
  setContentReady(state.health.contentRootExists);
  showSetupBanner(state.health);
  renderCoachMeta(state.health);
  renderProviderWarning(state.health);

  await refreshLearningState();

  if (state.contentReady) {
    await loadChapters();
    addMessage("agent", `English Coach v${state.health.version} 已就绪。告诉我你的水平、目标或卡点，我会把教程内容转成可执行训练。`);
  } else {
    addMessage("agent", "应用已启动，但未找到指南内容。请按页面顶部提示配置 English-level-up-tips 后刷新。");
  }
}

init().catch(error => {
  addMessage("agent", `启动失败：${error.message}`);
});
