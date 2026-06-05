from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, MessageResponse
from app.crud.user import get_user_by_email, create_user, verify_password, get_user_by_id
from app.core.security import create_access_token, get_user_id_from_cookie
from app.core.config import settings

# ⚠️ prefix 제거 (routers.py에서 "/auth"를 붙여서 include 함)
router = APIRouter(tags=["auth"])

@router.post("/signup", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def signup(user_in: UserCreate, db: Session = Depends(get_db)):
    if get_user_by_id(db, user_in.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 존재하는 아이디입니다.")
    if get_user_by_email(db, user_in.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="이미 존재하는 이메일입니다.")
    create_user(db, user_in)
    return {"message": "회원가입 성공"}

@router.post("/login", response_model=MessageResponse)
def login(user_in: UserLogin, response: Response, db: Session = Depends(get_db)):
    db_user = get_user_by_id(db, user_in.id)
    if not db_user or not verify_password(user_in.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 올바르지 않습니다.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(subject=db_user.id)

    # httpOnly 쿠키 심기 → 새로고침해도 유지
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=False,              # 개발(HTTP)에서는 False, 운영(HTTPS)은 True
        samesite="Lax",            # 운영에서 크로스오리진 필요 시 "None" + secure=True
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    return {"message": "로그인 성공"}

@router.get("/me", response_model=MessageResponse)
def me(request: Request):
    user_id = get_user_id_from_cookie(request)
    return {"message": user_id}

@router.post("/logout", response_model=MessageResponse)
def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "로그아웃 성공"}

@router.get("/profile")
def profile(db: Session = Depends(get_db), user_id: str = Depends(get_user_id_from_cookie)):
    """현재 로그인한 사용자의 프로필(id, name, email)을 반환합니다."""
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
    }
