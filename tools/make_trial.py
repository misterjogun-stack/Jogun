#!/usr/bin/env python3
"""ZeroBalance 체험판 만들기.

정식 앱(zerobalance/app/index.html)을 바탕으로, Netlify에 index.html 하나만 올려
며칠 동안 테스트할 수 있는 체험판을 만든다.

  python3 tools/make_trial.py            # 마감일 기본값(아래 DEFAULT_END)
  python3 tools/make_trial.py 2026-11-30 # 마감일 지정 (그날 밤 12시까지 사용 가능)

결과: trial/index.html

정식 앱과 다른 점
- 파일 하나: 아이콘을 파일 안에 넣고, manifest·서비스 워커를 뺐다.
  (서비스 워커가 없어야 사이트를 지우면 테스터 기기에서도 바로 못 쓴다)
- 마감일이 지나면 '체험 기간이 끝났어요' 화면만 보인다. 입력한 기록은 파일로 저장 가능.
- 맨 위에 '체험판 · 마감일 · 의견 보내기' 띠.
- 정식 주소(소개 페이지) 링크를 뺐다.
"""
import base64, datetime, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'zerobalance/app/index.html'
OUT = ROOT / 'trial/index.html'
DEFAULT_END = '2026-11-24'

end = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_END
d = datetime.date.fromisoformat(end)
end_label = f"{d.month}월 {d.day}일({'월화수목금토일'[d.weekday()]})"

s = SRC.read_text(encoding='utf-8')

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f'바꿀 부분을 찾지 못했어요 ({n}곳): {old[:70]!r}')
    s = s.replace(old, new)

def data_uri(path):
    return 'data:image/png;base64,' + base64.b64encode((ROOT / path).read_bytes()).decode()

# 1) 파일 하나로: manifest 빼고 아이콘은 파일 안에
rep('<link rel="manifest" href="manifest.webmanifest">\n', '')
rep('<link rel="apple-touch-icon" href="icon-180.png">', f'<link rel="apple-touch-icon" href="{data_uri("zerobalance/app/icon-180.png")}">')
rep('<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">', f'<link rel="icon" type="image/png" sizes="32x32" href="{data_uri("zerobalance/app/favicon-32.png")}">')
rep('<link rel="icon" type="image/png" sizes="192x192" href="icon-192.png">\n', '')
rep('<title>ZeroBalance · 제로밸런스</title>', '<title>ZeroBalance 체험판</title>\n<meta name="robots" content="noindex,nofollow">')

# 2) 서비스 워커 대신: 혹시 남아 있는 것도 지운다
rep("if('serviceWorker' in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){window.addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}))}",
    "/* 체험판: 오프라인 저장을 쓰지 않는다 (사이트를 지우면 바로 못 쓰게) */\n"
    "try{if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister())).catch(()=>{})}catch(e){}")

# 3) 체험판 설정
rep("const APP_NAME='ZeroBalance',APP_KO='제로밸런스',APP_VERSION='2.0',",
    f"/* ── 체험판 ── 마감일(이날 밤 12시까지 사용 가능). tools/make_trial.py 로 바꿔요 */\n"
    f"const TRIAL_END='{end}',TRIAL_LABEL='{end_label}';\n"
    "const trialOver=()=>{const [y,m,d]=TRIAL_END.split('-').map(Number);return Date.now()>=new Date(y,m-1,d+1).getTime()};\n"
    "const APP_NAME='ZeroBalance',APP_KO='제로밸런스',APP_VERSION='2.0 체험판',")

# 4) 맨 위 체험판 띠
rep("  const head_=`<header class=\"top\"><div class=\"wrap\">${",
    "  const trialbar=`<div class=\"trialbar\"><span>체험판 · ${TRIAL_LABEL}까지 써 볼 수 있어요</span><button data-act=\"goFb\">의견 보내기</button></div>`;\n"
    "  const head_=trialbar+`<header class=\"top\"><div class=\"wrap\">${")

# 5) 마감 후 화면 (잠금이 켜져 있으면 잠금이 먼저)
rep("  if(ui.locked){$('#app').innerHTML=vLock();return}",
    "  if(ui.locked){$('#app').innerHTML=vLock();return}\n"
    "  if(trialOver()){$('#app').innerHTML=vTrialOver();return}")
rep("function render(keep){",
    "function vTrialOver(){\n"
    "  return `<div class=\"lockscr\" role=\"dialog\" aria-modal=\"true\" aria-label=\"체험 종료\"><img class=\"lm\" src=\"${MARK}\" alt=\"\">\n"
    "    <h1>체험 기간이 끝났어요</h1>\n"
    "    <p>ZeroBalance를 써 주셔서 감사해요.<br>입력한 기록은 이 ${DEV}에 그대로 남아 있어요.<br>파일로 저장해 두면 정식 버전에서 이어서 쓸 수 있어요.</p>\n"
    "    <div class=\"lockbtns\">${hasData()?'<button class=\"btn white pill block\" data-act=\"backupShare\">내 기록 파일로 저장</button>':''}"
    "<a class=\"btn glass pill block\" href=\"${IG_DM}\" target=\"_blank\" rel=\"noopener\">정식 버전 문의 · @${IG}</a></div></div>`;\n"
    "}\n"
    "function render(keep){")

# 6) 정식 주소(소개 페이지) 링크 빼기
rep('<br><a href="../">${I(\'arrow\')}소개 페이지</a>', '')

# 7) 띠 모양
rep(".sumbox span{",
    ".trialbar{display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;padding:8px 16px;padding-top:calc(8px + env(safe-area-inset-top,0px));"
    "background:#0A1428;color:#D6E0FF;font-size:13px;font-weight:600;text-align:center}\n"
    ".trialbar button{background:#2F6BFF;color:#fff;border:0;border-radius:999px;padding:4px 12px;font-size:12.5px;font-weight:700}\n"
    ".trialbar+.top{padding-top:0}\n"
    ".sumbox span{")

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(s, encoding='utf-8')
print(f'만들었어요: {OUT.relative_to(ROOT)} · 마감 {end_label} · {OUT.stat().st_size//1024}KB')
