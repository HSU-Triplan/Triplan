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
    const { destination, days, max_people, bio, plan, departure_date } = req.body;

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
        departure_date: departure_date || null,
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
        ),
        chat_rooms (
          id,
          chat_members (count)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 현재 참여 인원 수 계산
    const posts = data.map(post => ({
      ...post,
      current_people: post.chat_rooms?.[0]?.chat_members?.[0]?.count ?? 0,
    }));

    res.json({ success: true, posts });
  } catch (error) {
    console.error('게시글 조회 에러:', error);
    res.status(500).json({ success: false, message: '게시글 조회 실패' });
  }
});

// 참여하기 (채팅방 생성 또는 참여)
router.post('/:postId/join', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.userId;

    // 기존 채팅방 확인
    let { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('post_id', postId)
      .single();

    // 없으면 채팅방 생성
    if (!chatRoom) {
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({ post_id: postId })
        .select()
        .single();
      if (error) throw error;
      chatRoom = newRoom;
    }

    // 이미 참여 중인지 확인
    const { data: existing } = await supabase
      .from('chat_members')
      .select('*')
      .eq('chat_room_id', chatRoom.id)
      .eq('user_id', userId)
      .single();

    if (!existing) {
      const { error } = await supabase
        .from('chat_members')
        .insert({ chat_room_id: chatRoom.id, user_id: userId });
      if (error) throw error;
    }

    res.json({ success: true, chat_room_id: chatRoom.id });
  } catch (error) {
    console.error('참여하기 에러:', error);
    res.status(500).json({ success: false, message: '참여하기 실패' });
  }
});

// 내가 참여한 채팅방 목록
router.get('/my-chats', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('chat_members')
      .select(`
        chat_room_id,
        chat_rooms (
          id,
          post_id,
          created_at,
          posts (
            id,
            destination,
            days,
            departure_date,
            bio,
            users (
              name,
              profile_image
            )
          )
        )
      `)
      .eq('user_id', req.user.userId);

    if (error) throw error;

    res.json({ success: true, chats: data });
  } catch (error) {
    console.error('채팅방 목록 에러:', error);
    res.status(500).json({ success: false, message: '채팅방 목록 조회 실패' });
  }
});

module.exports = router;