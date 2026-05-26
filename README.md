# Triplan ✈️

여행 성향 기반 동행 매칭 SNS & AI 일정 추천 앱

---

## 📌 프로젝트 소개

Triplan은 여행 스타일이 맞는 동행자를 찾고, AI와 함께 여행 계획을 세우는 앱입니다.

- **성향 테스트** — 20문항 4축(T/C·U/N·A/R·J/P) 기반 여행 성향 코드 도출
- **동행 매칭** — 성향 점수 + 여행 경험 기반 알고리즘으로 최적 동행자 매칭
- **AI 채팅** — 그룹 채팅방에서 AI 메모 수집 → 여행지 추천 → 일정 최적화까지 원스톱

---

## 🛠 기술 스택

| 분류 | 기술 |
|------|------|
| 프론트엔드 | React Native CLI (Android / iOS) |
| 백엔드 | Node.js + Express.js + Socket.io |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Google OAuth 2.0 + JWT |
| AI | Google Gemini 2.5 Flash |
| 지도 | Google Maps API (해외), Kakao Map API (국내) |
| 푸시 알림 | Firebase Cloud Messaging (FCM) |
| 배포 | Render (백엔드), Supabase (DB) |

---

## ✨ 주요 기능

### 성향 테스트
- 20문항 4축 테스트로 여행 성향 코드(예: TUAJ) 도출
- 축별 설명 및 성향 지표 시각화

### 동행 매칭
- 성향 4축 가중치 차등 점수 (계획성 30점, 활동성 20점, 관계지향 15점, 판단 10점)
- 여행 경험 레벨 기반 멘토링형 매칭
- 카드 스와이프 UI (오른쪽 = 초대 / 왼쪽 = 패스)

### SNS 피드
- 여행 게시글 작성·수정·삭제
- 여행지·성향·기간·테마 필터
- 참여하기 → 채팅방 자동 생성

### AI 채팅
- 실시간 소켓 채팅 (Socket.io)
- **AI 메모** — 그룹 선호사항 태그 관리 (Gemini 카테고리 분류·중복 감지)
- **여행지 추천** — 인기 장소 기반 Gemini 단일 호출 → Google/Kakao Maps 좌표·사진 자동 연동
- **정리하기** — 전체 대화 5W 분석 → 수정·승인 후 전체 공유
- **일정 확정** — AI 동선 최적화 → 일차별 타임라인 카드 생성 → 전체 브로드캐스트

### 친구
- 친구 코드로 친구 요청
- 매칭 수락 시 친구 자동 요청
- 푸시 알림 (채팅·일정 확정·친구 수락)

---

## 🚀 시작하기

### 사전 요구사항

- Node.js 18+
- Android Studio + Android SDK
- JDK 17

### 설치 및 실행

```bash
git clone https://github.com/HSU-Triplan/Triplan.git
cd Triplan

# 프론트엔드 패키지 설치
npm install

# 백엔드 패키지 설치
cd backend && npm install && cd ..

# 백엔드 환경변수 설정
cp backend/.env.example backend/.env
# .env 파일에 각 키 입력

# 백엔드 실행
cd backend && node src/index.js

# 앱 실행 (새 터미널)
npx react-native run-android
```

### 환경변수 (.env)

```env
SUPABASE_URL=
SUPABASE_KEY=           # service_role key
JWT_SECRET=
GOOGLE_CLIENT_ID=
GEMINI_API_KEY=
GOOGLE_MAPS_API_KEY=
KAKAO_REST_API_KEY=
FIREBASE_SERVICE_ACCOUNT=  # serviceAccountKey.json 내용 (JSON 문자열)
```

---

## 📂 프로젝트 구조

```
Triplan/
├── backend/
│   └── src/
│       ├── index.js          # Express + Socket.io 서버
│       ├── routes/
│       │   ├── auth.js       # 구글 로그인
│       │   ├── posts.js      # 게시글·채팅·AI API
│       │   └── users.js      # 유저·매칭·친구 API
│       └── utils/
│           ├── gemini.js     # Gemini AI 파이프라인
│           ├── googleMaps.js # Google Places API
│           ├── kakaoMap.js   # Kakao Local API
│           └── firebase.js   # FCM 푸시 알림
├── src/
│   ├── components/
│   │   ├── AIMessageCard.js      # 여행지 추천 카드
│   │   ├── AISummaryCard.js      # 정리하기 결과 카드
│   │   ├── AIItineraryCard.js    # 일정 확정 카드
│   │   ├── SummaryModal.js       # 정리하기 편집 모달
│   │   └── InputBar.js           # 채팅 입력바
│   ├── navigation/
│   │   ├── TabNavigator.js
│   │   └── chatNavigator.js
│   └── pages/
│       ├── LoginScreen.js
│       ├── HomeScreen.js
│       ├── SearchScreen.js
│       ├── ChatScreen.js
│       ├── ChatRoomScreen.js
│       ├── MatchingScreen.js
│       ├── FriendsScreen.js
│       ├── ProfileScreen.js
│       └── ProfileEditScreen.js
└── App.tsx                   # 성향 테스트 + 네비게이션 루트
```


## 🔗 링크

- **백엔드 서버**: https://triplan-backend-qwrs.onrender.com
- **GitHub**: https://github.com/HSU-Triplan/Triplan