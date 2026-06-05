function SlideInfo1() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-8xl font-extrabold text-blue-600 mb-14">뇌졸중이란?</h2>

            <p className="text-3xl font-medium text-gray-800 mb-0 leading-normal">
                <strong>뇌졸중(Stroke)</strong>은 뇌에 산소 공급이 차단되어<br />
                뇌 손상이 발생하는 질병입니다.
            </p>

            {/* 이미지 영역 */}
            <div className="my-6">
                <img
                    src="/stroke.png"
                    alt="뇌졸중 그림"
                    className="w-[700px] h-auto mx-auto"
                />
            </div>

            <p className="text-3xl font-medium text-gray-800 mt-0 leading-normal">
                뇌졸중에는 뇌혈관이 터지는 <strong>뇌출혈</strong>과<br />
                뇌혈관이 막히는 <strong>뇌경색</strong>이 있습니다.<br />
                뇌졸중은 국내 질병 사망 원인 3위에 해당되는<br />
                심각한 질병입니다.
            </p>
        </div>
    );
}

export default SlideInfo1;
