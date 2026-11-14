# ZEROCUT

사진·영상을 올리면 블로그 글, 인스타 캡션·카드뉴스, 스레드, 릴스·쇼츠·틱톡 세로 영상, 유튜브 가로 영상을 자동으로 만드는 웹앱. ZEROCOUNT와 같은 ZERO 시리즈 디자인.

- `index.html` 소개 페이지 (검색 노출용 메타·구조화 데이터 포함), `robots.txt`, `sitemap.xml`, `images/og.jpg`
- `app/` 앱 (빌드 없이 바로 동작하는 정적 파일, 브라우저 ES 모듈)
  - `js/media.js` 영상 장면 분석 · 고화질 이미지 추출
  - `js/writer.js` 채널별 글쓰기 (Claude API 키가 있으면 사진을 직접 읽고 씀, 없으면 메모로 기본 문구)
  - `js/cards.js` 카드뉴스 1080×1350 그리기
  - `js/motion.js` 숏폼·유튜브 자동 편집 (컷 · 자막 · 모션그래픽 · 소리 · 녹화)
  - `js/store.js` 이 기기 브라우저(IndexedDB) 저장

## 배포 (Vercel)
이 `zerocut` 폴더를 프로젝트 루트로 지정해 정적 사이트로 배포. 주소가 `zerocut.vercel.app`이 아니면 `index.html`의 canonical·og 주소, `robots.txt`, `sitemap.xml`의 주소를 바꿔 주세요.

## 검색 노출 체크리스트
1. 네이버 서치어드바이저 · 구글 서치콘솔에 사이트 등록 → 받은 확인 코드를 `index.html` 머리말 주석 자리에 넣기
2. 두 곳 모두 `https://(주소)/sitemap.xml` 제출
3. 인스타·블로그 프로필에 주소 링크 걸기 (외부 링크가 순위에 도움)
