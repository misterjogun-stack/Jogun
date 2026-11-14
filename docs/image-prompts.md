# ZEROCOUNT 이미지 프롬프트 (ChatGPT 이미지 생성용)

레퍼런스처럼 "사진이 있는 첫 화면"을 만들기 위한 이미지입니다.
ChatGPT에 아래 **영문 프롬프트**를 그대로 붙여 넣으세요. 한국어 설명은 참고용입니다.

## 공통 규칙 (모든 프롬프트에 이미 들어 있음)
- 이미지 안에 **글자, 로고, 실제 브랜드 라벨을 넣지 않습니다.** 글자는 웹페이지에서 따로 올립니다.
- 색감은 ZEROCOUNT 로고에 맞춰 **진한 네이비·검정 + 파란 포인트 + 은색**입니다.
- 받은 파일은 아래 **파일 이름**으로 저장해서 보내 주세요. 크기 최적화와 웹 변환은 제가 합니다.

---

## 1. 첫 화면 배경 사진 (가장 중요)
- **쓰는 곳:** 소개 페이지 맨 위 네이비 카드의 배경. 레퍼런스 왼쪽 위의 "창고 + 바코드 스캐너" 사진에 해당합니다.
- **비율과 파일:** 16:9 가로, `hero.jpg`
- **구도:** 왼쪽은 어둡게 비워 두고(제목 글자 자리), 오른쪽에 주인공을 둡니다.

```
A cinematic, moody photograph of a professional hair salon's back-room dispensary shelf at night. Neatly arranged hair color tubes, perm solution bottles and developer bottles in plain unbranded white and amber packaging, no readable text or logos on any product. In the right third of the frame, a hand holds a smartphone up to a product, scanning its barcode; a thin red laser-like scan line and a soft blue screen glow light the hand. Deep navy and near-black color palette with cool blue rim lighting and subtle silver reflections, shallow depth of field, background shelves softly blurred into bokeh. The left 55% of the image is dark, calm and uncluttered negative space for headline text. Photorealistic, 35mm lens, high detail, 16:9, no text, no watermark, no logos.
```

## 2. "재고조사 현황" 옆 밝은 사진
- **쓰는 곳:** 소개 페이지 두 번째 구역의 밝은 배경 이미지. 레퍼런스 오른쪽 위의 "밝은 바탕 + 상자" 사진에 해당합니다.
- **비율과 파일:** 4:3 가로, `overview.jpg`

```
A bright, clean, minimal photograph of a modern hair salon supply shelf in soft daylight. Stacked plain kraft and white boxes and a few unbranded hair product bottles on light grey shelves, arranged on the right side of the frame. Airy light grey and white background with a very subtle cool blue tint, soft natural shadows, lots of empty space on the left. Calm, organized, premium feeling. Photorealistic, 4:3, no text, no labels, no logos, no people.
```

## 3. 바코드 스캔 장면 (손 + 휴대폰)
- **쓰는 곳:** "찍고, 세고, 등록하면" 구역. 지금 HTML로 그린 휴대폰 목업 대신 실제 사진으로 바꿀 때 씁니다.
- **비율과 파일:** 4:5 세로, `scan.jpg`
- **참고:** 휴대폰 화면은 비워 두게 했습니다. 제가 앱의 실제 스캔 화면을 그 위에 합성합니다.

```
A close-up photograph of a hairstylist's hand holding a modern smartphone vertically in front of a salon product shelf, as if scanning a product barcode. The phone screen is a plain solid dark navy rectangle with nothing on it (to be replaced later), facing the camera, sharp edges, no glare. Background: blurred shelf of unbranded hair color tubes and bottles with deep navy tones and soft blue rim light. Realistic skin, clean manicure, no rings. Photorealistic, 4:5 portrait, no text, no logos, no watermark.
```

## 4. 빈 화면용 입체 일러스트
- **쓰는 곳:** 앱에서 아직 데이터가 없을 때 보이는 빈 화면. 레퍼런스 오른쪽 아래의 "파란 정육면체 상자들"에 해당합니다.
- **비율과 파일:** 1:1 정사각형, **투명 배경 PNG**, `empty-boxes.png`

```
A clean 3D isometric illustration of a small stack of translucent glossy blue cubes and boxes, like an inventory icon, with soft gradients from bright blue (#3B82F6) to deep blue (#1D4ED8), subtle white highlights and soft shadow beneath. Minimal, modern SaaS dashboard style, centered composition with generous padding. Transparent background, 1:1, no text, no logos.
```

## 5. 링크 공유용 이미지 (선택)
- **쓰는 곳:** 카톡이나 인스타그램에 링크를 붙였을 때 뜨는 미리보기. 지금은 보내 주신 로고 이미지를 그대로 쓰고 있습니다.
- **비율과 파일:** 1200×630, `og.jpg`
- **참고:** 로고는 ChatGPT가 똑같이 그리기 어렵습니다. 배경만 만들고 로고와 문구는 제가 올리는 방식이 가장 정확합니다.

```
A wide dark navy-to-black gradient background with a soft blue glow in the upper right and a faint perspective grid fading out toward the edges, subtle silver light streaks, premium tech-product feel. Leave the center completely empty for a logo to be placed later. 1200x630, no text, no logos, no objects in the center.
```

---

## 보내 주실 때
- 1번(`hero.jpg`)만 있어도 첫 화면 인상이 크게 달라집니다. 우선순위는 **1 → 2 → 4 → 3 → 5**입니다.
- 마음에 드는 결과가 나올 때까지 여러 장을 뽑은 뒤, 가장 좋은 것만 보내 주세요.
- 보내 주시면 웹용으로 줄이고(WebP 변환, 보통 200KB 이하) 제목 글자가 잘 읽히도록 어둡게 덧칠한 뒤 바로 반영합니다.
