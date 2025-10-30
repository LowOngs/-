// System_files/scripts/publish/blogger.js
// 최소 동작: dist/posts/*.html 중 1개를 Blogger API로 "게시"합니다.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BLOG_ID = process.env.BLOGGER_BLOG_ID;
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// 안전 체크
if (!BLOG_ID || !CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error('❌ 환경변수 누락(BLOGGER_BLOG_ID / GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN)');
  process.exit(1);
}

// 런타임 경로
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 렌더 결과 폴더
const DIST_DIR = path.resolve(__dirname, '../../dist/posts');

function pickTitle(html) {
  // <h1>제목</h1> → 제목 추출, 없으면 파일명 사용
  const m = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (m) return m[1].replace(/<[^>]+>/g, '').trim();
  return 'Untitled';
}

async function getAccessToken() {
  // Refresh Token → Access Token 발급
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function publishOne({ title, content }) {
  const token = await getAccessToken();
  const url = `https://www.googleapis.com/blogger/v3/blogs/${BLOG_ID}/posts/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      kind: 'blogger#post',
      title,
      content,
      // labels: ['Auto', 'AIO'],   // 필요시 라벨
      // isDraft: true             // 초안으로만 올리고 싶다면 주석 해제
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish error ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data; // {id, url, ...}
}

async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('❌ 렌더 결과 폴더(dist/posts)가 없습니다. 먼저 렌더가 되어야 합니다.');
    process.exit(1);
  }
  const files = fs.readdirSync(DIST_DIR).filter(f => f.endsWith('.html'));
  if (files.length === 0) {
    console.error('❌ 발행할 HTML이 없습니다. dist/posts/*.html 확인.');
    process.exit(1);
  }

  // 일단 1개만 발행 (원하면 순회 발행 가능)
  const first = files[0];
  const full = path.join(DIST_DIR, first);
  const html = fs.readFileSync(full, 'utf8');
  const title = pickTitle(html);

  console.log(`📰 Publish: ${first} → "${title}"`);
  const post = await publishOne({ title, content: html });

  console.log(`✅ 발행 완료: ${post.id}  ${post.url || post.selfLink || ''}`);
}

main().catch(err => {
  console.error('❌ 실패:', err.message);
  process.exit(1);
});
