# Triplan 기능 구현

## 목차
- [Client 부문](#client-부문)
- [Server 부문](#server-부문)
- [Database 부문](#database-부문)

---

## Client 부문

### 화면 구성

| 클래스 | 기능 | 파일 |
|--------|------|------|
| LoginScreen | 구글 소셜 로그인 | `src/pages/LoginScreen.js` |
| ProfileScreen | 프로필 보기, 로그아웃 | `src/pages/ProfileScreen.js` |
| TabNavigator | 하단 탭 네비게이션 | `src/navigation/TabNavigator.js` |

---

### 로그인 화면

**LoginScreen.js**

앱 실행 시 `AsyncStorage`에서 JWT 토큰을 확인한다. 토큰이 존재하면 로그인 화면을 거치지 않고 메인 탭으로 자동 진입한다.

**App.tsx — 자동 로그인 처리**
```javascript
useEffect(() => {
  const checkToken = async () => {
    const token = await AsyncStorage.getItem('token');
    setIsLoggedIn(!!token);
  };
  checkToken();
}, []);
```

토큰이 없을 경우 로그인 화면이 표시된다. 로그인/로그아웃 시 `navigation.replace` 대신 `isLoggedIn` 상태값을 변경하는 조건부 렌더링 방식으로 화면을 전환한다.

```javascript
return (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main">
          {() => <TabNavigator setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Login">
          {() => <LoginScreen setIsLoggedIn={setIsLoggedIn} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
```

---

### 구글 로그인

`@react-native-google-signin/google-signin` 라이브러리를 사용한다.  
로그인 성공 시 발급된 `idToken`을 백엔드로 전달하고, 응답받은 JWT 토큰을 `AsyncStorage`에 저장한다.

**GoogleSignin 설정**
```javascript
GoogleSignin.configure({
  webClientId: 'GOOGLE_WEB_CLIENT_ID',
});
```

**로그인 처리**
```javascript
const handleGoogleLogin = async () => {
  try {
    await GoogleSignin.signOut(); // 이전 세션 초기화
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo.data;

    const response = await fetch('http://10.0.2.2:3000/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    const result = await response.json();

    if (result.success) {
      await AsyncStorage.setItem('token', result.token);
      setIsLoggedIn(true);
    }
  } catch (error) {
    console.log('로그인 에러:', error);
  }
};
```

---

### 로그아웃

**ProfileScreen.js**

프로필 탭 하단에 로그아웃 버튼이 위치한다. 버튼 클릭 시 확인 팝업이 표시되며, 확인 시 구글 세션과 로컬 토큰을 모두 제거하고 로그인 화면으로 전환된다.

```javascript
const handleLogout = async () => {
  Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
    { text: '취소', style: 'cancel' },
    {
      text: '로그아웃',
      style: 'destructive',
      onPress: async () => {
        await GoogleSignin.signOut();        // 구글 세션 제거
        await AsyncStorage.removeItem('token'); // 로컬 토큰 제거
        setIsLoggedIn(false);               // 로그인 화면으로 자동 전환
      },
    },
  ]);
};
```

---

## Server 부문

### 서버 구성

**backend/src/index.js**

Node.js + Express 기반 REST API 서버이다. 포트 3000에서 실행된다.

```javascript
const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);

app.listen(3000, () => {
  console.log('서버 실행 중: http://localhost:3000');
});
```

---

### 구글 로그인 API

**POST /auth/google**

클라이언트로부터 `idToken`을 받아 Google API로 토큰을 검증한다. 검증 성공 시 DB에서 유저를 조회하고, 신규 유저면 자동 가입 처리 후 JWT를 발급한다.

```javascript
router.post('/google', async (req, res) => {
  const { idToken } = req.body;

  // 구글 토큰 검증
  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const { email, name, picture, sub: providerId } = ticket.getPayload();

  // DB 유저 조회
  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('provider_id', providerId)
    .single();

  // 신규 유저 생성
  if (!user) {
    const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: newUser } = await supabase
      .from('users')
      .insert({ email, name, profile_image: picture, provider: 'google', provider_id: providerId, friend_code: friendCode })
      .select()
      .single();
    user = newUser;
  }

  // JWT 발급 (7일 만료)
  const token = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ success: true, token, user });
});
```

**신규 / 기존 유저 분기**

`provider_id` 기준으로 DB를 조회하여 기존 유저면 정보를 그대로 반환하고, 신규 유저면 자동 가입 처리 후 랜덤 6자리 친구 코드를 발급한다.

---

## Database 부문

### DB 구성

| 항목 | 내용 |
|------|------|
| 서비스 | Supabase |
| DB 종류 | PostgreSQL |
| 리전 | Northeast Asia (Seoul) |

---

### users 테이블

회원 정보를 저장하는 테이블이다. 현재 구현된 유일한 테이블이며, 소셜 로그인 기반으로 자동 가입 처리된다.

```sql
CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         VARCHAR(255) NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    profile_image VARCHAR(500),
    gender        VARCHAR(10),
    birth_year    INT,
    bio           VARCHAR(200),
    travel_type   VARCHAR(10),
    friend_code   VARCHAR(20) UNIQUE,
    provider      VARCHAR(20) NOT NULL,
    provider_id   VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 자동 증가하는 유저 고유 번호 |
| email | VARCHAR(255) | 구글 계정 이메일 (UNIQUE) |
| name | VARCHAR(100) | 구글 계정 이름 |
| profile_image | VARCHAR(500) | 구글 프로필 사진 URL |
| gender | VARCHAR(10) | 성별 — 프로필 설정 시 입력 |
| birth_year | INT | 출생년도 — 프로필 설정 시 입력 |
| bio | VARCHAR(200) | 한 줄 소개 — 프로필 설정 시 입력 |
| travel_type | VARCHAR(10) | 성향 코드 (ex. EPSA) — 성향 테스트 완료 후 채워짐 |
| friend_code | VARCHAR(20) | 고유 친구 코드 (UNIQUE) — 가입 시 자동 생성 |
| provider | VARCHAR(20) | 로그인 제공자 (google / kakao) |
| provider_id | VARCHAR(255) | 제공자 고유 ID — 로그인 시 유저 식별에 사용 |
| created_at | TIMESTAMP | 가입일시 (DEFAULT NOW()) |
| updated_at | TIMESTAMP | 수정일시 (DEFAULT NOW()) |
