import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import FaceSlide from "./FaceSlide";
import ArmSlide from "./ArmSlide";
import SpeechSlide from "./SpeechSlide";
import EndSlide from "./EndSlide";
//import TopRightMenu from "./TopRightMenu";

// [ADD] 라우팅 훅 추가
import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function TestCarousel() {
    const slides = [<FaceSlide key="face" />, <ArmSlide key="arm" />, <SpeechSlide key="speech" />, <EndSlide key="end" />];
    
    const [isAnimating, setIsAnimating] = useState(false);
    // [ADD] URL <-> 슬라이드 단계 매핑
    const STEPS = ["face", "arm", "speech", "end"];
    const navigate = useNavigate();
    const location = useLocation();
    const { step } = useParams(); // face | arm | speech | end | undefined
    const initialIndex = Math.max(0, STEPS.indexOf((step || "face").toLowerCase()));
    const [current, setCurrent] = useState(initialIndex);

    const nextSlide = () => {
        if (isAnimating || current >= slides.length - 1) return;
        setIsAnimating(true);
        setCurrent((prev) => prev + 1);
    };

    const prevSlide = () => {
        if (isAnimating || current <= 0) return;
        setIsAnimating(true);
        setCurrent((prev) => prev - 1);
    };

   // 1) 애니메이션 타이머
    useEffect(() => {
        if (!isAnimating) return;
        const t = setTimeout(() => setIsAnimating(false), 700);
        return () => clearTimeout(t);
        }, [isAnimating]); // ← current 말고 isAnimating 기준이 안전

    // 2) (/test → /test/face) 정규화
    // App.jsx에서 <Navigate to="/test/face" /> 쓰면 이 블록은 삭제하세요.
    useEffect(() => {
        if (location.pathname === "/test") {
            navigate("/test/face", { replace: true });
        }
        }, [location.pathname]);

    // 3) URL(step) → 내부 상태(current)
    useEffect(() => {
        const k = (step || "face").toLowerCase().trim();
        const idx = STEPS.indexOf(k);
        if (idx < 0) {
            navigate("/test/face", { replace: true });
            return;
        }
        if (idx !== current) setCurrent(idx);
        }, [step]);

    // 4) 내부 상태(current) → URL
    useEffect(() => {
        const target = `/test/${STEPS[current]}`;
        if (location.pathname !== target) {
            navigate(target, { replace: false });
        }
        }, [current]);
    return (
        <div className="w-screen h-screen flex items-center justify-center bg-white relative overflow-hidden">
            <div className="w-[133vh] h-[133vh] rounded-full border-[7vw] border-[#f6f6f6] shadow-xl overflow-hidden flex items-center justify-center z-0 relative">
                <div
                    className="flex w-full h-full"
                    style={{
                        transform: `translateX(-${current * 100}%)`,
                        transition: "transform 700ms ease-in-out",
                    }}
                >
                    {slides.map((slide, idx) => (
                        <div key={idx} className="flex-shrink-0 w-full h-full">
                            {slide}
                        </div>
                    ))}
                </div>
            </div>

            {/* 왼쪽 화살표 */}
            {current > 0 && (
                <button
                    onClick={prevSlide}
                    className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-[calc(50%+calc(67.5px+60vh))]
                    w-[155px] h-[155px] rounded-full bg-white shadow-lg flex items-center justify-center z-50
                    hover:scale-110 transition-transform duration-300 active:scale-95"
                >
                    <ChevronLeft className="w-24 h-24 text-blue-600" strokeWidth={3} />
                </button>
            )}

            {/* 오른쪽 화살표 */}
            {current < slides.length - 1 && (
                <button
                    onClick={nextSlide}
                    className="absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(50%+calc(67.5px+44vh))]
                    w-[155px] h-[155px] rounded-full bg-white shadow-lg flex items-center justify-center z-50
                    hover:scale-110 transition-transform duration-300 active:scale-95"
                >
                    <ChevronRight className="w-24 h-24 text-blue-600" strokeWidth={3} />
                </button>
            )}
        </div>
    );
}
