# FAST Stroke Screening Service

AI를 활용한 F.A.S.T 기반 뇌졸중 조기 경고 웹 서비스입니다.

본 프로젝트는 홍익대학교 세종캠퍼스 소프트웨어융합학과 졸업 프로젝트로 진행되었으며,  
세계뇌졸중협회가 제안한 F.A.S.T 원칙을 기반으로 사용자가 웹 브라우저에서 카메라와 마이크만으로  
뇌졸중 초기 의심 증상을 확인할 수 있도록 구현한 서비스입니다.

사용자는 Face, Arm, Speech 검사를 순차적으로 수행할 수 있으며,  
검사 결과를 기반으로 이상 징후 여부를 확인하고, Time 모듈을 통해 사용자 위치 기반 인근 뇌졸중 센터 정보를 제공받을 수 있습니다.

---

## Project Info

- **Project Name**: AI를 활용한 F.A.S.T 기반 뇌졸중 경고 시스템
- **Repository Name**: FAST Stroke Screening Service
- **University**: Hongik University Sejong Campus
- **Department**: Department of Software Convergence
- **Type**: Graduation Project
- **Conference**: 대한전자공학회 2025 추계학술대회
- **Team Members**: 홍민기, 김민규, 김수민, 최정환
- **Advisor**: 안병구 교수님

---

## Project Background

뇌졸중은 발병 후 치료까지의 시간이 생존율과 후유증에 큰 영향을 미치는 질환입니다.  
따라서 초기 증상을 빠르게 인지하고 신속히 의료기관에 접근하는 것이 매우 중요합니다.

F.A.S.T는 뇌졸중의 대표적인 조기 증상인 얼굴 마비, 팔 힘 약화, 언어 장애, 신속한 조치를  
Face, Arm, Speech, Time으로 구분한 지침입니다.

하지만 기존 F.A.S.T 방식은 사용자의 주관적 판단에 의존하는 한계가 있습니다.  
본 프로젝트는 이러한 한계를 보완하기 위해 AI 모델과 웹 서비스를 활용하여  
뇌졸중 의심 증상을 정량적으로 분석하는 시스템을 구현했습니다.

---

## Main Features

### 1. Face Module

사용자의 얼굴 영상을 입력받아 안면 비대칭 여부를 분석합니다.

- MediaPipe FaceMesh 기반 얼굴 랜드마크 추출
- 얼굴 비대칭, 기울기, 비율 기반 feature 계산
- TabNet 기반 분류 모델을 통한 안면 비대칭 여부 판단

### 2. Arm Module

사용자가 양팔을 앞으로 뻗은 영상을 입력받아 팔 힘 약화 여부를 분석합니다.

- MediaPipe Hands 기반 손 랜드마크 추출
- 손가락 좌표 변화량 기반 팔 하강 여부 분석
- 손목 회전 여부 분석
- XGBoost 기반 분류 모델을 통한 팔 힘 약화 여부 판단

### 3. Speech Module

사용자의 음성을 입력받아 언어 장애 여부를 분석합니다.

- 입력 음성 16kHz 정규화
- Librosa 기반 음성 feature 추출
- MFCC, ZCR, RMS 기반 feature 생성
- Random Forest 기반 분류 모델을 통한 언어 장애 여부 판단

### 4. Time Module

사용자의 위치 정보를 기반으로 인근 뇌졸중 센터 정보를 제공합니다.

- 사용자 위치 정보 수집
- 자체 구축 Stroke Center API 연동
- 가까운 뇌졸중 센터 6곳 안내
- 센터명, 주소, 거리, 연락처, 홈페이지 정보 제공

---

## My Role

본 프로젝트에서 최정환은 백엔드 개발과 Face 분석 모듈 연동을 중심으로 참여했습니다.

- FastAPI 기반 백엔드 API 개발
- Face 모듈 분석 흐름 구현 및 모델 연동
- MediaPipe 기반 얼굴 랜드마크 처리 로직 구현
- AI 모델 추론 결과와 서비스 결과 페이지 연동
- 사용자 검사 결과 저장 및 조회 기능 구현
- 프론트엔드와 백엔드 API 연동
- 프로젝트 문서화 및 발표 자료 작성 참여

---

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript

### Backend

- FastAPI
- Python
- MySQL
- Docker Compose

### AI / ML

- MediaPipe
- OpenCV
- TabNet
- XGBoost
- Random Forest
- Librosa

### Database

- MySQL

---

## System Architecture

```text
User
 ├─ Camera Input
 │   ├─ Face Module
 │   │   ├─ MediaPipe FaceMesh
 │   │   ├─ Feature Extraction
 │   │   └─ TabNet Model
 │   │
 │   └─ Arm Module
 │       ├─ MediaPipe Hands
 │       ├─ Feature Extraction
 │       └─ XGBoost Model
 │
 ├─ Microphone Input
 │   └─ Speech Module
 │       ├─ Librosa
 │       ├─ MFCC / ZCR / RMS Feature Extraction
 │       └─ Random Forest Model
 │
 └─ Location Input
     └─ Time Module
         └─ Stroke Center API

Result
 ├─ Risk Analysis Result
 ├─ Database Storage
 └─ Nearby Stroke Center Information
```

---

## Project Structure

```text
FAST-Stroke-Screening-Service
├─ front-end/
│  └─ React frontend
│
├─ back-end/
│  └─ FastAPI backend
│
├─ db/
│  └─ MySQL initialization scripts
│
├─ docker-compose.yml
├─ package.json
├─ requirements.txt
├─ .env.example
└─ README.md
```

---

## Model Performance

본 시스템은 Face, Arm, Speech 세 가지 주요 모듈에서 성능 평가를 진행했습니다.

| Module | Model | Accuracy |
| --- | --- | --- |
| Face | TabNet | 0.880 |
| Arm | XGBoost | 0.937 |
| Speech | Random Forest | 0.854 |

의료 및 이상 탐지 분야에서는 단순 정확도뿐 아니라 실제 이상 징후를 놓치지 않는 Recall이 중요합니다.  
본 프로젝트에서는 각 모듈의 Accuracy와 Recall을 함께 고려하여 모델 성능을 평가했습니다.

---

## Getting Started

### 1. Clone Repository

```bash
git clone https://github.com/JeongHwan0208/FAST-Stroke-Screening-Service.git
cd FAST-Stroke-Screening-Service
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
pip install -r requirements.txt
```

### 4. Create Environment File

`.env.example` 파일을 참고하여 `.env` 파일을 생성합니다.

```bash
cp .env.example .env
```

예시:

```env
MYSQL_ROOT_PASSWORD=your_root_password
MYSQL_DATABASE=fast_db
MYSQL_USER=your_db_user
MYSQL_PASSWORD=your_db_password

DB_HOST=localhost
DB_PORT=13306
DB_NAME=fast_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

### 5. Run Database

```bash
docker compose up -d
```

### 6. Run Project

```bash
npm start
```

---

## Research / Publication

본 프로젝트는 대한전자공학회 2025 추계학술대회에  
**「AI를 활용한 F.A.S.T 기반 뇌졸중 경고 시스템」**이라는 제목으로 발표되었습니다.

- **Conference**: 대한전자공학회 2025 추계학술대회
- **Paper Title**: AI를 활용한 F.A.S.T 기반 뇌졸중 경고 시스템
- **Authors**: 홍민기, 김민규, 김수민, 최정환, 안병구
- **Affiliation**: 홍익대학교 소프트웨어융합학과

---

## Key Contributions

- 웹 환경에서 F.A.S.T 검사를 수행할 수 있는 통합 시스템 구현
- 카메라와 마이크만을 활용한 비접촉 방식의 뇌졸중 의심 증상 분석
- Face, Arm, Speech 모듈별 AI 모델 적용
- 사용자 위치 기반 인근 뇌졸중 센터 안내 기능 구현
- 검사 결과 저장 및 조회 기능을 포함한 웹 서비스 형태로 구현

---

## Limitations

본 프로젝트는 의료 진단을 대체하기 위한 서비스가 아닙니다.  
뇌졸중 의심 증상을 조기에 확인하고, 신속한 의료기관 방문을 돕기 위한 보조적 선별 시스템입니다.

또한 학습 데이터의 범위와 실제 임상 데이터 부족으로 인해 일반화 성능에는 한계가 있을 수 있습니다.  
향후 실제 임상 데이터 확보와 개인별 특성을 반영한 동적 threshold 조정이 필요합니다.

---

## Future Work

- 실제 임상 데이터 기반 모델 고도화
- 개인별 얼굴 형태 및 음성 특성을 반영한 정규화 알고리즘 개선
- 모바일 환경 최적화
- 사용자별 검사 이력 기반 위험도 변화 추적
- 의료기관 연계 기능 고도화

---

## License

This project was developed as a graduation project at Hongik University Sejong Campus.  
For academic and portfolio purposes only.