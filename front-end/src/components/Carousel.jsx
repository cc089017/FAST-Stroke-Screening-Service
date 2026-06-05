import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SlideMain from "./SlideMain";
import SlideInfo1 from "./SlideInfo1";
import SlideInfo2 from "./SlideInfo2";
import TopRightMenu from "./TopRightMenu";
import { ChevronLeft, ChevronRight } from "lucide-react";

function Carousel({ onLoginClick, isLoggedIn, setIsLoggedIn }) {
    const navigate = useNavigate();

    const handleStartTest = () => {
        navigate("/test");
    };

    // 실제 슬라이드
    const rawSlides = [
        <SlideMain onStart={handleStartTest} key="main" />,
        <SlideInfo1 key="info1" />,
        <SlideInfo2 key="info2" />,
    ];

    // 복제 포함한 무한 슬라이드 구성
    const slides = [
        <SlideInfo2 key="clone-start" />, // 맨 앞 복제
        ...rawSlides,
        <SlideMain onStart={handleStartTest} key="clone-end" />, // 맨 뒤 복제 → 자연스러운 Main 연결
    ];

    const [current, setCurrent] = useState(1);
    const [isAnimating, setIsAnimating] = useState(true);

    const nextSlide = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrent((prev) => prev + 1);
    };

    const prevSlide = () => {
        if (isAnimating) return;
        setIsAnimating(true);
        setCurrent((prev) => prev - 1);
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsAnimating(false);

            if (current === 0) {
                setCurrent(slides.length - 2); // 앞 복제 → 마지막 원본
            } else if (current === slides.length - 1) {
                setCurrent(1); // 뒤 복제 → 첫 번째 원본
            }
        }, 700);

        return () => clearTimeout(timeout);
    }, [current]);

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-white relative overflow-hidden">
            <TopRightMenu
                onLoginClick={onLoginClick}
                showHomeButton={false}
                isLoggedIn={isLoggedIn}
                setIsLoggedIn={setIsLoggedIn}
            />

            <div className="w-[133vh] h-[133vh] rounded-full border-[7vw] border-[#f6f6f6] shadow-xl overflow-hidden flex items-center justify-center z-0 relative">
                <div
                    className="flex w-full h-full"
                    style={{
                        transform: `translateX(-${current * 100}%)`,
                        transition: isAnimating ? "transform 700ms ease-in-out" : "none",
                    }}
                >
                    {slides.map((slide, index) => (
                        <div key={index} className="flex-shrink-0 w-full h-full">
                            {slide}
                        </div>
                    ))}
                </div>
            </div>

            {/* 왼쪽 화살표 */}
            <button
                onClick={prevSlide}
                className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-[calc(50%+calc(67.5px+60vh))]
                w-[155px] h-[155px] rounded-full bg-white shadow-lg flex items-center justify-center z-50
                hover:scale-110 transition-transform duration-300 active:scale-95"
            >
                <ChevronLeft className="w-24 h-24 text-blue-600" strokeWidth={3} />
            </button>

            {/* 오른쪽 화살표 */}
            <button
                onClick={nextSlide}
                className="absolute top-1/2 left-1/2 -translate-y-1/2 translate-x-[calc(50%+calc(67.5px+44vh))]
                w-[155px] h-[155px] rounded-full bg-white shadow-lg flex items-center justify-center z-50
                hover:scale-110 transition-transform duration-300 active:scale-95"
            >
                <ChevronRight className="w-24 h-24 text-blue-600" strokeWidth={3} />
            </button>
        </div>
    );
}

export default Carousel;
