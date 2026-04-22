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

module.exports = router;