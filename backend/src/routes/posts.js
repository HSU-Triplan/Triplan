const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { processPreference, recommendDestinations } = require('../utils/gemini');
const router = express.Router();
const { searchGooglePlace } = require('../utils/googleMaps');
const { searchKakaoPlace } = require('../utils/kakaoMap');

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

    // 게시글 생성
    const { data: post, error: postError } = await supabase
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

    if (postError) throw postError;

    // 채팅방 자동 생성
    const { data: chatRoom, error: roomError } = await supabase
      .from('chat_rooms')
      .insert({ post_id: post.id })
      .select()
      .single();

    if (roomError) throw roomError;

    // 작성자 자동 참여
    const { error: memberError } = await supabase
      .from('chat_members')
      .insert({ chat_room_id: chatRoom.id, user_id: req.user.userId });

    if (memberError) throw memberError;

    res.json({ success: true, post, chat_room_id: chatRoom.id });
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

// 최근 계획 목록
router.get('/my-recent-plans', authMiddleware, async (req, res) => {
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
      .eq('user_id', req.user.userId)
      .order('id',{ascending : false})
      .limit(5);


    if (error) throw error;

    res.json({ success: true, chats: data });
  } catch (error) {
    console.error('채팅방 목록 에러:', error);
    res.status(500).json({ success: false, message: '채팅방 목록 조회 실패' });
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

// 채팅방 나가기
router.delete('/chat-rooms/:roomId/leave', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.userId;

    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('채팅방 나가기 에러:', error);
    res.status(500).json({ success: false, message: '채팅방 나가기 실패' });
  }
});

// 게시글 수정
router.patch('/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;
    const { destination, days, max_people, bio, plan, departure_date } = req.body;

    // 내 글인지 확인
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '권한 없음' });
    }

    const { error } = await supabase
      .from('posts')
      .update({
        destination,
        days,
        max_people,
        bio,
        plan,
        departure_date: departure_date || null,
        updated_at: new Date(),
      })
      .eq('id', postId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('게시글 수정 에러:', error);
    res.status(500).json({ success: false, message: '게시글 수정 실패' });
  }
});

// 게시글 삭제
router.delete('/:postId', authMiddleware, async (req, res) => {
  try {
    const { postId } = req.params;

    // 내 글인지 확인
    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (!post || post.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '권한 없음' });
    }

    // 채팅방 조회
    const { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('post_id', postId)
      .single();

    if (chatRoom) {
      // 1. 채팅 멤버 먼저 삭제
      console.log('채팅방 ID:', chatRoom.id);
        const { error: memberError } = await supabase
        .from('chat_members')
        .delete()
        .eq('chat_room_id', chatRoom.id);
      console.log('멤버 삭제 에러:', memberError);
      // 2. 채팅방 삭제
      const { error: roomError } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', chatRoom.id);
      console.log('채팅방 삭제 에러:', roomError);

    }

    // 3. 게시글 삭제
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('게시글 삭제 에러:', error);
    res.status(500).json({ success: false, message: '게시글 삭제 실패' });
  }
});

// 채팅방 멤버 조회
router.get('/chat-rooms/:roomId/members', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase
      .from('chat_members')
      .select(`
        user_id,
        joined_at,
        users (
          id, name, nickname, profile_image, travel_type, friend_code
        )
      `)
      .eq('chat_room_id', roomId);

    if (error) throw error;

    res.json({ success: true, members: data });
  } catch (error) {
    console.error('멤버 조회 에러:', error);
    res.status(500).json({ success: false, message: '멤버 조회 실패' });
  }
});


// 메시지 목록 조회
router.get('/chat-rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        users (
          id, name, nickname, profile_image
        )
      `)
      .eq('chat_room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, messages: data });
  } catch (error) {
    console.error('메시지 조회 에러:', error);
    res.status(500).json({ success: false, message: '메시지 조회 실패' });
  }
});

// 메시지 전송
router.post('/chat-rooms/:roomId/messages', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, type = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({ success: false, message: '내용 없음' });
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content,
        type,
      })
      .select(`
        *,
        users (
          id, name, nickname, profile_image
        )
      `)
      .single();

    if (error) throw error;

    res.json({ success: true, message: data });
  } catch (error) {
    console.error('메시지 전송 에러:', error);
    res.status(500).json({ success: false, message: '메시지 전송 실패' });
  }
});

router.post('/chat-rooms/:roomId/ai-preference', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body; // "@맛집위주" 에서 @ 제거된 "맛집위주"

  if (!text?.trim()) {
    return res.status(400).json({ success: false, message: '내용을 입력해주세요.' });
  }

  try {
    // 기존 선호사항 조회
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('ai_preferences')
      .eq('id', roomId)
      .single();

    if (error) throw error;

    const existing = room.ai_preferences || [];

    // Gemini에게 카테고리 분류 + 중복 판단 요청
    const geminiResult = await processPreference(text.trim(), existing);

    // 중복이면 같은 카테고리 제거 후 새 것 추가, 아니면 그냥 추가
    let updated = [...existing];
    if (geminiResult.replaced && geminiResult.replacedText) {
      updated = updated.filter(p => p.text !== geminiResult.replacedText);
    }
    updated.push({
      text: text.trim(),
      category: geminiResult.category,
      addedAt: new Date().toISOString(),
    });

    // DB 업데이트
    await supabase
      .from('chat_rooms')
      .update({ ai_preferences: updated })
      .eq('id', roomId);

    // AI 확인 메시지를 messages 테이블에도 저장 (다른 멤버도 볼 수 있게)
    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content: geminiResult.message,
        type: 'ai_preference',
      })
      .select()
      .single();

    res.json({
      success: true,
      preferences: updated,
      aiMessage: {
        id: String(savedMsg.id),
        type: 'ai_preference',
        text: geminiResult.message,
        replaced: geminiResult.replaced,
        replacedText: geminiResult.replacedText,
      },
    });
  } catch (error) {
     console.log('AI 선호사항 저장 에러 상세:', error.message, error.details);
     res.status(500).json({ success: false, message: error.message }); //테스트
   }
});

// ── 2. 선호사항 목록 조회 ────────────────────────────────────
router.get('/chat-rooms/:roomId/ai-preference', authMiddleware, async (req, res) => {
  const { roomId } = req.params;

  try {
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('ai_preferences')
      .eq('id', roomId)
      .single();

    if (error) throw error;

    res.json({ success: true, preferences: room.ai_preferences || [] });
  } catch (error) {
    console.log('선호사항 조회 에러:', error);
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});

// ── 선호사항 삭제 ────────────────────────────────────────────
router.delete('/chat-rooms/:roomId/ai-preference', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { text } = req.body;

  try {
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('ai_preferences')
      .eq('id', roomId)
      .single();

    if (error) throw error;

    const updated = (room.ai_preferences || []).filter(p => p.text !== text);

    await supabase
      .from('chat_rooms')
      .update({ ai_preferences: updated })
      .eq('id', roomId);

    res.json({ success: true, preferences: updated });
  } catch (error) {
    console.log('선호사항 삭제 에러:', error.message);
    res.status(500).json({ success: false, message: '삭제 실패' });
  }
});

// ── 3. 여행지 추천 ───────────────────────────────────────────
router.post('/chat-rooms/:roomId/ai-recommend', authMiddleware, async (req, res) => {
  const { roomId } = req.params;

  try {
    // 선호사항 + 채팅방 정보 조회
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select(`ai_preferences, posts (destination, days, departure_date, max_people)`)
      .eq('id', roomId)
      .single();

    if (error) throw error;

    const preferences = room.ai_preferences || [];
    const roomInfo = room.posts || {};

    // 1. Gemini에서 JSON 구조로 추천 받기
    const parsed = await recommendDestinations(preferences, roomInfo);

    // 2. 각 spots에 좌표 + 사진 붙이기
    for (const dest of parsed.destinations) {
      for (const spot of dest.spots) {
        let result = null;

        if (dest.isKorea) {
          result = await searchKakaoPlace(spot.name);
        } else {
          result = await searchGooglePlace(`${spot.name} ${dest.name}`);
        }

        if (result) {
          spot.lat = result.lat;
          spot.lng = result.lng;
          spot.address = result.address;
          spot.photoUrl = result.photoUrl || null;
          spot.placeUrl = result.placeUrl || null;
        } else {
          // 검색 실패 시 기본값
          spot.lat = null;
          spot.lng = null;
          spot.address = null;
          spot.photoUrl = null;
        }
      }
    }

    // 3. messages 테이블에 JSON으로 저장
    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content: JSON.stringify(parsed),  // JSON 문자열로 저장
        type: 'ai_recommend',
      })
      .select()
      .single();

    const aiMsg = {
      id: String(savedMsg.id),
      type: 'ai_recommend',
      data: parsed,  // 파싱된 JSON 그대로 전달
    };

    // 4. 소켓 브로드캐스트
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('receive_message', aiMsg);

    res.json({ success: true, message: aiMsg });
  } catch (error) {
    console.log('AI 추천 에러:', error.message);
    res.status(500).json({ success: false, message: 'AI 추천 중 오류가 발생했습니다.' });
  }
});

module.exports = router;