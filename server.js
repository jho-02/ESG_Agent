import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadWorkbook } from "./src/workbook-loader.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3100);
const PUBLIC_DIR = path.join(__dirname, "public");
const TEMPLATE_PATH = path.join(__dirname, "data", "template.xlsx");

let cachedTemplate = null;
let cachedTemplateStamp = null;

function getContentType(filePath) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    default:
      return "application/octet-stream";
  }
}

async function getTemplate() {
  const stat = await fs.stat(TEMPLATE_PATH);
  const nextStamp = stat.mtimeMs;

  if (!cachedTemplate || cachedTemplateStamp !== nextStamp) {
    cachedTemplate = await loadWorkbook(TEMPLATE_PATH);
    cachedTemplateStamp = nextStamp;
  }

  return cachedTemplate;
}

function getSafePublicPath(requestUrl) {
  const url = new URL(requestUrl, "http://localhost");
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const relativePath = pathname.replace(/^\/+/, "");
  const resolvedPath = path.resolve(PUBLIC_DIR, relativePath);

  if (!resolvedPath.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return resolvedPath;
}

async function serveStaticFile(req, res) {
  const filePath = getSafePublicPath(req.url || "/");
  if (!filePath) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(file);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }

    const fallbackPath = path.join(PUBLIC_DIR, "index.html");
    const fallback = await fs.readFile(fallbackPath);
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fallback);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (!req.url) {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Bad Request");
      return;
    }

    const url = new URL(req.url, "http://localhost");

    if (url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname === "/api/template") {
      const template = await getTemplate();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(template));
      return;
    }

    await serveStaticFile(req, res);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        message: "서버 처리 중 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error)
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`ESG Agent UI server listening on http://localhost:${PORT}`);
  console.log(`cwd: ${process.cwd()}`);
  console.log(`template: ${TEMPLATE_PATH}`);
});
