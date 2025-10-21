// google-blog/System_files/scripts/build/r2-upload.js
import 'dotenv/config';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import fg from 'fast-glob';
import fs from 'fs';
import path from 'path';

const {
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY,
  R2_BUCKET, R2_ENDPOINT, IMAGES_DIR
} = process.env;

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
  console.error('R2 환경변수(.env) 설정이 필요합니다.');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY
  }
});

const today = new Date();
const y = today.getFullYear();
const m = String(today.getMonth() + 1).padStart(2, '0');

const root = process.cwd();
const srcDir = path.join(root, IMAGES_DIR || 'assets/images');

const files = await fg(['**/*.{png,jpg,jpeg,webp,avif,gif,svg}'], { cwd: srcDir, dot: false });

if (!files.length) {
  console.log('업로드할 이미지가 없습니다.');
  process.exit(0);
}

let uploaded = 0, skipped = 0;
for (const rel of files) {
  const full = path.join(srcDir, rel);
  const key = `images/${y}/${m}/${rel.replace(/\\/g,'/')}`;

  // 이미 있으면 skip (헤더 확인)
  try {
    await s3.send(new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    skipped++;
    continue;
  } catch (_) {}

  const Body = fs.readFileSync(full);
  const ContentType = mimeGuess(rel);
  await s3.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body,
    ContentType,
    ACL: 'public-read' // R2는 퍼블릭 버킷 정책으로 제어; ACL 무시될 수 있음
  }));
  uploaded++;
}

console.log(`R2 업로드 완료: uploaded=${uploaded}, skipped=${skipped}`);

function mimeGuess(name) {
  const ext = name.toLowerCase().split('.').pop();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'webp': return 'image/webp';
    case 'avif': return 'image/avif';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}
