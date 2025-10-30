// scripts/publish/blogger.js
import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 설정값 읽기 =====
const ROOT = path.resolve(__dirname, '../../');
const DIST_DIR = path.join(ROOT, 'dist', 'posts');

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function apiError(json, res) {
  const msg = (json && (json.error?.message || json.error)) || `HTTP ${res.status}`;
  return new Error(`Blogger API error: ${msg}`);
}

// ===== Access Token 갱신(Refresh) =====
async function refreshAccessToken() {
  const {
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN
  } = process.env;

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET/GOOGLE_REFRESH_TOKEN 누락');
  }

  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: GOOGLE_REFRESH_TOKEN,
    grant_type: 'refresh_token'
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) throw apiError(json, res);
  return json.access_token; // ya29...
}

async function ensureAccessToken() {
  let { GOOGLE_OAUTH_TOKEN } = process.env;
  if (GOOGLE_OAUTH_TOKEN && GOOGLE_OAUTH_TOKEN.trim()) {
    return GOOGLE_OAUTH_TOKEN.trim();
  }
  // access_token이 없으면 refresh 토큰으로 신규 발급
  return await refreshAccessToken();
}

// ===== 단일 포스트 발행 =====
async function publishOne(file, token, blogId) {
  const html = await fs.readFile(path.join(DIST_DIR, file), 'utf-8');
  const title = file.replace(/\.html$/i, '');
  const url = `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`;

  const payload = { title, content: html, labels: [] };

  let res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 401) {
    // 만료 → 1회 자동 갱신 후 재시도
    const newToken = await refreshAccessToken();
    res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  const json = await res.json();
  if (!res.ok) throw apiError(json, res);
  return json;
}

// ===== 엔트리포인트 =====
(async () => {
  const { BLOGGER_BLOG_ID } = process.env;
  if (!BLOGGER_BLOG_ID) fail('BLOGGER_BLOG_ID 누락');

  // dist/posts 존재/파일 확인
  const exists = await fs.stat(DIST_DIR).then(() => true).catch(() => false);
  if (!exists) {
    console.log('⚠️ 발행할 HTML 없음(dist/posts 미존재)');
    process.exit(0);
  }
  const files = (await fs.readdir(DIST_DIR)).filter(f => f.toLowerCase().endsWith('.html'));
  if (!files.length) {
    console.log('⚠️ 발행할 HTML 없음(dist/posts/*.html 없음)');
    process.exit(0);
  }

  // 토큰 확보
  let token;
  try {
    token = await ensureAccessToken();
  } catch (e) {
    fail(`토큰 준비 실패: ${e.message}`);
  }

  // 순차 발행
  for (const f of files) {
    try {
      const result = await publishOne(f, token, BLOGGER_BLOG_ID);
      const link = result.url || (result.selfLink ?? '') || '';
      console.log(`✅ 발행 완료: ${f} ${link}`);
    } catch (e) {
      console.error(`❌ 발행 실패: ${f} — ${e.message}`);
    }
  }
})();
