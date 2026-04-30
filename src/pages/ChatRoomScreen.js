import React, { useState, useLayoutEffect } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput
} from 'react-native';
import InputBar from '../components/InputBar';
import AIMessageCard from '../components/AIMessageCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatRoomScreen = ({ navigation }) => {

  const [messages, setMessages] = useState([
    { id: "1", type: "system", text: "채팅방 입장" }
  ]);
  const [editPlan, setEditPlan] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 🔥 AI 모드 상태
  const [isAIMode, setIsAIMode] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const myId = "me";

  // =========================
  // 헤더 버튼
  // =========================
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', marginRight: 10 }}>

          {/* AI 버튼 */}
          <TouchableOpacity onPress={generateAI} style={{ marginRight: 15 }}>
            <Text style={{ color: '#555', fontWeight: 'bold' }}>AI</Text>
          </TouchableOpacity>

          {/* 일정 버튼 */}
          <TouchableOpacity onPress={openEditModal}>
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>일정</Text>
          </TouchableOpacity>

        </View>
      )
    });
  }, [navigation, selectedSchedule]);

const openEditModal = () => {
  const schedules = messages
    .filter(m => m.type === "ai")
    .flatMap(m => m.data.schedules);

  if (schedules.length === 0) return;

  const first = schedules[0];

  setEditingId(first.id);
  setEditTitle(first.title);
  setEditDescription(first.summary);
  setEditPlan(first.plan);

  setIsModalVisible(true);
};

  const closeModal = () => setIsModalVisible(false);

  // =========================
  // 메시지 전송
  // =========================
  const sendMessage = (text) => {

    // 🔥 AI 모드면 AI 실행
    if (isAIMode) {
      generateAI();
      setIsAIMode(false);
      return;
    }

    const msg = {
      id: Date.now().toString(),
      type: "text",
      text,
      senderId: myId
    };

    setMessages(prev => [...prev, msg]);
  };

  // =========================
  // AI 생성
  // =========================
const generateAI = () => {
  const aiMsg = {
    id: Date.now().toString(),
    type: "ai",
    data: {
      schedules: [
        {
          id: "s1",
          title: "해운대 힐링 코스",

          summary: "바다 중심 여유로운 일정",

          plan: [
            { time: "09:00", place: "해운대", detail: "해변 산책 및 카페" },
            { time: "12:00", place: "해운대 맛집", detail: "해산물 점심" },
            { time: "15:00", place: "동백섬", detail: "산책 및 전망 감상" }
          ]
        },

        {
          id: "s2",
          title: "감성 + 야경 코스",

          summary: "사진과 야경 중심 일정",

          plan: [
            { time: "10:00", place: "감천문화마을", detail: "골목 투어" },
            { time: "14:00", place: "광안리", detail: "카페 + 바다뷰" },
            { time: "19:00", place: "광안대교", detail: "야경 감상" }
          ]
        }
      ]
    }
  };

  setMessages(prev => [...prev, aiMsg]);
};

  // =========================
  // 수정 저장
  // =========================
const saveEdit = () => {

  setMessages(prev =>
    prev.map(msg => {
      if (msg.type !== "ai") return msg;

      return {
        ...msg,
        data: {
          ...msg.data,
          schedules: msg.data.schedules.map(s => {
            if (s.id !== editingId) return s;

            return {
              ...s,
              title: editTitle,
              summary: editDescription,
              plan: editPlan
            };
          })
        }
      };
    })
  );

  closeModal();
};

  return (
    <SafeAreaView style={{ flex: 1 }}>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {

          return <MessageItem
              message={item}
              myId={myId}
              selectedSchedule={selectedSchedule}
              setSelectedSchedule={setSelectedSchedule}
          />
        }}
      />

      <InputBar
        onSend={sendMessage}
        isAIMode={isAIMode}
        setIsAIMode={setIsAIMode}
      />

      {/* 수정 모달 */}
      <Modal visible={isModalVisible} transparent animationType="fade">
  <View style={{
    flex:1,
    justifyContent:'center',
    alignItems:'center',
    backgroundColor:'rgba(0,0,0,0.4)'
  }}>

    <View style={{
      width:'90%',
      backgroundColor:'#fff',
      padding:20,
      borderRadius:12
    }}>

      <Text style={{ fontSize:18, marginBottom:20 }}>
        일정 수정
      </Text>

      {/* 제목 */}
      <TextInput
        value={editTitle}
        onChangeText={setEditTitle}
        placeholder="제목"
        style={{ borderBottomWidth:1, marginBottom:15 }}
      />

      {/* 요약 */}
      <TextInput
        value={editDescription}
        onChangeText={setEditDescription}
        placeholder="전체 설명"
        style={{ borderBottomWidth:1, marginBottom:20 }}
      />

      {/* 🔥 상세 일정 */}
      {editPlan.map((p, idx) => (
        <View key={idx} style={{ marginBottom:15 }}>

          <TextInput
            value={p.time}
            onChangeText={(t) => {
              const newPlan = [...editPlan];
              newPlan[idx].time = t;
              setEditPlan(newPlan);
            }}
            placeholder="시간"
            style={{ borderBottomWidth:1 }}
          />

          <TextInput
            value={p.place}
            onChangeText={(t) => {
              const newPlan = [...editPlan];
              newPlan[idx].place = t;
              setEditPlan(newPlan);
            }}
            placeholder="장소"
            style={{ borderBottomWidth:1 }}
          />

          <TextInput
            value={p.detail}
            onChangeText={(t) => {
              const newPlan = [...editPlan];
              newPlan[idx].detail = t;
              setEditPlan(newPlan);
            }}
            placeholder="상세 내용"
            style={{ borderBottomWidth:1 }}
          />

        </View>
      ))}

      <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
        <TouchableOpacity onPress={closeModal}>
          <Text>취소</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={saveEdit}>
          <Text style={{ color:'#007AFF' }}>저장</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
};

export default ChatRoomScreen;


const MessageItem = ({ message, myId, selectedSchedule, setSelectedSchedule }) => {

  if (message.type === "ai") {
    return (
                    <View style={{ marginVertical: 10 }}>
        <Text style={{
          alignSelf: 'center',
          fontSize: 12,
          color: '#6C5CE7',
          marginBottom: 5
        }}>
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

  if (message.type === "system") {
    return <Text style={{ textAlign: 'center' }}>{message.text}</Text>;
  }

  return (
    <View style={{
      alignSelf: message.senderId === myId ? 'flex-end' : 'flex-start',
      backgroundColor: message.senderId === myId ? '#FEE500' : '#fff',
      padding: 10,
      borderRadius: 10,
      margin: 5
    }}>
      <Text>{message.text}</Text>
    </View>
  );
};
