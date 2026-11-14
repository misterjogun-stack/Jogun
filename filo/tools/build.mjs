// 앱 소스(app/app.jsx)를 브라우저가 바로 실행할 수 있는 app.js 로, Tailwind 클래스를 app.css 로 미리 만든다.
// 사용법: cd filo/tools && npm install && npm run build
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import babel from '@babel/core';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.join(here, '..', 'app');

const src = readFileSync(path.join(app, 'app.jsx'), 'utf8');
const { code } = babel.transformSync(src, {
  babelrc: false, configFile: false, sourceType: 'script', compact: true, comments: false,
  presets: [['@babel/preset-react', { runtime: 'classic' }]],
});
writeFileSync(path.join(app, 'app.js'), '(function(){"use strict";\n' + code + '\n})();\n');

execFileSync(process.execPath, [
  path.join(here, 'node_modules', 'tailwindcss', 'lib', 'cli.js'),
  '-c', path.join(here, 'tailwind.config.cjs'), '-i', path.join(here, 'tailwind.css'),
  '-o', path.join(app, 'app.css'), '--minify',
], { cwd: here, stdio: 'inherit' });

// 파일이 바뀌면 주소의 ?v= 값도 바뀌어 폰이 옛 파일을 캐시에서 쓰지 않게 한다
const hash = (f) => createHash('sha1').update(readFileSync(path.join(app, f))).digest('hex').slice(0, 10);
const htmlPath = path.join(app, 'index.html');
let html = readFileSync(htmlPath, 'utf8');
html = html.replace(/app\.css\?v=[0-9a-z]+/, `app.css?v=${hash('app.css')}`).replace(/app\.js\?v=[0-9a-z]+/, `app.js?v=${hash('app.js')}`);
writeFileSync(htmlPath, html);
console.log('built app.js', readFileSync(path.join(app, 'app.js')).length, 'bytes; app.css', readFileSync(path.join(app, 'app.css')).length, 'bytes');
