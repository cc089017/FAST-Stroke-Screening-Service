function SlideInfo2() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-9xl font-extrabold text-blue-600 mb-20">F.A.S.T란?</h2>

            <p className="text-3xl font-medium text-gray-800 mb-8 leading-normal">
                F.A.S.T는 뇌졸중 조기증상을 확인하는 자가진단법 입니다.
            </p>

            {/* 이미지 영역 */}
            <div className="my-6">
                <img
                    src="/fast.png"
                    alt="FAST 그림"
                    className="w-[900px] h-auto mx-auto"
                />
            </div>

            <p className="text-3xl font-medium text-gray-800 mt-5 leading-normal">
                뇌졸중의 골든타임은 약 <strong className="text-blue-600">4시간 30분</strong>으로<br/>
                영구적인 후유증을 방지하기 위해서는<br/>
                초기 증상 발견과 빠른 대처가 중요합니다.
            </p>
        </div>
    );
}

export default SlideInfo2;
