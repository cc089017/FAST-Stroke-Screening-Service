import React, { useRef, useEffect, useState } from "react";
import http from "../lib/http";

function LoginModal({ onClose, onSignupOpen, onLoginSuccess }) {
  const modalRef = useRef(null);
  const [userId, setUserId] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  // 바깥 클릭 닫기
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [onClose]);

  const handleSignup = () => {
    onClose();
    onSignupOpen && onSignupOpen();
  };

  const handleLogin = async () => {
    if (!userId || !pw) {
      alert("아이디/비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const res = await http.post(`/api/v1/auth/login`, { id: userId, password: pw });
      if (res.status >= 400) throw new Error(res?.data?.detail || "로그인 실패");

      // 서버가 httpOnly 쿠키를 세팅 → /me로 상태 복구
      const me = await http.get(`/api/v1/auth/me`);
      onLoginSuccess && onLoginSuccess(me.data); // 부모에서 isLoggedIn = true 등 처리
      alert("로그인 성공!");
      onClose();
    } catch (err) {
      alert(err?.response?.data?.detail || err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white p-6 rounded-lg w-[30rem] shadow-lg">
        <h2 className="text-3xl font-semibold mb-8 text-center">로그인</h2>
        <div className="space-y-3">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="아이디"
            className="w-full border rounded-md px-3 py-2"
          />
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="비밀번호"
            className="w-full border rounded-md px-3 py-2"
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full text-xl bg-blue-600 text-white mt-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <button
          onClick={handleSignup}
          className="w-full text-sm text-gray-500 hover:text-blue-600 mt-6 pt-5 border-t"
        >
          회원가입
        </button>
      </div>
    </div>
  );
}

export default LoginModal;
