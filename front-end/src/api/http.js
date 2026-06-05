// front-end/src/api/http.js

export async function apiFetch(url, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });

  // ✅ 성공 응답 처리
  if (res.ok) {
    const ct = res.headers.get("content-type") || "";
    try {
      return ct.includes("application/json")
        ? await res.json()
        : await res.text();
    } catch {
      // 본문이 비어 있거나 파싱 불가
      return null;
    }
  }

  // ✅ 에러 응답 처리
  let msg = `HTTP ${res.status}`;
  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const j = await res.json();
      msg = j?.detail || j?.message || JSON.stringify(j);
    } else {
      const t = await res.text();
      msg = t || msg;
    }
  } catch {
    // 파싱 실패 → 기본 msg 유지
  }

  throw new Error(msg);
}
