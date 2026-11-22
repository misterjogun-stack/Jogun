# 릴스·카드뉴스 원본

다시 만들 때 (앱을 `zerobalance/`에서 `python3 -m http.server 8765`로 띄운 상태):

1. `node cap.js $PWD/cap` · `node cap2.js $PWD/cap` — 실제 앱 화면 다시 찍기 (예시 데이터)
2. `node check.js $PWD 1.6 10.5 19.5` — 장면 몇 개 미리 보기
3. `node render.js $PWD` — 프레임 630장 만들기 (frames/, 약 3분)
4. `python3 sound.py` → `ffmpeg -i sfx.wav -af loudnorm=I=-20:TP=-2 sfx_n.wav`
5. `ffmpeg -framerate 30 -i frames/f%05d.png -i sfx_n.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -shortest -movflags +faststart ../zerobalance-reel.mp4`
6. 카드뉴스: `node cards.js $PWD ..`
