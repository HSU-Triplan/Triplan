const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    // 구글 토큰 검증
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const { email, name, picture, sub: providerId } = payload;

    // DB에서 유저 찾기
    let { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('provider_id', providerId)
      .single();

    // 없으면 신규 유저 생성
    if (!user) {
      const friendCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: newUser } = await supabase
        .from('users')
        .insert({
          email,
          name,
          profile_image: picture,
          provider: 'google',
          provider_id: providerId,
          friend_code: friendCode,
        })
        .select()
        .single();
      user = newUser;
    }

    // JWT 발급
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ success: true, token, user });
  } catch (error) {
    console.error('구글 로그인 에러:', error);
    res.status(401).json({ success: false, message: '로그인 실패' });
  }
});

module.exports = router;