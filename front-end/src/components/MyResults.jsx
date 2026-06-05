import { useMemo, useState, useEffect } from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { Link as LinkIcon, Home, Menu } from "lucide-react";
import TopRightMenu from "./TopRightMenu"; // 이미 있다면 그대로 사용
import http from "@/lib/http";

// 상태 뱃지
function StatusBadge({ value }) {
    const isWarn = value === "경고";
    return (
        <span className={`text-2xl ${isWarn ? "text-red-500 font-bold" : "text-gray-800"}`}>
      {value}
    </span>
    );
}

export default function MyResults() {
    const location = useLocation();
    // 상세 라우팅 비활성화 (요약 전용)
    const [userName, setUserName] = useState("");

    // 프로필 불러오기 (쿠키 기반 인증)
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await http.get("/api/v1/auth/profile");
                if (alive && res?.data?.name) setUserName(res.data.name);
            } catch {
                // 인증이 없거나 실패하면 이름 표시 없이 진행
            }
        })();
        return () => { alive = false; };
    }, []);

    // 실제 데이터 호출: /api/v1/results/sessions (speech를 앵커로 누적 표시)
    const [allData, setAllData] = useState([]);
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await http.get("/api/v1/results/sessions");
                if (alive) setAllData(Array.isArray(res.data) ? res.data : []);
            } catch (e) {
                console.warn("[MyResults] sessions fetch failed:", e);
            }
        })();
        return () => { alive = false; };
    }, []);

    const pageSize = 5;
    const [page, setPage] = useState(1);
    const totalPages = Math.max(1, Math.ceil(allData.length / pageSize));
    const pageData = useMemo(() => {
        const start = (page - 1) * pageSize;
        return allData.slice(start, start + pageSize);
    }, [allData, page]);

    // 상세 페이지 라우팅은 추후 레코드별 상세가 준비되면 활성화

    return (
        <div className="relative min-h-screen bg-white px-6 py-8">
            {/* 상단 오른쪽 고정 메뉴 (이미 프로젝트에 있다면 유지) */}
            <TopRightMenu showLoginButton={false} showHomeButton={true} />

            <div className="text-center mt-4">
                {/* 제목: "유저 이름"님의 페이지 */}
                <h1 className="text-7xl font-bold text-blue-600 mt-16 mb-10">
                    {userName ? `${userName}님의 페이지` : "My 검사결과"}
                </h1>
                <p className="inline-block bg-gray-100 px-12 py-1.5 text-[1.6rem] rounded-full text-black">
                    F.A.S.T 검사 결과를 확인할 수 있습니다.
                </p>

                {/* 표: 더미 데이터 기반 */}
                <div className="mx-36 mt-20 overflow-hidden rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
                    <table className="w-full table-auto text-left">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-8 py-6 text-2xl font-semibold text-gray-700">날짜</th>
                                <th className="px-8 py-6 text-2xl font-semibold text-gray-700">얼굴</th>
                                <th className="px-8 py-6 text-2xl font-semibold text-gray-700">팔</th>
                                <th className="px-8 py-6 text-2xl font-semibold text-gray-700">말</th>
                                <th className="px-8 py-6 text-2xl font-semibold text-gray-700 text-right">상세</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pageData.map((row, idx) => (
                                <tr key={`${row.date}-${idx}`} className="border-t hover:bg-gray-50">
                                    <td className="px-8 py-6 text-2xl text-gray-800">{row.date || "-"}</td>
                                    <td className="px-8 py-6"><StatusBadge value={row.face || "미실시"} /></td>
                                    <td className="px-8 py-6"><StatusBadge value={row.arm || "미실시"} /></td>
                                    <td className="px-8 py-6"><StatusBadge value={row.speech || "미실시"} /></td>
                                    <td className="px-8 py-6 text-right">
                                        {row.detail_id ? (
                                            <RouterLink
                                                to={`/results/${row.detail_id}`}
                                                state={{ background: location }}
                                                className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-2xl"
                                            >
                                                <LinkIcon size={22} /> 상세보기
                                            </RouterLink>
                                        ) : (
                                            <span className="inline-flex items-center gap-2 text-gray-400 text-2xl select-none">
                                                <LinkIcon size={22} /> -
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                <div className="mt-10 flex items-center justify-center gap-4">
                    {Array.from({ length: totalPages }).map((_, i) => {
                        const n = i + 1;
                        const isActive = n === page;
                        return (
                            <button
                                key={n}
                                onClick={() => setPage(n)}
                                className={`w-12 h-12 rounded-full text-2xl transition
                ${isActive ? "bg-blue-600 text-white shadow-lg scale-105" : "bg-white text-gray-800 border"}
              `}
                            >
                                {n}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
