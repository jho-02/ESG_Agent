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
// 연결 담당자 참고:
// 현재는 template.xlsx를 읽는 임시 구조입니다.
// 추후 계산 담당자가 store/<year>/<corp_code>/... 형태로 결과를 저장하면
// 아래 STORE_DIR을 기준으로 /api/years, /api/companies, /api/company, /api/analyze 같은 API를 추가하면 됩니다.
// 예: const STORE_DIR = path.join(__dirname, "store");

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
  // 현재 UI 초기 데이터 API입니다.
  // 지금은 data/template.xlsx를 읽지만, store 구조로 전환하면 이 함수 대신
  // store/연도/기업코드/computed/scorecard.json 등을 읽는 함수를 추가하세요.
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

    // 서버 상태 확인용입니다.
    // 연결 담당자는 배포/실행 확인 시 이 주소를 먼저 확인하면 됩니다.
    if (url.pathname === "/healthz") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    // 현재 UI가 처음 로딩할 때 호출하는 데이터 API입니다.
    // 현재: data/template.xlsx 기반
    // 추후 권장: store 파일 시스템 기반 API로 교체 또는 병행
    if (url.pathname === "/api/template") {
      const template = await getTemplate();
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(template));
      return;
    }

    // ============================================================
    // store 파일 시스템 연결 예정 위치
    // ============================================================
    // 계산/수집 담당자가 아래와 같은 구조로 결과를 저장한다면,
    // 이 영역에 API를 추가하면 됩니다.
    //
    // store/
    //   2022/
    //     001143/
    //       computed/
    //         scorecard.json
    //         summary.json
    //         metrics.json
    //         facts.json
    //       normalized/
    //         records.json
    //       meta/
    //         company_context.json
    //       raw_assets/
    //         files/
    //           index.json
    //
    // 추천 API:
    // GET  /api/years
    // GET  /api/companies?year=2022
    // GET  /api/company?year=2022&corp=001143
    // GET  /api/company/file?year=2022&corp=001143&path=result.xlsx
    // POST /api/analyze
    //
    // 보안/API 키/CORS 문제가 있으면 public/app.js에서 외부 서버를 직접 호출하지 말고,
    // POST /api/analyze를 여기 server.js에 만들어 외부 Agent/계산 서버를 중계하세요.

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
