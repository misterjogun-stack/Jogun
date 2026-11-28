# 옥상 슛아웃

해 질 녘 옥상 코트에서 하는 30초 1:1 농구 슛 대결.

## 조작

- 왼쪽 아래 ◀ ▶: 방향(조준 링) 이동. 누르고 있으면 계속 움직인다. 처음엔 골대 정중앙을 겨눈다.
- 오른쪽 아래 슛 버튼: 누르고 있으면 게이지가 위아래로 오간다. 초록 칸에서 떼면 알맞은 힘.
  약하면 앞 림·에어볼, 조금 세면 뒤 림·백보드, 너무 세면 백보드 위로 넘어간다.
- 궤적 점선은 공에서 조준 링(그물)까지 이어진다. 링이 초록이면 골대를 제대로 겨눈 것.
- 컴퓨터: ← → 방향, 스페이스(또는 ↑) 누르고 있다가 떼기.

## 규칙

- 골 100점, 림·백보드에 안 닿은 클린슛 150점
- 연속으로 넣으면 ×2, ×3, ×4, ×5 (놓치면 다시 ×1)
- 마지막 10초는 '더블 타임': 골대가 좌우로 움직이고 점수 2배
- 종료 버저 전에 던진 공이 버저 후에 들어가도 점수 인정(버저비터)

## 모드

- **연습 상대와 한 판**: 실력 세 단계 중 골라 대결. 쉬움 '옆집 꼬마'(성공률 약 30%), 보통 '동네 형'(약 46%), 어려움 '농구부 주장'(약 65%, 슛도 더 자주). 어디서나 동작.
- **친구랑 대결**: 4자리 방 코드나 초대 링크(`주소#코드`)로 둘이 실시간 대결. 상대가 던진 공은 파란 공으로 내 화면에 보인다.
  - Vercel 같은 일반 주소: 두 폰을 WebRTC로 직접 연결(PeerJS, `vendor/peerjs.min.js` 1.5.4). 처음 연결 중개만 PeerJS 공개 서버(0.peerjs.com)를 쓴다.
  - claude.ai 아티팩트: 페이지의 실시간 room 기능을 쓴다(두 사람 모두 로그인 필요).

## 파일

- `game.html` — 원본. claude.ai 아티팩트로 올리는 파일(문서 틀 없이 내용만)
- `index.html` — 브라우저에서 바로 여는 용도로 `game.html` 앞뒤에 문서 틀만 붙인 것.
  `game.html`을 고치면 아래 명령으로 다시 만든다.

```bash
cd rooftop-shootout
{ printf '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'; cat game.html; printf '\n</body>\n</html>\n'; } > index.html
```

- `vendor/peerjs.min.js` — 친구 대결용 PeerJS(npm `peerjs@1.5.4` 의 dist 파일)

## Vercel 배포

`rooftop-shootout` 폴더를 그대로 정적 사이트로 올린다(빌드 없음, 프레임워크 없음, Root Directory = `rooftop-shootout`).

그래픽(코트·골대·공)과 효과음은 모두 코드로 그리고 합성한다. 외부 파일은 Google Fonts 두 개(Black Han Sans, IBM Plex Sans KR)뿐.
