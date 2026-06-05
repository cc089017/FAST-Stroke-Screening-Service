import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import SpeechRecorder from "./SpeechRecorder";
import SpeechResult from "./SpeechResult";

const promptText = `
아래 문장을 읽어주세요:

안녕하세요 제 이름은 000입니다.
저는 0000년 00월 00일에 00에서 태어났고 00살입니다.
00초등학교 00중학교 00고등학교 00대학교를 졸업했고
지금 000일을 하고 있습니다. 감사합니다
`;

export default function SpeechTestPage() {
  const [result, setResult] = useState(null);
  const [recording, setRecording] = useState(true);
  const [loading, setLoading] = useState(false);
  const resultRef = useRef(null);
  const navigate = useNavigate(); // ✅ 추가

  // 녹음 종료 시 서버로 전송
  const handleStop = async (blob, filename = "recording.webm") => {
    console.log("[DEBUG] handleStop called with blob:", blob.size, "bytes");

    setLoading(true);
    setResult(null);
    setRecording(false); // 녹음 상태 종료

    try {
      const fd = new FormData();
      fd.append("file", blob, filename);

      console.log("[DEBUG] Sending to API:", filename, blob.size, "bytes");

      const res = await fetch("/api/v1/speech/predict", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      console.log("Response status:", res.status);

      if (res.ok) {
        // ✅ 요구사항: SpeechResult로 가지 않고 /test/end로 이동
        // 필요 시 다음 두 줄로 응답 확인만 가능:
        // const data = await res.json();
        // console.log("API 성공 응답:", data);
        navigate("/test/end");
      } else {
        const errorText = await res.text();
        console.error("API Error:", res.status, errorText);
        setResult({
          error: `API Error: ${res.status} - ${errorText}`,
        });
      }
    } catch (e) {
      console.error("Request Error:", e);
      setResult({
        error: `Request Error: ${e.message}`,
      });
    }

    setLoading(false);
  };

  // 업로드 완료 결과 (기존 UI/흐름 유지)
  const handleDone = (data) => {
    setResult(data);
  };
  return (
    <div className="w-screen h-screen flex items-center justify-center bg-white relative overflow-hidden">
      {/* 원형 링 배경 - 가운데 정렬, vmin 단위 */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-xl overflow-hidden"
        style={{
          width:  '133vmin',
          height: '133vmin',
          border: '7vw solid #f6f6f6',
        }}
      />

      {/* 콘텐츠 카드 */}
      <div className="relative z-10 w-full max-w-xl">
        <div className="bg-white rounded-xl shadow-lg p-8 flex flex-col items-center">
          <div className="mb-8 text-center">
            <h2 className="text-4xl font-bold mb-4 text-blue-700">음성 검사</h2>
            <pre className="text-gray-800 text-[25px] font-sans font-normal whitespace-pre-wrap">
              {promptText}
            </pre>
          </div>

          {loading && (
            <div className="my-8 text-3xl text-blue-600 font-bold">결과 출력중...</div>
          )}

          {recording && <SpeechRecorder onStop={handleStop} onDone={handleDone} />}

          <div ref={resultRef}>{result ? <SpeechResult result={result} /> : null}</div>
        </div>
      </div>
    </div>
  );
};
