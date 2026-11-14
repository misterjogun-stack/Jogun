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

must(/\s*<script>\s*\/\/ 한 번 연 뒤에는[\s\S]*?<\/script>/, 'service worker');
html = html.replace(/\s*<script>\s*\/\/ 한 번 연 뒤에는[\s\S]*?<\/script>/, '');

let js = read('app.js')
  .replace("'vendor/xlsx.full.min.js'", "'https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js'")
  .replace("'vendor/html5-qrcode.min.js'", "'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'")
  .split('"empty-boxes.webp"').join(JSON.stringify(dataUri('empty-boxes.webp', 'image/webp')));
if (js.includes('vendor/') || js.includes('empty-boxes.webp"')) throw new Error('외부 파일 참조가 남아 있음');

must(/<script defer src="app\.js\?v=[0-9a-z]+"><\/script>/, 'app.js');
html = html.replace(/<script defer src="app\.js\?v=[0-9a-z]+"><\/script>/, () => inlineScript(js));
html = html.replace('<title>ZEROCOUNT</title>', '<title>ZEROCOUNT (테스트)</title>');

mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, 'zerocount.html');
writeFileSync(out, html);
console.log('standalone:', out, Math.round(Buffer.byteLength(html) / 1024), 'KB');
