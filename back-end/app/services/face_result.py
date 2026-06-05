# app/services/face_result.py
from __future__ import annotations
import re
from typing import Dict, Any, Optional, Tuple

# ─────────────────────────────────────────────────────────────────────────────
#  미디어파이프 Face Mesh 인덱스 → 한국어 부위명 매핑
#  (우/좌 표기: 화면 기준이 아니라 얼굴의 실제 좌/우 개념. 텍스트는 양측 쌍으로 표기)
#  ※ 필요한 쌍은 계속 추가 가능. 미지정 쌍은 일반 문구로 폴백.
# ─────────────────────────────────────────────────────────────────────────────

# 키는 "작은번호,큰번호" 문자열로 통일
PAIR_REGION_MAP: Dict[str, str] = {
    "33,263":  "눈꼬리(가쪽, 우–좌)",
    "133,362": "눈머리(안쪽, 우–좌)",
    "145,374": "윗눈꺼풀(우–좌)",
    "159,385": "아랫눈꺼풀(우–좌)",

    # 입술/입꼬리 주변
    "61,291":  "입꼬리(우–좌)",
    "48,278":  "입술 외곽(우–좌)",
    "55,285":  "입술 윤곽(우–좌)",
    "65,295":  "윗입술 경계(우–좌)",
    "50,280":  "아랫입술 경계(우–좌)",
    "57,287":  "아랫입술 중앙 근처(우–좌)",

    # 코/인중/구순 주변
    "93,323":  "콧방울(우–좌)",
    "81,311":  "코–입 사이(우–좌)",
    "91,321":  "인중/상순(우–좌)",

    # 눈 안쪽 근방(세부 포인트)
    "123,352": "눈 안쪽 주변(우–좌)",
    "132,361": "눈 안쪽 주변(우–좌)",

    # 얼굴 외곽/광대, 관자 부위
    "234,454": "광대/관자 부위(우–좌)",
}

#  쌍 표기 파싱: ..._<a>_<b>  → ("a","b")
_PAIR_SUFFIX_RE = re.compile(r".*?_(\d+)_(\d+)$")
_VALID_PREFIXES = ("AI_x_", "AI_y_", "angle_")  # 우리가 고르는 feature prefix

def _norm_pair_key(a: str, b: str) -> str:
    """작은 번호가 앞에 오도록 정규화."""
    ai, bi = int(a), int(b)
    return f"{min(ai,bi)},{max(ai,bi)}"

def human_region_for_pair(a: str, b: str) -> str:
    """
    점 쌍 → 한국어 부위명.
    등록된 매핑이 없으면 "(a–b) 부위" 로 폴백.
    """
    key = _norm_pair_key(a, b)
    return PAIR_REGION_MAP.get(key, f"({a}–{b}) 부위")

def _top_pair_feature(features: Dict[str, Any]) -> Optional[Tuple[str, float, Tuple[str, str]]]:
    """
    features 중 AI_x_/AI_y_/angle_ 로 시작하고, 이름 끝에 "_<a>_<b>"를 가진 항목에서
    '절대값' 최대인 항목을 반환.
    반환: (키, 값, (a, b))
    """
    winner: Optional[Tuple[str, float, Tuple[str, str]]] = None
    for k, v in (features or {}).items():
        if not isinstance(v, (int, float)):
            try:
                v = float(v)
            except Exception:
                continue
        if not k.startswith(_VALID_PREFIXES):
            continue
        m = _PAIR_SUFFIX_RE.match(k)
        if not m:
            continue
        a, b = m.group(1), m.group(2)
        cur = (k, float(v), (a, b))
        if winner is None or abs(cur[1]) > abs(winner[1]):
            winner = cur
    return winner

def compose_result_text(user_name_or_id: str, is_abnormal: bool, features: Optional[Dict[str, Any]] = None) -> str:
    """
    한국어 결과 문장 생성:
      - 정상:  "{이름}님의 안면마비 측정 결과는 정상입니다.\n(현재 측정으로 안면 마비 징후는 확인되지 않았습니다.)"
      - 비정상: 줄바꿈 3줄 구조
    """
    name = user_name_or_id or "사용자"

    if not is_abnormal:
        return (
            f"{name}님의 안면마비 측정 결과는 정상입니다.\n"
            "(현재 측정으로 안면 마비 징후는 확인되지 않았습니다.)\n"
            "안면마비는 입꼬리 높이, 눈-입 대칭성, 기울기 등의 얼굴 좌우 지표를 종합 분석하여 판단합니다.\n"
            "고개 기울임, 표정 부족, 가림 요소(머리카락, 손 등), 측면 얼굴은 정확도에 영향을 줄 수 있습니다.\n"
        )

    # 비정상 이유 구성
    part_text = None
    topf = _top_pair_feature(features or {})
    if topf:
        _, _, (a, b) = topf
        part_text = human_region_for_pair(a, b)

    if not part_text:
        return (
            f"{name}님의 안면마비 측정 결과는 비정상입니다.\n"
            "(기준치를 초과한 안면 마비 수치가 확인되었습니다. 즉시 가까운 뇌졸중 센터에 방문하세요.)\n"
            "특정 부위에서 비대칭 수치가 높게 측정되었습니다."
        )

    return (
        f"{name}님의 안면마비 측정 결과는 비정상입니다.\n"
        "(기준치를 초과한 안면 마비 수치가 확인되었습니다. 즉시 가까운 뇌졸중 센터에 방문하세요.)\n"
        "안면마비는 입꼬리 높이, 눈-입 대칭성, 기울기 등의 얼굴 좌우 지표를 종합 분석하여 판단합니다.\n"
        "고개 기울임, 표정 부족, 가림 요소(머리카락, 손 등), 측면 얼굴은 정확도에 영향을 줄 수 있습니다.\n"
        f"{name}님의 {part_text} 부분이 비대칭 수치가 높게 측정되어 위험이 있다고 판단됩니다."
    )

