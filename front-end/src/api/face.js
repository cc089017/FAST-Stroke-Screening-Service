// front-end/src/api/face.js
import http from "@/lib/http";

/**
 * (권장) 얼굴 저장은 반드시 /api/v1/measure/face/upload 를 사용
 * 설명형 결과(=face_result)로 DB 저장됨
 */
export async function saveFaceImageWithResult(blob, { predLabel, features } = {}) {
  const fd = new FormData();
  fd.append("image", blob, "frame.jpg");

  if (typeof predLabel !== "undefined" && predLabel !== null) {
    fd.append("pred_label", String(predLabel));
  }
  if (features && typeof features === "object") {
    fd.append("features_json", JSON.stringify(features));
  }

  const res = await http.post("/api/v1/measure/face/upload", fd);
  return res.data; // { face_id, user_id, result_text, ... }
}

/**
 * (레거시 호환) 기존에 /api/v1/face 로 바로 저장 호출하던 코드가 남아있다면,
 * 내부적으로 /measure/face/upload 로 우회시켜 동일한 동작을 보장.
 */
export async function legacySaveFace(blob, { resultText, landmarks } = {}) {
  const fd = new FormData();
  fd.append("image", blob, "frame.jpg");

  // 과거 파라미터를 최대한 보존해서 서버 합성 로직이 참고할 수 있게 전달
  if (typeof resultText === "string") {
    // 서버에서 pred_label이 없으면 result_text/feature를 참고하여 문장 합성
    fd.append("result_text", resultText);
  }
  if (landmarks && typeof landmarks === "object") {
    fd.append("features_json", JSON.stringify(landmarks));
  }

  const res = await http.post("/api/v1/measure/face/upload", fd);
  return res.data; // { face_id, user_id, result_text, ... }
}
