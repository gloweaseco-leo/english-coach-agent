const { VERSION, CONTENT_ROOT, DATA_ROOT } = require("../lib/config");
const { dataRootExists } = require("../lib/storage");
const { contentRootExists, listChapters, getChapter } = require("../services/content");
const { search } = require("../services/retrieval");
const { getProviderStatus } = require("../services/providers");
const { getRagStats } = require("../services/retrieval");
const { handleChat } = require("../services/chat");
const {
  getPublicState,
  saveProfile,
  savePlan,
  updateTask,
  reviewAndSave
} = require("../services/progress");

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(typeof body === "string" ? body : JSON.stringify(body, null, 2));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function handleApi(req, res, pathname, url) {
  if (pathname === "/api/health") {
    const chapters = contentRootExists() ? listChapters().length : 0;
    const provider = getProviderStatus();
    return send(res, 200, {
      ok: true,
      version: VERSION,
      contentRoot: CONTENT_ROOT,
      contentRootExists: contentRootExists(),
      chapters,
      dataRoot: DATA_ROOT,
      dataRootExists: dataRootExists(),
      coachMode: provider.coachMode,
      providerReady: provider.providerReady,
      providerWarning: provider.providerWarning || undefined,
      rag: getRagStats()
    });
  }

  if (pathname === "/api/search") {
    const query = url.searchParams.get("q") || "";
    const state = getPublicState();
    const todayTrack = state.todayTask?.task?.track || "";
    const results = contentRootExists()
      ? search(query, {
        weakAreas: state.profile?.weakAreas || [],
        todayTrack
      })
      : [];
    return send(res, 200, { query, results });
  }

  if (pathname === "/api/state") {
    return send(res, 200, getPublicState());
  }

  if (pathname === "/api/chapters") {
    if (!contentRootExists()) {
      return send(res, 200, { chapters: [] });
    }
    return send(res, 200, { chapters: listChapters() });
  }

  if (pathname === "/api/chapter") {
    if (!contentRootExists()) {
      return send(res, 503, { error: "Content root not available" });
    }
    const rel = url.searchParams.get("path") || "README.md";
    const chapter = getChapter(rel);
    if (!chapter) return send(res, 404, { error: "Chapter not found" });
    return send(res, 200, {
      path: chapter.path,
      title: chapter.title,
      label: chapter.label,
      markdown: chapter.markdown
    });
  }

  if (pathname === "/api/profile" && req.method === "POST") {
    const body = await readJson(req);
    const profile = saveProfile(body);
    return send(res, 200, { ok: true, profile });
  }

  if (pathname === "/api/task" && req.method === "POST") {
    const body = await readJson(req);
    const result = updateTask(body.taskId, { action: body.action, reflection: body.reflection });
    if (result.error) return send(res, 400, result);
    return send(res, 200, result);
  }

  if (req.method !== "POST") {
    return send(res, 405, { error: "Method not allowed" });
  }

  const body = await readJson(req);

  if (pathname === "/api/chat") {
    const result = await handleChat(body.message, body.profile);
    return send(res, 200, result);
  }

  if (pathname === "/api/plan") {
    const result = savePlan(body);
    return send(res, 200, result);
  }

  if (pathname === "/api/review") {
    return send(res, 200, reviewAndSave(body));
  }

  return send(res, 404, { error: "Not found" });
}

module.exports = { handleApi, send, readJson };
