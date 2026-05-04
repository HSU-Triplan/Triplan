const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// JWT 토큰에서 유저 정보 추출 미들웨어
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

// 게시글 작성
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { destination, days, max_people, bio, plan } = req.body;

    if (!destination || !days || !max_people || !bio) {
      return res.status(400).json({ success: false, message: '필수 항목 누락' });
    }

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

    if (error) throw error;

    res.json({ success: true, post: data });
  } catch (error) {
    console.error('게시글 작성 에러:', error);
    res.status(500).json({ success: false, message: '게시글 작성 실패' });
  }
});

// 게시글 목록 조회
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        users (
          id, name, profile_image, travel_type, friend_code
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, posts: data });
  } catch (error) {
    console.error('게시글 조회 에러:', error);
    res.status(500).json({ success: false, message: '게시글 조회 실패' });
  }
});

module.exports = router;