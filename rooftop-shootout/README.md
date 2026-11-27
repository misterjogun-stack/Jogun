# 옥상 슛아웃

해 질 녘 옥상 코트에서 하는 30초 1:1 농구 슛 대결. 폰에서 아래에서 위로 쓸어 올려 던진다.

## 규칙

- 골 100점, 림·백보드에 안 닿은 클린슛 150점
- 연속으로 넣으면 ×2, ×3, ×4, ×5 (놓치면 다시 ×1)
- 마지막 10초는 '더블 타임': 골대가 좌우로 움직이고 점수 2배
- 종료 버저 전에 던진 공이 버저 후에 들어가도 점수 인정(버저비터)

## 모드

- **연습 상대와 한 판**: '동네 형'(성공률 약 60%)과 대결. 어디서나 동작.
- **친구랑 대결**: 4자리 방 코드로 둘이 실시간 대결. claude.ai 아티팩트로 열었을 때만 동작
  (페이지의 실시간 room 기능 사용, 두 사람 모두 로그인 필요). 상대가 던진 공은 파란 공으로 내 화면에 보인다.

## 파일

- `game.html` — 원본. claude.ai 아티팩트로 올리는 파일(문서 틀 없이 내용만)
- `index.html` — 브라우저에서 바로 여는 용도로 `game.html` 앞뒤에 문서 틀만 붙인 것.
  `game.html`을 고치면 아래 명령으로 다시 만든다.

```bash
cd rooftop-shootout
{ printf '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'; cat game.html; printf '\n</body>\n</html>\n'; } > index.html
```

그래픽(코트·골대·공)과 효과음은 모두 코드로 그리고 합성한다. 외부 파일은 Google Fonts 두 개(Black Han Sans, IBM Plex Sans KR)뿐.
