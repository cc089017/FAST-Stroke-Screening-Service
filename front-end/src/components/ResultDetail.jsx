// src/components/ResultDetail.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import http from "@/lib/http";
// --- Arm 소견 문자열 생성 (안정 버전) ---
// --- Arm 소견 문자열 생성: confidence만 사용 ---
function buildArmNote(data) {
  try {
    const a = data && data.arm ? data.arm : null;
    if (!a) return "본 검사는 실시되지 않았습니다.";

    const userName =
      (data && data.user && data.user.name) ? data.user.name : "사용자";

    // 라벨 정규화
    const rawLabel = (a.label == null ? "" : String(a.label)).toLowerCase();
    const isNormal = ["normal", "negative", "0", "false"].includes(rawLabel);
    const isAbn    = ["abnormal", "detected", "positive", "1", "true"].includes(rawLabel);

    // confidence만 사용 (0~1이면 %로 변환, 그 외 값은 %로 가정)
    let conf = (typeof a.confidence === "number") ? a.confidence : null;
    let confPctStr = null;
    if (conf != null) {
      const pct = (conf <= 1 && conf >= 0) ? conf * 100 : conf; // 0~1 → %
      confPctStr = pct.toFixed(1) + "%";
    }

    const lines = [];
    // 1) 헤더/결과
    lines.push(`${userName}님의 팔 힘 측정결과는 ${isAbn ? "비정상" : (isNormal ? "정상" : "미실시")}입니다.`);

    // 2) 결과 코멘트
    lines.push(
      isAbn
        ? "(기준치를 초과한 팔 힘 약화가 확인되었습니다. 즉시 가까운 뇌졸중 센터에 방문하세요.)"
        : "(현재 측정으로 팔 힘 약화 징후는 확인되지 않았습니다.)"
    );

    // 3) 설명
    lines.push("팔 힘 약화는 팔 하강 측정과 손목 회전 측정을 종합 분석합니다.심한 피로, 근육통, 어깨 질환, 팔이 화면 밖으로 나가는 경우는 진단 결과에 영향을 줄 수 있습니다.");


    return lines.join("\n");
  } catch {
    return "소견 생성 중 오류가 발생했습니다.";
  }
}



export default function ResultDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await http.get(`/api/v1/results/detail/${id}`);
                if (alive) setData(res.data);
            } catch (e) {
                if (alive) setData({ error: e?.response?.data?.detail || e.message });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [id]);

    

    const statusColor = (s) => (s === "경고" || s === "주의" ? "text-red-500" : "text-blue-600");

    if (loading) return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center text-white text-xl">불러오는 중…</div>
    );
    if (!data || data.error) return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
            <div className="bg-white p-6 rounded shadow text-center">
                <div className="text-red-600 font-semibold mb-2">상세 데이터를 불러오지 못했습니다</div>
                <div className="text-sm text-gray-600">{data?.error || "알 수 없는 오류"}</div>
                <Link to="/results" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded">닫기</Link>
            </div>
        </div>
    );

    return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[1px] overflow-y-auto p-6">
        {/* A4 카드: 각진 직사각형 */}
        <div
            className="relative mx-auto bg-white shadow-2xl border border-gray-200 flex flex-col"
            style={{ aspectRatio: "210 / 297", width: "min(92vw, 794px)" }}
        >
            {/* 항상 보이는 닫기 버튼 (우상단) */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-3 right-3 px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
                aria-label="닫기"
            >
                닫기
            </button>
            {/* 헤더 */}
            <div className="px-6 sm:px-8 pt-6">
                <h1 className="text-center text-7xl font-extrabold text-blue-600 tracking-wide">F.A.S.T</h1>

                {/* 인적사항 */}
                <div className="mt-10 border border-gray-100 bg-gray-100 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-4 text-center text-[15px] font-semibold text-gray-700">
                        <div className="py-2">이름</div>
                        <div className="py-2">생년월일</div>
                        <div className="py-2">성별</div>
                        <div className="py-2">검사일시</div>
                    </div>
                    <div className="h-px mx-4 bg-gray-300" />
                    <div className="grid grid-cols-4 text-center text-[15px]">
                        <div className="py-2">{data.user?.name || '-'}</div>
                        <div className="py-2">{data.user?.birth || '-'}</div>
                        <div className="py-2">{data.user?.gender || '-'}</div>
                        <div className="py-2">{data.date}</div>
                    </div>
                </div>
            </div>

            {/* 본문: ✅ 내부 스크롤 제거 (overflow-auto 삭제) → 오버레이가 전체 스크롤 담당 */}
            <div className="flex-1 px-6 sm:px-8 pb-6 mt-5">
                {/* Face */}
                <section className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-[20px] font-semibold text-gray-800">Face 분석 |</h2>
                        <span className={`text-[21px] font-bold ${statusColor(data.face?.result)}`}> {data.face?.result || "미실시"}</span>
                    </div>

                    {/* 가운데 정렬 */}
                    <div className="mt-0.5 grid grid-cols-[350px_1fr] gap-6 rounded-xl bg-gray-100 p-4">
                        <div className="w-[330px] rounded-xl border border-gray-300 bg-white overflow-hidden flex items-center justify-center">
                            {data.face?.image_url ? (
                                <img src={data.face.image_url} alt="Face" className="w-full h-auto object-contain" />
                            ) : (
                                <div className="text-gray-400 text-sm py-12">이미지 없음</div>
                            )}
                        </div>
                        <div className="p-2 text-sm text-black whitespace-pre-wrap">
                            {data.face?.result_text || "-"}
                        </div>
                    </div>
            </section>
                {/* Arm */}
                <section className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-[20px] font-semibold text-gray-800">Arm 분석 |</h2>
                        <span className={`text-[21px] font-bold ${statusColor(data.arm?.result)}`}>
                        {data.arm?.result || "미실시"}
                        </span>
                    </div>

                                    {/* 유동 레이아웃: 모바일 1열, md 이상 2열 */}
                    <div className="mt-0.5 grid grid-cols-1 md:grid-cols-2 gap-6 rounded-xl bg-gray-100 p-4">
                        {/* 왼쪽: 시작/종료 이미지 2개(정사각 유지, 컨테이너 유동) */}
                        <div className="w-full md:max-w-[clamp(240px,35vw,380px)] rounded-xl border border-gray-300 bg-white overflow-hidden mx-auto">
                            <div className="grid grid-cols-2 gap-2 p-2">
                                <div className="aspect-square rounded border border-gray-300 bg-white overflow-hidden relative">
                                    {data.arm?.start_image_url ? (
                                        <img
                                        src={data.arm.start_image_url}
                                        alt="Arm 시작"
                                        className="absolute inset-0 w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                                        시작 이미지 없음
                                        </div>
                                    )}
                                </div>
                                
                            <div className="aspect-square rounded border border-gray-300 bg-white overflow-hidden relative">
                                    {data.arm?.end_image_url ? (
                                        <img
                                        src={data.arm.end_image_url}
                                        alt="Arm 종료"
                                        className="absolute inset-0 w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-xs">
                                        종료 이미지 없음
                                        </div>
                                    )}
                            </div>
                        </div>
                    </div>

                    <div className="p-2 text-sm text-black whitespace-pre-wrap">
                    {buildArmNote(data)}
                    </div>
                </div>
            </section>

               


                {/* Speech */}
                <section className="mb-4">
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-[20px] font-semibold text-gray-800">Speech 분석 |</h2>
                        <span className={`text-[21px] font-bold ${statusColor(data.speech?.result)}`}> {data.speech?.result || "미실시"} </span>
                    </div>

                    {/* 가운데 정렬 */}
                    <div className="mt-0.5 grid grid-cols-[350px_1fr] gap-6 rounded-xl bg-gray-100 p-4">
                        {/* 이미지 2개를 가로로 나란히 */}
                        <div className="flex gap-4">
                            <div className="w-[170px] aspect-square rounded-xl border border-gray-300 bg-white overflow-hidden flex items-center justify-center">
                                {data.speech?.waveform_graph_url ? (
                                    <img src={data.speech.waveform_graph_url} alt="Waveform" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-gray-400 text-sm">파형 없음</div>
                                )}
                            </div>
                            <div className="w-[170px] aspect-square rounded-xl border border-gray-300 bg-white overflow-hidden flex items-center justify-center">
                                {data.speech?.dtw_graph_url ? (
                                    <img src={data.speech.dtw_graph_url} alt="DTW" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-gray-400 text-sm">DTW 없음</div>
                                )}
                            </div>
                        </div>
                        {/* 결과 텍스트 */}
                        <div className="p-2 text-sm text-black whitespace-pre-wrap">
                            {(() => {
                                const risk = data.speech?.risk;
                                const th = data.speech?.threshold;
                                const userName = data.user?.name || "사용자";
                                // 간단한 개인화 문구 (백엔드 저장값이 있으면 우선)
                                if (data.speech?.personalized_text) return data.speech.personalized_text;
                                const r = (typeof risk === 'number') ? risk : Number.NaN;
                                const t = (typeof th === 'number') ? th : Number.NaN;
                                const comp = (isFinite(r) && isFinite(t)) ? (r < t ? '미만' : '이상') : '';
                                const exist = (isFinite(r) && isFinite(t)) ? (r < t ? '없' : '있') : '';
                                const rStr = isFinite(r) ? r.toFixed(2) : String(risk);
                                const tStr = isFinite(t) ? t.toFixed(2) : String(th);
                                return [
                                    '언어 장애 평가는 발음의 정확도와 정상 음성과의 차이로 비교하여 정상 패턴과의 유사도를 구하고 발성의 불안정성과 에너지 일관성을 함께 고려해 종합 위험도를 산출합니다.',
                                    '',
                                    `${userName}님의 위험도는 ${rStr}로 모델 기준치 ${tStr} ${comp}으로 위험이 ${exist}다고 판단됩니다.`
                                ].join('\n');
                            })()}
                        </div>
                    </div>
                </section>

                {/* 종합분석 */}
                <section className="mt-4">
                    <h2 className="text-[22px] font-bold text-gray-900">종합분석</h2>
                    <div className="mt-0.5 rounded-xl bg-gray-50 p-4">
                        <div className="p-2 text-sm text-gray-700 min-h-[120px]">
                            {/* 간단 합성: 하나라도 경고면 경고 */}
                            {(() => {
                                const warn = [data.face?.result, data.arm?.result, data.speech?.result].some(v => v === "경고" || v === "주의");
                                return warn ? "경고 소견이 있습니다. 가까운 뇌졸중 센터에 문의하시기 바랍니다. 본 진단은 의료적인 진단을 수행하거나 대체하지 않으며, 판단을 보조하는 도구임을 명시합니다." : "현재 검사에서는 뚜렷한 이상 소견이 없습니다.";
                            })()}
                        </div>
                    </div>
                </section>

                {/* 닫기 버튼 */}
                <div className="mt-6 flex justify-center">
                    <Link
                        to="/results"
                        className="px-6 py-2 text-[18px] bg-blue-600 text-white rounded-lg shadow hover:brightness-110 active:scale-95 transition"
                    >
                        닫기
                    </Link>
                </div>
            </div>
        </div>
    </div>
);
}
