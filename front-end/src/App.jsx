import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Carousel from "./components/Carousel";
import LoginModal from "./components/LoginModal";
import SignupModal from "./components/SignupModal";
import StrokeCenter from "./components/StrokeCenter";
import TestCarousel from "./components/TestCarousel";
import TopRightMenu from "./components/TopRightMenu";
import FaceMeasure from "./components/FaceMeasure";
import ArmMeasure from "./components/ArmMeasure.jsx";
import MyResults from "./components/MyResults";
import ResultDetail from "./components/ResultDetail";
import http from "./lib/http";
import SpeechTestPage from "./components/SpeechTestPage";

function App() {
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isSignupOpen, setIsSignupOpen] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);

    // ★ 앱 시작 시 쿠키로 세션 상태 동기화
    useEffect(() => {
        (async () => {
            try {
                await http.get("/api/v1/auth/me");
                setIsLoggedIn(true);
            } catch {
                setIsLoggedIn(false);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div />;

    // 내부 라우트: 모달 라우트(결과지 오버레이) 지원을 위한 래퍼
    function AppInnerRoutes() {
        const location = useLocation();
        const background = location.state && location.state.background; // MyResults를 배경으로 유지

        return (
            <>
                {/* 기본 라우트: 배경이 있으면 그 위치로 렌더 */}
                <Routes location={background || location}>
                    <Route
                        path="/"
                        element={
                            <div className="w-full h-screen relative">
                                <Carousel
                                    onLoginClick={() => setIsLoginOpen(true)}
                                    isLoggedIn={isLoggedIn}
                                    setIsLoggedIn={setIsLoggedIn}
                                />
                                <TopRightMenu
                                    onLoginClick={() => setIsLoginOpen(true)}
                                    isLoggedIn={isLoggedIn}
                                    setIsLoggedIn={setIsLoggedIn}
                                    showHomeButton={false}
                                />
                                {isLoginOpen && (
                                    <LoginModal
                                        onClose={() => setIsLoginOpen(false)}
                                        onSignupOpen={() => {
                                            setIsLoginOpen(false);
                                            setIsSignupOpen(true);
                                        }}
                                        onLoginSuccess={() => {
                                            setIsLoggedIn(true);
                                            setIsLoginOpen(false);
                                        }}
                                    />
                                )}
                                {isSignupOpen && (
                                    <SignupModal
                                        onClose={() => setIsSignupOpen(false)}
                                        onLoginOpen={() => {
                                            setIsSignupOpen(false);
                                            setIsLoginOpen(true);
                                        }}
                                    />
                                )}
                            </div>
                        }
                    />
                    <Route path="/stroke-center" element={<StrokeCenter />} />
                    <Route path="/test" element={<TestCarousel />} />
                    {/* [ADD] 슬라이드별 URL 지원 */}
                    <Route path="/test/:step" element={<TestCarousel />} />
                    <Route path="/measure/face" element={<FaceMeasure />} />
                    <Route path="/measure/arm" element={<ArmMeasure />} />
                    <Route path="/results" element={<MyResults />} />
                    {/* 직접 진입 시 단독 페이지로도 동작 */}
                    <Route path="/results/:id" element={<ResultDetail />} />
                    <Route path="/speech-test" element={<SpeechTestPage />} />
                </Routes>

                {/* 모달 라우트: MyResults를 배경으로 둔 상태에서 결과지를 오버레이로 렌더 */}
                {background && (
                    <Routes>
                        <Route path="/results/:id" element={<ResultDetail />} />
                    </Routes>
                )}
            </>
        );
    }

    return (
        <Router>
            <AppInnerRoutes />
        </Router>
    );
}

export default App;
