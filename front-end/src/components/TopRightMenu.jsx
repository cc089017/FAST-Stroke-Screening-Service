// TopRightMenu.jsx
import { useState, useRef, useEffect } from "react";
import { Menu, House } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ 추가

function TopRightMenu({
                          onLoginClick,
                          showLoginButton = true,
                          showHomeButton = true,
                          isLoggedIn,
                          setIsLoggedIn,
                      }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const { pathname } = useLocation(); // ✅ 현재 경로
    const isTestPage = pathname.startsWith("/test"); // ✅ 캐러셀 경로
    const showHome = showHomeButton && !isTestPage;  // ✅ 최종 표시 여부

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        else document.removeEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div className="absolute top-5 right-12 z-50 flex items-center gap-6">
            {/* 홈 아이콘 */}
            {showHome && (
                <House
                    onClick={() => navigate("/")}
                    className="w-7 h-7 text-gray-800 cursor-pointer hover:text-blue-600 transition-all"
                    aria-label="홈으로 이동"
                />
            )}

            {/* 로그인 / 로그아웃 버튼 */}
            {showLoginButton && (
                <button
                    className="text-2xl font-medium px-0 py-4 rounded-md hover:text-blue-600 hover:font-bold transition-all"
                    aria-label={isLoggedIn ? "로그아웃" : "로그인"}
                    onClick={() => (isLoggedIn ? setIsLoggedIn(false) : onLoginClick())}
                >
                    {isLoggedIn ? "로그아웃" : "로그인"}
                </button>
            )}

            {/* 메뉴 */}
            <div className="relative" ref={dropdownRef}>
                <Menu
                    onClick={() => setIsOpen(!isOpen)}
                    className="cursor-pointer w-9 h-9 text-gray-800 hover:text-blue-600 transition-all"
                    aria-label="메뉴 열기"
                    role="button"
                />
                {isOpen && (
                    <div className="absolute top-1/2 right-full -translate-y-1/2 mr-4
                          bg-gray-100 shadow-lg rounded-xl px-6 py-4 flex items-center gap-6">
                        <button
                            onClick={() => { setIsOpen(false); navigate("/results"); }}
                            className="text-2xl hover:text-blue-600 hover:font-bold transition-all whitespace-nowrap"
                        >
                            My 검사결과
                        </button>
                        <button
                            onClick={() => { setIsOpen(false); navigate("/stroke-center"); }}
                            className="text-2xl hover:text-blue-600 hover:font-bold transition-all whitespace-nowrap"
                        >
                            뇌졸중 센터
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TopRightMenu;
