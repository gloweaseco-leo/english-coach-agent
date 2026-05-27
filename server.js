const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { PORT, PUBLIC_ROOT, VERSION } = require("./server/lib/config");
const { handleApi, send } = require("./server/routes/api");
const { ensureDataDir } = require("./server/lib/storage");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

function safeJoin(root, requestedPath) {
  const decoded = decodeURIComponent(requestedPath || "");
  const resolved = path.resolve(root, decoded);
  if (!resolved.startsWith(root)) {
    throw new Error("Invalid path");
  }
  return resolved;
}

function serveStatic(req, res, pathname) {
  const requested = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath;
  try {
    filePath = safeJoin(PUBLIC_ROOT, requested);
  } catch {
    return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  }
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      return await handleApi(req, res, url.pathname, url);
    }
    return serveStatic(req, res, url.pathname);
  } catch (error) {
    return send(res, 500, { error: error.message || String(error) });
  }
});

server.listen(PORT, () => {
  ensureDataDir();
  console.log(`English Coach Agent v${VERSION} running at http://127.0.0.1:${PORT}`);
});
