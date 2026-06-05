// front-end/src/lib/http.js
import axios from "axios";

/**
 * ✅ 모든 API 호출은 상대경로 "/api/..." 로만 보냄 (vite proxy가 백엔드로 전달)
 * ✅ withCredentials 활성화로 쿠키 전달
 * ✅ default Content-Type 강제 설정 금지 (FormData 전송 시 브라우저가 boundary 포함 헤더 자동 설정)
 */
const http = axios.create({
  baseURL: "/",           // 절대 백엔드 URL 쓰지 말 것 (proxy 사용)
  withCredentials: true,  // 쿠키 포함
});

// 전역 기본 헤더는 강제하지 않는다. (특히 'Content-Type: application/json' 금지)
// 필요한 경우 각 요청에서만 개별 지정하세요.

export default http;
