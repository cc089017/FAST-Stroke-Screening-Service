// SpeechResult.jsx - 김민규 작성
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SpeechResult({ result }) {
  const [showDebug, setShowDebug] = useState(false);
  const navigate = useNavigate();
  const fileName = result?.debug_info?.filename ?? null;

  // 에러 감지 및 친절한 안내 메시지 구성
  const errorInfo = useMemo(() => {
    if (!result?.error) return null;
    const msg = String(result.error);
    if (msg.includes("401") || /Not authenticated|Invalid token/i.test(msg)) {
      return {
        title: "로그인이 필요합니다",
        detail: "검사를 실행하려면 먼저 로그인하세요. 우측 상단 로그인 버튼을 눌러 로그인 후 다시 시도해주세요.",
      };
    }
    if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
      return {
        title: "백엔드 연결 실패",
        detail: "백엔드 서버가 실행 중인지 확인하세요. 개발 환경에서는 루트에서 'npm start'로 백엔드/프론트엔드를 함께 실행할 수 있습니다.",
      };
    }
    return { title: "요청 실패", detail: msg };
  }, [result]);

  const decisionColor = result.decision === "Abnormal" ? "text-red-600" : "text-green-600";
  const decisionBg = result.decision === "Abnormal" ? "bg-red-50" : "bg-green-50";
  const riskPct =
    typeof result.risk === "number" ? Math.round(result.risk * 100) : (result.risk ?? "—");
  const thresholdPct =
    typeof result.threshold === "number" ? Math.round(result.threshold * 100) : (result.threshold ?? "—");

  return (
    <div className="mt-6 space-y-4">
      {!result && (
        <div className="p-4 rounded border bg-gray-50 text-gray-700">결과 데이터가 없습니다.</div>
      )}
      {/* 에러 배너 */}
      {errorInfo && (
        <div className="p-4 rounded border border-red-200 bg-red-50 text-red-700">
          <div className="font-semibold">{errorInfo.title}</div>
          <div className="text-sm mt-1">{errorInfo.detail}</div>
        </div>
      )}

      {/* 그래프 최상단 배치 */}
      {result.graph && (
        <div>
          <h3 className="text-lg font-semibold mb-2">시각화</h3>
          <img
            src={result.graph}
            alt="Speech analysis graph"
            className="w-full rounded border shadow"
          />
        </div>
      )}

      {/* 핵심 결과 카드 */}
      <div className={`p-4 rounded border ${decisionBg}`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-gray-600">판정</span>
          <span className={`text-xl font-bold ${decisionColor}`}>
            {result.decision}
          </span>
          <span className="ml-2 text-sm text-gray-600">
            위험도 {riskPct}% · 임계값 {thresholdPct}%
          </span>
                  {fileName && (
                    <span className="ml-auto text-xs text-gray-500">파일: {fileName}</span>
                  )}
        </div>
      </div>

      {/* 이동 버튼 */}
      <div className="mt-4">
        <button
          onClick={() => navigate("/results")}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg text-lg shadow hover:bg-blue-700"
        >
          My 검사 결과 페이지로 이동
        </button>
      </div>

      {/* 전체 디버그 JSON: 기본 접힘 */}
      <div>
        <button
          onClick={() => setShowDebug((s) => !s)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showDebug ? "디버그 숨기기" : "디버그 상세 보기"}
        </button>
        {showDebug && (
          <pre className="mt-2 text-xs bg-gray-50 rounded border p-3 overflow-auto max-h-[300px]">
{JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}