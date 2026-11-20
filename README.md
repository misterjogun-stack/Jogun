# ZEROCOUNT

미용실 약제 재고 관리 웹앱. 약을 꺼낼 때 한 번 누르는 빠른 차감, 바코드 재고조사, 거래처별 발주 문자, 입고 처리를 한 곳에서 합니다.

| | 주소 |
|---|---|
| 소개 페이지 | https://zerocount.vercel.app |
| 앱 | https://zerocount.vercel.app/app/ |
| 샘플 체험 | https://zerocount.vercel.app/app/?demo |
| 옛 주소 | https://filo-salon-system.vercel.app (기록 옮기기 안내 후 새 주소로 이동) |

## 기능

- **홈**: 등록 품목, 정상 재고 비율, 발주 필요, 최근 발주, 재고 상태 도넛, 최근 7일 사용량, 약제비, 확인이 필요한 품목
- **빠른 차감**: 꺼낼 때 −, 넣을 때 +. 같은 약을 10분 안에 반대로 누르면 정정으로 보고 사용량에서 뺍니다. 되돌리기와 '오늘 사용'의 '잘못 누름'으로도 바로잡을 수 있습니다.
- **재고조사**: 조사를 만들면 그 순간의 전산 재고를 기록하고, 실물 수량(직접 입력·+/− 버튼·바코드 스캔·'일치')과 자동 비교합니다. 진행률, 차이 수량과 금액을 보여 주고, 결과를 엑셀이나 PDF로 저장합니다. 완료할 때 실물 수량을 재고에 반영할 수 있습니다.
- **발주**: 적정선 아래로 내려간 약을 거래처별로 묶어 발주 문자를 만들고, 보낸 발주는 '입고 대기'에서 받은 수량만큼 입고 처리합니다.
- **품목 관리**: 등록·수정, 엑셀/CSV 업로드(새 품목 추가, 바뀐 값만 변경), 엑셀 내보내기와 양식, 바코드 라벨 출력(Code 128, A4 24칸·10칸), 적정선 추천(최근 4주 사용량 기준)
- **설정**: 전체 백업(.json)·복원, 앱 이름·로고, 화면 테마

## 데이터 저장 방식

- 모든 기록은 **사용자 기기의 브라우저 저장소(localStorage)** 에만 저장되고 서버로 보내지 않습니다. 저장 키는 `filo_` 로 시작합니다(이름이 바뀌기 전부터 쓰던 키라 그대로 둡니다).
- 브라우저는 주소마다 저장소를 따로 씁니다. 주소가 바뀌거나 브라우저 데이터를 지우면 기록이 보이지 않으므로, 설정의 **전체 백업**으로 파일을 받아 두고 **백업 복원**으로 되살립니다.
- 옛 주소에 기록이 있으면 앱 위쪽의 '기록 가지고 새 주소로 이동' 버튼이 새 주소로 기록을 넘깁니다(새 주소는 옛 주소에서 온 데이터만 받습니다).

## 폴더 구성

```
filo/                     ← Vercel 배포 폴더 (Root Directory)
  index.html              소개 페이지 (정적 HTML)
  images/                 소개 페이지 사진 (WebP), 공유 이미지 og.jpg
  app/
    app.jsx               ★ 앱 소스. 기능을 고칠 때는 이 파일을 수정
    app.js, app.css       빌드 결과 (직접 수정하지 않음)
    index.html            앱 화면 틀, 기본 스타일, 테마·주소 이전 스크립트
    sw.js                 오프라인용 서비스 워커
    vendor/               직접 제공하는 라이브러리 (React 18.3.1, SheetJS 0.18.5, html5-qrcode 2.3.8)
    manifest.webmanifest, icon-*.png, empty-boxes.webp
  tools/                  빌드 도구 (배포에서 제외)
  .vercelignore           tools/, app/app.jsx 를 배포에서 제외
standalone/zerocount.html 테스트용 단일 파일 (다른 곳에 잠깐 올려 쓰는 용도)
standalone/trial/index.html 체험판 단일 파일 (샘플로 시작, 맨 위 체험판 안내 줄, 정식 사이트 링크 없음 · Netlify Drop 용)
docs/                     이미지 프롬프트, 폰 점검 체크리스트
money-sprint/             판매 실행 키트 (FILO 시절 작성, 판매 시작 전에 갱신 필요)
badminton/                손 배드민턴: 카메라 손 인식으로 AI 콕봇과 치는 배드민턴 (단일 HTML)
piano-hands/              손가락 피아노: 카메라 손 인식으로 치는 아이용 피아노 놀이 (단일 HTML)
```

## 수정과 빌드

`app/app.jsx` 나 `app/index.html` 을 고친 뒤 미리 빌드한 파일을 다시 만듭니다.

```bash
cd filo/tools
npm install          # 처음 한 번
npm run build        # app.jsx → app.js, Tailwind → app.css, index.html 의 ?v= 캐시 값 갱신
npm run standalone   # (선택) standalone/zerocount.html, standalone/trial/index.html 다시 만들기
```

- `app.js` 와 `app.css` 는 빌드 결과물이라 함께 커밋해야 배포에 반영됩니다.
- 브라우저가 옛 파일을 쓰지 않도록 `index.html` 의 `app.js?v=…`, `app.css?v=…` 값은 빌드가 자동으로 바꿉니다.
- 소개 페이지(`filo/index.html`)는 빌드 없이 바로 수정합니다.

## 배포

- Vercel 프로젝트 이름: `zerocount` (Root Directory: `filo`, 빌드 명령 없음 — 정적 파일)
- 운영 배포는 `main` 브랜치 기준입니다.
- 저장소와 Vercel 의 자동 배포 연결은 아직 하지 않았습니다. 연결하려면 Vercel → 프로젝트 Settings → Git 에서 이 저장소를 연결하고 Production Branch 를 `main` 으로 지정합니다. 연결 전에는 수동으로 배포합니다.
- 옛 주소 `filo-salon-system.vercel.app` 는 기록 옮기기를 위해 연결을 유지합니다.

## 알아둘 점

- 카메라 바코드 스캔은 https 주소에서만 동작합니다. 블루투스·USB 바코드 스캐너는 스캔 화면의 번호 입력 칸에서 그대로 쓸 수 있습니다.
- 예전 FILO 단일 파일 버전은 이 저장소의 Git 기록(커밋 `54a7499`)에 남아 있습니다.
- 자동 테스트 스크립트는 작업 환경에서만 돌렸고 저장소에는 포함하지 않았습니다.
