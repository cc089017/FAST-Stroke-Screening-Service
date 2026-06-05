// src/components/FaceSlide.jsx
import { useNavigate } from "react-router-dom"
export default function FaceSlide() {
    const navigate = useNavigate();
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
            {/* 타이틀 */}
            <h1 className="text-9xl font-bold text-gray-400 mb-2">
                <span className="text-blue-600">F</span><span className="text-gray-400">.A.S.T</span>
            </h1>
            <p className="text-3xl text-black mb-14">Face Scan</p>

            {/* 중앙 내용 */}
            <div className="flex flex-row items-center justify-center gap-16 mb-20">
                {/* 캐릭터 이미지 */}
                <img
                    src="/face.png" // ✅ public 경로 기준
                    alt="Face Guide"
                    className="w-[220px] h-auto"
                />

                {/* 검사 가이드 텍스트 */}
                <div className="text-left text-4xl text-gray-800 ml-0 leading-relaxed">
                    <p>1. 카메라 정면을 봐주세요.</p>
                    <p className="mt-4">2. <strong>'이~'</strong> 하며 웃는 얼굴을</p>
                    <p>&nbsp;&nbsp;&nbsp;5초 동안 유지해주세요.</p>
                </div>
            </div>

            {/* 검사 시작 버튼 */}
            <button
                onClick={() => navigate("/measure/face")}
                className="bg-blue-600 text-white text-4xl font-normal font-sans px-7 py-4 rounded-full shadow-lg
                   hover:scale-110 hover:bg-blue-700 hover:font-semibold hover:shadow-xl transition-transform duration-300"
            >
                검사 시작하기
            </button>
        </div>
    );
}
