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
import SummaryModal from '../components/SummaryModal';
import AISummaryCard from '../components/AISummaryCard';

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, title, destination, days, departure_date, bio, max_people } = route.params;

  const [messages, setMessages] = useState([
    { id: '1', type: 'system', text: '채팅방에 입장했습니다.' }
  ]);
//  const [isAIMode, setIsAIMode] = useState(false);
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
  const [pendingSpots, setPendingSpots] = useState([]);
  const [isAddMemoVisible, setIsAddMemoVisible] = useState(false);
  const [manualMemoInput, setManualMemoInput] = useState('');
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

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


  // 1. 태그 삭제 함수
  const handleDeletePreference = (pref) => {
    Alert.alert(
      '선호사항 삭제',
      `"${pref.text}" 를 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(
                `http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-preference`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({ text: pref.text }),
                }
              );
              const data = await res.json();
              if (data.success) setAiPreferences(data.preferences);
            } catch (error) {
              console.log('선호사항 삭제 에러:', error);
            }
          },
        },
      ]
    );
  };

//  // 자동 분석 함수
//  const analyzeConversation = async (batch) => {
//    if (batch.length === 0 || isAutoMemoLoading) return;
//    setIsAutoMemoLoading(true);
//    try {
//      const token = await AsyncStorage.getItem('token');
//      await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-auto-memo`, {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//        body: JSON.stringify({ messages: batch }),
//      });
//    } catch (error) {
//      console.log('자동 메모 분석 에러:', error);
//    } finally {
//      setIsAutoMemoLoading(false);
//    }
//  };
//
//  const triggerAutoAIAnalysis = (message) => {
//    const triggered = shouldTriggerAI(message.text);
//    console.log('[AutoMemo] 스캔: ' + message.text + ' → 트리거: ' + String(triggered));
//    if (!triggered) return;
//
//    pendingMessagesRef.current.push({
//      senderName: message.senderName || '나',
//      text: message.text,
//    });
//
//    console.log('[AutoMemo] 버퍼 누적: ' + pendingMessagesRef.current.length + '개, 30초 타이머 시작');
//
//    if (debounceRef.current) clearTimeout(debounceRef.current);
//
//    debounceRef.current = setTimeout(() => {
//      const batch = [...pendingMessagesRef.current];
//      pendingMessagesRef.current = [];
//      console.log('[AutoMemo] 타이머 발동! ' + batch.length + '개 분석 시작');
//      if (batch.length > 0) analyzeConversation(batch);
//    }, 30000);
//  };

  // 수동 메모 추가 함수
  const handleManualAddMemo = async () => {
    if (!manualMemoInput.trim()) return;
    setIsAddMemoVisible(false);
    setManualMemoInput('');
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: manualMemoInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAiPreferences(data.preferences);
        setMessages(prev => [...prev, data.aiMessage]);
      }
    } catch (error) {
      console.log('수동 메모 추가 에러:', error);
    } finally {
      setManualMemoInput('');
      setIsAddMemoVisible(false);
    }
  };

//  //승인 함수
//  const handleApproveAutoMemo = async (extracted, messageId) => {
//    try {
//      const token = await AsyncStorage.getItem('token');
//      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-memo-approve`, {
//        method: 'POST',
//        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
//        body: JSON.stringify({ extracted }),
//      });
//      const data = await res.json();
//      if (data.success) {
//        setAiPreferences(data.preferences);
//        // 승인 카드를 approved 상태로 변경
//        setMessages(prev =>
//          prev.map(m => m.id === messageId ? { ...m, type: 'ai_memo_approved' } : m)
//        );
//      }
//    } catch (error) {
//      console.log('메모 승인 에러:', error);
//    }
//  };
//
//  const handleRejectAutoMemo = (messageId) => {
//    setMessages(prev =>
//      prev.map(m => m.id === messageId ? { ...m, type: 'ai_memo_rejected' } : m)
//    );
//  };


  // 정리하기 함수 추가 ────────────────────────────────────
  const handleSummarize = async () => {
    if (isSummaryLoading) return;

    const textMessages = messages.filter(m => m.type === 'text');
    if (textMessages.length < 3) {
      Alert.alert('대화가 부족해요', '분석하려면 대화가 3개 이상 필요해요.');
      return;
    }

    setIsSummaryLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setSummaryData(data.summary);
        setIsSummaryVisible(true);
      } else {
        Alert.alert('알림', data.message || '정리할 내용이 없어요.');
      }
    } catch (error) {
      console.log('정리하기 에러:', error);
      Alert.alert('오류', '정리 중 문제가 발생했습니다.');
    } finally {
      setIsSummaryLoading(false);
    }
  };

  // 승인 함수 추가 ────────────────────────────────────────
  const handleSummaryApprove = async (editedSummary) => {
    setIsSummaryVisible(false);
    setSummaryData(null);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-summarize-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary: editedSummary }),
      });
      const data = await res.json();
      if (data.success) {
        setAiPreferences(data.preferences);
      }
    } catch (error) {
      console.log('정리 승인 에러:', error);
    }
  };
// 일정추가
  const addSpotToSchedule = (spotItem) => {
    setPendingSpots(prev => [...prev, spotItem]);
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
      const msgRes = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/messages`,
      {
        headers: { Authorization: `Bearer ${token}` },
      });
      const msgData = await msgRes.json();
      if (msgData.success && msgData.messages.length > 0) {
        const loaded = msgData.messages.map(m => {
          const base = {
            id: String(m.id),
            type: m.type || 'text',
            text: m.content,
            senderId: m.user_id,
            senderName: m.users?.nickname || m.users?.name,
            senderImage: m.users?.profile_image,
          };


//          if (m.type === 'ai_memo_pending') {
//            try { base.extracted = JSON.parse(m.content); }
//            catch { base.extracted = []; }
//          }

          if (m.type === 'ai_recommend') {
            try { base.data = JSON.parse(m.content); }
            catch { base.data = null; }
          }
          if (m.type === 'ai_summary') {
            try { base.data = JSON.parse(m.content); }
            catch { base.data = null; }
          }

          return base;
        });
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
        console.log(`[Socket] 메시지 수신: type=${data.type}, id=${data.id}`);
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
      socket.on('ai_memo_updated', (newPreferences) => {
        setAiPreferences(newPreferences);
      });

      fetchMembers();
    };

    init();
    return () => socketRef.current?.disconnect();
  }, []);

  // ── 여행지 추천받기 ─────────────────────────────────────────
  const handleAiRecommend = async () => {
    if (isAILoading) return;

    // ── 필수 요소 체크 ──────────────────────────────────────────
    const missing = [];
    if (!destination) missing.push('여행지(@ 또는 게시글 설정)');
    if (!days) missing.push('여행 일수(몇박몇일)');

    if (missing.length > 0) {
      Alert.alert(
        '필수 정보가 부족해요',
        `AI 추천을 받으려면 아래 정보가 필요해요:\n\n${missing.map(m => `• ${m}`).join('\n')}\n\n@ 버튼으로 선호사항을 추가해주세요!\n예) @3박4일, @도쿄`
      );
      return;
    }

    if (aiPreferences.length === 0) {
      Alert.alert(
        '선호사항을 먼저 입력해주세요',
        '@ 버튼을 눌러 여행 스타일을 알려주세요!\n예) @맛집위주, @예산30만원, @온천'
      );
      return;
    }

    // ── 추천 시작 ───────────────────────────────────────────────
    Alert.alert(
      '✈️ 여행지 추천받기',
      `현재 선호사항: ${aiPreferences.map(p => p.text).join(', ')}\n\nAI가 여행지 3곳을 추천해드릴까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추천받기',
          onPress: async () => {
            setIsAILoading(true);

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

              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingId);
                if (data.success) return [...filtered, data.message];
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
//        triggerAutoAIAnalysis(msg);
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
    setEditPlan([...(selectedSchedule?.plan || []), ...pendingSpots]);
    setIsModalVisible(true);
  };

  const saveEdit = () => {
    setSelectedSchedule({
      id: editingId || Date.now().toString(),
      title: editTitle,
      summary: editDescription,
      plan: editPlan,
    });
    setPendingSpots([]);
    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* 여행 정보 헤더 */}
      <View style={styles.tripInfo}>
        <Text style={styles.tripBio}>{bio}</Text>
        <View style={styles.tripTags}>
          <Text style={styles.tag}>📍 {destination}</Text>
          <Text style={styles.tag}>
            🗓 {String(days).includes('박') ? days : `${days}박${Number(days)+1}일`}
          </Text>
          {departure_date ? <Text style={styles.tag}>🛫 {departure_date}</Text> : null}
          {max_people ? <Text style={styles.tag}>👥 최대 {max_people}명</Text> : null}
        </View>
      </View>

      {/* ── AI 선호사항 태그 영역 ── */}
      {(aiPreferences.length > 0 || true) && (
        <View style={styles.aiTagsContainer}>
          <Text style={styles.aiTagsLabel}>🤖 AI 메모</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.aiTagsRow}>
              {aiPreferences.map((pref, idx) => (
                <View key={idx} style={styles.aiTag}>
                  <Text style={styles.aiTagText}>@ {pref.text}</Text>
                  <TouchableOpacity
                    onPress={() => handleDeletePreference(pref)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                    <Text style={styles.aiTagDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
          {/* + 버튼 */}
          <TouchableOpacity
            style={styles.aiTagAddBtn}
            onPress={() => setIsAddMemoVisible(true)}>
            <Text style={styles.aiTagAddBtnText}>＋</Text>
          </TouchableOpacity>
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
            onAddSpotToSchedule={addSpotToSchedule}
//            onApproveAutoMemo={handleApproveAutoMemo}
//            onRejectAutoMemo={handleRejectAutoMemo}
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
      <TouchableOpacity
        style={[styles.summarizeButton, isSummaryLoading && styles.summarizeButtonDisabled]}
        onPress={handleSummarize}
        disabled={isSummaryLoading}>
        {isSummaryLoading ? (
          <ActivityIndicator size="small" color="#6C5CE7" />
        ) : (
          <Text style={styles.summarizeButtonText}>📋 정리하기</Text>
        )}
      </TouchableOpacity>

      // ── [6] SummaryModal 추가 (기존 Modal들 아래에) ───────────────
      <SummaryModal
        visible={isSummaryVisible}
        summary={summaryData}
        onApprove={handleSummaryApprove}
        onReject={() => { setIsSummaryVisible(false); setSummaryData(null); }}
        onClose={() => { setIsSummaryVisible(false); setSummaryData(null); }}
      />

      <InputBar
        onSend={sendMessage}
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

      <Modal visible={isAddMemoVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.memoModalOverlay}
          activeOpacity={1}
          onPress={() => setIsAddMemoVisible(false)}>
          <TouchableOpacity style={styles.memoModalBox} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.memoModalTitle}>메모 추가</Text>
            <Text style={styles.memoModalSub}>여행 관련 선호사항을 입력해주세요</Text>
            <TextInput
              style={styles.memoModalInput}
              placeholder="예) 맛집위주, 예산 30만원, 온천"
              placeholderTextColor="#aaa"
              value={manualMemoInput}
              onChangeText={setManualMemoInput}
              autoFocus
            />
            <View style={styles.memoModalButtons}>
              <TouchableOpacity onPress={() => { setIsAddMemoVisible(false); setManualMemoInput(''); }}>
                <Text style={styles.memoModalCancel}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.memoModalConfirm} onPress={handleManualAddMemo}>
                <Text style={styles.memoModalConfirmText}>추가</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>


    </SafeAreaView>
  );
}

// ── 메시지 아이템 ─────────────────────────────────────────────
const MessageItem = ({ message, myUserId, selectedSchedule, setSelectedSchedule, onAddSpotToSchedule }) => {


    if (message.type === 'ai_summary') {
      const summaryData = message.data
        ? message.data
        : (() => { try { return JSON.parse(message.text); } catch { return null; } })();
      if (!summaryData) return null;
      return <AISummaryCard data={summaryData} />;
    }

//    if (
//      message.type === 'ai_memo_pending' ||
//      message.type === 'ai_memo_approved' ||
//      message.type === 'ai_memo_rejected'
//    ) {
//      console.log(`[MessageItem] ai_memo 렌더: type=${message.type}, extracted=`, message.extracted);
//      return (
//        <AIMemoApprovalCard
//          message={message}
//          onApprove={onApproveAutoMemo}
//          onReject={onRejectAutoMemo}
//        />
//      );
//    }

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
      // 백엔드에서 data(JSON)로 오는 경우 / 이전 저장된 text(JSON문자열)로 오는 경우 둘 다 처리
      const recData = message.data
        ? message.data
        : (() => { try { return JSON.parse(message.text); } catch { return null; } })();

    if (!recData) {
      return (
        <View style={aiStyles.recommendWrap}>
          <View style={aiStyles.recommendBubble}>
            <Text style={aiStyles.recommendText}>{message.text}</Text>
          </View>
        </View>
      );
    }

    return (
      <AIMessageCard
        data={recData}
        onAddSpotToSchedule={onAddSpotToSchedule}
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiTagDelete: {
    fontSize: 10,
    color: '#9B8FCC',
    fontWeight: 'bold',
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
  aiTagAddBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#6C5CE7',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 6, flexShrink: 0,
  },
  aiTagAddBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },

  // 수동 추가 모달
  memoModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  memoModalBox: {
    backgroundColor: '#fff', borderRadius: 16,
    padding: 24, width: '80%',
  },
  memoModalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  memoModalSub: { fontSize: 12, color: '#888', marginBottom: 16 },
  memoModalInput: {
    borderWidth: 1, borderColor: '#C9B8FF', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#333', marginBottom: 16,
  },
  memoModalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  memoModalCancel: { fontSize: 15, color: '#aaa', paddingVertical: 8 },
  memoModalConfirm: {
    backgroundColor: '#6C5CE7', borderRadius: 10,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  memoModalConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // aiTag X 버튼
  aiTagDelete: { fontSize: 10, color: '#9B8FCC', fontWeight: 'bold' },
  summarizeButton: {
    marginHorizontal: 12, marginVertical: 6,
    borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#6C5CE7',
    backgroundColor: '#FAF8FF',
    flexDirection: 'row',
  },
  summarizeButtonDisabled: { opacity: 0.5 },
  summarizeButtonText: { color: '#6C5CE7', fontSize: 14, fontWeight: 'bold' },
});
