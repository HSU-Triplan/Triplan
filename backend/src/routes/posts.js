const express = require('express');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { processPreference, recommendDestinations, summarizeConversation, optimizeItinerary  } = require('../utils/gemini');
const router = express.Router();
const { searchGooglePlace, searchPopularGooglePlaces, searchNearbyGooglePlaces } = require('../utils/googleMaps');
const { searchKakaoPlace, searchPopularKakaoPlaces, searchNearbyKakaoPlaces } = require('../utils/kakaoMap');
//firebase admin 초기화
const {admin} = require('../utils/firebase')

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

    let { data: chatRoom } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('post_id', postId)
      .single();

    if (!chatRoom) {
      const { data: newRoom, error } = await supabase
        .from('chat_rooms')
        .insert({ post_id: postId })
        .select()
        .single();
      if (error) throw error;
      chatRoom = newRoom;
    }

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

      // 신규 참여일 때만 브로드캐스트
      const { data: user } = await supabase
        .from('users')
        .select('nickname, name')
        .eq('id', userId)
        .single();

      const displayName = user?.nickname || user?.name || '누군가';
      const io = req.app.get('io');
      if (io) io.to(String(chatRoom.id)).emit('receive_message', {
        id: `system-join-${Date.now()}`,
        type: 'system',
        text: `${displayName}님이 여행에 참가했습니다.`,
      });
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

    // 이름 먼저 조회 (삭제 전에)
    const { data: user } = await supabase
      .from('users')
      .select('nickname, name')
      .eq('id', userId)
      .single();

    const { error } = await supabase
      .from('chat_members')
      .delete()
      .eq('chat_room_id', roomId)
      .eq('user_id', userId);

    if (error) throw error;

    // 퇴장 브로드캐스트
    const displayName = user?.nickname || user?.name || '누군가';
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('receive_message', {
      id: `system-leave-${Date.now()}`,
      type: 'system',
      text: `${displayName}님이 여행에서 떠났습니다.`,
    });

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


    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // AI 확인 메시지를 messages 테이블에도 저장 (다른 멤버도 볼 수 있게)
    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content: JSON.stringify(itinerary),
        type: 'ai_itinerary',
        vote_expires_at: expiresAt,
      })
      .select()
      .single();

    const aiMsg = {
      id: String(savedMsg.id),
      type: 'ai_itinerary',
      data: itinerary,
      voteExpiresAt: expiresAt,
    };

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
    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select(`ai_preferences, posts(destination, days, departure_date, max_people)`)
      .eq('id', roomId)
      .single();

    if (error) throw error;

    const { data: members } = await supabase
      .from('chat_members')
      .select('users(travel_type)')
      .eq('chat_room_id', roomId);

    // U/N, A/R 비율 계산
    let urbanCount = 0, natureCount = 0;
    let activeCount = 0, restCount = 0;
    const totalMembers = members?.length || 0;

    members?.forEach(m => {
      const type = m.users?.travel_type || '';
      if (type[1] === 'U') urbanCount++;
      else if (type[1] === 'N') natureCount++;
      if (type[2] === 'A') activeCount++;
      else if (type[2] === 'R') restCount++;
    });

    const urbanRatio  = totalMembers > 0 ? Math.round(urbanCount  / totalMembers * 100) : 50;
    const activeRatio = totalMembers > 0 ? Math.round(activeCount / totalMembers * 100) : 50;

    const preferences = room.ai_preferences || [];
    const roomInfo = {
      ...room.posts,
      urbanRatio,
      activeRatio,
    };

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
// ── 전체 대화 정리 ────────────────────────────────────────────

router.post('/chat-rooms/:roomId/ai-summarize', authMiddleware, async (req, res) => {
  const { roomId } = req.params;

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('content, type, users(nickname, name)')
      .eq('chat_room_id', roomId)
      .eq('type', 'text')
      .order('created_at', { ascending: true });

    const { data: room } = await supabase
      .from('chat_rooms')
      .select('posts(days, departure_date, destination)')
      .eq('id', roomId)
      .single();

    // ↓ 멤버 성향 조회 추가
    const { data: members } = await supabase
      .from('chat_members')
      .select('users(nickname, name, travel_type)')
      .eq('chat_room_id', roomId);

    if (error) throw error;
    if (!messages || messages.length === 0) {
      return res.json({ success: false, message: '분석할 대화가 없어요.' });
    }

    const formatted = messages.map(m => ({
      senderName: m.users?.nickname || m.users?.name || '멤버',
      text: m.content,
      type: m.type,
    }));

    const roomInfo = {
      days: room?.posts?.days,
      departure_date: room?.posts?.departure_date,
      destination: room?.posts?.destination,
    };

    // ↓ memberProfiles 추가
    const memberProfiles = (members || []).map(m => ({
      name: m.users?.nickname || m.users?.name || '멤버',
      travelType: m.users?.travel_type || '미설정',
    }));

    const summary = await summarizeConversation(formatted, roomInfo, memberProfiles);

    res.json({ success: true, summary });
  } catch (error) {
    console.log('대화 정리 에러:', error.message);
    res.status(500).json({ success: false, message: '정리 중 오류가 발생했습니다.' });
  }
});

// ── 정리 결과 승인 → 브로드캐스트 + AI 메모 갱신 ─────────────
router.post('/chat-rooms/:roomId/ai-summarize-approve', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { summary } = req.body; // { who, when, where, how, what }

  try {
    // 1. messages 테이블에 저장
    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content: JSON.stringify(summary),
        type: 'ai_summary',
      })
      .select()
      .single();

    // 2. AI 메모 갱신 — where, when, how, what에서 추출
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('ai_preferences')
      .eq('id', roomId)
      .single();

    const overlapKeywords = {
    who: ['명', '인원/성향', '사람', '명이서'],
    when: ['박', '일', '날짜', '출발', '월', '주', '기간'],
    where: ['여행지', '장소'],
    how: ['렌트', '드라이브', '도보', '버스', '기차', '비행기', '이동'],
    what: ['예산', '만원', '맛집', '카페', '관광', '드라이브', '활동', '코스'],
    };

    const fieldCategories = {
    who: '인원',
    when: '기간/날짜',
    where: '여행지',
    how: '이동수단',
    what: '활동', };
    let preferences = [...(room.ai_preferences || [])];
    for (const [field, newItems] of Object.entries(summary)) {
        if (!newItems || newItems.length === 0) continue;

    const keywords = overlapKeywords[field] || [];
    const newText = newItems.join(', ');

    // 1. 같은 카테고리 제거
    preferences = preferences.filter(
        p => p.category !== fieldCategories[field]
    );
    // 2. 키워드 겹치는 기존 메모 제거
    preferences = preferences.filter(p => {
        const pText = p.text.toLowerCase();
        return !keywords.some(kw => pText.includes(kw)); });

    // 3. 새 메모 추가
    preferences.push({
            text: newText, category: fieldCategories[field],
            addedAt: new Date().toISOString(),
        });
    }

    await supabase
      .from('chat_rooms')
      .update({ ai_preferences: preferences })
      .eq('id', roomId);

    // 3. 소켓 브로드캐스트
    const aiMsg = {
      id: String(savedMsg.id),
      type: 'ai_summary',
      data: summary,
    };
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('receive_message', aiMsg);
    if (io) io.to(String(roomId)).emit('ai_memo_updated', preferences);

    res.json({ success: true, message: aiMsg, preferences });
  } catch (error) {
    console.log('정리 승인 에러:', error.message);
    res.status(500).json({ success: false, message: '승인 처리 중 오류가 발생했습니다.' });
  }
});

// ── 일정 확정 + AI 동선 최적화 ────────────────────────────────
router.post('/chat-rooms/:roomId/ai-itinerary', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { spots } = req.body; // [{ time, place, detail, photoUrl }]

  if (!spots || spots.length === 0) {
    return res.status(400).json({ success: false, message: '일정 항목이 없습니다.' });
  }

  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('posts(days, destination)')
      .eq('id', roomId)
      .single();

    const roomInfo = {
      days: room?.posts?.days,
      destination: room?.posts?.destination,
    };

    // Gemini 동선 최적화
    const itinerary = await optimizeItinerary(spots, roomInfo);

    // messages 저장
    const { data: savedMsg } = await supabase
      .from('messages')
      .insert({
        chat_room_id: roomId,
        user_id: req.user.userId,
        content: JSON.stringify(itinerary),
        type: 'ai_itinerary',
      })
      .select()
      .single();

    const aiMsg = {
      id: String(savedMsg.id),
      type: 'ai_itinerary',
      data: itinerary,
    };

    // 브로드캐스트
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('receive_message', aiMsg);

    scheduleConfirmedAlarm(roomId,req.user.userId)
    res.json({ success: true, message: aiMsg });
  } catch (error) {
    console.log('일정 확정 에러:', error.message);
    res.status(500).json({ success: false, message: '일정 생성 중 오류가 발생했습니다.' });
  }
});

//fcm으로 일정 확정 알람 보내기
  const scheduleConfirmedAlarm = async (roomId,senderId) => {
    let usersFcmTokens = []
    try{
        let {data , error} = await supabase
            .from('chat_members')
            .select('user_id,users(fcm_token)')
            .eq('chat_room_id',roomId);
        console.log("data : "+ JSON.stringify(data))
        for(let i=0 ; i<data.length ; i++){
            //메세지 송신자는 안보냄
            if(data[i].user_id == senderId){
                console.log(data[i].user_id+ "이 아이디는 송신자입니다.");
                continue;
            }
            console.log(i + "번째 token 발송 : ",data[i].users.fcm_token)
            const res = await admin.messaging().send({
                token : data[i].users.fcm_token,

                notification : {
                    title : '메세지 알람',
                    body : '채팅방에 일정확정이 완료되었습니다.'
                },

                android: {
                    priority: 'high'
                },

                data : {
                    type : 'new-message'
                }
            });
            console.log("일정 확정 알람 보내기 완료: "+ res)
        }
    }catch(error){
        console.log("error : "+ error)
    }

  }


// ── 승인된 메모 저장 ──────────────────────────────────────────
router.post('/chat-rooms/:roomId/ai-memo-approve', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { extracted } = req.body; // [{text, category, replaces}]

  try {
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('ai_preferences')
      .eq('id', roomId)
      .single();

    let updated = [...(room.ai_preferences || [])];

    for (const item of extracted) {
      // 교체할 항목 제거
      if (item.replaces) {
        updated = updated.filter(p => p.text !== item.replaces);
      }
      // 새 항목 추가
      updated.push({
        text: item.text,
        category: item.category,
        addedAt: new Date().toISOString(),
      });
    }

    await supabase
      .from('chat_rooms')
      .update({ ai_preferences: updated })
      .eq('id', roomId);

    // 소켓으로 태그 업데이트 알림
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('ai_memo_updated', updated);

    res.json({ success: true, preferences: updated });
  } catch (error) {
    console.log('메모 승인 에러:', error.message);
    res.status(500).json({ success: false, message: '승인 처리 중 오류가 발생했습니다.' });
  }
});

// 친구 초대
router.post('/chat-rooms/:roomId/invite', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;

  try {
    // 채팅방 + 정원 조회
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('id, posts(max_people)')
      .eq('id', roomId)
      .single();

    if (!room) return res.status(404).json({ success: false, message: '채팅방 없음' });

    // 현재 인원 조회
    const { count } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId);

    const maxPeople = room.posts?.max_people || 999;
    if (count >= maxPeople) {
      return res.status(400).json({ success: false, message: '정원이 가득 찼습니다.' });
    }

    // 이미 참여 중인지 확인
    const { data: existing } = await supabase
      .from('chat_members')
      .select('id')
      .eq('chat_room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      return res.status(400).json({ success: false, message: '이미 참여 중인 멤버입니다.' });
    }

    // 초대할 친구 정보 조회
    const { data: invitedUser } = await supabase
      .from('users')
      .select('nickname, name, fcm_token')
      .eq('id', userId)
      .single();

    // 초대한 사람 정보 조회
    const { data: inviter } = await supabase
      .from('users')
      .select('nickname, name')
      .eq('id', req.user.userId)
      .single();

    // 채팅방 참여
    await supabase
      .from('chat_members')
      .insert({ chat_room_id: roomId, user_id: userId });

    const invitedName = invitedUser?.nickname || invitedUser?.name || '누군가';
    const inviterName = inviter?.nickname || inviter?.name || '누군가';

    // 시스템 메시지 브로드캐스트
    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('receive_message', {
      id: `system-invite-${Date.now()}`,
      type: 'system',
      text: `${inviterName}님이 ${invitedName}님을 초대했습니다.`,
    });

    // FCM 푸시 알림 (비동기)
    try {
      if (invitedUser?.fcm_token) {
        await admin.messaging().send({
          token: invitedUser.fcm_token,
          notification: {
            title: '여행 초대',
            body: `${inviterName}님이 채팅방에 초대했습니다.`,
          },
          android: { priority: 'high' },
          data: { type: 'invite' },
        });
      }
    } catch (pushErr) {
      console.error('초대 푸시 실패:', pushErr.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.log('친구 초대 에러:', error.message);
    res.status(500).json({ success: false, message: '초대 실패' });
  }
});

// 투표하기
router.post('/chat-rooms/:roomId/itinerary/:messageId/vote', authMiddleware, async (req, res) => {
  console.log('userId 타입:', typeof req.user.userId, '값:', req.user.userId); //test
  console.log('messageId:', req.params.messageId, typeof req.params.messageId);
  console.log('vote:', req.body.vote);

  const { roomId, messageId } = req.params;
  const { vote } = req.body; // 'agree' | 'disagree'

  try {
    // 마감 여부 확인
    const { data: msg, error: msgError } = await supabase
      .from('messages')
      .select('vote_closed, vote_expires_at, content')
      .eq('id', messageId)
      .single();

    if (msgError) {
      console.log('msg 조회 에러:', msgError.message);
      return res.status(500).json({ success: false, message: 'msg 조회 실패' });
    }
    if (!msg) {
      return res.status(404).json({ success: false, message: '메시지 없음' });
    }

    console.log('msg 조회 성공:', msg?.vote_closed, msg?.vote_expires_at);


    console.log('msg 조회 결과:', msg, 'error:', msgError);
    if (msg.vote_closed) {
      return res.status(400).json({ success: false, message: '이미 마감된 투표예요.' });
    }

    if (msg.vote_expires_at && new Date() > new Date(msg.vote_expires_at)) {
      // 만료 시 자동 마감
      await supabase.from('messages').update({ vote_closed: true }).eq('id', messageId);
      return res.status(400).json({ success: false, message: '투표 기간이 만료됐어요.' });
    }

    // 중복 투표 방지
    const { data: existing } = await supabase
      .from('itinerary_votes')
      .select('id')
      .eq('message_id', Number(messageId))
      .eq('user_id', req.user.userId)
      .maybeSingle();

    console.log('existing:', existing, 'existingError:', existingError?.message);

    if (existing) {
      return res.status(400).json({ success: false, message: '이미 투표했어요.' });
    }

    // 투표 저장
    const { data: insertData, error: insertError } = await supabase
      .from('itinerary_votes')
      .insert({
        message_id: Number(messageId),   // ← Number() 추가
        user_id: req.user.userId,
        vote,
      });

    console.log('insert 결과:', insertData, 'insertError:', insertError?.message);

    // 전체 멤버 수 조회
    const { count: totalMembers } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId);

    console.log('totalMembers:', totalMembers);

    // 현재 투표 집계
    const { data: votes } = await supabase
      .from('itinerary_votes')
      .select('vote')
      .eq('message_id', messageId);

    const agreeCount = votes.filter(v => v.vote === 'agree').length;
    const disagreeCount = votes.filter(v => v.vote === 'disagree').length;
    const majority = Math.floor(totalMembers / 2) + 1;

    const io = req.app.get('io');

    // 과반수 찬성 → 자동 확정
    if (agreeCount >= majority) {
      await supabase.from('messages')
        .update({ vote_closed: true, vote_closed_at: new Date() })
        .eq('id', messageId);

      const itinerary = JSON.parse(msg.content);

      // 확정 시스템 메시지
      if (io) io.to(String(roomId)).emit('receive_message', {
        id: `system-confirmed-${Date.now()}`,
        type: 'system',
        text: `🎉 일정이 확정됐습니다! (${agreeCount}/${totalMembers}명 찬성)`,
      });

      // 확정 카드 브로드캐스트
      const { data: confirmedMsg, error: confirmError } = await supabase
        .from('messages')
        .insert({
          chat_room_id: roomId,
          user_id: req.user.userId,
          content: JSON.stringify(JSON.parse(msg.content)),
          type: 'ai_itinerary_confirmed',
        })
        .select()
        .single();

      console.log('confirmedMsg:', confirmedMsg, 'confirmError:', confirmError?.message);

      if (!confirmedMsg) {
        console.log('확정 카드 저장 실패');
        return res.json({ success: true, confirmed: true, agreeCount, disagreeCount, totalMembers });
      }


      if (io) io.to(String(roomId)).emit('receive_message', {
        id: String(confirmedMsg.id),
        type: 'ai_itinerary_confirmed',
        data: itinerary,
      });

      return res.json({
        success: true,
        confirmed: true,
        agreeCount,
        disagreeCount,
        totalMembers,
      });
    }

    // 투표 현황 실시간 브로드캐스트
    if (io) io.to(String(roomId)).emit('vote_updated', {
      messageId,
      agreeCount,
      disagreeCount,
      totalMembers,
    });

    res.json({ success: true, confirmed: false, agreeCount, disagreeCount, totalMembers });
  } catch (error) {
    console.log('투표 에러:', error.message);
    res.status(500).json({ success: false, message: '투표 처리 중 오류가 발생했습니다.' });
  }
});

// 방장 강제 마감
router.post('/chat-rooms/:roomId/itinerary/:messageId/close', authMiddleware, async (req, res) => {
  const { roomId, messageId } = req.params;

  try {
    // 방장 확인 (chat_rooms → posts → user_id)
    const { data: room } = await supabase
      .from('chat_rooms')
      .select('posts(user_id)')
      .eq('id', roomId)
      .single();

    if (room.posts.user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: '방장만 마감할 수 있어요.' });
    }

    await supabase.from('messages')
      .update({ vote_closed: true, vote_closed_at: new Date() })
      .eq('id', messageId);

    // 집계
    const { data: votes } = await supabase
      .from('itinerary_votes')
      .select('vote')
      .eq('message_id', messageId);

    const agreeCount = votes.filter(v => v.vote === 'agree').length;
    const disagreeCount = votes.filter(v => v.vote === 'disagree').length;

    const { count: totalMembers } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId);

    const io = req.app.get('io');
    if (io) io.to(String(roomId)).emit('vote_updated', {
      messageId, agreeCount, disagreeCount, totalMembers, closed: true,
    });

    if (io) io.to(String(roomId)).emit('receive_message', {
      id: `system-close-${Date.now()}`,
      type: 'system',
      text: `방장이 투표를 마감했습니다. (찬성 ${agreeCount} / 반대 ${disagreeCount})`,
    });

    res.json({ success: true, agreeCount, disagreeCount });
  } catch (error) {
    console.log('마감 에러:', error.message);
    res.status(500).json({ success: false, message: '마감 처리 중 오류가 발생했습니다.' });
  }
});

// 투표 현황 조회
router.get('/chat-rooms/:roomId/itinerary/:messageId/votes', authMiddleware, async (req, res) => {
  const { messageId, roomId } = req.params;

  try {
    const { data: votes } = await supabase
      .from('itinerary_votes')
      .select('vote, user_id')
      .eq('message_id', messageId);

    const { data: msg } = await supabase
      .from('messages')
      .select('vote_closed, vote_expires_at')
      .eq('id', messageId)
      .single();

    const { count: totalMembers } = await supabase
      .from('chat_members')
      .select('*', { count: 'exact', head: true })
      .eq('chat_room_id', roomId);

    const agreeCount = votes.filter(v => v.vote === 'agree').length;
    const disagreeCount = votes.filter(v => v.vote === 'disagree').length;
    const myVote = votes.find(v => v.user_id === req.user.userId)?.vote || null;

    res.json({
      success: true,
      agreeCount,
      disagreeCount,
      totalMembers,
      myVote,
      closed: msg.vote_closed,
      expiresAt: msg.vote_expires_at,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: '조회 실패' });
  }
});


module.exports = router;