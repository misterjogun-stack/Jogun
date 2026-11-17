"""룩(색감 + 자막 분위기) 프리셋.

각 룩은 ffmpeg 필터 그래프 조각이다. 입력은 {i}, 출력은 {o} 자리표시자.

cinematic : 차분한 색감. 그림자는 차가운 푸른빛, 검정은 살짝 띄우고, 자막은 작은 흰 글씨에 호박색 강조.
airy      : 밝은 아침 햇살. 레퍼런스 광고에서 측정한 값(평균 R-B +17, 검정 0.16, 상위5% 밝기 0.92,
            날아간 하이라이트 3.6%, 채도 0.20)을 목표로 한다. 낚시 영상 한 장면에서 확인한 결과: 평균 R-B +13, 검정 0.13, 상위5% 밝기 0.92. 하이라이트를 번지게 하고(블룸),
            따뜻한 크림빛에 청록빛 그림자. 자막은 옆쪽 중간 높이에 작고 연하게, 천천히 나타난다.
"""
LOOKS = {"none", "cinematic", "airy"}

_CINEMATIC = (
    "[{i}]curves=all='0/0.08 0.5/0.5 1/0.94',"
    "eq=saturation=0.95:contrast=0.95,"
    "colorbalance=rs=-0.05:gs=-0.01:bs=0.07:rh=-0.01:gh=0:bh=0.03[{o}]"
)

# 밝은 부분만 뽑아 크게 흐린 뒤 화면 합성(screen)으로 번지게 한다 → 그 위에 색보정
_AIRY = (
    "[{i}]split[ab][bb];"
    "[bb]curves=all='0/0 0.40/0 1/1',gblur=sigma=32[glow];"
    "[ab][glow]blend=all_mode=screen:all_opacity=0.80,"
    "curves=all='0/0.03 0.25/0.20 0.5/0.58 0.9/0.96 1/1',"
    "eq=saturation=0.88:contrast=0.94,"
    "colorbalance=rs=-0.07:gs=0.01:bs=0.08:rm=0.095:gm=0.01:bm=-0.095:rh=0.095:gh=0.01:bh=-0.095[{o}]"
)

GRAPH = {"cinematic": _CINEMATIC, "airy": _AIRY}


def grade_graph(look: str, inp: str, out: str) -> str:
    """색보정 필터 그래프 조각. 룩이 없으면 빈 문자열."""
    tpl = GRAPH.get(look)
    return tpl.format(i=inp, o=out) if tpl else ""


def caption_style(look: str) -> str:
    return look if look in ("cinematic", "airy") else "pop"
