// scripts/build/render-posts.js
// 렌더 단계: content/posts/*.json → System_files/dist/posts/*.html
// - 템플릿 자리표시자(<!--TITLE-->, <!--SUMMARY-->, <!--UPDATED-->, <!--SCHEMA-->, <!--TLDR-->, <!--BODY-->, <!--FAQ-->, <!--SOURCES-->)
// - AIO·SEO 메타(data.meta) → <head>에 주입
// - env: POSTS_DIR(기본 content/posts)

import fs from "fs";
import path from "path";
import fg from "fast-glob";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = path.resolve(__dirname, "../../"); // System_files/
const POSTS_DIR = path.join(ROOT, process.env.POSTS_DIR || "content/posts");
const TEMPLATE_PATH = path.join(ROOT, "templates/post.html");
const OUTPUT_DIR = path.join(ROOT, "dist/posts");

const read = (p) => fs.readFileSync(p, "utf8");
const write = (p, c) => fs.writeFileSync(p, c, "utf8");
const ensureDir = (p) => fs.mkdirSync(p, { recursive: true });

// HTML 이스케이프(메타/스크립트 안전 주입용)
const esc = (s = "") =>
  String(s).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

// JSON-LD는 문자열 전체를 이스케이프하지 말고 안전하게 직렬화
const toJsonLd = (obj) => {
  try {
    return JSON.stringify(obj);
  } catch {
    return "{}";
  }
};

// 템플릿 로드
if (!fs.existsSync(TEMPLATE_PATH)) {
  console.error(`❌ 템플릿을 찾을 수 없습니다: ${TEMPLATE_PATH}`);
  process.exit(1);
}
const template = read(TEMPLATE_PATH);

// 출력 폴더 준비
ensureDir(OUTPUT_DIR);

// 포스트 JSON 수집
const files = fg.sync("*.json", { cwd: POSTS_DIR, dot: false, onlyFiles: true });
if (files.length === 0) {
  console.warn("⚠️  렌더링할 포스트(JSON)가 없습니다. content/posts 폴더를 확인하세요.");
  process.exit(0);
}

// 렌더 유틸
const listToUl = (arr) =>
  Array.isArray(arr) && arr.length
    ? `<ul>${arr.map((x) => `<li>${esc(String(x))}</li>`).join("")}</ul>`
    : "";

const faqToHtml = (faq) =>
  Array.isArray(faq) && faq.length
    ? `<section class="faq"><h3>FAQ</h3>${faq
        .map((f) => `<p><b>${esc(f.q || "")}</b><br>${esc(f.a || "")}</p>`)
        .join("")}</section>`
    : "";

const sourcesToHtml = (src) =>
  Array.isArray(src) && src.length
    ? `<section class="sources"><h3>Sources</h3><ul>${src
        .map((s) => `<li><a href="${esc(s.url || "#")}" target="_blank">${esc(s.name || s.url || "source")}</a></li>`)
        .join("")}</ul></section>`
    : "";

// 메타 → <head> 블록 조립
function buildHeadMeta(meta = {}, updatedAt = "") {
  const parts = [];

  // title/description
  if (meta.description) {
    parts.push(
      `<meta name="description" content="${esc(meta.description)}">`,
      `<meta property="og:description" content="${esc(meta.description)}">`
    );
  }
  if (meta.title) {
    parts.push(`<meta property="og:title" content="${esc(meta.title)}">`);
  }

  // og
  const ogType = meta?.og?.type || "article";
  parts.push(`<meta property="og:type" content="${esc(ogType)}">`);
  if (meta?.og?.image) {
    parts.push(`<meta property="og:image" content="${esc(meta.og.image)}">`);
  }

  // updated
  if (updatedAt) {
    parts.push(`<meta property="article:modified_time" content="${esc(updatedAt)}">`);
  }

  // schema (JSON-LD)
  if (meta.schema) {
    parts.push(`<script type="application/ld+json">${toJsonLd(meta.schema)}</script>`);
  }

  return parts.join("\n  ");
}

// 본문 조립: body_html 우선, 없으면 body, content 사용
const bodyFrom = (data) => data.body_html || data.body || data.content || "";

// 파일명: 명시적 slug 우선, 없으면 파일명 기반
const outName = (data, fileBase) => (data.slug ? String(data.slug) : fileBase).replace(/\.html$/i, "");

let rendered = 0;

for (const baseName of files) {
  const fullPath = path.join(POSTS_DIR, baseName);
  const raw = read(fullPath);
  const data = JSON.parse(raw);

  const meta = data.meta || {};
  const title = meta.title || data.title || "";
  const summary = meta.description || data.summary || "";
  const updated = data.updated_at || "";

  const headMeta = buildHeadMeta(meta, updated);
  const tldrBlock = listToUl(meta?.aio?.tldr || data.tldr);
  const faqBlock = faqToHtml(meta?.aio?.faq || data.faq);
  const sourcesBlock = sourcesToHtml(meta?.aio?.sources || data.sources);
  const body = bodyFrom(data);

  const html = template
    .replace("<!--TITLE-->", esc(title))
    .replace("<!--SUMMARY-->", esc(summary))
    .replace("<!--UPDATED-->", "") // updated는 headMeta로 주입되므로 공란 처리
    .replace("<!--SCHEMA-->", headMeta)
    .replace("<!--TLDR-->", tldrBlock)
    .replace("<!--BODY-->", body)
    .replace("<!--FAQ-->", faqBlock)
    .replace("<!--SOURCES-->", sourcesBlock);

  const outFile = path.join(OUTPUT_DIR, `${outName(data, path.basename(baseName, ".json"))}.html`);
  write(outFile, html);
  console.log(`✔ Rendered: ${path.basename(outFile)}`);
  rendered++;
}

console.log(`✅ 렌더 완료: ${rendered} 파일`);
