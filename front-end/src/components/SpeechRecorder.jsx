// SpeechRecorder.jsx - 수동 시작/종료, 파일 업로드 UI 제거
import React, { useRef, useState, useEffect, useCallback } from "react";

const MAX_SECONDS = 40;

const SpeechRecorder = ({ onStop, onDone }) => {
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const chunksRef = useRef([]);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setIsRecording(false);
    setSeconds(0);
    chunksRef.current = [];
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleDataAvailable = useCallback((e) => {
    if (e.data && e.data.size > 0) {
      chunksRef.current.push(e.data);
    }
  }, []);

  const stopRecordingInternal = useCallback(async () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        await new Promise((resolve) => {
          mediaRecorderRef.current.onstop = resolve;
          mediaRecorderRef.current.stop();
        });
      }
    } catch (_) {
      /* no-op */
    }

    // Blob 생성 및 상위 콜백 전달
    const blob = new Blob(chunksRef.current, { type: "audio/webm" });
    reset();
    if (typeof onStop === "function") {
      onStop(blob, "recording.webm");
    }
    if (typeof onDone === "function") {
      onDone(); // 상위에서 필요시 사용
    }
  }, [onStop, onDone, reset]);

  const startRecording = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.addEventListener("dataavailable", handleDataAvailable);

      mr.start(100); // 100ms 단위로 청크 수집
      setIsRecording(true);
      setSeconds(0);

      // 타이머 시작
      timerRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            // 시간 만료 → 자동 종료
            stopRecordingInternal();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
      setError("마이크 권한을 허용해 주세요.");
    }
  }, [handleDataAvailable, stopRecordingInternal]);

  const stopRecording = useCallback(async () => {
    await stopRecordingInternal();
  }, [stopRecordingInternal]);

  useEffect(() => {
    return () => {
      // 언마운트 시 정리
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (_) {}
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

    return (
      <>
        {/* 흰 배경 + 파란 테두리 박스 (상단 두 줄 + 에러만) */}
        <div className="flex flex-col items-center rounded-xl bg-white border-2 border-blue-600 px-6 py-3 shadow-lg">
          <div className="text-xl mb-3">
            {isRecording ? "녹음 중..." : "대기 중"}
          </div>

          <div className="text-2xl ">
            {seconds}s / {MAX_SECONDS}s
          </div>

          {error && <div className="mt-1 text-red-500">{error}</div>}
        </div>

        {/* 버튼 영역 (박스 밖) */}
        <div className="flex gap-3 mt-4">
          {!isRecording ? (
            <button
              className="bg-blue-600 text-white text-4xl font-normal font-sans px-7 py-4 rounded-full shadow-lg
                        transition-transform duration-300 scale-[0.7]
                        hover:scale-[0.77] hover:bg-blue-700 hover:font-semibold hover:shadow-xl"
              onClick={startRecording}
            >
              녹음 시작
            </button>
          ) : (
            <button
              className="bg-blue-600 text-white text-4xl font-normal font-sans px-7 py-4 rounded-full shadow-lg
                        transition-transform duration-300 scale-[0.7]
                        hover:scale-[0.77] hover:bg-blue-700 hover:font-semibold hover:shadow-xl"
              onClick={stopRecording}
            >
              녹음 종료
            </button>
          )}
        </div>
      </>
    );

};

export default SpeechRecorder;
