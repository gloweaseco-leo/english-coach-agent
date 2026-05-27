const state = {
  chapters: [],
  activeChapter: null,
  profile: JSON.parse(localStorage.getItem("englishCoachProfile") || "{}")
};

const $ = selector => document.querySelector(selector);

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
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json();
}

function currentProfile() {
  return {
    level: $("#level").value,
    goal: $("#goal").value.trim(),
    minutes: Number($("#minutes").value || 45)
  };
}

function loadProfile() {
  $("#level").value = state.profile.level || "B1";
  $("#goal").value = state.profile.goal || "提升听说读写综合能力";
  $("#minutes").value = state.profile.minutes || 45;
}

function saveProfile() {
  state.profile = currentProfile();
  localStorage.setItem("englishCoachProfile", JSON.stringify(state.profile));
  addMessage("agent", "学习档案已保存。后续计划和建议会按这个目标生成。");
}

function addMessage(role, text, references = []) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;
  wrapper.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
  if (references.length) {
    const refs = document.createElement("div");
    refs.className = "refs";
    refs.innerHTML = references.map(ref => `
      <button class="ref" data-path="${escapeHtml(ref.path)}">
        <strong>${escapeHtml(ref.label || ref.title)}</strong>
        <p>${escapeHtml(ref.summary)}</p>
      </button>
    `).join("");
    wrapper.appendChild(refs);
  }
  $("#messages").appendChild(wrapper);
  $("#messages").scrollIntoView({ block: "end", behavior: "smooth" });
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });
  document.querySelectorAll(".view").forEach(view => {
    view.classList.toggle("active", view.id === name);
  });
}

async function loadChapters() {
  const data = await api("/api/chapters");
  state.chapters = data.chapters;
  $("#chapters").innerHTML = state.chapters.map(chapter => `
    <button class="chapter-item" data-path="${escapeHtml(chapter.path)}">
      ${escapeHtml(chapter.label || chapter.title)}
    </button>
  `).join("");
}

async function openChapter(path) {
  const data = await api(`/api/chapter?path=${encodeURIComponent(path)}`);
  state.activeChapter = data.path;
  $("#readerTitle").textContent = data.title;
  $("#readerPath").textContent = data.path;
  $("#readerContent").innerHTML = markdownToHtml(data.markdown);
  document.querySelectorAll(".chapter-item").forEach(button => {
    button.classList.toggle("active", button.dataset.path === data.path);
  });
  switchTab("reader");
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
    addMessage("agent", data.reply, data.references || []);
  } catch (error) {
    addMessage("agent", `请求失败：${error.message}`);
  }
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
  $("#planList").innerHTML = data.days.map(day => `
    <article class="plan-card">
      <h3>Day ${day.day}: ${escapeHtml(day.title)}</h3>
      <p>${day.minutes} 分钟</p>
      <p>${escapeHtml(day.output)}</p>
      <button data-path="${escapeHtml(day.chapter)}">打开章节</button>
    </article>
  `).join("");
  switchTab("plan");
}

async function reviewPractice() {
  const data = await api("/api/review", {
    method: "POST",
    body: JSON.stringify({
      type: $("#practiceType").value,
      focus: $("#practiceFocus").value,
      text: $("#practiceText").value
    })
  });
  $("#reviewResult").textContent = data.feedback;
}

function bindEvents() {
  document.addEventListener("click", event => {
    const tab = event.target.closest(".tab");
    if (tab) switchTab(tab.dataset.tab);

    const ref = event.target.closest("[data-path]");
    if (ref && !ref.classList.contains("tab")) {
      openChapter(ref.dataset.path);
    }
  });
  $("#chatForm").addEventListener("submit", sendChat);
  $("#saveProfile").addEventListener("click", saveProfile);
  $("#makePlan").addEventListener("click", makePlan);
  $("#quickPlan").addEventListener("click", makePlan);
  $("#reviewPractice").addEventListener("click", reviewPractice);
}

async function init() {
  loadProfile();
  bindEvents();
  await loadChapters();
  addMessage("agent", "我已经加载英语学习指南。告诉我你的当前水平、目标或卡点，我会把教程内容转成可执行训练。");
}

init().catch(error => {
  addMessage("agent", `启动失败：${error.message}`);
});
