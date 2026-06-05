import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_signup_and_login():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # 회원가입
        resp = await ac.post("/api/v1/auth/signup", json={
            "id": "user01", "email": "u1@example.com", "password": "secret12",
            "name":"홍길동","birth_date":"1990-01-01","privacy_agreed":True
        })
        assert resp.status_code == 201

        # 로그인
        resp2 = await ac.post("/api/v1/auth/login", json={
            "email": "u1@example.com", "password": "secret12"
        })
        assert resp2.status_code == 200
        data = resp2.json()
        assert "access_token" in data
