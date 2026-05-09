import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput, ScrollView, StyleSheet,
  Image, Alert,
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
  const myId = 'me';

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

    useEffect(() => {
      const init = async () => {
        const token = await AsyncStorage.getItem('token');

        // 내 userId 불러오기
        const meRes = await fetch('http://10.0.2.2:3000/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (meData.success) setMyUserId(meData.user.id);

        // 기존 메시지 불러오기
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

        // 소켓 연결
        const socket = io('http://10.0.2.2:3000');
        socketRef.current = socket;

        socket.on('connect', () => {
          console.log('소켓 연결됨');
          socket.emit('join_room', String(roomId));
        });

        socket.on('receive_message', (data) => {
          if (data.senderId === myUserId) return;
          setMessages(prev => [...prev, data]);
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          });
        });

        fetchMembers();
      };

      init();

      return () => {
        socketRef.current?.disconnect();
      };
    }, []);


  const generateAI = () => {
    const aiMsg = {
      id: Date.now().toString(),
      type: 'ai',
      data: {
        schedules: [
          {
            id: 's1',
            title: `${destination} 힐링 코스`,
            summary: '여유로운 일정',
            plan: [
              { time: '09:00', place: destination, detail: '오전 탐방' },
              { time: '12:00', place: '현지 맛집', detail: '점심 식사' },
              { time: '15:00', place: '관광지', detail: '오후 관광' },
            ],
          },
          {
            id: 's2',
            title: `${destination} 액티비티 코스`,
            summary: '활동 중심 일정',
            plan: [
              { time: '10:00', place: '액티비티 센터', detail: '체험 활동' },
              { time: '14:00', place: '카페', detail: '휴식' },
              { time: '19:00', place: '야경 명소', detail: '야경 감상' },
            ],
          },
        ],
      },
    };
    setMessages(prev => [...prev, aiMsg]);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  };


  // 헤더 버튼
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTitle: title,
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10, gap: 16 }}>
          <TouchableOpacity onPress={() => {
            fetchMembers();
            setIsMemberVisible(true);
          }}>
            <Text style={{ color: '#4A90E2', fontWeight: 'bold' }}>멤버</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={generateAI}>
            <Text style={{ color: '#555', fontWeight: 'bold' }}>AI</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={openEditModal}>
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>일정</Text>
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

    const sendMessage = async (text) => {
      if (isAIMode) {
        generateAI();
        setIsAIMode(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('token');

        // DB에 저장
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

          // 소켓으로 브로드캐스트
          socketRef.current?.emit('send_message', { ...msg, roomId: String(roomId) });
        }
      } catch (error) {
        console.log('메시지 전송 에러:', error);
      }
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
            <Text style={styles.tag}>🗓 {days}</Text>
            {departure_date ? <Text style={styles.tag}>🛫 {departure_date}</Text> : null}
            <Text style={styles.tag}>👥 최대 {max_people}명</Text>
          </View>
        </View>

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
          <TouchableOpacity
            style={styles.memberBox}
            activeOpacity={1}
            onPress={() => {}}>
            <Text style={styles.modalTitle}>참여 중인 멤버 ({members.length})</Text>
            {members.map((m, idx) => (
              <View key={idx} style={styles.memberItem}>
                <Image
                  source={{ uri: m.users?.profile_image || 'https://via.placeholder.com/40' }}
                  style={styles.memberAvatar}
                />
                <View>
                  <Text style={styles.memberName}>
                    {m.users?.nickname || m.users?.name}
                  </Text>
                  <Text style={styles.memberType}>
                    {m.users?.travel_type ?? '성향 미설정'}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setIsMemberVisible(false)}>
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

              <TextInput
                value={editTitle}
                onChangeText={setEditTitle}
                placeholder="제목"
                style={styles.editInput}
              />
              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder="전체 설명"
                style={styles.editInput}
              />

              <Text style={styles.editSectionTitle}>일정 추가</Text>
              <TextInput
                value={newPlanItem.time}
                onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, time: t }))}
                placeholder="시간"
                style={styles.editInput}
              />
              <TextInput
                value={newPlanItem.place}
                onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, place: t }))}
                placeholder="장소"
                style={styles.editInput}
              />
              <TextInput
                value={newPlanItem.detail}
                onChangeText={(t) => setNewPlanItem(prev => ({ ...prev, detail: t }))}
                placeholder="상세 내용"
                style={styles.editInput}
              />
              <TouchableOpacity onPress={() => {
                if (!newPlanItem.time && !newPlanItem.place) return;
                setEditPlan(prev => [...prev, { ...newPlanItem }]);
                setNewPlanItem({ time: '', place: '', detail: '' });
              }}>
                <Text style={styles.addButton}>+ 추가하기</Text>
              </TouchableOpacity>

              {editPlan.map((p, idx) => (
                <View key={idx} style={styles.planItem}>
                  <TextInput
                    value={p.time}
                    onChangeText={(t) => {
                      const newPlan = [...editPlan];
                      newPlan[idx].time = t;
                      setEditPlan(newPlan);
                    }}
                    placeholder="시간"
                    style={styles.editInput}
                  />
                  <TextInput
                    value={p.place}
                    onChangeText={(t) => {
                      const newPlan = [...editPlan];
                      newPlan[idx].place = t;
                      setEditPlan(newPlan);
                    }}
                    placeholder="장소"
                    style={styles.editInput}
                  />
                  <TextInput
                    value={p.detail}
                    onChangeText={(t) => {
                      const newPlan = [...editPlan];
                      newPlan[idx].detail = t;
                      setEditPlan(newPlan);
                    }}
                    placeholder="상세 내용"
                    style={styles.editInput}
                  />
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

const MessageItem = ({ message, myUserId, selectedSchedule, setSelectedSchedule }) => {
  if (message.type === 'ai') {
    return (
      <View style={{ marginVertical: 10 }}>
        <Text style={{ alignSelf: 'center', fontSize: 12, color: '#6C5CE7', marginBottom: 5 }}>
          AI 추천
        </Text>
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
    <View style={{
      alignItems: isMe ? 'flex-end' : 'flex-start',
      marginHorizontal: 12,
      marginVertical: 4,
    }}>
      {!isMe && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
          <Image
            source={{ uri: message.senderImage || 'https://via.placeholder.com/30' }}
            style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: '#ddd' }}
          />
          <View>
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{message.senderName}</Text>
            <View style={{
              backgroundColor: '#fff',
              padding: 10,
              borderRadius: 12,
              maxWidth: 220,
              elevation: 1,
            }}>
              <Text>{message.text}</Text>
            </View>
          </View>
        </View>
      )}
      {isMe && (
        <View style={{
          backgroundColor: '#FEE500',
          padding: 10,
          borderRadius: 12,
          maxWidth: 220,
        }}>
          <Text>{message.text}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tripInfo: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tripBio: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  tripTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginTop: 4,
  },
  messageList: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  memberBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  memberAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ddd' },
  memberName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  memberType: { fontSize: 12, color: '#4A90E2', marginTop: 2 },
  closeButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  editBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    margin: 20,
    padding: 20,
    maxHeight: '85%',
  },
  editInput: { borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 12, fontSize: 15, paddingVertical: 6 },
  editSectionTitle: { fontWeight: 'bold', fontSize: 15, marginBottom: 8, marginTop: 8 },
  planItem: { marginBottom: 12, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 8 },
  addButton: { color: '#007AFF', fontWeight: 'bold', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  cancelButton: { fontSize: 15, color: '#aaa' },
  saveButton: { fontSize: 15, color: '#007AFF', fontWeight: 'bold' },
});