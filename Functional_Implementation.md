# Triplan 기능 구현

## 목차
- [Client 부문](#client-부문)
- [Server 부문](#server-부문)
- [Database 부문](#database-부문)

---

## Client 부문

### 화면 구성

| 클래스               | 기능                          | 파일                               |
|-------------------|-----------------------------|----------------------------------|
| LoginScreen       | 구글 소셜 로그인                   | `src/pages/LoginScreen.js`       |
| ProfileScreen     | 프로필 보기, 로그아웃                | `src/pages/ProfileScreen.js`     |
| SearchScreen      | SNS 피드, 게시글 검색/필터           | `src/pages/SearchScreen.js`      |
| WriteScreen       | 동행 모집 글 작성                  | `src/pages/WriteScreen.js`       |
| TabNavigator      | 하단 탭 네비게이션                  | `src/navigation/TabNavigator.js` |
| HomeScreen        | 메인 홈 화면                     | `src/pages/HomeScreen.js`        |
| FriendsScreen     | 친구 목록, 받은 요청 , 보낸 요청, 친구 요청 | `src/pages/FriendsScreen.js`     |
| ProfileEditScreen | 프로필 이미지, 닉네임 , 생년월일, 성별 변경  | `src/pages/ProfileEditScreen.js` |
| EditPostScreen    | Sns 피드에 올릴 계획 피드를 작성        | `src/pages/EditPostScreen.js`    |
| ChatScreen        | 채팅방 목록                      | `src/pages/ChatScreen.js`        |
| MatchingScreen    | 추천 유저 목록, 스와이프로 친구 초대       | `src/pages/MatchingScreen.js`    |

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

    const response = await fetch('https://triplan-backend-qwrs.onrender.com/auth/google', {
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
        await GoogleSignin.signOut();           // 구글 세션 제거
        await AsyncStorage.removeItem('token'); // 로컬 토큰 제거
        setIsLoggedIn(false);                   // 로그인 화면으로 자동 전환
      },
    },
  ]);
};
```

---

### SNS 피드 (SearchScreen)

**SearchScreen.js**

동행 모집 게시글 피드를 표시하는 화면이다. 상단 검색바와 필터 기능을 제공하며, 좌 하단 FAB(+) 버튼으로 글 작성 화면으로 진입한다.

#### 게시글 불러오기

화면 진입 시 `GET /posts` API를 호출하여 게시글 목록을 불러온다. 글 작성 완료 후 모달이 닫힐 때도 자동으로 재호출된다.

```javascript
const fetchPosts = useCallback(async () => {
  setLoading(true);
  try {
    const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts');
    const result = await response.json();
    if (result.success) {
      setPosts(result.posts);
    }
  } catch (error) {
    console.log('게시글 불러오기 에러:', error);
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchPosts();
}, [fetchPosts]);
```

#### 필터 기능

상단 필터 버튼 클릭 시 모달 팝업이 표시된다. 모달 내부에서 여행지와 성향을 각각 드롭다운으로 선택하고 적용 버튼을 누르면 필터가 반영된다. 필터가 적용된 상태에서는 버튼 색상이 변경되고 적용된 필터 태그가 상단에 표시된다.

```javascript
const DESTINATION_OPTIONS = ['전체', '국내', '일본', '유럽', '동남아'];
const TYPE_OPTIONS = ['전체', 'TUAJ', 'TUAP', 'TURJ', 'TURP', 'TNAJ', 'TNAP', 'TNRJ', 'TNRP', 'CUAJ', 'CUAP', 'CURJ', 'CURP', 'CNAJ', 'CNAP', 'CNRJ', 'CNRP'];
```

- 여행지 필터 : 드롭다운 선택
- 성향 필터 : 드롭다운 선택 (16가지 유형, 스크롤 가능)
- 적용 전까지 임시 상태(`tempDestination`, `tempType`)로 관리하여 취소 시 원래 값 유지

#### 게시글 카드

각 카드에 아래 정보를 표시한다.

| 항목 | 설명 |
|------|------|
| 프로필 이미지 | 작성자 아바타 |
| 이름 | 작성자 구글 계정 이름 |
| 성향 코드 | 작성자 여행 성향 (미설정 시 '성향 미설정') |
| 여행지 | 목적지 |
| 여행 일수 | 예) 3박 4일 |
| 모집 인원 | 예) 3명 모집 |
| 한 줄 소개 | 게시글 소개 문구 |
| 간단 계획 | 최대 2줄 표시 |
| 참여하기 버튼 | UI만 구현 (기능 연동 예정) |

#### FAB 버튼

```javascript
<TouchableOpacity style={styles.fab} onPress={() => setWriteVisible(true)}>
  <Text style={styles.fabText}>+</Text>
</TouchableOpacity>
```

좌 하단에 고정 위치(`position: 'absolute'`)로 표시된다. 클릭 시 WriteScreen 모달이 아래에서 위로 슬라이드되어 올라온다.

---

### 동행 모집 글 작성 (WriteScreen)

**WriteScreen.js**

SearchScreen에서 FAB 버튼을 누르면 Modal(`animationType: 'slide'`)로 진입한다. 상단에 닫기(✕) 버튼과 완료 버튼이 있다.

#### 입력 항목

| 항목 | 필수 여부 | 설명 |
|------|----------|------|
| 여행지 | 필수 | 목적지 텍스트 입력 |
| 여행 일수 | 필수 | 예) 3박 4일 |
| 모집 인원 | 필수 | 숫자 입력 |
| 한 줄 소개 | 필수 | 게시글 소개 문구 |
| 간단 계획 | 선택 | 여행 계획 텍스트 (멀티라인) |

#### 작성 완료 처리

완료 버튼 클릭 시 필수 항목 검증 후 `POST /posts` API를 호출한다. JWT 토큰을 `Authorization` 헤더에 담아 전송하며, 성공 시 모달을 닫고 피드를 자동 새로고침한다.

```javascript
const handleSubmit = async () => {
  const token = await AsyncStorage.getItem('token');

  const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      destination,
      days,
      max_people: parseInt(maxPeople, 10),
      bio,
      plan,
    }),
  });
};
```
---

### 홈 화면

**HomeScreen.js**

홈 화면에서 바로가기 탭으로 다른 탭으로 이동한다.

**바로가기 탭**
```javascript
{/* 빠른 탭 이동 2x2 그리드 */}
          <View style={styles.sectionHeader}>
          </View>
          <View style={styles.gridContainer}>
            {QUICK_TABS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.gridCard}
                onPress={() => navigation.navigate(item.tab)}
                activeOpacity={0.85}>
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
                <Text style={styles.gridSub}>{item.sub}</Text>
                <View style={styles.gridArrow}>
                  <Text style={styles.gridArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
```

**가장 기간이 남지 않은 여행기록을 불러온다.**

```javascript
{/* D-Day 카드 */}
          {nextTrip ? (
            <View style={styles.dDayCard}>
              <View style={styles.dDayBadge}>
                <Text style={styles.dDayText}>{calcDDay(nextTrip.departure_date) ?? '날짜 미정'}</Text>
              </View>
              <Text style={styles.dDayTitle}>다가오는 여행</Text>
              <Text style={styles.dDayDestination}>📍 {nextTrip.destination}</Text>
              <View style={styles.dDayInfo}>
                <Text style={styles.dDayInfoText}>🗓 {nextTrip.days}</Text>
                {nextTrip.departure_date && (
                  <Text style={styles.dDayInfoText}>🛫 {nextTrip.departure_date}</Text>
                )}
              </View>
              <Text style={styles.dDayBio} numberOfLines={1}>{nextTrip.bio}</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>예정된 여행이 없어요 🗺</Text>
              <Text style={styles.emptySubText}>탐색 탭에서 멋진 동행을 찾아보세요!</Text>
            </View>
          )}
```

---

### 친구 화면

**FreindsScreen.js**

페이지가 렌더링 되면 서버에서 친구 데이터를 가져온다.

**친구 정보 불러오기**
```javascript
const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const result = await response.json();

      if (result.success && !isUploadingRef.current) {
        let friends = [];
        let request = [];
        let sent = [];
        let userId = result.userId;
        console.log("user id : "+ userId);
        console.log("data : "+ JSON.stringify(result.friends))
        for (let i = 0; i < result.friends.length; i++) {
          if (result.friends[i].status === 'accept' && result.friends[i].user_id == userId) {
            friends.push(result.friends[i]);
          } else if (result.friends[i].status === 'request' && result.friends[i].user_id == userId) {
            request.push(result.friends[i]);
          }else if (result.friends[i].status === 'request' && result.friends[i].friend_id == userId) {
            sent.push(result.friends[i]);
        }
      }
          setFriendsList(friends);
          setRequestList(request);
          setSentList(sent);
      }
    }catch (e) {
      console.log('친구 정보 불러오기 실패:', e);
    }
  };
```

**유저의 친구코드를 바탕으로 서버에 친구 추가 요청을 한다.**

```javascript
const friendAdd = async () => {
    if (isSending) return;
    if (!friendCode.trim()) {
      Alert.alert('알림', '친구 코드를 입력해주세요!');
      return;
    }

    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        'https://triplan-backend-qwrs.onrender.com/users/friendsAdd?friendCode=' + friendCode.trim(),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        Alert.alert('오류', '서버가 요청을 처리하지 못했습니다. 코드를 확인해주세요.');
        return;
      }

      const result = await response.json();
      if (result.state == "duplicate"){
        Alert.alert('친구 요청 중복!', '이미 친구 요청을 보냈습니다!');
        setFriendCode('');
        fetchFriends();
      }else if (result.success) {
        Alert.alert('친구 요청', '친구 요청을 보냈습니다!');
        setFriendCode('');
        fetchFriends();
      } else {
        Alert.alert('알림', result.message || '친구 추가에 실패했습니다.');
      }
    } catch (e) {
      console.log('친구 추가 실패:', e);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };
```
---

### 프로필 수정 화면

**ProfileEditScreen.js**

프로필 화면에 수정 버튼으로 프로필 정보를 수정하고 db에 저장한다.

**정보를 수정하고 db에 post 방식으로 body에 닉네임 , 성별 , 생년월일 , 한 줄 소개 값을 전달해서 저장한다.**
```javascript
 try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          gender,
          birth_year: formatDate(birthDate),
          bio: bio.trim(),
        }),
      });
```

---

### Sns 피드 작성 화면

**EditPostScreen.js**

피드 작성 폼에 사용자가 입력하면 db에 저장하도록 요청한다.

```javascript
 try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/${post.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination,
          days,
          max_people: parseInt(maxPeople, 10),
          bio,
          plan,
          departure_date: formatDate(departureDate),
        }),
      });
```
---

### 채팅 화면

**ChatScreen.js**

**렌더링 되면 채팅방 목록 서버로부터 가져오기**
```javascript
const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts/my-chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setChats(result.chats);
      }
    } catch (error) {
      console.log('채팅방 목록 에러:', error);
    } finally {
      setLoading(false);
    }
  }, []);


```


## Server 부문

### 서버 구성

**backend/src/index.js**

Node.js + Express 기반 REST API 서버이다. 포트 3000에서 실행된다.

```javascript
const app = express();
app.use(cors());
app.use(express.json());
app.use('/auth', authRouter);
app.use('/posts', postsRouter);

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

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const { email, name, picture, sub: providerId } = ticket.getPayload();

  let { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('provider_id', providerId)
    .single();

  if (!user) {
    const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data: newUser } = await supabase
      .from('users')
      .insert({ email, name, profile_image: picture, provider: 'google', provider_id: providerId, friend_code: friendCode })
      .select()
      .single();
    user = newUser;
  }

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

### 게시글 API

**backend/src/routes/posts.js**

JWT 인증 미들웨어를 통해 토큰을 검증하고 유저 정보를 추출한다.

```javascript
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ success: false, message: '토큰 없음' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, message: '토큰 만료 또는 유효하지 않음' });
  }
};
```

#### POST /posts — 게시글 작성

인증된 유저만 게시글을 작성할 수 있다. `req.user.userId`로 작성자를 특정한다.

```javascript
router.post('/', authMiddleware, async (req, res) => {
  const { destination, days, max_people, bio, plan } = req.body;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: req.user.userId,
      destination,
      days,
      max_people,
      bio,
      plan,
    })
    .select()
    .single();

  res.json({ success: true, post: data });
});
```

#### GET /posts — 게시글 목록 조회

인증 없이 조회 가능하다. `users` 테이블과 JOIN하여 작성자 정보를 함께 반환한다.

```javascript
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      users (
        id, name, profile_image, travel_type, friend_code
      )
    `)
    .order('created_at', { ascending: false });

  res.json({ success: true, posts: data });
});
```
---

### 알람 firebase API

**POST /auth/google**



```javascript


```


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

회원 정보를 저장하는 테이블이다. 소셜 로그인 기반으로 자동 가입 처리된다.

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
| travel_type | VARCHAR(10) | 성향 코드 (ex. TUAJ) — 성향 테스트 완료 후 채워짐 |
| friend_code | VARCHAR(20) | 고유 친구 코드 (UNIQUE) — 가입 시 자동 생성 |
| provider | VARCHAR(20) | 로그인 제공자 (google / kakao) |
| provider_id | VARCHAR(255) | 제공자 고유 ID — 로그인 시 유저 식별에 사용 |
| created_at | TIMESTAMP | 가입일시 (DEFAULT NOW()) |
| updated_at | TIMESTAMP | 수정일시 (DEFAULT NOW()) |

---

### posts 테이블

동행 모집 게시글 정보를 저장하는 테이블이다. `user_id`로 `users` 테이블과 연결된다.

```sql
CREATE TABLE posts (
    id            SERIAL PRIMARY KEY,
    user_id       INT NOT NULL REFERENCES users(id),
    destination   VARCHAR(100) NOT NULL,
    days          VARCHAR(50) NOT NULL,
    max_people    INT NOT NULL,
    bio           VARCHAR(200) NOT NULL,
    plan          TEXT,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);
```

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | SERIAL PK | 게시글 고유 번호 |
| user_id | INT FK | 작성자 ID (users.id 참조) |
| destination | VARCHAR(100) | 여행지 |
| days | VARCHAR(50) | 여행 일수 (예: 3박 4일) |
| max_people | INT | 모집 인원 |
| bio | VARCHAR(200) | 한 줄 소개 |
| plan | TEXT | 간단 계획 (선택 입력) |
| created_at | TIMESTAMP | 작성일시 (DEFAULT NOW()) |
| updated_at | TIMESTAMP | 수정일시 (DEFAULT NOW()) |

---

### friends 테이블

user들끼리의 친구 관계 정보를 저장하는 db이다. `user_id` 와 'friend_id'로 `users` 테이블과 연결된다.
status 값이 accept이면 친구 관계 , request라면 요청 상태를 의미한다.

```sql
create table public.friends (
    id bigint generated by default as identity not null,
    created_at timestamp with time zone not null default now(),
    user_id integer null,
    friend_id integer null,
    status text null,
    constraint friends_pkey primary key (id),
    constraint friends_friend_id_fkey foreign KEY (friend_id) references users (id),
    constraint friends_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;
```

| 컬럼         | 타입         | 설명                    |
|------------|------------|-----------------------|
| id         | SERIAL PK  | 친구 고유 번호              |
| user_id    | INT FK     | 사용자 ID (users.id 참조)  |
| friend_id  | INT FK     | 친구 ID (user.id 참조)    |
| status     | VARCHAR(50) | 관계 (acceopt, request) |

---

### messages 테이블

message의 내용은 content로 저장하고 해당 메세지가 포함된 chat_room_id 를 chat_rooms로 연결한다.


```sql
create table public.messages (
    id serial not null,
    chat_room_id integer not null,
    user_id integer not null,
    content text not null,
    type text null default 'text'::character varying,
    created_at timestamp without time zone null default now(),
    vote_closed boolean null default false,
    vote_closed_at timestamp with time zone null,
    vote_expires_at timestamp with time zone null,
    constraint messages_pkey primary key (id),
    constraint messages_chat_room_id_fkey foreign KEY (chat_room_id) references chat_rooms (id),
    constraint messages_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;
```

| 컬럼              | 타입          | 설명                      |
|-----------------|-------------|-------------------------|
| id              | SERIAL PK   | 메세지 고유 번호               |
| chat_room_id    | INT FK      | 채팅 룸 ID (chat_room_id 참조) |
| user_id         | INT FK      | 사용자 ID (user.id 참조)     |
| content         | VARCHAR(50) | 메세지 내용                  |
| type            | VARCHAR(30) | 메세지 타입                  |
| created_at      | INT FK      | 사용자 ID (users.id 참조)    |
| vate_closed     | BOOLEAN     |                         |
| vate_closed_at  | VARCHAR(50) |     |
| vate_expires_at | VARCHAR(50) |     |

---

### chat_rooms 테이블

chat_room_id 로 채팅방 id를 저장하고 post_id로 채팅방과 연결된 post의 id값을 외래키로 지정한다.


```sql
create table public.chat_rooms (
    id serial not null,
    post_id integer not null,
    created_at timestamp without time zone null default now(),
    ai_preferences jsonb null default '[]'::jsonb,
    constraint chat_rooms_pkey primary key (id),
    constraint chat_rooms_post_id_fkey foreign KEY (post_id) references posts (id)
    ) TABLESPACE pg_default;
```

| 컬럼              | 타입        | 설명                    |
|-----------------|-----------|-----------------------|
| id              | SERIAL PK | 채팅 룸 고유 번호            |
| post_id         | INT FK    | post ID (posts.id 참조) |
| created_at      | INT FK    | 생성 날짜                 |
| ai_preferences  | jsonb     | ai 전달 인자 값            |


### chat_members 테이블

chat_room_id 와 user_id 값을 통해 채팅룸 과 포함된 유저의 id값을 저장한다.


```sql
create table public.chat_members (
         id serial not null,
         chat_room_id integer not null,
         user_id integer not null,
         joined_at timestamp without time zone null default now(),
         constraint chat_members_pkey primary key (id),
         constraint chat_members_chat_room_id_user_id_key unique (chat_room_id, user_id),
         constraint chat_members_chat_room_id_fkey foreign KEY (chat_room_id) references chat_rooms (id),
         constraint chat_members_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;
```

| 컬럼           | 타입        | 설명                              |
|--------------|-----------|---------------------------------|
| id           | SERIAL PK | 채팅 멤버 고유 번호                     |
| chat_room_id | INT FK    | chat_room_id (chat_rooms.id 참조) |
| user_id      | INT FK    | user_id(user.id 참조)             |
| joined_at    | jsonb     | ai 전달 인자 값                      |


### chat_members 테이블

chat_room_id 와 user_id 값을 통해 채팅룸 과 포함된 유저의 id값을 저장한다.


```sql
create table public.chat_members (
         id serial not null,
         chat_room_id integer not null,
         user_id integer not null,
         joined_at timestamp without time zone null default now(),
         constraint chat_members_pkey primary key (id),
         constraint chat_members_chat_room_id_user_id_key unique (chat_room_id, user_id),
         constraint chat_members_chat_room_id_fkey foreign KEY (chat_room_id) references chat_rooms (id),
         constraint chat_members_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;
```

| 컬럼           | 타입        | 설명                              |
|--------------|-----------|---------------------------------|
| id           | SERIAL PK | 채팅 멤버 고유 번호                     |
| chat_room_id | INT FK    | chat_room_id (chat_rooms.id 참조) |
| user_id      | INT FK    | user_id(user.id 참조)             |
| joined_at    | jsonb     | ai 전달 인자 값                      |
