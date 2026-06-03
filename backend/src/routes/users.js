const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { admin } = require('../utils/firebase');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

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

// 성향 코드 저장
router.post('/travel-type', authMiddleware, async (req, res) => {
  try {
    const { travelType } = req.body;
    if (!travelType) return res.status(400).json({ success: false, message: '성향 코드 없음' });

    const { error } = await supabase
      .from('users')
      .update({ travel_type: travelType })
      .eq('id', req.user.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('성향 저장 에러:', error);
    res.status(500).json({ success: false, message: '성향 저장 실패' });
  }
});

// 내 정보 조회
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, nickname, profile_image, gender, birth_year, bio, travel_type, friend_code, preferred_destination, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error) {
    console.error('유저 정보 조회 에러:', error);
    res.status(500).json({ success: false, message: '유저 정보 조회 실패' });
  }
});

// 다른 사용자 프로필 조회
router.get('/others', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, nickname, profile_image, gender, birth_year, bio, travel_type, friend_code, created_at')
      .eq('id', req.query.id)
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error) {
    console.error('유저 정보 조회 에러:', error);
    res.status(500).json({ success: false, message: '유저 정보 조회 실패' });
  }
});

// 프로필 수정
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { nickname, birth_year, gender, bio } = req.body;

    const { error } = await supabase
      .from('users')
      .update({
        nickname: nickname || null,
        birth_year: birth_year || null,
        gender: gender || null,
        bio: bio || null,
        updated_at: new Date(),
      })
      .eq('id', req.user.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('프로필 수정 에러:', error);
    res.status(500).json({ success: false, message: '프로필 수정 실패' });
  }
});

// 내가 작성한 게시글 조회
router.get('/my-posts', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('id, destination, days, departure_date, bio, max_people, created_at')
      .eq('user_id', req.user.userId)
      .order('departure_date', { ascending: true });

    if (error) throw error;
    res.json({ success: true, posts: data });
  } catch (error) {
    console.error('내 게시글 조회 에러:', error);
    res.status(500).json({ success: false, message: '내 게시글 조회 실패' });
  }
});

// 프로필 이미지 업로드
router.post('/upload-avatar', authMiddleware, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: '이미지 없음' });

    const fileName = `${req.user.userId}.jpg`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_image: publicUrl })
      .eq('id', req.user.userId);

    if (updateError) throw updateError;
    res.json({ success: true, profile_image: publicUrl });
  } catch (error) {
    console.error('이미지 업로드 에러:', error);
    res.status(500).json({ success: false, message: '이미지 업로드 실패' });
  }
});

// 매칭 유저 목록 조회
router.get('/matching', authMiddleware, async (req, res) => {
  try {
    const { destination } = req.query;
    const myId = req.user.userId;

    const { data: me } = await supabase
      .from('users')
      .select('travel_type, birth_year, preferred_destination')
      .eq('id', myId)
      .single();

    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, nickname, profile_image, travel_type, birth_year, bio, gender, friend_code, preferred_destination')
      .neq('id', myId)
      .not('travel_type', 'is', null);

    if (error) throw error;

    const { data: myPosts } = await supabase
      .from('posts')
      .select('destination')
      .eq('user_id', myId);

    const myDestinations = myPosts?.map(p => p.destination?.trim().toLowerCase()) || [];

    const scored = await Promise.all(users.map(async (user) => {
      let score = 0;

      if (me.travel_type && user.travel_type) {
        const myType = me.travel_type;
        const theirType = user.travel_type;
        if (myType[0] === theirType[0]) score += 18.75;
        if (myType[1] === theirType[1]) score += 18.75;
        if (myType[2] === theirType[2]) score += 18.75;
        if (myType[3] === theirType[3]) score += 18.75;
      }

      if (me.birth_year && user.birth_year) {
        const myYear = new Date(me.birth_year).getFullYear();
        const theirYear = new Date(user.birth_year).getFullYear();
        const diff = Math.abs(myYear - theirYear);
        if (diff <= 2) score += 25;
        else if (diff <= 5) score += 18;
        else if (diff <= 10) score += 10;
      }

      // 선호 여행지 일치 가산점 추가
      const myPreferred = me.preferred_destination
        ? me.preferred_destination.split(',').map(d => d.trim().toLowerCase())
        : [];
      const theirPreferred = user.preferred_destination
        ? user.preferred_destination.split(',').map(d => d.trim().toLowerCase())
        : [];

      const commonDestinations = myPreferred.filter(d => theirPreferred.includes(d));
      score += commonDestinations.length * 5; // 겹치는 여행지 1개당 5점

      if (destination) {
        const { data: theirPosts } = await supabase
          .from('posts')
          .select('destination')
          .eq('user_id', user.id);

        const theirDestinations = theirPosts?.map(p => p.destination?.trim().toLowerCase()) || [];
        const dest = destination.trim().toLowerCase();
        if (theirDestinations.includes(dest) || myDestinations.includes(dest)) score += 10;
      }

      return { ...user, score: Math.round(score) };
    }));

    // 선호 여행지 선 정렬
    scored.sort((a, b) => {
      const aHasCommon = myPreferred.some(d =>
        (a.preferred_destination || '').toLowerCase().includes(d)
      );
      const bHasCommon = myPreferred.some(d =>
        (b.preferred_destination || '').toLowerCase().includes(d)
      );
      if (aHasCommon && !bHasCommon) return -1;
      if (!aHasCommon && bHasCommon) return 1;
      return b.score - a.score;
    });

    res.json({ success: true, users: scored });
  } catch (error) {
    console.error('매칭 에러:', error);
    res.status(500).json({ success: false, message: '매칭 실패' });
  }
});

// 스와이프 결과 저장
router.post('/matching/swipe', authMiddleware, async (req, res) => {
  try {
    const { receiverId, status } = req.body;
    const senderId = req.user.userId;

    const { data: existing } = await supabase
      .from('matches')
      .select('*')
      .eq('sender_id', receiverId)
      .eq('receiver_id', senderId)
      .single();

    if (existing && status === 'accepted') {
      await supabase.from('matches').update({ status: 'accepted' }).eq('id', existing.id);
      await supabase.from('matches').upsert({ sender_id: senderId, receiver_id: receiverId, status: 'accepted' });
      return res.json({ success: true, matched: true });
    }

    await supabase.from('matches').upsert({ sender_id: senderId, receiver_id: receiverId, status });
    res.json({ success: true, matched: false });
  } catch (error) {
    console.error('스와이프 에러:', error);
    res.status(500).json({ success: false, message: '스와이프 저장 실패' });
  }
});

// 친구 목록 조회
router.get('/friends', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('friends')
      .select('user_id,friend_id,status, users:friend_id(id, name, nickname, profile_image),sentUsers:user_id(id, name, nickname, profile_image,travel_type)')
      .or(`user_id.eq.${req.user.userId},friend_id.eq.${req.user.userId}`);

    if (error) throw error;
    console.log("friends 목록 : "+data);
    res.json({ success: true, friends: data , userId : req.user.userId});
  } catch (error) {
    console.error('친구목록 조회 에러:', error);
    res.status(500).json({ success: false, message: '친구 목록 조회 실패' });
  }
});

// 친구 초대 요청
router.get('/friendsAdd', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('friend_code', req.query.friendCode)
      .single();

    if (error) throw error;

    //친구 요청 이미 했는지 확인
    const {data:friendData , error : friendError} = await supabase
        .from('friends')
        .select('*')
        .eq('user_id',data.id)
        .eq('friend_id',req.user.userId)

    if(friendData.length>=1){
        console.log("이미 존재하는 친구 요청입니다.");
        return res.json({state : "duplicate"});
    }

    await supabase
      .from('friends')
      .insert({ user_id: data.id, friend_id: req.user.userId, status: 'request' });

    res.json({ success: true });
  } catch (error) {
    console.error('친구 요청 에러:', req.query.friendCode);
    res.status(500).json({ success: false, message: '친구 요청 실패' });
  }
});

// 친구 초대 수락
router.get('/friendsAccept', authMiddleware, async (req, res) => {
  try {
    // 1. status를 accept로 변경
    const { error: updateError } = await supabase
      .from('friends')
      .update({ status: 'accept' })
      .eq('user_id', req.user.userId)
      .eq('friend_id', req.query.friendId);

    if (updateError) throw updateError;

    // 2. 반대 방향 친구 관계 추가
    await supabase
      .from('friends')
      .insert({ user_id: req.query.friendId, friend_id: req.user.userId, status: 'accept' });

    res.json({ success: true });

    // 3. 푸시 알림 (응답 이후 비동기로 처리)
    try {
      const { data: friendData } = await supabase
        .from('users')
        .select('fcm_token')
        .eq('id', req.query.friendId)
        .single();

      if (friendData?.fcm_token) {
        await admin.messaging().send({
          token: friendData.fcm_token,
          notification: { title: '친구 요청 수락', body: '친구 요청이 수락되었습니다.' },
          android: { priority: 'high' },
          data: { type: 'friend_accept' },
        });
      }
    } catch (pushError) {
      console.error('푸시 알림 에러:', pushError);
    }
  } catch (error) {
    console.error('친구 수락 에러:', error);
    res.status(500).json({ success: false, message: '친구 수락 실패' });
  }
});

// 친구 초대 거절
router.get('/friendsRefuse', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', req.user.userId)
      .eq('friend_id', req.query.friendId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('친구 거절 에러:', error);
    res.status(500).json({ success: false, message: '친구 초대 거절 실패' });
  }
});

// FCM 토큰 저장
router.post('/saveFcmToken', authMiddleware, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .update({ fcm_token: req.body.fcm_token })
      .eq('id', req.user.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    console.error('fcm 토큰 저장 에러:', error);
    res.status(500).json({ success: false, message: 'fcm 토큰 저장 에러' });
  }
});

// 선호 여행지 저장
router.post('/preferred-destination', authMiddleware, async (req, res) => {
  try {
    const { destinations } = req.body; // ["국내", "아시아", "유럽"]

    if (!destinations || !Array.isArray(destinations) || destinations.length === 0) {
      return res.status(400).json({ success: false, message: '여행지를 선택해주세요.' });
    }

    const destinationStr = destinations.join(','); // "국내,아시아,유럽"

    const { error } = await supabase
      .from('users')
      .update({ preferred_destination: destinationStr })
      .eq('id', req.user.userId);

    if (error) throw error;

    res.json({ success: true, preferred_destination: destinationStr });
  } catch (error) {
    console.error('선호 여행지 저장 에러:', error);
    res.status(500).json({ success: false, message: '저장 실패' });
  }
});

// 선호 여행지 조회 (내 정보에 포함되어 있어서 /users/me로도 가능하지만 별도 제공)
router.get('/preferred-destination', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('preferred_destination')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    const destinations = data.preferred_destination
      ? data.preferred_destination.split(',')
      : [];

    res.json({ success: true, destinations });
  } catch (error) {
    console.error('선호 여행지 조회 에러:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

module.exports = router;