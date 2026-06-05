def compose_arm_result(proba: float, label: str, feats: dict) -> str:
    left = abs(float(feats.get("left_slope_diff", 0.0)))
    right = abs(float(feats.get("right_slope_diff", 0.0)))
    side = "왼손" if left >= right else "오른손"
    perc = f"{proba*100:.1f}%"
    return f"{'비정상' if label=='detected' else '정상'} 가능성 {perc}. {side} 변화가 상대적으로 큽니다."
