import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, StyleSheet,
  Image, Alert, ActivityIndicator, ImageBackground, Clipboard,KeyboardAvoidingView,Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InputBar from '../components/InputBar';
import AIMessageCard from '../components/AIMessageCard';
import { io } from 'socket.io-client';
import SummaryModal from '../components/SummaryModal';
import AISummaryCard from '../components/AISummaryCard';
import AIItineraryCard from '../components/AIItineraryCard';
import { formatTime } from '../constants/utils';
import UserProfileModal from '../components/UserProfileModal';
import TravelInfoModal from '../components/TravelInfoModal';

// 🌟 고급스러운 세계 여행 랜드마크 배경 (경복궁 & 여행 무드)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1546436836-07a91091f160?q=80&w=800&auto=format&fit=crop';

export default function ChatRoomScreen({ route, navigation }) {
  const { roomId, title, destination, days, departure_date, bio, max_people } = route.params;
  const [isSummarized, setIsSummarized] = useState(false);
  const [messages, setMessages] = useState([]);
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
  const [profileVisible,setProfileVisible] = useState(false);
  const [otherUser,setOtherUser] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInviteVisible, setIsInviteVisible] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [invitingId, setInvitingId] = useState(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);


  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch('https://triplan-backend-qwrs.onrender.com/users/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        const myId = data.userId;
        const filtered = data.friends.filter(
          f => f.status === 'accept' && f.user_id == myId
        );
        setFriendsList(filtered);
      }
    } catch (e) {
      console.log('친구 목록 에러:', e);
    }
  };

  const handleInviteFriend = async (friendUserId, friendName) => {
    if (invitingId) return;
    setInvitingId(friendUserId);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/invite`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: friendUserId }),
        }
      );
      const data = await res.json();
      if (data.success) {
        Alert.alert('초대 완료', `${friendName}님을 초대했어요!`);
        fetchMembers(); // 멤버 목록 갱신
      } else {
        Alert.alert('알림', data.message || '초대에 실패했습니다.');
      }
    } catch (e) {
      console.log('초대 에러:', e);
    } finally {
      setInvitingId(null);
    }
  };

  // 멤버 불러오기
  const fetchMembers = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/members`, {
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
      const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-preference`, {
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
                `https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-preference`,
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
      const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-preference`, {
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
      const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-summarize`, {
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
    setIsSummarized(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-summarize-approve`, {
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
            const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/leave`, {
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

  //사용자 프로필 정보 가져오기
  const fetchProfile = async (senderId) => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/others?id='+senderId, {
            headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success) {
          setProfileVisible(true);
          setOtherUser(result.user);
        }
      } catch (error) {
        console.log('다른 사용자 프로필 정보 에러:', error);
      } finally {
        setLoading(false);
      }
  };
  //친구 코드 복사
  const handleCopyFriendCode = () => {
      Clipboard.setString(otherUser?.friend_code);
      Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };

  const handleBackToList = () => navigation.goBack();

  useEffect(() => {
  let socket = null;
    const init = async () => {
      const token = await AsyncStorage.getItem('token');

      // 내 userId
      const meRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) setMyUserId(meData.user.id);

      // 기존 메시지
      const msgRes = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/messages`,
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
            createdAt: m.created_at,
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

      const tutorialKey = `tutorial_seen_${roomId}`;
      const seen = await AsyncStorage.getItem(tutorialKey);
      if (!seen) {
        setTimeout(() => setTutorialVisible(true), 500); // 화면 로드 후 약간 딜레이
        await AsyncStorage.setItem(tutorialKey, 'true');
      }

      // 소켓 연결
      socket = io('https://triplan-backend-qwrs.onrender.com');
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join_room', {
          roomId: String(roomId),
          userId: meData.user.id,
        });
      });

      socket.on('vote_updated', (data) => {
        setMessages(prev => prev.map(m =>
          String(m.id) === String(data.messageId)
            ? { ...m, voteData: data }
            : m
        ));
      });

      socket.on('receive_message', (data) => {
        console.log(`[Socket] 메시지 수신: type=${data.type}, id=${data.id}`);
        if (data.senderId === meData.user?.id) return;
          setMessages(prev => {
            if (prev.some(m => String(m.id) === String(data.id))) return prev;
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
    return () => {
      socket?.disconnect();
      socketRef.current = null;
    };
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
            const loadingMessages = [
              'AI가 인기 장소를 검색하는 중...',
              'AI가 여행 성향을 분석하는 중...',
              'AI가 최적 장소를 선정하는 중...',
              '주변 장소 정보를 수집하는 중...',
            ];
            let msgIdx = 0;

            setMessages(prev => [...prev, {
              id: loadingId,
              type: 'ai_loading',
              text: loadingMessages[0],
            }]);
            flatListRef.current?.scrollToEnd({ animated: true });

            // 3초마다 메시지 변경
            const loadingInterval = setInterval(() => {
              msgIdx = (msgIdx + 1) % loadingMessages.length;
              setMessages(prev => prev.map(m =>
                m.id === loadingId ? { ...m, text: loadingMessages[msgIdx] } : m
              ));
            }, 3000);

            try {
              const token = await AsyncStorage.getItem('token');
              const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-recommend`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();

              clearInterval(loadingInterval);
              setMessages(prev => {
                const filtered = prev.filter(m => m.id !== loadingId);
                if (data.success) return [...filtered, data.message];
                return filtered;
              });
            } catch (error) {
              clearInterval(loadingInterval);
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
      const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/messages`, {
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
          createdAt: result.message.created_at || new Date().toISOString(),
        };
        setMessages(prev => [...prev, msg]);
        socketRef.current?.emit('send_message', { ...msg, roomId: String(roomId) ,senderId : myUserId });
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
          <TouchableOpacity onPress={() => setTutorialVisible(true)}>
            <Text style={{ color: '#aaa', fontWeight: 'bold', fontSize: 16 }}>?</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { fetchMembers(); setIsMemberVisible(true); }}>
            <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>멤버</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal}>
            <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>일정</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { fetchFriends(); setIsInviteVisible(true); }}>
            <Text style={{ color: '#FF6B6B', fontWeight: 'bold' }}>초대</Text>
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
      const res = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/chat-rooms/${roomId}/ai-itinerary`, {
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
         <KeyboardAvoidingView  style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.overlay} />
            <View style={{ height: 80 }} />

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
                  roomId={roomId}
                  myUserId={myUserId}
                  currentSpotCount={pendingSpots.length}
                  days={days}
                  selectedSchedule={selectedSchedule}
                  setSelectedSchedule={setSelectedSchedule}
                  onAddSpotToSchedule={addSpotToSchedule}
                  profileVisible={profileVisible}
                  otherUser={otherUser}
                  fetchProfile={fetchProfile}
                />
              )}
            />

            <View style={styles.actionButtonRow}>

              {/* 왼쪽: 정리하기 or 채팅 수집 중 */}
              {(() => {
                const textCount = messages.filter(m => m.type === 'text').length;
                const canSummarize = textCount >= 3;

                return (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      canSummarize ? styles.summarizeButton : styles.summarizeButtonDisabled,
                    ]}
                    onPress={canSummarize ? handleSummarize : null}
                    disabled={!canSummarize || isSummaryLoading}
                    activeOpacity={canSummarize ? 0.8 : 1}>
                    {isSummaryLoading ? (
                      <ActivityIndicator size="small" color="#6C5CE7" />
                    ) : canSummarize ? (
                      <Text style={styles.summarizeButtonText}>📋 정리하기 </Text>
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color="#aaa" />
                        <Text style={styles.collectingText}>대화 수집 중 ({textCount}/3)</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })()}

              {/* 오른쪽: 여행지 추천 */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isSummarized ? styles.recommendButton : styles.recommendButtonLocked,
                  isAILoading && styles.recommendButtonDisabled,
                ]}
                onPress={isSummarized ? handleAiRecommend : () => Alert.alert('💡 안내', '먼저 대화를 정리해주세요!\n📋 정리하기 버튼을 눌러보세요.')}
                disabled={isAILoading}
                activeOpacity={0.8}>
                {isAILoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : isSummarized ? (
                  <Text style={styles.recommendButtonText}>✈️ 여행지 추천받기 </Text>
                ) : (
                  <Text style={styles.recommendButtonLockedText}>✈️ 여행지 추천</Text>
                )}
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
                         {/* 삭제 버튼 */}
                         <TouchableOpacity
                           onPress={() => setEditPlan(editPlan.filter((_, i) => i !== idx))}
                           style={{ marginLeft: 'auto', marginBottom: 6 }}>
                           <Text style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: 12 }}>삭제</Text>
                         </TouchableOpacity>

                         {/* 사진 */}
                         {p.photoUrl ? (
                           <Image source={{ uri: p.photoUrl }} style={styles.editImage} resizeMode="cover" />
                         ) : null}

                         {/* 장소명 + 주소 */}
                         <Text style={styles.editPlaceName}>{p.place}</Text>
                         {p.address ? (
                           <Text style={styles.editPlaceAddress}>📍 {p.address}</Text>
                         ) : null}

                         {/* 지도 링크 */}
                         {p.placeUrl ? (
                           <TouchableOpacity
                             onPress={() => Linking.openURL(p.placeUrl)}
                             style={styles.editMapBtn}>
                             <Text style={styles.editMapBtnText}>🗺 카카오맵에서 보기</Text>
                           </TouchableOpacity>
                         ) : p.lat && p.lng ? (
                           <TouchableOpacity
                             onPress={() => Linking.openURL(
                               `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
                             )}
                             style={styles.editMapBtn}>
                             <Text style={styles.editMapBtnText}>🗺 구글맵에서 보기</Text>
                           </TouchableOpacity>
                         ) : null}
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

            <Modal visible={tutorialVisible} transparent animationType="fade" onRequestClose={() => setTutorialVisible(false)}>
              <TouchableOpacity
                style={styles.modalOverlayDark}
                activeOpacity={1}
                onPress={() => setTutorialVisible(false)}>
                <TouchableOpacity style={styles.tutorialBox} activeOpacity={1} onPress={() => {}}>

                  <Text style={styles.tutorialTitle}>✈️ Triplan 사용 가이드</Text>
                  <Text style={styles.tutorialSub}>이렇게 여행을 계획해보세요!</Text>

                  {[
                    { step: '1', emoji: '💬', title: '자유롭게 대화하세요', desc: '멤버들과 여행 스타일, 예산, 선호지 등을 자유롭게 이야기해보세요.' },
                    { step: '2', emoji: '📋', title: 'AI에게 정리를 맡기세요', desc: '대화가 3개 이상 쌓이면 "정리하기" 버튼으로 AI가 핵심을 요약해드려요.' },
                    { step: '3', emoji: '✈️', title: '맞춤 여행지를 추천받으세요', desc: '정리가 완료되면 "여행지 추천받기"로 AI가 딱 맞는 여행지 3곳을 제안해요.' },
                    { step: '4', emoji: '📍', title: '원하는 장소를 일정에 담으세요', desc: '추천된 장소 카드에서 마음에 드는 곳의 "일정 추가" 버튼을 눌러보세요.' },
                    { step: '5', emoji: '🗓', title: '일정 버튼으로 여행을 완성하세요', desc: '헤더의 "일정" 버튼을 눌러 추가한 장소들을 확인하고 AI가 동선을 최적화해요.' },
                    { step: '6', emoji: '🗳', title: '찬반투표로 최종 확정하세요', desc: '멤버 과반수가 찬성하면 일정이 확정돼요. 방장이 직접 마감할 수도 있어요.' },
                  ].map((item) => (
                    <View key={item.step} style={styles.tutorialItem}>
                      <View style={styles.tutorialStepBadge}>
                        <Text style={styles.tutorialStepText}>{item.step}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tutorialItemTitle}>{item.emoji} {item.title}</Text>
                        <Text style={styles.tutorialItemDesc}>{item.desc}</Text>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity style={styles.tutorialCloseBtn} onPress={() => setTutorialVisible(false)}>
                    <Text style={styles.tutorialCloseBtnText}>확인했어요!</Text>
                  </TouchableOpacity>

                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>

            <Modal
              visible={isInviteVisible}
              transparent
              animationType="slide"
              onRequestClose={() => setIsInviteVisible(false)}>
              <TouchableOpacity
                style={styles.modalOverlayDark}
                activeOpacity={1}
                onPress={() => setIsInviteVisible(false)}>
                <TouchableOpacity style={styles.memberBox} activeOpacity={1} onPress={() => {}}>
                  <Text style={styles.modalTitle}>친구 초대</Text>

                  {friendsList.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                      <Text style={{ fontSize: 40, marginBottom: 12 }}>🤝</Text>
                      <Text style={{ color: '#888', fontSize: 15 }}>초대할 친구가 없어요</Text>
                    </View>
                  ) : (
                    friendsList.map((friend, idx) => {
                      const isAlreadyMember = members.some(
                        m => m.users?.id === friend.users?.id
                      );
                      const isInviting = invitingId === friend.users?.id;

                      return (
                        <View key={idx} style={styles.memberItem}>
                          <Image
                            source={{ uri: friend.users?.profile_image || 'https://via.placeholder.com/40' }}
                            style={styles.memberAvatar}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.memberName}>
                              {friend.users?.nickname || friend.users?.name}
                            </Text>
                          </View>

                          {isAlreadyMember ? (
                            <View style={styles.invitedBadge}>
                              <Text style={styles.invitedBadgeText}>참여 중</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={[styles.inviteBtn, isInviting && { opacity: 0.5 }]}
                              onPress={() => handleInviteFriend(
                                friend.users?.id,
                                friend.users?.nickname || friend.users?.name
                              )}
                              disabled={isInviting}>
                              {isInviting
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={styles.inviteBtnText}>초대</Text>
                              }
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })
                  )}

                  <TouchableOpacity style={styles.closeButton} onPress={() => setIsInviteVisible(false)}>
                    <Text style={styles.closeButtonText}>닫기</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
            <UserProfileModal
              visible={profileVisible}
              user={otherUser}
              onClose={() => setProfileVisible(false)}
              onInfoPress={() => setInfoVisible(true)}
            />
         </KeyboardAvoidingView>
        </ImageBackground>

  );
}

// ── 메시지 아이템 ─────────────────────────────────────────────
const MessageItem = ({
    message,
    roomId,
    myUserId,
    selectedSchedule,
    setSelectedSchedule,
    onAddSpotToSchedule,
    fetchProfile,
    currentSpotCount,
    days
    }) => {

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
      return (
        <AIItineraryCard
          data={itineraryData}
          messageId={message.id}
          roomId={roomId}
          myUserId={myUserId}
          isConfirmed={false}
        />
      );
  }
  if (message.type === 'ai_itinerary_confirmed') {
    const confirmedData = message.data
      ?? (() => { try { return JSON.parse(message.text); } catch { return null; } })();
    if (!confirmedData) return null;
    return (
      <AIItineraryCard
        data={confirmedData}
        isConfirmed={true}
      />
    );
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
     return (
       <AIMessageCard
         data={recData}
         onAddSpotToSchedule={onAddSpotToSchedule}
         currentSpotCount={currentSpotCount}
         days={days}
       />
     );
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
          <TouchableOpacity onPress={() => { fetchProfile(message.senderId); }}>
            <Image
              source={{ uri: message.senderImage || 'https://via.placeholder.com/30' }}
              style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#ddd' }}
            />
          </TouchableOpacity>
          <View>
            <Text style={{ fontSize: 11, color: '#666', marginBottom: 4, marginLeft: 2 }}>
              {message.senderName}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopLeftRadius: 4, maxWidth: 220, elevation: 2 }}>
                <Text style={{ color: '#333' }}>{message.text}</Text>
              </View>
              <Text style={{ fontSize: 10, color: 'rgba(80,80,80,0.7)', marginBottom: 2 }}>
                {formatTime(message.createdAt)}
              </Text>
            </View>
          </View>
        </View>
      )}
      {isMe && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: 'rgba(80,80,80,0.7)', marginBottom: 2 }}>
            {formatTime(message.createdAt)}
          </Text>
          <View style={{ backgroundColor: '#FF6B6B', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderTopRightRadius: 4, maxWidth: 220, elevation: 2 }}>
            <Text style={{ color: '#fff' }}>{message.text}</Text>
          </View>
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
    marginHorizontal: 16, marginTop: 0, marginBottom: 10,
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
   detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
   profileModalBox: {
       backgroundColor: '#fff',
       borderTopLeftRadius: 30,
       borderTopRightRadius: 30,
       paddingBottom: 40,
     },
     profileModalHeader: { alignItems: 'center', backgroundColor: '#f5f7fa', paddingVertical: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
     profileImageLarge: { width: 90, height: 90, borderRadius: 45, marginBottom: 12, borderWidth: 3, borderColor: '#fff' },
     profileModalName: { fontSize: 22, fontWeight: '900', color: '#222' },
     bioPreview: { fontSize: 14, color: '#666', marginTop: 6, fontWeight: '500' },

     profileCard: { padding: 24 },
     cardTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, color: '#333' },
     infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
     infoLabel: { fontSize: 15, color: '#777', fontWeight: 'bold' },
     infoValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
     copyButton: { backgroundColor: '#f0f0f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, marginLeft: 10 },
     copyButtonText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
   inviteBtn: {
     backgroundColor: '#FF6B6B',
     paddingHorizontal: 16,
     paddingVertical: 8,
     borderRadius: 12,
     minWidth: 52,
     alignItems: 'center',
   },
   inviteBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
   invitedBadge: {
     backgroundColor: '#f0f0f0',
     paddingHorizontal: 12,
     paddingVertical: 8,
     borderRadius: 12,
   },
   invitedBadgeText: { color: '#aaa', fontWeight: 'bold', fontSize: 13 },
   editPlaceName: {
     fontSize: 15, fontWeight: '900', color: '#333', marginBottom: 4,
   },
   editPlaceAddress: {
     fontSize: 12, color: '#888', marginBottom: 10,
   },
   editMapBtn: {
     backgroundColor: '#E8E0FF',
     borderRadius: 8,
     paddingVertical: 8,
     paddingHorizontal: 12,
     alignItems: 'center',
     marginTop: 6,
   },
   editMapBtnText: {
     fontSize: 12, color: '#6C5CE7', fontWeight: 'bold',
   },
   editImage: {
     width: '100%', height: 140,
     borderRadius: 10, marginBottom: 10,
   },
   tutorialBox: {
     backgroundColor: '#fff',
     borderTopLeftRadius: 28,
     borderTopRightRadius: 28,
     padding: 24,
     paddingBottom: 40,
     maxHeight: '90%',
   },
   tutorialTitle: {
     fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 4,
   },
   tutorialSub: {
     fontSize: 13, color: '#aaa', marginBottom: 20,
   },
   tutorialItem: {
     flexDirection: 'row', alignItems: 'flex-start',
     gap: 14, marginBottom: 16,
   },
   tutorialStepBadge: {
     width: 28, height: 28, borderRadius: 14,
     backgroundColor: '#FF6B6B',
     justifyContent: 'center', alignItems: 'center',
     flexShrink: 0, marginTop: 2,
   },
   tutorialStepText: { color: '#fff', fontWeight: '900', fontSize: 13 },
   tutorialItemTitle: { fontSize: 14, fontWeight: '900', color: '#333', marginBottom: 4 },
   tutorialItemDesc: { fontSize: 12, color: '#666', lineHeight: 18 },
   tutorialCloseBtn: {
     backgroundColor: '#FF6B6B', borderRadius: 16,
     paddingVertical: 14, alignItems: 'center', marginTop: 8,
   },
   tutorialCloseBtnText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});