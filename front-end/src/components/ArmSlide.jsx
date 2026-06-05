// src/components/ArmSlide.jsx
import { useNavigate } from "react-router-dom"
export default function ArmSlide() {
    const navigate = useNavigate();
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
            {/* 타이틀 */}
            <h1 className="text-9xl font-bold text-gray-400 mb-2">
                <span className="text-gray-400">F.</span><span className="text-blue-600">A</span><span className="text-gray-400">.S.T</span>
            </h1>
            <p className="text-3xl text-black mb-12">Arm Scan</p>

            {/* 중앙 내용 */}
            <div className="flex flex-row items-center justify-center gap-4 mb-20">
                {/* 캐릭터 이미지 */}
                <img
                    src="/arm.png" // ✅ public 경로 기준
                    alt="Face Guide"
                    className="w-[450px] h-auto"
                />

                {/* 검사 가이드 텍스트 */}
                <div className="text-left text-3xl text-gray-800 ml-0 leading-relaxed">
                    <p>1. 카메라 정면을 봐주세요.</p>
                    <p className="mt-4">2. 손바닥을 하늘로 향한 채로</p>
                    <p>&nbsp;&nbsp;&nbsp;두 팔을 앞으로 뻗어주세요.</p>
                    <p className="mt-4">3. 눈을 감고 10초 동안</p>
                    <p>&nbsp;&nbsp;&nbsp;자세를 유지해주세요.</p>
                </div>
            </div>

            {/* 검사 시작 버튼 */}
            <button
                onClick={() => navigate("/measure/arm")}
                className="bg-blue-600 text-white text-4xl font-normal font-sans px-7 py-4 rounded-full shadow-lg
                   hover:scale-110 hover:bg-blue-700 hover:font-semibold hover:shadow-xl transition-transform duration-300"
            >
                검사 시작하기
            </button>
        </div>
    );
}
