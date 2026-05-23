import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, StyleSheet,
  Image, Alert, ActivityIndicator, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InputBar from '../components/InputBar';
import AIMessageCard from '../components/AIMessageCard';
import { io } from 'socket.io-client';
import SummaryModal from '../components/SummaryModal';
import AISummaryCard from '../components/AISummaryCard';
import AIItineraryCard from '../components/AIItineraryCard';

// 🌟 고급스러운 세계 여행 랜드마크 배경 (경복궁 & 여행 무드)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1546436836-07a91091f160?q=80&w=800&auto=format&fit=crop';

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, title, destination, days, departure_date, bio, max_people } = route.params;

  const [messages, setMessages] = useState([
    { id: '1', type: 'system', text: '채팅방에 입장했습니다.' }
  ]);
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
  const [aiPreferences, setAiPreferences] = useState([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [pendingSpots, setPendingSpots] = useState([]);
  const [isAddMemoVisible, setIsAddMemoVisible] = useState(false);
  const [manualMemoInput, setManualMemoInput] = useState('');
  const [isSummaryVisible, setIsSummaryVisible] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isTripInfoExpanded, setIsTripInfoExpanded] = useState(true);

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

  // 정리하기 함수
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

  // 승인 함수
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

          if (m.type === 'ai_recommend') {
            try { base.data = JSON.parse(m.content); }
            catch { base.data = null; }
          }
          if (m.type === 'ai_itinerary') {
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
          requestAnimationFrame(() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);
          });
      }

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
            if (prev.some(m => m.id === data.id)) return prev;
            return [...prev, data];
          });
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

  const handleAiRecommend = async () => {
    if (isAILoading) return;

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
      }
    } catch (error) {
      console.log('메시지 전송 에러:', error);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: title,
      headerTransparent: true,
      headerTintColor: '#333',
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10, gap: 16 }}>
          <TouchableOpacity onPress={() => { fetchMembers(); setIsMemberVisible(true); }}>
            <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>멤버</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal}>
            <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>일정</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLeaveRoom}>
            <Text style={{ color: '#aaa', fontWeight: 'bold' }}>나가기</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [navigation, selectedSchedule, pendingSpots]);

  const openEditModal = () => {
    setEditingId(selectedSchedule?.id || null);
    setEditTitle(selectedSchedule?.title || '');
    setEditDescription(selectedSchedule?.summary || '');
    setEditPlan([...(selectedSchedule?.plan || []), ...pendingSpots]);
    setIsModalVisible(true);
  };

  const handleConfirmItinerary = async () => {
    if (editPlan.length === 0) {
      Alert.alert('일정이 없어요', '추가된 장소가 없습니다.');
      return;
    }

    setIsModalVisible(false);

    const loadingId = 'itinerary-loading-' + Date.now();
    setMessages(prev => [...prev, {
      id: loadingId,
      type: 'ai_loading',
      text: 'AI가 동선을 최적화하는 중...',
    }]);

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/ai-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spots: editPlan }),
      });
      const data = await res.json();

      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== loadingId);
        if (data.success) return [...filtered, data.message];
        return filtered;
      });

      setPendingSpots([]);
      requestAnimationFrame(() => flatListRef.current?.scrollToEnd({ animated: true }));
    } catch (error) {
      console.log('일정 확정 에러:', error);
      setMessages(prev => prev.filter(m => m.id !== loadingId));
      Alert.alert('오류', '일정 생성 중 문제가 발생했습니다.');
    }
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
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={6}>
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <View style={{ height: 40 }} />

        <View style={styles.tripInfo}>
          <View style={styles.tripBioRow}>
            <Text style={styles.tripBio}>{bio}</Text>
            <TouchableOpacity onPress={() => setIsTripInfoExpanded(prev => !prev)}>
              <Text style={styles.tripToggleIcon}>
                {isTripInfoExpanded ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
          </View>

          {isTripInfoExpanded && (
            <View style={styles.tripTags}>
              <Text style={styles.tag}>📍 {destination}</Text>
              <Text style={styles.tag}>
                🗓 {String(days).includes('박') ? days : `${days}박${Number(days) + 1}일`}
              </Text>
              {departure_date ? <Text style={styles.tag}>🛫 {departure_date}</Text> : null}
              {max_people ? <Text style={styles.tag}>👥 최대 {max_people}명</Text> : null}
            </View>
          )}
        </View>

        {isTripInfoExpanded && (
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
            <TouchableOpacity style={styles.aiTagAddBtn} onPress={() => setIsAddMemoVisible(true)}>
              <Text style={styles.aiTagAddBtnText}>＋</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <MessageItem
              message={item}
              myUserId={myUserId}
              selectedSchedule={selectedSchedule}
              setSelectedSchedule={setSelectedSchedule}
              onAddSpotToSchedule={addSpotToSchedule}
            />
          )}
        />

        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.recommendButton, isAILoading && styles.recommendButtonDisabled]}
            onPress={handleAiRecommend}
            disabled={isAILoading}>
            {isAILoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.recommendButtonText}>✈️ 여행지 추천</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.summarizeButton, isSummaryLoading && styles.summarizeButtonDisabled]}
            onPress={handleSummarize}
            disabled={isSummaryLoading}>
            {isSummaryLoading
              ? <ActivityIndicator size="small" color="#6C5CE7" />
              : <Text style={styles.summarizeButtonText}>📋 정리하기</Text>
            }
          </TouchableOpacity>
        </View>

        <InputBar onSend={sendMessage} />

        {/* 🌟 멤버 모달 */}
        <Modal
          visible={isMemberVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setIsMemberVisible(false)}>
          <TouchableOpacity
            style={styles.modalOverlayDark}
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
                        <View style={{ backgroundColor: '#FF6B6B', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }}>
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

        {/* 🌟 일정 수정 모달 */}
        <Modal visible={isModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlayDark}>
            <View style={styles.editBox}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>일정 수정</Text>
                {editPlan.map((p, idx) => (
                  <View key={idx} style={styles.planItem}>
                    <TouchableOpacity onPress={() => setEditPlan(editPlan.filter((p,i)=>i != idx))} style={{marginLeft : 'auto'}}>
                      <Text style={{color : 'red'}}>삭제</Text>
                    </TouchableOpacity>
                    <TextInput value={p.time} onChangeText={(t) => { const n = [...editPlan]; n[idx].time = t; setEditPlan(n); }} placeholder="시간" style={styles.editInput} />
                    <TextInput value={p.place} onChangeText={(t) => { const n = [...editPlan]; n[idx].place = t; setEditPlan(n); }} placeholder="장소" style={styles.editInput} />
                    <TextInput value={p.detail} onChangeText={(t) => { const n = [...editPlan]; n[idx].detail = t; setEditPlan(n); }} placeholder="상세 내용" style={styles.editInput} />
                    {p.photoUrl != null && <Image source={{uri : p.photoUrl }}  style={styles.editImage} /> }
                  </View>
                ))}
                <View style={styles.modalButtons}>
                  <TouchableOpacity onPress={() => setIsModalVisible(false)} style={styles.modalBtnCancel}>
                    <Text style={styles.cancelButton}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleConfirmItinerary} style={styles.modalBtnSave}>
                    <Text style={styles.saveButton}>🗓 일정 확정</Text>
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

        <SummaryModal
          visible={isSummaryVisible}
          summary={summaryData}
          onApprove={handleSummaryApprove}
          onReject={() => { setIsSummaryVisible(false); setSummaryData(null); }}
          onClose={() => { setIsSummaryVisible(false); setSummaryData(null); }}
        />
      </SafeAreaView>
    </ImageBackground>
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

  if (message.type === 'ai_loading') {
    return (
      <View style={aiStyles.loadingWrap}>
        <View style={aiStyles.loadingBubble}>
          <ActivityIndicator size="small" color="#FF6B6B" style={{ marginRight: 8 }} />
          <Text style={aiStyles.loadingText}>{message.text}</Text>
        </View>
      </View>
    );
  }

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

  if (message.type === 'ai_itinerary') {
    const itineraryData = message.data
      ? message.data
      : (() => { try { return JSON.parse(message.text); } catch { return null; } })();
    if (!itineraryData) return null;
    return <AIItineraryCard data={itineraryData} />;
  }

  if (message.type === 'ai_recommend') {
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
    return <AIMessageCard data={recData} onAddSpotToSchedule={onAddSpotToSchedule} />;
  }

  if (message.type === 'ai') {
    return (
      <View style={{ marginVertical: 10 }}>
        <Text style={{ alignSelf: 'center', fontSize: 12, color: '#FF6B6B', marginBottom: 5 }}>AI 추천</Text>
        <AIMessageCard data={message.data} selectedSchedule={selectedSchedule} setSelectedSchedule={setSelectedSchedule} />
      </View>
    );
  }

  // 🌟 시스템 메시지 처리 🌟
  if (message.type === 'system') {
    return (
      <View style={styles.systemMessageContainer}>
        <Text style={styles.systemMessageText}>{message.text}</Text>
      </View>
    );
  }

  const isMe = message.senderId === myUserId;

  return (
    <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginHorizontal: 12, marginVertical: 6 }}>
      {!isMe && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Image
            source={{ uri: message.senderImage || 'https://via.placeholder.com/30' }}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ddd' }}
          />
          <View>
            <Text style={{ fontSize: 11, color: '#666', marginBottom: 4, marginLeft: 2 }}>{message.senderName}</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopLeftRadius: 4, maxWidth: 220, elevation: 2 }}>
              <Text style={{ color: '#333' }}>{message.text}</Text>
            </View>
          </View>
        </View>
      )}
      {isMe && (
        <View style={{ backgroundColor: '#FF6B6B', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopRightRadius: 4, maxWidth: 220, elevation: 2 }}>
          <Text style={{ color: '#fff' }}>{message.text}</Text>
        </View>
      )}
    </View>
  );
};

const aiStyles = StyleSheet.create({
  loadingWrap: { alignItems: 'flex-start', marginHorizontal: 12, marginVertical: 6 },
  loadingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255, 240, 240, 0.9)', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFD1D1',
  },
  loadingText: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' },

  prefWrap: { alignItems: 'flex-start', marginHorizontal: 12, marginVertical: 4 },
  prefBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255, 240, 240, 0.9)', paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 20, maxWidth: 260,
  },
  prefIcon: { fontSize: 16 },
  prefText: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold', flexShrink: 1 },

  recommendWrap: { marginHorizontal: 12, marginVertical: 8 },
  recommendBubble: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 18, borderRadius: 20,
    borderWidth: 1, borderColor: '#eee', elevation: 3
  },
  recommendText: { fontSize: 14, color: '#333', lineHeight: 22 },
});

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240, 244, 248, 0.5)' },
  container: { flex: 1 },

  tripInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: 16, marginTop: 10, marginBottom: 15,
    paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 20, elevation: 5,
  },
  tripBio: { fontSize: 16, fontWeight: '900', color: '#333', marginBottom: 8 },
  tripTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: {
    fontSize: 12, color: '#444', backgroundColor: '#fff',
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    borderWidth: 1, borderColor: '#eee', overflow: 'hidden'
  },

  aiTagsContainer: {
    paddingHorizontal: 16, paddingBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  aiTagsLabel: { fontSize: 12, color: '#FF6B6B', fontWeight: '900', flexShrink: 0 },
  aiTagsRow: { flexDirection: 'row', gap: 8 },
  aiTag: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)', borderRadius: 15,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#FF6B6B',
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  aiTagDelete: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },
  aiTagText: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },

  messageList: { flex: 1 },

  recommendButton: { backgroundColor: '#FF6B6B' },
  recommendButtonDisabled: { backgroundColor: '#FFB5B5' },
  recommendButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  modalOverlayDark: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  memberBox: {
    backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30,
    padding: 24, paddingBottom: 40,
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 20 },
  memberItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eee' },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberType: { fontSize: 13, color: '#FF6B6B', marginTop: 4, fontWeight: '600' },
  closeButton: {
    backgroundColor: '#FF6B6B', borderRadius: 15,
    paddingVertical: 14, alignItems: 'center', marginTop: 24,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  editBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)', borderRadius: 25,
    margin: 20, padding: 24, maxHeight: '85%', marginBottom: 40
  },
  editInput: {
    borderBottomWidth: 1, borderBottomColor: '#ddd',
    marginBottom: 16, fontSize: 15, paddingVertical: 8, color: '#333'
  },

  editSectionTitle: { fontWeight: '900', fontSize: 16, color: '#FF6B6B', marginBottom: 12, marginTop: 10 },
  planItem: { marginBottom: 12, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#eee' },
  addButton: { color: '#FF6B6B', fontWeight: 'bold', marginBottom: 20, fontSize: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, gap: 10 },
  modalBtnCancel: { flex: 1, backgroundColor: '#f0f0f0', padding: 14, borderRadius: 15, alignItems: 'center' },
  modalBtnSave: { flex: 1, backgroundColor: '#FF6B6B', padding: 14, borderRadius: 15, alignItems: 'center' },
  cancelButton: { fontSize: 15, color: '#666', fontWeight: 'bold' },
  saveButton: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
  aiTagAddBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center', alignItems: 'center',
    marginLeft: 6, flexShrink: 0,
  },
  aiTagAddBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 22 },
  memoModalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  memoModalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%' },
  memoModalTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  memoModalSub: { fontSize: 12, color: '#888', marginBottom: 16 },
  memoModalInput: {
    borderWidth: 1, borderColor: '#FFD1D1', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: '#333', marginBottom: 16,
  },
  memoModalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 },
  memoModalCancel: { fontSize: 15, color: '#aaa', paddingVertical: 8 },
  memoModalConfirm: { backgroundColor: '#FF6B6B', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8 },
  memoModalConfirmText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  summarizeButton: { backgroundColor: '#FF6B6B' },
  summarizeButtonDisabled: { opacity: 0.5 },
  summarizeButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  editImage: { height: 250 },
  actionButtonRow: { flexDirection: 'row', marginHorizontal: 16, marginVertical: 6, gap: 10 },
  actionButton: {
    flex: 1, borderRadius: 20, paddingVertical: 11,
    alignItems: 'center', justifyContent: 'center', elevation: 3,
  },
  mapToggleBtn: {
    marginHorizontal: 12, marginBottom: 6, paddingVertical: 8, paddingHorizontal: 14,
    backgroundColor: '#E8E0FF', borderRadius: 10, alignSelf: 'flex-start',
  },
  mapToggleText: { fontSize: 12, color: '#6C5CE7', fontWeight: 'bold' },
  tripBioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tripBio: { fontSize: 16, fontWeight: '900', color: '#333', flex: 1 },
  tripToggleIcon: { fontSize: 14, color: '#888', paddingLeft: 8 },
  aiTagStatic: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 15,
    paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#ddd',
  },
  aiTagStaticText: { fontSize: 12, color: '#555' },

  // 🌟 시스템 메시지 전용 스타일 추가 완료 🌟
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  systemMessageText: {
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    color: '#666',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 15,
    overflow: 'hidden',
  },
});