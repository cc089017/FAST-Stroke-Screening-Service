import { useEffect, useState } from "react";
import TopRightMenu from "./TopRightMenu";
import { MapPinHouse, Hospital } from "lucide-react";

export default function StrokeCenter() {
    // location: { address, lat, lon }
    const [location, setLocation] = useState(null);
    // 화면에 뿌릴 최종 6개
    const [centers, setCenters] = useState([]);
    // 전체 센터 원본
    const [allCenters, setAllCenters] = useState([]);
    // 상태(필요시 화면에 안내)
    const [status, setStatus] = useState("idle");

    // ===== 거리 계산 =====
    const R = 6371; // km
    const toRad = (d) => (d * Math.PI) / 180;
    const haversineKm = (a, b) => {
        const dLat = toRad(b.lat - a.lat);
        const dLon = toRad(b.lon - a.lon);
        const s =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) *
            Math.cos(toRad(b.lat)) *
            Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(s));
    };

    // ===== URL 보정(https 누락시 자동 붙임) =====
    const fixUrl = (u) =>
        u && !/^https?:\/\//i.test(u) ? `https://${u}` : (u || "");

    // ===== 데이터 정규화 =====
    const normalizeCenters = (raw) =>
        (raw || [])
            .filter((c) => Number.isFinite(+c.lat) && Number.isFinite(+c.lon))
            .map((c) => ({
                name: c.name || c.hospital || "이름 없음",
                address: c.address || "",
                phone: c.phone || "",
                website: fixUrl(c.website || c.homepage || ""),
                lat: +c.lat,
                lon: +c.lon,
            }));

    // ===== 센터 목록 로드(JSON, 캐시 무력화) =====
    useEffect(() => {
        const controller = new AbortController();
        (async () => {
            try {
                setStatus("loading");
                const url = `/data/centers.json?ts=${Date.now()}`; // 캐시 방지
                const res = await fetch(url, { cache: "no-store", signal: controller.signal });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const raw = await res.json();
                const norm = normalizeCenters(raw);
                setAllCenters(norm);
                setStatus(norm.length ? "ready" : "empty");
            } catch (e) {
                if (e.name !== "AbortError") {
                    console.warn("[StrokeCenter] centers.json 로드 실패:", e);
                    setAllCenters([]);
                    setStatus("error");
                }
            }
        })();
        return () => controller.abort();
    }, []);

    // ===== 사용자 위치(거부/오류 시 서울시청) =====
    useEffect(() => {
        const setFromCoords = (lat, lon, label) => {
            setLocation({
                address: label || `내 좌표: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
                lat,
                lon,
            });
        };

        // 캐시 먼저
        const cached = localStorage.getItem("userLoc");
        if (cached) {
            try {
                const obj = JSON.parse(cached);
                if (obj && typeof obj.lat === "number" && typeof obj.lon === "number") {
                    setFromCoords(obj.lat, obj.lon, obj.address || null);
                }
            } catch {}
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    const here = {
                        address: `내 좌표: ${lat.toFixed(5)}, ${lon.toFixed(5)}`,
                        lat,
                        lon,
                    };
                    setLocation(here);
                    localStorage.setItem("userLoc", JSON.stringify(here));
                },
                () => {
                    // 실패/거부 시 기본 좌표
                    setFromCoords(37.5665, 126.9780, "서울특별시 중구 태평로1가(기본 좌표)");
                },
                { enableHighAccuracy: true, maximumAge: 30000, timeout: 8000 }
            );
        } else {
            setFromCoords(37.5665, 126.9780, "서울특별시 중구 태평로1가(기본 좌표)");
        }
    }, []);

    // ===== 가까운 6개 계산(거리 제한 없음) =====
    useEffect(() => {
        if (!location || !Number.isFinite(location.lat) || allCenters.length === 0) return;
        const here = { lat: location.lat, lon: location.lon };
        const ranked = allCenters
            .map((c) => ({ ...c, distance: haversineKm(here, c) }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 6);
        setCenters(ranked);
    }, [location, allCenters]);

    return (
        <div className="relative min-h-screen bg-white px-6 py-8">
            <TopRightMenu showLoginButton={false} />

            {/* 제목 및 설명 */}
            <div className="text-center mt-4">
                <h1 className="text-7xl font-bold text-blue-600 mt-10 mb-8">주변 뇌졸중 센터</h1>
                <p className="inline-block bg-gray-100 px-12 py-1.5 text-[1.6rem] rounded-full text-black">
                    현재 위치를 기반으로 가까운 센터를 추천합니다.
                </p>
            </div>

            {/* 현재 위치 */}
            {location?.address && (
                <div className="mt-8 text-center flex items-center justify-center text-gray-700 gap-2">
                    <MapPinHouse className="w-7 h-7 text-black" />
                    <span className="underline text-black text-2xl">{location.address}</span>
                </div>
            )}

            {/* 병원 리스트 (UI 틀 동일, 데이터만 nearest6 사용) */}
            <div className="mt-14 ml-24 mr-24 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-8">
                {centers.map((center, index) => (
                    <div
                        key={index}
                        className="bg-gray-50 rounded-2xl p-4 shadow-md hover:shadow-lg transition flex flex-col"
                    >
                        {/* 아이콘 + 병원 이름 */}
                        <div className="flex items-center gap-4 mb-4">
                            <div className="bg-white rounded-full p-2 shadow-md w-20 h-20 flex items-center justify-center">
                                <Hospital className="w-11 h-11 text-black" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-[1.7rem] font-bold text-blue-600">{center.name}</h3>
                        </div>

                        {/* 항목 리스트 */}
                        <div className="space-y-2 text-lg text-black">
                            <div className="flex gap-3">
                                <span className="font-semibold w-24 shrink-0">주소:</span>
                                <span>{center.address || "-"}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-semibold w-24 shrink-0">거리:</span>
                                <span>
                  {Number.isFinite(center.distance) ? `${center.distance.toFixed(1)} km` : "-"}
                </span>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-semibold w-24 shrink-0">연락처:</span>
                                <span>{center.phone || "-"}</span>
                            </div>
                            <div className="flex gap-3">
                                <span className="font-semibold w-24 shrink-0">홈페이지:</span>
                                {center.website ? (
                                    <a
                                        href={center.website}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-black underline text-lg hover:font-semibold break-all"
                                    >
                                        {center.website}
                                    </a>
                                ) : (
                                    <span>-</span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 필요할 때만 보이는 상태 메시지 */}
            {centers.length === 0 && (
                <div className="text-center text-gray-500 mt-8 text-sm">
                    {status === "loading" && "데이터 로딩 중..."}
                    {status === "error" && "centers.json을 불러오지 못했습니다. 경로/형식을 확인하세요."}
                    {status === "empty" && "centers.json 로드됨. 그러나 유효한 센터 항목이 없습니다(lat/lon 확인)."}
                </div>
            )}
        </div>
    );
}