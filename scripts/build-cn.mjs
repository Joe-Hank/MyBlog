// build-cn.mjs — 从 Notion(经 Worker) 生成国内静态站内容。
//
// 在【构建机】(GitHub Actions runner，境外) 上跑，不在访客浏览器跑：
//   1. ?raw=1 取 Notion 原始 S3 图 → 镜像到 src/assets/notion/<fileId>.<ext>（幂等）
//   2. 非 raw 取内容 → 把 GH Pages 绝对 URL 相对化 → 写 src/data/*.json
//   3. works.json 额外合并 CN-only 覆盖层 works.local.json（如 ASC，不进 Notion 也不丢）
//
// 访客只读境内 OSS 上的成品，全程不碰 Notion。
import { writeFileSync, readFileSync, existsSync, mkdirSync, createWriteStream } from 'node:fs';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const WORKER = (process.env.WORKER_URL || 'https://myblog-notion-proxy.wenhuawasi.workers.dev').replace(/\/$/, '');
const MIRROR = 'https://joe-hank.github.io/MyBlog/';   // worker 重写后的图片前缀，相对化时去掉
const ROOT = process.cwd();
const DATA = join(ROOT, 'src', 'data');
const ASSETS = join(ROOT, 'src', 'assets', 'notion');
const EPS = ['blog', 'works', 'banner', 'timeline'];

mkdirSync(ASSETS, { recursive: true });

async function getText(url) {
  const r = await fetch(url, { headers: { 'cache-control': 'no-cache' } });
  if (!r.ok) throw new Error(`${url} → HTTP ${r.status}`);
  return await r.text();
}

// ── 1) 镜像图片：?raw=1 拿 S3 原图，下载缺失的 <fileId>.<ext> ──────────────
const wanted = new Map();
for (const ep of EPS) {
  const raw = await getText(`${WORKER}/${ep}?raw=1`);
  const decoded = raw.replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const re = /https:\/\/prod-files-secure\.s3[^\s"\\]+/g;
  let m;
  while ((m = re.exec(decoded))) {
    try {
      const u = new URL(m[0]);
      const segs = u.pathname.split('/').filter(Boolean);
      if (segs.length < 2) continue;
      const fileId = segs[segs.length - 2];
      const fn = decodeURIComponent(segs[segs.length - 1]);
      const dot = fn.lastIndexOf('.');
      if (dot < 0) continue;
      const ext = fn.slice(dot).toLowerCase();
      const key = fileId + ext;
      if (!wanted.has(key)) wanted.set(key, m[0]);
    } catch { /* skip */ }
  }
}
let dl = 0, skip = 0, fail = 0;
for (const [name, url] of wanted) {
  const dest = join(ASSETS, name);
  if (existsSync(dest)) { skip++; continue; }
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await pipeline(Readable.fromWeb(r.body), createWriteStream(dest));
    dl++;
  } catch (e) { console.warn(`  [x] img ${name}: ${e.message}`); fail++; }
}
console.log(`images: +${dl} downloaded, ${skip} present, ${fail} failed`);

// ── 2) 重建 data/*.json（相对化）+ works 合并 CN-only 覆盖层 ────────────────
for (const ep of EPS) {
  const body = await getText(`${WORKER}/${ep}`);
  const rel = body.split(MIRROR).join('');   // 绝对 GH Pages URL → 相对 assets/notion/...
  let arr = JSON.parse(rel);                  // 校验合法

  if (ep === 'works') {
    const overlayPath = join(DATA, 'works.local.json');
    if (existsSync(overlayPath)) {
      const overlay = JSON.parse(readFileSync(overlayPath, 'utf8'));
      const overlayIds = new Set(overlay.map(w => w.id));
      // 覆盖层在前（如 ASC 置顶），Notion 内容去重后接其后
      arr = overlay.concat(arr.filter(w => !overlayIds.has(w.id)));
      console.log(`  works overlay: +${overlay.length} CN-only (${overlay.map(w => w.id).join(',')})`);
    }
  }

  writeFileSync(join(DATA, ep + '.json'), JSON.stringify(arr));
  console.log(`data: ${ep}.json → ${arr.length} 条`);
}
console.log('✔ build-cn done');
