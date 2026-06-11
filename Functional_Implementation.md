# Triplan — Functional Implementation

> 여행 성향 기반 동행 매칭 & AI 여행 계획 앱  
> React Native CLI · Node.js · Supabase · Google Gemini 2.5 Flash

---

## Table of Contents

- [Background](#background)
- [Client](#client)
    - [Screen List](#screen-list)
    - [Login / Auto Login](#login--auto-login)
    - [Google Login](#google-login)
    - [Logout](#logout)
    - [Travel Style Test](#travel-style-test)
    - [Home Screen](#home-screen)
    - [SNS Feed](#sns-feed-searchscreen)
    - [Post Write / Edit](#post-write--edit)
    - [Matching Screen](#matching-screen)
    - [Friends Screen](#friends-screen)
    - [Chat List](#chat-list)
    - [Chat Room](#chat-room)
    - [Profile / Profile Edit](#profile--profile-edit)
- [Server](#server)
    - [Server Config](#server-config)
    - [Auth API](#auth-api)
    - [User API](#user-api)
    - [Post / Chat API](#post--chat-api)
    - [AI API](#ai-api)
    - [Socket.io Events](#socketio-events)
- [Database](#database)
    - [DB Config](#db-config)
    - [Tables](#tables)

---

## Background

현대 여행객들은 단순히 목적지가 같은 사람을 넘어서, 자신과 여행 스타일 및 성향이 잘 맞는 동행을 찾고자 합니다. **Triplan**은 이러한 니즈를 반영하여 기획된 맞춤형 여행 동행 매칭 플랫폼입니다.

사용자의 여행 스타일을 정밀하게 분석하는 자체 성향 테스트(4축 20문항)를 제공하며, AI 기반 여행지 추천 및 일정 최적화 기능을 결합하여 여행 준비의 번거로움을 줄이고 더욱 만족스러운 동행 경험을 제공하는 것을 목표로 합니다.

| 문제 | Triplan의 해결 방법 |
|------|-------------------|
| 여행 스타일 불일치로 인한 갈등 | 4축 성향 테스트로 사전에 궁합 확인 |
| 단체 채팅에서의 의사결정 비효율 | AI 대화 정리(5W)로 핵심 자동 요약 |
| 여행지 선정의 어려움 | 그룹 성향 기반 AI 여행지 3곳 추천 |
| 일정 합의 과정의 복잡함 | 찬반투표로 민주적 일정 확정 |

---

## Client

### Screen List

| Class | 기능 | 파일 |
|-------|------|------|
| `LoginScreen` | 구글 소셜 로그인 | `src/pages/LoginScreen.js` |
| `HomeScreen` | 홈 화면, D-Day 카드, 빠른 탭 이동 | `src/pages/HomeScreen.js` |
| `SearchScreen` | SNS 피드, 게시글 검색/필터/참여 | `src/pages/SearchScreen.js` |
| `WriteScreen` | 동행 모집 글 작성 | `src/pages/WriteScreen.js` |
| `EditPostScreen` | SNS 피드 게시글 수정 | `src/pages/EditPostScreen.js` |
| `MatchingScreen` | 추천 유저 카드 스와이프 매칭 | `src/pages/MatchingScreen.js` |
| `FriendsScreen` | 친구 목록, 받은/보낸 요청 관리 | `src/pages/FriendsScreen.js` |
| `ChatScreen` | 채팅방 목록 | `src/pages/ChatScreen.js` |
| `ChatRoomScreen` | 실시간 채팅, AI 기능 전체 | `src/pages/ChatRoomScreen.js` |
| `ProfileScreen` | 프로필 보기, 로그아웃 | `src/pages/ProfileScreen.js` |
| `ProfileEditScreen` | 닉네임/성별/생년월일/소개/이미지 수정 | `src/pages/ProfileEditScreen.js` |
| `TravelStyleGame` | 여행 성향 테스트 (20문항) | `TravelStyleGame.tsx` |
| `TabNavigator` | 하단 탭 네비게이션 (5탭) | `src/navigation/TabNavigator.js` |

---

### Login / Auto Login

앱 실행 시 `AsyncStorage`에서 JWT 토큰을 확인한다. 토큰이 존재하면 `AuthRouter`를 통해 `/users/me`를 호출하고, `travel_type`이 있으면 메인으로 진입한다. 토큰이 만료(401)되면 로그인 화면으로 이동한다.

```js
// App.tsx — 자동 로그인 확인
useEffect(() => {
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('token');
    setIsLoggedIn(!!token);
  };
  checkToken();
}, []);
```

```jsx
// 네비게이터 구성 — 전체 스크린 항상 등록, initialRouteName으로 진입 제어
<Stack.Navigator initialRouteName={isLoggedIn ? 'AuthRouter' : 'Login'}>
  <Stack.Screen name="Login" ... />
  <Stack.Screen name="AuthRouter" component={AuthRouterScreen} />
  <Stack.Screen name="TestIntro" component={TestIntroScreen} />
  <Stack.Screen name="Test" component={TravelStyleGame} />
  <Stack.Screen name="Result" component={ResultScreen} />
  <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
  <Stack.Screen name="Main" ... />
</Stack.Navigator>
```

> **주의:** 조건부 렌더링 방식 대신 전체 스크린 항상 등록 방식을 사용한다.  
> `navigation.replace('Login')` 호출 시 스크린이 등록되어 있어야 에러가 발생하지 않는다.

---

### Google Login

`@react-native-google-signin/google-signin` 라이브러리를 사용한다.  
로그인 성공 시 발급된 `idToken`을 백엔드로 전달하고, 응답받은 JWT 토큰을 `AsyncStorage`에 저장한다. 이후 FCM 토큰을 서버에 비동기로 저장한다.

```js
GoogleSignin.configure({
  webClientId: 'GOOGLE_WEB_CLIENT_ID',
});

const handleGoogleLogin = async () => {
  await GoogleSignin.signOut(); // 이전 세션 초기화
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();
  const { idToken } = userInfo.data;

  const result = await fetch('https://triplan-backend-qwrs.onrender.com/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  }).then(r => r.json());

  if (result.success) {
    await AsyncStorage.setItem('token', result.token);
    setIsLoggedIn(true);
    navigation.replace('AuthRouter');

    // FCM 토큰 비동기 저장
    (async () => {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      const fcmToken = await messaging().getToken();
      await fetch('https://triplan-backend-qwrs.onrender.com/users/saveFcmToken', {
        method: 'POST',
        headers: { Authorization: `Bearer ${result.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fcm_token: fcmToken }),
      });
    })();
  }
};
```

---

### Logout

프로필 탭 하단 로그아웃 버튼 → 확인 팝업 → 구글 세션 제거 → 로컬 토큰 제거 → `setIsLoggedIn(false)`.

```js
const handleLogout = async () => {
  Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
    { text: '취소', style: 'cancel' },
    {
      text: '로그아웃',
      style: 'destructive',
      onPress: async () => {
        await GoogleSignin.signOut();
        await AsyncStorage.removeItem('token');
        setIsLoggedIn(false);
      },
    },
  ]);
};
```

---

### Travel Style Test

총 20문항의 질문을 통해 사용자의 여행 스타일을 4축 기준으로 분석하여 16가지 코드 중 하나로 분류한다.  
`Animated.timing`을 활용한 슬라이드 애니메이션을 적용했다.

| 축 | 선택지 A | 선택지 B | 설명 |
|----|---------|---------|------|
| T / C | T (활동형) | C (여유형) | 많이 걷기 OK vs 편안한 이동 선호 |
| U / N | U (도심파) | N (자연파) | 번화가/쇼핑 vs 산/바다/공원 |
| A / R | A (액티브형) | R (힐링형) | 체험/도전 vs 느긋하게 충전 |
| J / P | J (계획파) | P (즉흥파) | 꼼꼼한 일정 vs 자유로운 여행 |

```js
// 성향 판별 로직
const handleSelect = (type) => {
  const newScores = { ...scores, [type]: scores[type] + 1 };
  setScores(newScores);

  Animated.timing(slideAnim, { toValue: -width, duration: 300, useNativeDriver: true }).start(() => {
    if (step < questions.length - 1) {
      setStep(step + 1);
      slideAnim.setValue(width);
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    } else {
      const r1 = newScores.T >= newScores.C ? 'T' : 'C';
      const r2 = newScores.U >= newScores.N ? 'U' : 'N';
      const r3 = newScores.A >= newScores.R ? 'A' : 'R';
      const r4 = newScores.J >= newScores.P ? 'J' : 'P';
      saveResult(`${r1}${r2}${r3}${r4}`);
    }
  });
};
```

```js
// 결과 서버 전송
const saveResult = async (finalType) => {
  const token = await AsyncStorage.getItem('token');
  await fetch('https://triplan-backend-qwrs.onrender.com/users/travel-type', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ travelType: finalType }),
  });
  navigation.replace('Result', { result: finalType });
};
```

---

### Home Screen

시간대별 인사말, D-Day 카드, 나의 여행 목록, 빠른 탭 이동(2×2 그리드)으로 구성된다.

| 구성 요소 | 설명 |
|----------|------|
| 시간대별 인사말 | 오전/오후/저녁에 따라 다른 인사말 표시 |
| D-Day 카드 | 출발일이 가장 가까운 여행 정보 (D-N 형태) |
| 나의 여행 목록 | 참여 중인 채팅방 목록, 클릭 시 ChatRoom 이동 |
| 빠른 탭 이동 | 탐색/매칭/채팅/친구 4탭으로 바로 이동하는 그리드 |

```jsx
// D-Day 계산
const calcDDay = (dateStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};
```

---

### SNS Feed (SearchScreen)

동행 모집 게시글 피드를 표시하는 화면이다.  
`useFocusEffect` 훅으로 화면 진입 시마다 데이터를 새로 불러온다.

#### 게시글 로딩

```js
const fetchPosts = useCallback(async () => {
  const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts');
  const result = await response.json();
  if (result.success) setPosts(result.posts);
}, []);

useFocusEffect(useCallback(() => {
  fetchPosts();
  fetchJoinedRooms();
}, [fetchPosts]));
```

#### 필터 기능

| 필터 항목 | 옵션 |
|----------|------|
| 여행지 | 전체 / 국내 / 아시아 / 유럽 / 아메리카 / 오세아니아·기타 |
| 성향 코드 | 전체 / TUAJ / TURP 등 16가지 |
| 여행 기간 | 전체 / 당일치기 / 1박2일 / 2박3일 / 3박 이상 |
| 동행 성별 | 전체 / 동성만 / 성별 무관 |
| 여행 테마 | 전체 / 빵지순례 / 역사문화 / 힐링/휴양 / 액티비티 / 쇼핑 |
| 모집 중만 보기 | 현재 인원 < 최대 인원인 게시글만 표시 |

- 필터 적용 전까지 임시 상태(`tempDestination`, `tempType` 등)로 관리하여 취소 시 원래 값 유지
- 여행지 필터는 `REGION_KEYWORDS` 매핑으로 키워드 포함 여부 검사

#### 게시글 카드

- 여행지명 → Unsplash 이미지 자동 매핑 (60개 이상 키워드 매핑 테이블)
- 배지: `내 글` / `참여 중` / `마감됨`
- 클릭 → 상세 모달 (게시글 정보 + 참여하기 / 채팅방 이동 버튼)

#### 참여하기

```js
const handleJoin = async (postId) => {
  const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/${postId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  // 성공 시 채팅방 자동 참여
};
```

---

### Post Write / Edit

| 항목 | 필수 여부 | 설명 |
|------|----------|------|
| 여행지 | 필수 | 목적지 텍스트 |
| 여행 일수 | 필수 | 예) 3박4일 |
| 모집 인원 | 필수 | 최대 참여 인원 |
| 출발일 | 선택 | DatePicker로 날짜 선택 |
| 한 줄 소개 | 필수 | 게시글 소개 문구 |
| 간단 계획 | 선택 | 여행 계획 (멀티라인) |

```js
// WriteScreen — 게시글 작성
await fetch('https://triplan-backend-qwrs.onrender.com/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ destination, days, max_people, bio, plan, departure_date }),
});

// EditPostScreen — 게시글 수정
await fetch(`https://triplan-backend-qwrs.onrender.com/posts/${post.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ destination, days, max_people, bio, plan, departure_date }),
});
```

---

### Matching Screen

여행지 입력 후 매칭 시작 → `GET /users/matching` 호출 → 추천 유저 목록 불러오기.  
`react-native-deck-swiper` 기반 카드 스와이프 UI.

#### 점수 계산 알고리즘

| 항목 | 점수 | 기준 |
|------|------|------|
| 성향 코드 일치 | 최대 75점 | 4축 각 18.75점 (T/C, U/N, A/R, J/P) |
| 나이 유사도 | 최대 25점 | ±2세: 25점 / ±5세: 18점 / ±10세: 10점 |
| 선호 여행지 일치 | 가산점 (+5점/개) | 일치 항목당 +5점, 일치자 우선 정렬 |

```js
// 성향 점수 계산
if (myType[0] === theirType[0]) score += 18.75; // T/C
if (myType[1] === theirType[1]) score += 18.75; // U/N
if (myType[2] === theirType[2]) score += 18.75; // A/R
if (myType[3] === theirType[3]) score += 18.75; // J/P
```

#### 스와이프 동작

- **오른쪽**: 동행 신청(`accepted`) → `POST /users/matching/swipe`
- **왼쪽**: 패스(`rejected`)
- 상호 `accepted` → 매칭 성립 + 친구 자동 추가 + Alert
- 💘 **여행 궁합 보기** 버튼: `TravelTypeModal`로 축별 궁합 상세 확인

```js
// 카드 렌더링 버그 방지 — renderKey + cardIndex 패턴
const [renderKey, setRenderKey] = useState(0);
const [cardIndex, setCardIndex] = useState(0);

onSwipedRight={(index) => {
  setCardIndex(index + 1);
  handleSwipe(index, 'accepted');
  setTimeout(() => setRenderKey(prev => prev + 1), 150);
}}

<Swiper key={renderKey} cardIndex={cardIndex} ... />
```

---

### Friends Screen

내 친구 목록, 받은 친구 요청, 보낸 친구 요청을 탭으로 구분하여 표시한다.

| 탭 | 조건 |
|----|------|
| 내 친구 | `status === 'accept'` AND `user_id === 나` |
| 받은 요청 | `status === 'request'` AND `user_id === 나` → 수락/거절 버튼 |
| 보낸 요청 | `status === 'request'` AND `friend_id === 나` |

```js
// 친구 코드로 친구 추가
GET /users/friends/add?friendCode=ABCD12

// 수락
GET /users/friends/accept?friendId=123

// 거절
GET /users/friends/refuse?friendId=123
```

---

### Chat List

`GET /posts/my-chats` 호출 → 내가 참여 중인 채팅방 목록 표시.  
채팅방 클릭 시 `ChatRoomScreen`으로 이동하며 아래 파라미터 전달.

```js
navigation.navigate('채팅', {
  screen: 'ChatRoom',
  params: {
    roomId, title, destination, days,
    departure_date, bio, max_people,
  }
});
```

---

### Chat Room

가장 복잡한 화면. 실시간 채팅, AI 기능 전체, 일정 관리, 투표, 멤버/초대 모달 포함.

#### 소켓 연결 패턴

```js
useEffect(() => {
  let socket = null; // 로컬 변수로 선언 — 클린업 버그 방지

  const init = async () => {
    // ... 메시지 로딩, userId 조회 등
    socket = io('https://triplan-backend-qwrs.onrender.com');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_room', { roomId: String(roomId), userId: meData.user.id });
    });

    socket.on('receive_message', (data) => {
      if (data.senderId === meData.user?.id) return; // 본인 메시지 차단
      setMessages(prev => {
        if (prev.some(m => String(m.id) === String(data.id))) return prev; // 중복 id 차단
        return [...prev, data];
      });
    });

    socket.on('vote_updated', (data) => {
      setMessages(prev => prev.map(m =>
        String(m.id) === String(data.messageId) ? { ...m, voteData: data } : m
      ));
    });

    socket.on('ai_memo_updated', (newPreferences) => setAiPreferences(newPreferences));
  };

  init();
  return () => {
    socket?.disconnect(); // 로컬 변수로 참조 — 비동기 타이밍 무관
    socketRef.current = null;
  };
}, []);
```

#### 메시지 타입별 렌더링

| type | 렌더링 컴포넌트 | 설명 |
|------|--------------|------|
| `text` | 말풍선 | 일반 채팅 메시지 |
| `ai_preference` | 보라색 확인 말풍선 | 메모 추가 확인 |
| `ai_recommend` | `AIMessageCard` | 여행지 추천 결과 (JSON) |
| `ai_itinerary` | `AIItineraryCard` | 일정 최적화 결과 + 투표 |
| `ai_summary` | `AISummaryCard` | 5W 정리 결과 |
| `ai_loading` | 로딩 말풍선 | AI 처리 중 상태 |
| `system` | 중앙 텍스트 | 시스템 알림 |

#### 메시지 타임스탬프

```js
// 에뮬레이터 UTC 오프셋 수동 보정
const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const koreaOffset = 9 * 60;
  const localOffset = date.getTimezoneOffset();
  const koreaTime = new Date(date.getTime() + (koreaOffset + localOffset) * 60 * 1000);
  const h = koreaTime.getHours();
  const m = String(koreaTime.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  return `${ampm} ${h % 12 || 12}:${m}`;
};
```

#### AI 메모 태그

- 채팅방 상단 `@ 태그` 형태로 표시
- `+` 버튼 → 수동 입력 → `POST /ai-preference`
- Gemini가 카테고리 분류(예산/식사/활동 등) + 중복 감지 자동 처리
- `✕` 버튼으로 개별 삭제

#### 정리하기 (5W 분석 — Trip DNA)

```
1. 텍스트 메시지 3개 이상 → 정리하기 버튼 활성화
2. POST /ai-summarize → SummaryModal에서 항목별 수정 가능
3. 승인 → POST /ai-summarize-approve → 전원 브로드캐스트 + AI 메모 갱신
4. 승인 완료 → isSummarized = true → 여행지 추천받기 버튼 활성화
```

> **Trip DNA**: 멤버 성향 코드 + 누적 AI 메모 + 멤버 구성을 구조화 페르소나로 Gemini에 주입

#### 여행지 추천 (3단계 파이프라인)

```
Step 1 — 인기 장소 수집
  Kakao Local API (국내) / Google Places API (해외)
  → urbanRatio 기반 쿼리 조정 (도심/자연 비율)
  → 최대 15개 인기 장소 수집

Step 2 — Gemini 선정 (1회 호출)
  → 그룹 성향 비율(urbanRatio, activeRatio) 기반 3곳 선정
  → 환각 방지: 목록 내 장소만 선정하도록 프롬프트 제약
  → spotKeywords 5개 생성 (활동/휴양 비율 반영)

Step 3 — 주변 장소 병렬 검색
  → spotKeywords 기반 Promise.all 병렬 요청
  → 중복 제거 후 각 여행지: 중심 1곳 + 주변 최대 5곳
```

#### 일정 확정 및 찬반투표

```
1. 추천 카드에서 일정 추가 버튼 → pendingSpots 누적
2. 헤더 일정 버튼 → 일정 수정 모달
3. 일정 확정 버튼 → POST /ai-itinerary → Gemini 동선 최적화
4. 투표 자동 시작 (24시간 만료)
5. 과반수 찬성 or 방장 강제 마감 → 일정 확정
6. Socket.io vote_updated 이벤트 → 실시간 반영
```

#### 모달 구성

| 모달 | 기능 |
|------|------|
| 멤버 모달 | 참여 중인 멤버 목록, 성향 표시, '나' 배지 |
| 초대 모달 | 친구 목록에서 채팅방 초대 (`POST /chat-rooms/:id/invite`) |
| 튜토리얼 모달 | AsyncStorage 플래그로 최초 1회 사용 가이드 표시 |
| 프로필 모달 | 메시지 발신자 클릭 시 `UserProfileModal` |

---

### Profile / Profile Edit

**ProfileScreen**: `GET /users/me`로 내 정보 표시. 최근 여행 계획 목록, 친구 코드 복사, 성향 테스트 다시하기, 로그아웃 기능.

**ProfileEditScreen**:

```js
// 프로필 수정
await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ nickname, gender, birth_year: formatDate(birthDate), bio }),
});

// 이미지 업로드 (Multer → Supabase Storage)
const formData = new FormData();
formData.append('avatar', { uri, type: 'image/jpeg', name: 'avatar.jpg' });
await fetch('https://triplan-backend-qwrs.onrender.com/users/upload-avatar', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});

// 선호 여행지 저장
await fetch('https://triplan-backend-qwrs.onrender.com/users/preferred-destination', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ destinations: ['국내', '아시아'] }),
});
```

---

## Server

### Server Config

```js
// backend/src/index.js
const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.set('io', io); // 라우터에서 req.app.get('io')로 브로드캐스트

app.use('/auth',  authRouter);
app.use('/posts', postsRouter);
app.use('/users', usersRouter);

server.listen(3000);
```

| 항목 | 내용 |
|------|------|
| 런타임 | Node.js + Express.js |
| 포트 | 3000 |
| 배포 | Render (7달러 플랜, 슬립 없음) |
| 인증 | JWT 7일 만료, `authMiddleware` 공용 (`backend/src/utils/authMiddleware.js`) |
| 파일 업로드 | Multer `memoryStorage` → Supabase Storage |

---

### Auth API

#### `POST /auth/google`

`idToken` 검증 → 신규 유저 자동 가입 → JWT 발급.

```js
router.post('/google', async (req, res) => {
  const { idToken } = req.body;
  const ticket = await client.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
  const { email, name, picture, sub: providerId } = ticket.getPayload();

  let { data: user } = await supabase
    .from('users').select('*').eq('provider_id', providerId).single();

  if (!user) {
    const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: newUser } = await supabase.from('users')
      .insert({ email, name, profile_image: picture,
                provider: 'google', provider_id: providerId, friend_code: friendCode })
      .select().single();
    user = newUser;
  }

  const token = jwt.sign({ userId: user.id, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user });
});
```

---

### User API

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| `GET` | `/users/me` | 내 정보 조회 | ✅ |
| `PATCH` | `/users/me` | 닉네임/성별/생년월일/소개 수정 | ✅ |
| `POST` | `/users/travel-type` | 성향 코드 저장 | ✅ |
| `POST` | `/users/upload-avatar` | 프로필 이미지 업로드 | ✅ |
| `GET` | `/users/others?id=` | 다른 유저 프로필 조회 | ✅ |
| `POST` | `/users/preferred-destination` | 선호 여행지 저장 | ✅ |
| `GET` | `/users/matching?destination=` | 매칭 유저 목록 + 점수 계산 | ✅ |
| `POST` | `/users/matching/swipe` | 스와이프 결과 저장 | ✅ |
| `GET` | `/users/friends` | 친구 목록 조회 | ✅ |
| `GET` | `/users/friends/add?friendCode=` | 친구 코드로 친구 요청 | ✅ |
| `GET` | `/users/friends/accept?friendId=` | 친구 요청 수락 + FCM 알림 | ✅ |
| `GET` | `/users/friends/refuse?friendId=` | 친구 요청 거절 | ✅ |
| `POST` | `/users/saveFcmToken` | FCM 토큰 저장 | ✅ |

---

### Post / Chat API

| Method | 경로 | 설명 | 인증 |
|--------|------|------|------|
| `GET` | `/posts` | 게시글 목록 (users JOIN) | ❌ |
| `POST` | `/posts` | 게시글 작성 + 채팅방 자동 생성 | ✅ |
| `PATCH` | `/posts/:postId` | 게시글 수정 (내 글만) | ✅ |
| `DELETE` | `/posts/:postId` | 게시글 삭제 | ✅ |
| `POST` | `/posts/:postId/join` | 채팅방 참여 | ✅ |
| `GET` | `/posts/my-chats` | 내 채팅방 목록 | ✅ |
| `GET` | `/posts/my-recent-plans` | 최근 여행 계획 | ✅ |
| `DELETE` | `/posts/chat-rooms/:roomId/leave` | 채팅방 나가기 | ✅ |
| `GET` | `/posts/chat-rooms/:roomId/members` | 멤버 조회 | ✅ |
| `GET` | `/posts/chat-rooms/:roomId/messages` | 메시지 조회 | ✅ |
| `POST` | `/posts/chat-rooms/:roomId/messages` | 메시지 전송 | ✅ |
| `POST` | `/posts/chat-rooms/:roomId/invite` | 친구 초대 | ✅ |

---

### AI API

| Method | 경로 | 설명 |
|--------|------|------|
| `POST` | `/posts/chat-rooms/:roomId/ai-preference` | 수동 메모 추가 (Gemini 카테고리 분류) |
| `GET` | `/posts/chat-rooms/:roomId/ai-preference` | 메모 목록 조회 |
| `DELETE` | `/posts/chat-rooms/:roomId/ai-preference` | 메모 삭제 |
| `POST` | `/posts/chat-rooms/:roomId/ai-recommend` | 여행지 추천 (3단계 파이프라인) |
| `POST` | `/posts/chat-rooms/:roomId/ai-summarize` | 대화 5W 정리 (본인에게만) |
| `POST` | `/posts/chat-rooms/:roomId/ai-summarize-approve` | 정리 승인 → 브로드캐스트 + 메모 갱신 |
| `POST` | `/posts/chat-rooms/:roomId/ai-itinerary` | 일정 확정 + Gemini 동선 최적화 |

#### Gemini 함수 구성 (`backend/src/utils/gemini.js`)

| 함수 | 역할 | Gemini 호출 |
|------|------|------------|
| `processPreference()` | 메모 카테고리 분류 + 중복 감지 | 1회 |
| `recommendDestinations()` | 인기 장소 수집 → 3곳 선정 → 주변 검색 | 1회 (Step 2) |
| `summarizeConversation()` | 대화 전체 5W 분석, Trip DNA 페르소나 주입 | 1회 |
| `optimizeItinerary()` | 장소 동선 최적화 + 날짜별 배분 | 1회 |

```js
// 공통 유틸
function cleanJson(text) {
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
}

async function ask(prompt, label) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text?.trim()) throw new Error(`${label} 빈 응답`);
  return text;
}
```

---

### Socket.io Events

| 이벤트 | 방향 | 설명 |
|--------|------|------|
| `join_room` | 클 → 서 | 채팅방 입장 (`roomId`, `userId`) |
| `send_message` | 클 → 서 | 메시지 전송 → DB 저장 → 전체 브로드캐스트 |
| `receive_message` | 서 → 클 | 메시지 수신 (`senderId` 포함, 중복 방지용) |
| `vote_updated` | 서 → 클 | 투표 현황 갱신 (`messageId`, agree/disagree 수) |
| `ai_memo_updated` | 서 → 클 | AI 메모 태그 갱신 |

```js
// index.js
io.on('connection', (socket) => {
  socket.on('join_room', ({ roomId }) => socket.join(roomId));

  socket.on('send_message', async ({ roomId, content, senderId, type }) => {
    const { data: savedMsg } = await supabase.from('messages')
      .insert({ chat_room_id: roomId, user_id: senderId, content, type })
      .select().single();

    io.to(String(roomId)).emit('receive_message', {
      ...savedMsg,
      id: String(savedMsg.id),
      senderId,
    });
  });
});
```

---

## Database

### DB Config

| 항목 | 내용 |
|------|------|
| 서비스 | Supabase |
| DB 종류 | PostgreSQL |
| 리전 | Northeast Asia (Seoul) |
| 인증 방식 | `service_role` key (RLS 우회 — `anon` key 사용 금지) |
| Storage | `avatars` 버킷 (퍼블릭, 프로필 이미지) |

---

### Tables

#### `users` — 회원 정보

```sql
CREATE TABLE users (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                TEXT UNIQUE NOT NULL,
  name                 TEXT,
  nickname             TEXT,
  profile_image        TEXT,
  gender               TEXT,
  birth_year           DATE,
  bio                  TEXT,
  travel_type          TEXT,
  preferred_destination TEXT,              -- 쉼표 구분 (예: '국내,아시아')
  friend_code          TEXT UNIQUE,        -- 6자리, 가입 시 자동 생성
  fcm_token            TEXT,
  provider             TEXT,
  provider_id          TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
```

#### `posts` — 동행 모집 게시글

```sql
CREATE TABLE posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID REFERENCES users(id) ON DELETE CASCADE,
  destination    TEXT NOT NULL,
  days           INT,
  max_people     INT,
  bio            TEXT,
  plan           TEXT,
  departure_date DATE,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
```

#### `chat_rooms` — 채팅방

```sql
CREATE TABLE chat_rooms (
  id              SERIAL PRIMARY KEY,
  post_id         INT REFERENCES posts(id) ON DELETE CASCADE,
  ai_preferences  JSONB DEFAULT '[]',   -- AI 메모 배열
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

```json
// ai_preferences 저장 형태
[
  { "text": "맛집위주", "category": "식사", "addedAt": "2026-05-11T..." },
  { "text": "예산30만원", "category": "예산", "addedAt": "2026-05-11T..." }
]
```

#### `chat_members` — 채팅방 멤버

```sql
CREATE TABLE chat_members (
  id           SERIAL PRIMARY KEY,
  chat_room_id INT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id      INT REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(chat_room_id, user_id)   -- 중복 참여 방지
);
```

#### `messages` — 채팅 메시지

```sql
CREATE TABLE messages (
  id              SERIAL PRIMARY KEY,
  chat_room_id    INT REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id         INT REFERENCES users(id),
  content         TEXT NOT NULL,         -- ai_recommend 등은 JSON 문자열
  type            TEXT DEFAULT 'text',   -- text|ai_preference|ai_recommend|ai_itinerary|ai_summary|system
  vote_closed     BOOLEAN DEFAULT false,
  vote_closed_at  TIMESTAMPTZ,
  vote_expires_at TIMESTAMPTZ,           -- 생성 후 24시간
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

#### `friends` — 친구 관계

```sql
CREATE TABLE friends (
  id         BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id    INT REFERENCES users(id),
  friend_id  INT REFERENCES users(id),
  status     TEXT,    -- request | accept
  created_at TIMESTAMPTZ DEFAULT now()
);
```

> 수락 시 양방향 row 생성: `(A→B, accept)` + `(B→A, accept)`

#### `matches` — 매칭 스와이프 이력

```sql
CREATE TABLE matches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  status      TEXT DEFAULT 'pending',   -- pending | accepted | rejected
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);
```

#### `itinerary_votes` — 일정 찬반투표

```sql
CREATE TABLE itinerary_votes (
  id         SERIAL PRIMARY KEY,
  message_id INT REFERENCES messages(id) ON DELETE CASCADE,
  user_id    INT REFERENCES users(id),
  vote       TEXT,    -- agree | disagree
  UNIQUE(message_id, user_id)   -- 중복 투표 방지, ON CONFLICT DO UPDATE로 변경 지원
);
```

---