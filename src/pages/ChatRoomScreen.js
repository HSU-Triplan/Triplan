import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, StyleSheet,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InputBar from '../components/InputBar';
import AIMessageCard from '../components/AIMessageCard';
import { io } from 'socket.io-client';

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, title, destination, days, departure_date, bio, max_people } = route.params;

  const [messages, setMessages] = useState([
    { id: '1', type: 'system', text: '채팅방에 입장했습니다.' }
  ]);
  const [isAIMode, setIsAIMode] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isMemberVisible, setIsMemberVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [editPlan, setEditPlan] = useState([]);
  const [newPlanItem, setNewPlanItem] = useState({ time: '', place: '', detail: '' });
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editingId, setEditingId] = useState(null);
  const socketRef = useRef(null);
  const [myUserId, setMyUserId] = useState(null);
  const flatListRef = useRef(null);
  const [aiPreferences, setAiPreferences] = useState([]); // [{text, category, addedAt}]
  const [isAILoading, setIsAILoading] = useState(false);  // AI 처리 중 로딩

  // 멤버 불러오기
  const fetchMembers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) setMembers(result.members);
    } catch (error) {
      console.log('멤버 조회 에러:', error);
    }
  };

  // AI 선호사항 불러오기
  const fetchAiPreferences = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-preference`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAiPreferences(data.preferences);
    } catch (error) {
      console.log('선호사항 조회 에러:', error);
    }
  };

  const handleLeaveRoom = () => {
    Alert.alert('채팅방 나가기', '채팅방을 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/leave`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) navigation.goBack();
            else Alert.alert('오류', result.message);
          } catch (error) {
            console.log('나가기 에러:', error);
          }
        },
      },
    ]);
  };

  const handleBackToList = () => navigation.goBack();

  useEffect(() => {
    const init = async () => {
      const token = await AsyncStorage.getItem('token');

      // 내 userId
      const meRes = await fetch('http://10.0.2.2:3000/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) setMyUserId(meData.user.id);

      // 기존 메시지
      const msgRes = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = await msgRes.json();
      if (msgData.success && msgData.messages.length > 0) {
        const loaded = msgData.messages.map(m => ({
          id: String(m.id),
          type: m.type || 'text',
          text: m.content,
          senderId: m.user_id,
          senderName: m.users?.nickname || m.users?.name,
          senderImage: m.users?.profile_image,
        }));
        setMessages(loaded);
      }

      // AI 선호사항
      fetchAiPreferences();

      // 소켓 연결
      const socket = io('http://10.0.2.2:3000');
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_room', String(roomId));
      });

      socket.on('receive_message', (data) => {
        if (data.senderId === meData.user?.id) return;
          setMessages(prev => {
            if (prev.some(m => m.id === data.id)) return prev; // 중복 id 방지
            return [...prev, data];
          });        // AI 선호사항 태그도 실시간 업데이트
        if (data.type === 'ai_preference' || data.type === 'ai_recommend') {
          fetchAiPreferences();
        }
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      });

      fetchMembers();
    };

    init();
    return () => socketRef.current?.disconnect();
  }, []);

  // ── 여행지 추천받기 ─────────────────────────────────────────
  const handleAiRecommend = async () => {
    if (isAILoading) return;

    if (aiPreferences.length === 0) {
      Alert.alert(
        '선호사항을 먼저 입력해주세요',
        '@ 버튼을 눌러 여행 스타일을 알려주세요!\n예) @맛집위주, @예산30만원, @온천'
      );
      return;
    }

    Alert.alert(
      '✈️ 여행지 추천받기',
      `현재 선호사항: ${aiPreferences.map(p => p.text).join(', ')}\n\nAI가 여행지 3곳을 추천해드릴까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추천받기',
          onPress: async () => {
            setIsAILoading(true);

            // 로딩 메시지 임시 표시
            const loadingId = 'ai-loading-' + Date.now();
            setMessages(prev => [...prev, {
              id: loadingId,
              type: 'ai_loading',
              text: 'AI가 여행지를 고르는 중...',
            }]);
            flatListRef.current?.scrollToEnd({ animated: true });

            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-recommend`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();

              // 로딩 메시지 제거 후 결과 추가
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingId);
                if (data.success) {
                  return [...filtered, data.message];
                }
                return filtered;
              });
            } catch (error) {
              console.log('AI 추천 에러:', error);
              setMessages(prev => prev.filter(m => m.id !== loadingId));
              Alert.alert('오류', 'AI 추천 중 문제가 발생했습니다.');
            } finally {
              setIsAILoading(false);
              requestAnimationFrame(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              });
            }
          },
        },
      ]
    );
  };

  // ── 메시지 전송 ─────────────────────────────────────────────
  const sendMessage = async (text) => {
    // AI 모드: @ 선호사항 처리
    if (isAIMode) {
      const cleanText = text.replace(/^@/, '').trim(); // 앞의 @ 제거
      if (!cleanText) {
        setIsAIMode(false);
        return;
      }

      setIsAILoading(true);
      setIsAIMode(false);

      // 사용자 입력 말풍선 먼저 표시
      const userMsg = {
        id: 'user-ai-' + Date.now(),
        type: 'text',
        text: `@${cleanText}`,
        senderId: myUserId,
      };
      setMessages(prev => [...prev, userMsg]);

      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-preference`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text: cleanText }),
        });
        const data = await res.json();

        if (data.success) {
          // 태그 업데이트
          setAiPreferences(data.preferences);

          // AI 확인 메시지 채팅창에 추가
          setMessages(prev => [...prev, data.aiMessage]);

          // 소켓으로 다른 멤버에게도 전파 일단 브로드 캐스팅 어차피 안함.
//          socketRef.current?.emit('send_message', {
//            ...data.aiMessage,
//            roomId: String(roomId),
//          });
        }
      } catch (error) {
        console.log('AI 선호사항 처리 에러:', error);
        Alert.alert('오류', 'AI 처리 중 문제가 발생했습니다.');
      } finally {
        setIsAILoading(false);
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      }
      return;
    }

    // 일반 메시지
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: text }),
      });
      const result = await response.json();

      if (result.success) {
        const msg = {
          id: String(result.message.id),
          type: 'text',
          text,
          senderId: myUserId,
          senderName: result.message.users?.nickname || result.message.users?.name,
          senderImage: result.message.users?.profile_image,
        };
        setMessages(prev => [...prev, msg]);
        socketRef.current?.emit('send_message', { ...msg, roomId: String(roomId) });
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        });
      }
    } catch (error) {
      console.log('메시지 전송 에러:', error);
    }
  };

  // ── 헤더 ────────────────────────────────────────────────────
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: title,
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10, gap: 16 }}>
          <TouchableOpacity onPress={() => { fetchMembers(); setIsMemberVisible(true); }}>
            <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>멤버</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal}>
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>일정</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLeaveRoom}>
            <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>나가기</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, selectedSchedule]);

  const openEditModal = () => {
    setEditingId(selectedSchedule?.id || null);
    setEditTitle(selectedSchedule?.title || '');
    setEditDescription(selectedSchedule?.summary || '');
    setEditPlan(selectedSchedule?.plan || []);
    setIsModalVisible(true);
  };

  const saveEdit = () => {
    setSelectedSchedule({
      id: editingId || Date.now().toString(),
      title: editTitle,
      summary: editDescription,
      plan: editPlan,
    });
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* 여행 정보 헤더 */}
      <View style={styles.tripInfo}>
        <Text style={styles.tripBio}>{bio}</Text>
        <View style={styles.tripTags}>
          <Text style={styles.tag}>📍 {destination}</Text>
          <Text style={styles.tag}>🗓 {days}박{Number(days)+1}일</Text>
          {departure_date ? <Text style={styles.tag}>🛫 {departure_date}</Text> : null}
          <Text style={styles.tag}>👥 최대 {max_people}명</Text>
        </View>
      </View>

      {/* ── AI 선호사항 태그 영역 ── */}
      {aiPreferences.length > 0 && (
        <View style={styles.aiTagsContainer}>
          <Text style={styles.aiTagsLabel}>🤖 AI 메모</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.aiTagsRow}>
              {aiPreferences.map((pref, idx) => (
                <View key={idx} style={styles.aiTag}>
                  <Text style={styles.aiTagText}>@ {pref.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* 메시지 목록 */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messageList}
        renderItem={({ item }) => (
          <MessageItem
            message={item}
            myUserId={myUserId}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
          />
        )}
      />

      {/* 여행지 추천받기 버튼 */}
      <TouchableOpacity
        style={[styles.recommendButton, isAILoading && styles.recommendButtonDisabled]}
        onPress={handleAiRecommend}
        disabled={isAILoading}>
        {isAILoading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.recommendButtonText}>✈️ 여행지 추천받기</Text>
        )}
      </TouchableOpacity>

      {/* 목록으로 버튼 */}
      <TouchableOpacity style={styles.backToListButton} onPress={handleBackToList}>
        <Text style={styles.backToListText}>← 목록으로</Text>
      </TouchableOpacity>

      <InputBar
        onSend={sendMessage}
        isAIMode={isAIMode}
        setIsAIMode={setIsAIMode}
      />

      {/* 멤버 모달 */}
      <Modal
        visible={isMemberVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsMemberVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMemberVisible(false)}>
          <TouchableOpacity style={styles.memberBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>참여 중인 멤버 ({members.length})</Text>
            {members.map((m, idx) => (
              <View key={idx} style={styles.memberItem}>
                <Image
                  source={{ uri: m.users?.profile_image || 'https://via.placeholder.com/40' }}
                  style={styles.memberAvatar}
                />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.memberName}>{m.users?.nickname || m.users?.name}</Text>
                    {m.users?.id === myUserId && (
                      <View style={{ backgroundColor: '#4A90E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>나</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.memberType}>{m.users?.travel_type ?? '성향 미설정'}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setIsMemberVisible(false)}>
              <Text style={styles.closeButtonText}>닫기</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 일정 수정 모달 */}
      <Modal visible={isModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.editBox}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>일정 수정</Text>
              <TextInput value={editTitle} onChangeText={setEditTitle} placeholder="제목" style={styles.editInput} />
              <TextInput value={editDescription} onChangeText={setEditDescription} placeholder="전체 설명" style={styles.editInput} />
              <Text style={styles.editSectionTitle}>일정 추가</Text>
              <TextInput value={newPlanItem.time} onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, time: t }))} placeholder="시간" style={styles.editInput} />
              <TextInput value={newPlanItem.place} onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, place: t }))} placeholder="장소" style={styles.editInput} />
              <TextInput value={newPlanItem.detail} onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, detail: t }))} placeholder="상세 내용" style={styles.editInput} />
              <TouchableOpacity onPress={() => {
                if (!newPlanItem.time && !newPlanItem.place) return;
                setEditPlan(prev => [...prev, { ...newPlanItem }]);
                setNewPlanItem({ time: '', place: '', detail: '' });
              }}>
                <Text style={styles.addButton}>+ 추가하기</Text>
              </TouchableOpacity>
              {editPlan.map((p, idx) => (
                <View key={idx} style={styles.planItem}>
                  <TextInput value={p.time} onChangeText={(t) => { const n = [...editPlan]; n[idx].time = t; setEditPlan(n); }} placeholder="시간" style={styles.editInput} />
                  <TextInput value={p.place} onChangeText={(t) => { const n = [...editPlan]; n[idx].place = t; setEditPlan(n); }} placeholder="장소" style={styles.editInput} />
                  <TextInput value={p.detail} onChangeText={(t) => { const n = [...editPlan]; n[idx].detail = t; setEditPlan(n); }} placeholder="상세 내용" style={styles.editInput} />
                </View>
              ))}
              <View style={styles.modalButtons}>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButton}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={saveEdit}>
                  <Text style={styles.saveButton}>저장</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ── 메시지 아이템 ─────────────────────────────────────────────
const MessageItem = ({ message, myUserId, selectedSchedule, setSelectedSchedule }) => {

  // AI 로딩
  if (message.type === 'ai_loading') {
    return (
      <View style={aiStyles.loadingWrap}>
        <View style={aiStyles.loadingBubble}>
          <ActivityIndicator size="small" color="#6C5CE7" style={{ marginRight: 8 }} />
          <Text style={aiStyles.loadingText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // AI 선호사항 확인 메시지
  if (message.type === 'ai_preference') {
    return (
      <View style={aiStyles.prefWrap}>
        <View style={aiStyles.prefBubble}>
          <Text style={aiStyles.prefIcon}>🤖</Text>
          <Text style={aiStyles.prefText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // AI 여행지 추천 결과
  if (message.type === 'ai_recommend') {
    return (
      <View style={aiStyles.recommendWrap}>
        <View style={aiStyles.recommendBubble}>
          <Text style={aiStyles.recommendText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  // 기존 AI 카드 (더미)
  if (message.type === 'ai') {
    return (
      <View style={{ marginVertical: 10 }}>
        <Text style={{ alignSelf: 'center', fontSize: 12, color: '#6C5CE7', marginBottom: 5 }}>AI 추천</Text>
        <AIMessageCard
          data={message.data}
          selectedSchedule={selectedSchedule}
          setSelectedSchedule={setSelectedSchedule}
        />
      </View>
    );
  }

  if (message.type === 'system') {
    return (
      <Text style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginVertical: 8 }}>
        {message.text}
      </Text>
    );
  }

  const isMe = message.senderId === myUserId;

  return (
    <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginHorizontal: 12, marginVertical: 4 }}>
      {!isMe && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Image
            source={{ uri: message.senderImage || 'https://via.placeholder.com/30' }}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd' }}
          />
          <View>
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{message.senderName}</Text>
            <View style={{ backgroundColor: '#fff', padding: 10, borderRadius: 12, maxWidth: 220, elevation: 1 }}>
              <Text>{message.text}</Text>
            </View>
          </View>
        </View>
      )}
      {isMe && (
        <View style={{ backgroundColor: '#FEE500', padding: 10, borderRadius: 12, maxWidth: 220 }}>
          <Text>{message.text}</Text>
        </View>
      )}
    </View>
  );
};

// ── AI 메시지 스타일 ──────────────────────────────────────────
const aiStyles = StyleSheet.create({
  loadingWrap: { alignItems: 'flex-start', marginHorizontal: 12, marginVertical: 6 },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F0EEFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, borderWidth: 1, borderColor: '#C9B8FF',
  },
  loadingText: { fontSize: 13, color: '#6C5CE7' },

  prefWrap: { alignItems: 'flex-start', marginHorizontal: 12, marginVertical: 4 },
  prefBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0EEFF', paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 16, maxWidth: 260,
  },
  prefIcon: { fontSize: 16 },
  prefText: { fontSize: 13, color: '#5A4FCF', fontWeight: '600', flexShrink: 1 },

  recommendWrap: { marginHorizontal: 12, marginVertical: 8 },
  recommendBubble: {
    backgroundColor: '#F0EEFF',
    padding: 16, borderRadius: 16,
    borderWidth: 1, borderColor: '#C9B8FF',
  },
  recommendText: { fontSize: 14, color: '#333', lineHeight: 22 },
});

// ── 메인 스타일 ───────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  tripInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  tripBio: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  tripTags: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  tag: {
    fontSize: 12, color: '#555', backgroundColor: '#f0f0f0',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    marginRight: 6, marginTop: 4,
  },

  // AI 태그 영역
  aiTagsContainer: {
    backgroundColor: '#FAF8FF',
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#E8E0FF',
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  aiTagsLabel: { fontSize: 11, color: '#8B7CF6', fontWeight: 'bold', flexShrink: 0 },
  aiTagsRow: { flexDirection: 'row', gap: 6 },
  aiTag: {
    backgroundColor: '#EDE9FF', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: '#C9B8FF',
  },
  aiTagText: { fontSize: 11, color: '#6C5CE7', fontWeight: '600' },

  messageList: { flex: 1 },

  // 여행지 추천 버튼
  recommendButton: {
    marginHorizontal: 12, marginVertical: 6,
    backgroundColor: '#6C5CE7',
    borderRadius: 12, paddingVertical: 11,
    alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row',
  },
  recommendButtonDisabled: { backgroundColor: '#B0A8D9' },
  recommendButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  backToListButton: {
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1, borderTopColor: '#eee',
  },
  backToListText: { fontSize: 14, color: '#4A90E2', fontWeight: 'bold' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end',
  },
  memberBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee',
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd' },
  memberName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  memberType: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  closeButton: {
    backgroundColor: '#4A90E2', borderRadius: 10,
    paddingVertical: 12, alignItems: 'center', marginTop: 16,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  editBox: {
    backgroundColor: '#fff', borderRadius: 12,
    margin: 20, padding: 20, maxHeight: '85%',
  },
  editInput: {
    borderBottomWidth: 1, borderBottomColor: '#eee',
    marginBottom: 12, fontSize: 15, paddingVertical: 6,
  },
  editSectionTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 8, marginTop: 8 },
  planItem: { marginBottom: 12, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8 },
  addButton: { color: '#007AFF', fontWeight: 'bold', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { fontSize: 15, color: '#aaa' },
  saveButton: { fontSize: 15, color: '#007AFF', fontWeight: 'bold' },
});
