const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

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

module.exports = router;