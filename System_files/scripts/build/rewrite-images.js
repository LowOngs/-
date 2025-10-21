// google-blog/System_files/scripts/build/rewrite-images.js
import 'dotenv/config';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

const root = process.cwd();
const POSTS_DIR = process.env.POSTS_DIR || 'content/posts';
const CDN_BASE = (process.env.CDN_BASE || '').replace(/\/+$/,''); // 끝 슬래시 제거

if (!CDN_BASE) {
  console.error('CDN_BASE 설정이 필요합니다(.env).');
  process.exit(1);
}

// 로컬 경로를 R2 업로드 경로 규칙에 맞춰 변환
// assets/images/foo/bar.jpg -> images/YYYY/MM/foo/bar.jpg
function toCdnPath(localSrc) {
  // 업로드 시점 월로 생성: 운영 중엔 포스트별 y/m 컬럼 보관 권장
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');

  const rel = localSrc.replace(/^assets\/images\//,'').replace(/^\//,'');
  return `${CDN_BASE}/${y}/${m}/${rel}`; // https://cdn..../YYYY/MM/foo/bar.jpg
}

const files = await fg(['**/*.json'], { cwd: path.join(root, POSTS_DIR) });

let changed = 0;
for (const rel of files) {
  const full = path.join(root, POSTS_DIR, rel);
  const post = JSON.parse(fs.readFileSync(full, 'utf8'));

  let mutated = false;
  for (const block of (post.blocks || [])) {
    if (!block.html) continue;
    const replaced = block.html
      .replace(/src=["'](?:\.\/)?assets\/images\/([^"']+)["']/g, (m, p1) => {
        const local = `assets/images/${p1}`;
        const cdn = toCdnPath(local);
        return `src="${cdn}"`;
      });
    if (replaced !== block.html) {
      block.html = replaced;
      mutated = true;
    }
  }

  if (mutated) {
    fs.writeFileSync(full, JSON.stringify(post, null, 2));
    changed++;
  }
}

console.log(`이미지 경로 치환 완료: changed=${changed}`);
