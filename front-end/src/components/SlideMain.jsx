function SlideMain({ onStart }) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            {/* 뇌 이미지 + 애니메이션 */}
            <div className="mb-0">
                <img
                    src="/brain.png"
                    alt="Brain Icon"
                    className="w-[270px] h-auto mx-auto animate-pulse-slow"
                />
            </div>

            {/* 타이틀 */}
            <h1 className="text-[10rem] font-extrabold text-blue-600 mt-1 mb-14 leading-none">F.A.S.T</h1>

            {/* 소제목 */}
            <p className="text-4xl text-gray-800 mb-10 font-normal">Brain Scan</p>

            {/* 버튼 */}
            <button
                onClick={onStart}
                className="bg-blue-600 text-white text-4xl font-normal font-sans px-7 py-4 rounded-full shadow-lg
                   hover:scale-110 hover:bg-blue-700 hover:font-semibold hover:shadow-xl transition-transform duration-300"
            >
                검사 시작하기
            </button>
        </div>
    );
}

export default SlideMain;