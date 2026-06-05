import React, { useRef, useEffect, useState } from "react";
import Select from "react-select";
import { CircleCheckBig, Circle } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

function SignupModal({ onClose, onLoginOpen }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const [userId, setUserId] = useState(""); // ✅ 백엔드 필수: id
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [birthYear, setBirthYear] = useState(null);
  const [birthMonth, setBirthMonth] = useState(null);
  const [birthDay, setBirthDay] = useState(null);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const formatPhoneNumber = (value) =>
    value.replace(/\D/g, "").replace(/(\d{3})(\d{3,4})(\d{4})/, "$1-$2-$3").slice(0, 13);

  const yearOptions = Array.from({ length: 100 }, (_, i) => {
    const year = 2025 - i;
    return { value: year, label: `${year}년` };
  });
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`,
  }));
  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}일`,
  }));
  const genderOptions = [
    { value: "male", label: "남성" },
    { value: "female", label: "여성" },
  ];

  const buildBirthDate = () => {
    if (!birthYear?.value || !birthMonth?.value || !birthDay?.value) return null;
    const y = birthYear.value;
    const m = String(birthMonth.value).padStart(2, "0");
    const d = String(birthDay.value).padStart(2, "0");
    return `${y}-${m}-${d}`; // FastAPI/Pydantic Date 파싱 가능 포맷
  };

  const validateId = (s) => /^[a-zA-Z0-9]{1,50}$/.test(s);

  const handleSubmit = async () => {
    if (!userId || !email || !password || !confirmPassword || !name || !birthYear || !birthMonth || !birthDay || !gender || !agreed) {
      alert("모든 필수 항목을 입력하고 동의해야 회원가입이 가능합니다.");
      return;
    }
    if (!validateId(userId)) {
      alert("아이디는 영문/숫자만 사용 가능하며 최대 50자입니다.");
      return;
    }
    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      alert("비밀번호는 6자 이상이어야 합니다.");
      return;
    }

    const birth_date = buildBirthDate();
    if (!birth_date) {
      alert("생년월일을 정확히 선택해 주세요.");
      return;
    }

    const payload = {
      id: userId,
      email,
      password,
      name,
      birth_date, // "YYYY-MM-DD"
      phone_number: phone || null,
      gender: gender?.value || null, // "male" | "female"
      privacy_agreed: agreed,
    };

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        // FastAPI 검증 오류(422) 또는 커스텀 메시지(400/409 등) 핸들링
        const msg =
          data?.message ||
          (Array.isArray(data?.detail)
            ? data.detail.map((d) => d.msg).join("\n")
            : data?.detail || "회원가입에 실패했습니다.");
        throw new Error(msg);
      }

      alert("회원가입 성공! 이제 로그인해 주세요.");
      onClose();
      onLoginOpen && onLoginOpen();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div ref={modalRef} className="bg-white p-6 rounded-lg w-[30rem] shadow-lg">
        <h2 className="text-4xl font-normal mb-8 text-center">회원가입</h2>

        {/* 0. 아이디(영숫자) */}
        <input
          type="text"
          placeholder="아이디(영문/숫자)"
          value={userId}
          onChange={(e) => setUserId(e.target.value.trim())}
          className="w-full text-lg mb-3 px-4 py-2 border rounded"
          autoComplete="username"
        />

        {/* 1. 이메일 */}
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-lg mb-3 px-4 py-2 border rounded"
          autoComplete="email"
        />

        {/* 2. 비밀번호 */}
        <input
          type="password"
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-lg mb-3 px-4 py-2 border rounded"
          autoComplete="new-password"
        />

        {/* 3. 비밀번호 확인 */}
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full text-lg mb-8 px-4 py-2 border rounded"
          autoComplete="new-password"
        />

        {/* 4. 이름 */}
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full text-lg mb-3 px-4 py-2 border rounded"
        />

        {/* 5. 생년월일 */}
        <div className="flex justify-between mb-3 gap-2">
          <Select
            options={yearOptions}
            placeholder="년"
            value={birthYear}
            onChange={(selected) => setBirthYear(selected)}
            className="w-1/3 text-lg"
          />
          <Select
            options={monthOptions}
            placeholder="월"
            value={birthMonth}
            onChange={(selected) => setBirthMonth(selected)}
            className="w-1/3 text-lg"
          />
          <Select
            options={dayOptions}
            placeholder="일"
            value={birthDay}
            onChange={(selected) => setBirthDay(selected)}
            className="w-1/3 text-lg"
          />
        </div>

        {/* 6. 전화번호 */}
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
          placeholder="전화번호"
          className="w-full text-lg mb-3 px-4 py-2 border rounded"
        />

        {/* 7. 성별 */}
        <Select
          options={genderOptions}
          placeholder="성별 선택"
          value={gender}
          onChange={(selected) => setGender(selected)}
          className="mb-4 text-lg"
        />

        {/* 8. 개인정보 수집 동의 */}
        <button
          onClick={() => setAgreed(!agreed)}
          className="flex items-center gap-2 text-sm text-gray-700 mt-1 mb-4 focus:outline-none cursor-pointer"
        >
          {agreed ? <CircleCheckBig className="text-green-600 w-6 h-6" /> : <Circle className="text-gray-400 w-6 h-6" />}
          개인정보 수집 및 이용에 동의합니다.
        </button>

        {/* 9. 회원가입 버튼 */}
        <button
          disabled={!agreed || loading}
          onClick={handleSubmit}
          className={`w-full text-xl text-white mt-2 py-3 rounded-lg transition-colors ${
            agreed ? "bg-green-600 hover:bg-green-700" : "bg-gray-300 cursor-not-allowed"
          } disabled:opacity-60`}
        >
          {loading ? "처리 중..." : "회원가입"}
        </button>

        {/* 10. 로그인으로 돌아가기 */}
        <button
          onClick={() => {
            onClose();
            onLoginOpen && onLoginOpen();
          }}
          className="w-full text-sm text-gray-500 hover:text-blue-600 mt-6 pt-5 border-t"
        >
          이미 계정이 있으신가요? 로그인
        </button>
      </div>
    </div>
  );
}

export default SignupModal;
