// 테스트 배포용: 앱 전체를 HTML 파일 하나로 묶는다 → standalone/zerocount.html
// 먼저 `npm run build` 로 app.js · app.css 를 만든 뒤 실행하세요: node build-standalone.mjs
// - React · 앱 코드 · 스타일 · 아이콘 · 빈 화면 그림은 파일 안에 들어간다.
// - 엑셀(SheetJS 0.18.5) · 바코드(html5-qrcode 2.3.8) 라이브러리는 쓸 때만 unpkg 에서 받는다.
// - 서비스 워커(오프라인)는 파일 하나로는 동작하지 않아 뺀다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..', 'app');
const outDir = path.join(here, '..', '..', 'standalone');
const read = (f) => readFileSync(path.join(app, f), 'utf8');
const dataUri = (f, type) => `data:${type};base64,${readFileSync(path.join(app, f)).toString('base64')}`;
const inlineScript = (code) => `<script>${code.replace(/<\/script/gi, '<\\/script')}</script>`;

let html = read('index.html');
const must = (re, label) => { if (!re.test(html)) throw new Error('찾지 못함: ' + label); };

must(/<link rel="manifest"[^>]*>\n\s*/, 'manifest');
html = html.replace(/<link rel="manifest"[^>]*>\n\s*/, '');
html = html.replace(/href="icon-192\.png"/, `href="${dataUri('icon-192.png', 'image/png')}"`);
html = html.replace(/href="icon-180\.png"/, `href="${dataUri('icon-180.png', 'image/png')}"`);

must(/<script src="vendor\/react\.production\.min\.js"><\/script>/, 'react');
html = html.replace(/<script src="vendor\/react\.production\.min\.js"><\/script>/, () => inlineScript(read('vendor/react.production.min.js')));
html = html.replace(/<script src="vendor\/react-dom\.production\.min\.js"><\/script>/, () => inlineScript(read('vendor/react-dom.production.min.js')));

must(/<link rel="stylesheet" href="app\.css\?v=[0-9a-z]+" \/>/, 'app.css');
html = html.replace(/<link rel="stylesheet" href="app\.css\?v=[0-9a-z]+" \/>/, () => `<style>${read('app.css')}</style>`);

// 주소 이전(옛 Vercel 주소 → 새 주소) 스크립트는 단일 파일에선 쓸 일이 없고, 다른 사이트 주소가 남지 않도록 뺀다
const MOVE_RE = /<script>\s*\/\/ ===== 주소 이전[\s\S]*?<\/script>/;
must(MOVE_RE, 'address move');
html = html.replace(MOVE_RE, '<script>window.ZC_OLD_ORIGINS = [];</script>');

must(/\s*<script>\s*\/\/ 한 번 연 뒤에는[\s\S]*?<\/script>/, 'service worker');
html = html.replace(/\s*<script>\s*\/\/ 한 번 연 뒤에는[\s\S]*?<\/script>/, '');

let js = read('app.js')
  .replace("'vendor/xlsx.full.min.js'", "'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'")
  .replace("'vendor/html5-qrcode.min.js'", "'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'")
  .split('"empty-boxes.webp"').join(JSON.stringify(dataUri('empty-boxes.webp', 'image/webp')))
  .split('https://zerocount.vercel.app').join('')
  .split('zerocount.vercel.app').join('새 주소');
if (js.includes('vendor/') || js.includes('empty-boxes.webp"')) throw new Error('외부 파일 참조가 남아 있음');

must(/<script defer src="app\.js\?v=[0-9a-z]+"><\/script>/, 'app.js');
html = html.replace(/<script defer src="app\.js\?v=[0-9a-z]+"><\/script>/, () => inlineScript(js));
const base = html;
mkdirSync(outDir, { recursive: true });

// 1) 테스트용: 그대로 묶은 파일
const testHtml = base.replace('<title>ZEROCOUNT</title>', '<title>ZEROCOUNT (테스트)</title>');
const out = path.join(outDir, 'zerocount.html');
writeFileSync(out, testHtml);
console.log('standalone:', out, Math.round(Buffer.byteLength(testHtml) / 1024), 'KB');

// 2) 체험판: 처음 열면 샘플로 시작 + 맨 위 체험판 안내 줄 (다른 사이트로 가는 링크 없음) (Netlify 등에 index.html 로 올려 쓰는 용도)
const TRIAL_HEAD = `  <script>
    // 체험판: 기록이 없으면 샘플 약제가 들어 있는 상태로 시작한다 (앱은 ?demo 를 보고 샘플을 넣는다)
    (function () {
      try {
        if (!localStorage.getItem('filo_products') && !/[?&]demo\\b/.test(location.search)) {
          history.replaceState(null, '', location.pathname + (location.search ? location.search + '&demo' : '?demo') + location.hash);
        }
      } catch (e) {}
    })();
    function zcTrialReset() {
      if (!confirm('처음 상태(샘플 약제)로 다시 시작할까요? 지금까지 넣은 체험 기록은 지워집니다.')) return;
      try { for (var i = localStorage.length - 1; i >= 0; i--) { var k = localStorage.key(i); if (k && k.indexOf('filo_') === 0) localStorage.removeItem(k); } } catch (e) {}
      location.replace(location.pathname + '?demo');
    }
  </script>
  <style>
    .zc-trial-bar { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 6px 12px; padding: 8px max(12px, env(safe-area-inset-right, 0px)) 8px max(12px, env(safe-area-inset-left, 0px));
      background: #0B1220; color: #E2E8F0; font: 500 12.5px/1.45 'Pretendard Variable', Pretendard, -apple-system, sans-serif; text-align: center; }
    .zc-trial-bar b { color: #fff; }
    .zc-trial-bar .tag { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #2563EB; color: #fff; font-weight: 700; font-size: 11px; letter-spacing: .02em; }
    .zc-trial-bar a, .zc-trial-bar button { color: #93C5FD; font: inherit; font-weight: 700; text-decoration: underline; text-underline-offset: 2px; background: none; border: 0; padding: 0; cursor: pointer; }
  </style>
</head>`;
const TRIAL_BAR = `<body>
  <div class="zc-trial-bar" role="note">
    <span class="tag">체험판</span>
    <span>샘플 약제가 들어 있어요. 마음껏 눌러 보세요. 기록은 <b>이 기기에만</b> 저장되고, 체험 사이트는 곧 종료됩니다.</span>
    <button type="button" onclick="zcTrialReset()">처음부터 다시 체험</button>
  </div>`;
if (!base.includes('</head>') || !base.includes('<body>')) throw new Error('찾지 못함: head/body');
const trialHtml = base
  .replace('<title>ZEROCOUNT</title>', '<title>ZEROCOUNT 체험판</title>')
  .replace('</head>', TRIAL_HEAD)
  .replace('<body>', TRIAL_BAR);
if (/vercel\.app/.test(base) || /vercel\.app/.test(trialHtml)) throw new Error('vercel.app 주소가 남아 있음');
const trialDir = path.join(outDir, 'trial');
mkdirSync(trialDir, { recursive: true });
const trialOut = path.join(trialDir, 'index.html');
writeFileSync(trialOut, trialHtml);
console.log('trial:', trialOut, Math.round(Buffer.byteLength(trialHtml) / 1024), 'KB');
