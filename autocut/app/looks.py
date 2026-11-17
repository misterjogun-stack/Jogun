"""룩(색감 + 자막 분위기) 프리셋.

cinematic 값은 광고 영상 레퍼런스에서 측정한 특징을 옮긴 것이다:
  - 그림자는 차가운 푸른빛, 밝은 부분은 따뜻한 크림빛
  - 채도는 낮게(약 0.22), 검정은 살짝 띄우고 하이라이트는 부드럽게
  - 자막은 작고 조용한 흰 글씨, 핵심 단어만 호박색으로 살짝 크게
"""
LOOKS = {"none", "cinematic"}

GRADE = {
    "none": "",
    "cinematic": (
        "curves=all='0/0.08 0.5/0.5 1/0.94',"
        "eq=saturation=0.95:contrast=0.95,"
        "colorbalance=rs=-0.05:gs=-0.01:bs=0.07:rh=-0.01:gh=0:bh=0.03"
    ),
}


def grade_filter(look: str) -> str:
    return GRADE.get(look, "")


def caption_style(look: str) -> str:
    return "cinematic" if look == "cinematic" else "pop"
