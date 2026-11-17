# AutoCut

영상을 올리면 군더더기를 자르고, 자막을 입히고, 세로(9:16)로 맞춰 완성본을 만들어 주는 웹앱입니다. 업종에 상관없이 쓸 수 있게 만들었고, 업종별로는 AI에게 주는 편집 지침과 게시물 글 말투만 달라집니다.

## 어떻게 동작하나

```
업로드 → 음성 인식(단어별 시간) → 말 덩어리로 묶기 → 편집 계획 → ffmpeg 렌더링 → 완성본
```

1. **음성 인식**: faster-whisper가 말을 단어 단위 시간과 함께 글자로 바꿉니다.
2. **말 덩어리(phrase)**: 쉬는 구간·문장 끝·글자 수 기준으로 묶습니다. 자막 한 줄이자 컷의 최소 단위입니다.
3. **편집 계획**: Claude가 번호 붙은 말 덩어리 중 *남길 번호*만 고르고, 오인식 수정·강조 단어·게시물 글·해시태그를 냅니다. 시간은 번호에서 계산하므로 AI가 시간을 지어낼 수 없습니다.
4. **렌더링**: ffmpeg가 컷 편집, 비율 변환, 자막 합성, 컷 경계 페이드, 음량 정리를 한 번에 합니다.

`ANTHROPIC_API_KEY`가 없거나 AI 호출이 실패하면 규칙 기반(무음 제거 + 자동 자막)으로 대체하고, 결과 화면에 그 사실을 표시합니다.

## 실행

필요한 것: Python 3.10+, ffmpeg(libass 포함), 한글 폰트.

```bash
cd autocut
pip install -r requirements.txt

# 한글 자막 폰트(Noto Sans KR)를 fonts/ 에 넣습니다. 폰트 이름은 AUTOCUT_FONT_NAME으로 바꿀 수 있습니다.
curl -L -o fonts/NotoSansKR.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/NotoSansKR%5Bwght%5D.ttf"

export ANTHROPIC_API_KEY=...        # 없으면 규칙 기반 편집
uvicorn app.main:app --port 8000    # http://localhost:8000
```

첫 실행 때 Whisper 모델을 내려받습니다(small 기준 약 500MB). 정확도가 더 필요하면 `AUTOCUT_WHISPER=large-v3`.

| 환경 변수 | 기본값 | 설명 |
|---|---|---|
| `ANTHROPIC_API_KEY` | 없음 | 편집 계획용 AI 키 |
| `AUTOCUT_MODEL` | `claude-sonnet-5-5` | 편집 계획 모델 |
| `AUTOCUT_WHISPER` | `small` | 음성 인식 모델 크기 |
| `AUTOCUT_FONT_NAME` | `Noto Sans KR` | 자막 폰트 이름 |
| `AUTOCUT_MAX_UPLOAD_MB` | `1024` | 업로드 한도 |
| `AUTOCUT_JOB_TTL_HOURS` | `24` | 작업 파일 보관 시간 |

## 테스트

```bash
python -m pytest -q tests
```

## 현재 한계와 다음 단계

- 작업 상태는 서버 메모리에 있어서 서버를 재시작하면 진행 중이던 작업은 사라집니다.
- 로그인이 없습니다. 인터넷에 공개하려면 로그인·사용량 제한을 먼저 붙여야 합니다(업로드와 렌더링은 서버 자원을 많이 씁니다).
- 편집은 말 중심입니다. 말이 거의 없는 영상은 원본 전체를 비율만 바꿔 내보냅니다. 장면 전환 감지, 배경음악, 효과음, 3분할 합성은 아직 없습니다.
- 결과를 미리 보고 자막·구간을 손보는 화면이 없습니다. `plan.json`(작업 폴더)에 계획이 저장되므로 다음 단계로 붙이기 좋습니다.
- 말 순서를 바꾸는 편집(훅을 앞으로 당기기)은 하지 않고 시간순으로만 자릅니다.
