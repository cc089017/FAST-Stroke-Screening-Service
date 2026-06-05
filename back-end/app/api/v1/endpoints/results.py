from __future__ import annotations

from datetime import datetime
from typing import List, Dict

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.security import get_user_id_from_cookie
from app.models.speech import Speech
from app.models.face import Face
from app.models.arm import Arm
from app.models.user import User


router = APIRouter(tags=["results"])


    
def _to_date_str(dt: datetime) -> str:
    if not dt:
        return ""
    return dt.strftime("%Y.%m.%d")


def _speech_to_label(row: Speech) -> str:
    # Speech.result_text: "Abnormal" | "Normal"
    if not row or not row.result_text:
        return "미실시"
    return "경고" if str(row.result_text).lower() == "abnormal" else "정상"


def _face_to_label(row: Face) -> str:
    if not row or not row.result_text:
        return "미실시"
    txt = str(row.result_text)
    # 저장 형태가 문장일 수 있어 부분 매칭
    if "비정상" in txt or "abnormal" in txt.lower():
        return "경고"
        
    return "정상"

def _arm_to_label(row: Arm) -> str:
    if not row:
        return "미실시"
    # label 1: 경고, 0: 정상 (기본 가정)
    try:
        return "경고" if int(row.label) == 1 else "정상"
    except Exception:
        # 라벨이 문자열이거나 None인 경우
        if str(getattr(row, "label", "")).strip() in ("1", "detected", "경고"):
            return "경고"
        if getattr(row, "label", None) is None:
            return "미실시"
        return "정상"


@router.get("/summary")
def get_results_summary(
    limit: int = 20,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
) -> List[Dict]:
    """
    사용자별 최근 날짜 단위로 face/arm/speech 결과를 요약해 반환.
    - 날짜는 각 모달리티 레코드의 created_at을 YYYY.MM.DD로 정규화하여 그룹핑
    - 동일 날짜에 여러 건이 있으면 가장 최신(created_at DESC)만 사용
    """
    # 각각 최근 N개 로드
    speech_rows: List[Speech] = (
        db.query(Speech)
        .filter(Speech.user_id == user_id)
        .order_by(Speech.created_at.desc())
        .limit(limit)
        .all()
    )
    face_rows: List[Face] = (
        db.query(Face)
        .filter(Face.user_id == user_id)
        .order_by(Face.created_at.desc())
        .limit(limit)
        .all()
    )
    arm_rows: List[Arm] = (
        db.query(Arm)
        .filter(Arm.user_id == user_id)
        .order_by(Arm.created_at.desc())
        .limit(limit)
        .all()
    )

    # 날짜별 최신 레코드만 유지
    by_date = {}

    for r in speech_rows:
        d = _to_date_str(r.created_at)
        item = by_date.get(d, {"date": d, "face": "미실시", "arm": "미실시", "speech": "미실시"})
        # speech가 더 최신일 수도 있으니 덮어쓰기 허용
        item["speech"] = _speech_to_label(r)
        by_date[d] = item

    for r in face_rows:
        d = _to_date_str(r.created_at)
        item = by_date.get(d, {"date": d, "face": "미실시", "arm": "미실시", "speech": "미실시"})
        if item.get("_face_ts") is None or r.created_at >= item.get("_face_ts"):
            item["face"] = _face_to_label(r)
            item["_face_ts"] = r.created_at
        by_date[d] = item

    for r in arm_rows:
        d = _to_date_str(r.created_at)
        item = by_date.get(d, {"date": d, "face": "미실시", "arm": "미실시", "speech": "미실시"})
        if item.get("_arm_ts") is None or r.created_at >= item.get("_arm_ts"):
            item["arm"] = _arm_to_label(r)
            item["_arm_ts"] = r.created_at
        by_date[d] = item

    # 정렬: 최신 날짜 우선, 내부 메타키 제거
    items = []
    for d, v in by_date.items():
        v.pop("_face_ts", None)
        v.pop("_arm_ts", None)
        items.append(v)

    def _sort_key(it):
        try:
            return datetime.strptime(it["date"], "%Y.%m.%d")
        except Exception:
            return datetime.min

    items.sort(key=_sort_key, reverse=True)
    # 상위 limit로 제한
    return items[:limit]


@router.get("/sessions")
def list_result_sessions(
    limit: int = 50,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
):
    """
    세션 목록: 'speech' 레코드를 기준(앵커)으로, 같은 날짜에서 가장 가까운 face/arm 최신 레코드를 매핑.
    - 반복 검사를 하면 speech마다 한 줄씩 추가됨(누적 표시).
    - 각 항목은 detail_id(=speech.id)를 제공 → 상세 API에서 통합 결과 제공.
    """
    speech_rows: List[Speech] = (
        db.query(Speech)
        .filter(Speech.user_id == user_id)
        .order_by(Speech.created_at.desc())
        .limit(limit)
        .all()
    )

    out = []
    for s in speech_rows:
        dstr = _to_date_str(s.created_at)
        # 같은 날짜 내에서 가장 최근 face/arm 가져오기 (검사 순서가 face→arm→speech라고 가정)
        face_row = (
            db.query(Face)
            .filter(Face.user_id == user_id)
            .filter(Face.created_at <= s.created_at)
            .filter(Face.created_at.isnot(None))
            .order_by(Face.created_at.desc())
            .first()
        )
        if face_row and _to_date_str(face_row.created_at) != dstr:
            face_row = None

        arm_row = (
            db.query(Arm)
            .filter(Arm.user_id == user_id)
            .filter(Arm.created_at <= s.created_at)
            .filter(Arm.created_at.isnot(None))
            .order_by(Arm.created_at.desc())
            .first()
        )
        if arm_row and _to_date_str(arm_row.created_at) != dstr:
            arm_row = None

        out.append({
            "detail_id": s.id,    # 상세 조회용 키(스피치 앵커)
            "datetime": s.created_at,
            "date": dstr,
            "face": _face_to_label(face_row),
            "arm": _arm_to_label(arm_row),
            "speech": _speech_to_label(s),
        })

    return out


@router.get("/detail/{speech_id}")
def get_result_detail(
    speech_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id_from_cookie),
):
    """
    통합 상세: 특정 speech_id를 기준으로 같은 날짜에서 가장 가까운 face/arm 결과를 함께 반환.
    프론트는 이 응답만으로 상세 결과지 렌더링 가능.
    """
    s: Speech = db.query(Speech).filter(Speech.id == speech_id).first()
    if not s or s.user_id != user_id:
        raise HTTPException(status_code=404, detail="speech not found")

    dstr = _to_date_str(s.created_at)

    face_row = (
        db.query(Face)
        .filter(Face.user_id == user_id)
        .filter(Face.created_at <= s.created_at)
        .order_by(Face.created_at.desc())
        .first()
    )
    if face_row and _to_date_str(face_row.created_at) != dstr:
        face_row = None

    arm_row = (
        db.query(Arm)
        .filter(Arm.user_id == user_id)
        .filter(Arm.created_at <= s.created_at)
        .order_by(Arm.created_at.desc())
        .first()
    )
    if arm_row and _to_date_str(arm_row.created_at) != dstr:
        arm_row = None

    # 이미지 접근 URL 구성(프론트가 바로 <img src>로 사용 가능)
    face_image_url = None
    if face_row:
        face_image_url = f"/api/v1/face/{getattr(face_row, 'face_id', 0)}/image"
    arm_start_url = arm_end_url = None
    if arm_row:
        arm_start_url = f"/api/v1/arm/{getattr(arm_row, 'arm_id', 0)}/image/start"
        arm_end_url = f"/api/v1/arm/{getattr(arm_row, 'arm_id', 0)}/image/end"

    # 사용자 정보 조회
    user: User = db.query(User).filter(User.id == user_id).first()
    name = getattr(user, 'name', '-') if user else '-'
    # birth_date -> YYYY.MM.DD 형식
    try:
        birth_str = user.birth_date.strftime('%Y.%m.%d') if (user and getattr(user, 'birth_date', None)) else '-'
    except Exception:
        birth_str = '-'
    # gender -> 남성/여성 표기
    g = getattr(user, 'gender', None)
    gender_str = {'male': '남성', 'female': '여성'}.get(g, '-')

    return {
        "date": dstr,
        "datetime": s.created_at,
        "user": {
            "name": name,
            "birth": birth_str,
            "gender": gender_str,
        },
        "face": None if not face_row else {
            "id": int(getattr(face_row, 'face_id', 0)),
            "result": _face_to_label(face_row),
            "result_text": getattr(face_row, 'result_text', None),
            "image_url": face_image_url,
        },
        "arm": None if not arm_row else {
            "id": int(getattr(arm_row, 'arm_id', 0)),
            "result": _arm_to_label(arm_row),
            "label": getattr(arm_row, 'label', None),
            "confidence": getattr(arm_row, 'confidence', None),
            "start_image_url": arm_start_url,
            "end_image_url": arm_end_url,
        },
        "speech": {
            "id": int(getattr(s, 'id', 0)),
            "result": _speech_to_label(s),
            "risk": getattr(s, 'risk_score', None),
            "threshold": getattr(s, 'threshold', None),
            "debug": getattr(s, 'debug_json', None),
            "features": getattr(s, 'features_json', None),
            "waveform_graph_url": getattr(s, 'waveform_graph_url', None),
            "dtw_graph_url": getattr(s, 'dtw_graph_url', None),
            "feature_graph_url": getattr(s, 'feature_graph_url', None),
            "personalized_text": (getattr(s, 'debug_json', {}) or {}).get('personalized_text') if isinstance(getattr(s, 'debug_json', None), dict) else None,
            # personalized_text는 프론트에서 생성 가능하지만, 필요 시 백엔드에 저장/제공하도록 확장 가능
        }
    }
