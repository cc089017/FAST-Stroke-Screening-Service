// front-end/src/api/measure.js
import http from "@/lib/http";

/**
 * 얼굴 프레임 예측 (단순 추론)
 * 응답: { modality, pred_proba, pred_label, features }
 */
export async function predictFaceFrame(blob) {
  const fd = new FormData();
  fd.append("file", blob, "frame.jpg");
  // ⚠️ 헤더를 수동 지정하지 말 것 (브라우저가 boundary 자동 설정)
  const res = await http.post("/api/v1/measure/face/predict", fd);
  return res.data;
}

/**
 * 얼굴 프레임 저장 (설명 포함 face_result로 저장)
 * 서버의 /api/v1/measure/face/upload 가 문장형 결과를 합성해 DB에 저장함
 * - image: Blob (필수)
 * - predLabel: 0/1 (선택) - 없으면 서버가 result_text/기타 정보로 판정
 * - features: 객체(선택) - landmark/지표 등 (JSON으로 전송)
 *
 * 응답 예시: { face_id, user_id, result_text, created_at, ... }
 */
export async function uploadFaceFrame(blob, { predLabel, features } = {}) {
  const fd = new FormData();
  fd.append("image", blob, "frame.jpg");

  if (typeof predLabel !== "undefined" && predLabel !== null) {
    fd.append("pred_label", String(predLabel));
  }
  if (features && typeof features === "object") {
    fd.append("features_json", JSON.stringify(features));
  }

  // ⚠️ 헤더를 수동 지정하지 말 것
  const res = await http.post("/api/v1/measure/face/upload", fd);
  return res.data; // { face_id, user_id, result_text, ... }
}
