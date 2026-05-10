const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

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
    console.log('userId:', req.user.userId);
    console.log('travelType:', travelType);

    if (!travelType) {
      return res.status(400).json({ success: false, message: '성향 코드 없음' });
    }

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
      .select('id, email, name, nickname, profile_image, gender, birth_year, bio, travel_type, friend_code, created_at')
      .eq('id', req.user.userId)
      .single();

    if (error) throw error;

    res.json({ success: true, user: data });
  } catch (error) {
    console.error('유저 정보 조회 에러:', error);
    res.status(500).json({ success: false, message: '유저 정보 조회 실패' });
  }
});

//다른 사용자 프로필 조회
router.get('/others',authMiddleware, async (req, res) => {
  try {

    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, nickname, profile_image, gender, birth_year, bio, travel_type, friend_code, created_at')
      .eq('id',req.query.id)
      .single();

    console.log(data);
    if (error) throw error;

    res.json({ success: true, user: data });
    console.log("요청옴");
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

// 홈 화면용 — 내가 작성한 게시글 조회
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
    if (!req.file) {
      return res.status(400).json({ success: false, message: '이미지 없음' });
    }

    const fileName = `${req.user.userId}.jpg`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (error) throw error;

    // 공개 URL 가져오기
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    console.log('publicUrl:', publicUrl);

    // DB에 저장
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


// 매칭 유저 목록 조회 (점수 계산)
router.get('/matching', authMiddleware, async (req, res) => {
  try {
    const { destination } = req.query;
    const myId = req.user.userId;

    // 내 정보 조회
    const { data: me } = await supabase
      .from('users')
      .select('travel_type, birth_year')
      .eq('id', myId)
      .single();

    // 나를 제외한 모든 유저 조회
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, nickname, profile_image, travel_type, birth_year, bio, gender, friend_code')
      .neq('id', myId)
      .not('travel_type', 'is', null);

    if (error) throw error;

    // 여행지 겹침 확인용 내 게시글 조회
    const { data: myPosts } = await supabase
      .from('posts')
      .select('destination')
      .eq('user_id', myId);

    const myDestinations = myPosts?.map(p => p.destination?.trim().toLowerCase()) || [];

    // 점수 계산
    const scored = await Promise.all(users.map(async (user) => {
      let score = 0;

      // 1. 여행타입 점수 (75점)
      if (me.travel_type && user.travel_type) {
        const myType = me.travel_type;
        const theirType = user.travel_type;
        if (myType[0] === theirType[0]) score += 18.75; // T/C
        if (myType[1] === theirType[1]) score += 18.75; // U/N
        if (myType[2] === theirType[2]) score += 18.75; // A/R
        if (myType[3] === theirType[3]) score += 18.75; // J/P
      }

      // 2. 나이 점수 (25점)
      if (me.birth_year && user.birth_year) {
        const myYear = new Date(me.birth_year).getFullYear();
        const theirYear = new Date(user.birth_year).getFullYear();
        const diff = Math.abs(myYear - theirYear);
        if (diff <= 2) score += 25;
        else if (diff <= 5) score += 18;
        else if (diff <= 10) score += 10;
      }

      // 3. 여행지 겹침 (입력한 여행지 기준)
      if (destination) {
        const { data: theirPosts } = await supabase
          .from('posts')
          .select('destination')
          .eq('user_id', user.id);

        const theirDestinations = theirPosts?.map(p => p.destination?.trim().toLowerCase()) || [];
        const dest = destination.trim().toLowerCase();

        if (theirDestinations.includes(dest) || myDestinations.includes(dest)) {
          score += 10; // 보너스 점수
        }
      }

      return { ...user, score: Math.round(score) };
    }));

    // 점수 높은 순 정렬
    scored.sort((a, b) => b.score - a.score);

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

    // 상대방이 나한테 이미 오른쪽 스와이프 했는지 확인
    const { data: existing } = await supabase
      .from('matches')
      .select('*')
      .eq('sender_id', receiverId)
      .eq('receiver_id', senderId)
      .single();

    if (existing && status === 'accepted') {
      // 양쪽 다 수락 → 매칭 성립
      await supabase
        .from('matches')
        .update({ status: 'accepted' })
        .eq('id', existing.id);

      // 내 스와이프도 저장
      await supabase
        .from('matches')
        .upsert({
          sender_id: senderId,
          receiver_id: receiverId,
          status: 'accepted',
        });

      return res.json({ success: true, matched: true });
    }

    // 스와이프 저장
    await supabase
      .from('matches')
      .upsert({
        sender_id: senderId,
        receiver_id: receiverId,
        status,
      });

    res.json({ success: true, matched: false });
  } catch (error) {
    console.error('스와이프 에러:', error);
    res.status(500).json({ success: false, message: '스와이프 저장 실패' });
  }
});

module.exports = router;