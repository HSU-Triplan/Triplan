import React, { useState, useLayoutEffect, useRef} from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
  Modal, TextInput, ScrollView
} from 'react-native';

import InputBar from '../components/InputBar';
import AIMessageCard from '../components/AIMessageCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const ChatRoomScreen = ({ navigation }) => {

  const [messages, setMessages] = useState([
    { id: "1", type: "system", text: "채팅방 입장" }
  ]);
  const [editPlan, setEditPlan] = useState([]);
  const [newPlanItem, setNewPlanItem] = useState({
  time: "",
  place: "",
  detail: ""
});
  const [selectedSchedule, setSelectedSchedule] = useState(null);

  // 🔥 AI 모드 상태
  const [isAIMode, setIsAIMode] = useState(false);

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const myId = "me";
const flatListRef = useRef(null);
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

  setEditingId(selectedSchedule?.id || null);
  setEditTitle(selectedSchedule?.title || "");
  setEditDescription(selectedSchedule?.summary || "");
  setEditPlan(selectedSchedule?.plan || []);

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

     requestAnimationFrame(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  });
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

    requestAnimationFrame(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
  });

};

  // =========================
  // 수정 저장
  // =========================
const saveEdit = () => {

  setSelectedSchedule({
    id: editingId || Date.now().toString(),
    title: editTitle,
    summary: editDescription,
    plan: editPlan
  });

  closeModal();
};

  return (
    <SafeAreaView style={{ flex: 1 }}>

      <FlatList
        ref={flatListRef}
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
      width: '90%',
      backgroundColor: '#fff',
      borderRadius: 12,
      maxHeight: '85%'
    }}>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20 }}
      >

        <Text style={{ fontSize: 18, marginBottom: 20 }}>
          일정 수정
        </Text>

        {/* 제목 */}
        <TextInput
          value={editTitle}
          onChangeText={setEditTitle}
          placeholder="제목"
          style={{ borderBottomWidth: 1, marginBottom: 15 }}
        />

        {/* 요약 */}
        <TextInput
          value={editDescription}
          onChangeText={setEditDescription}
          placeholder="전체 설명"
          style={{ borderBottomWidth: 1, marginBottom: 20 }}
        />

        {/* 일정 추가 */}
        <View style={{ marginBottom: 20 }}>

          <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>
            일정 추가
          </Text>

          <TextInput
            value={newPlanItem.time}
            onChangeText={(t) =>
              setNewPlanItem(prev => ({ ...prev, time: t }))
            }
            placeholder="시간"
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />

          <TextInput
            value={newPlanItem.place}
            onChangeText={(t) =>
              setNewPlanItem(prev => ({ ...prev, place: t }))
            }
            placeholder="장소"
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />

          <TextInput
            value={newPlanItem.detail}
            onChangeText={(t) =>
              setNewPlanItem(prev => ({ ...prev, detail: t }))
            }
            placeholder="상세 내용"
            style={{ borderBottomWidth: 1, marginBottom: 10 }}
          />

          <TouchableOpacity
            onPress={() => {
              if (!newPlanItem.time && !newPlanItem.place && !newPlanItem.detail) return;

              setEditPlan(prev => [...prev, { ...newPlanItem }]);
              setNewPlanItem({ time: "", place: "", detail: "" });
            }}
          >
            <Text style={{ color: "#007AFF", fontWeight: "bold" }}>
              + 추가하기
            </Text>
          </TouchableOpacity>

        </View>

        {/* 상세 일정 */}
        {editPlan.map((p, idx) => (
          <View key={idx} style={{ marginBottom: 15 }}>

            <TextInput
              value={p.time}
              onChangeText={(t) => {
                const newPlan = [...editPlan];
                newPlan[idx].time = t;
                setEditPlan(newPlan);
              }}
              placeholder="시간"
              style={{ borderBottomWidth: 1 }}
            />

            <TextInput
              value={p.place}
              onChangeText={(t) => {
                const newPlan = [...editPlan];
                newPlan[idx].place = t;
                setEditPlan(newPlan);
              }}
              placeholder="장소"
              style={{ borderBottomWidth: 1 }}
            />

            <TextInput
              value={p.detail}
              onChangeText={(t) => {
                const newPlan = [...editPlan];
                newPlan[idx].detail = t;
                setEditPlan(newPlan);
              }}
              placeholder="상세 내용"
              style={{ borderBottomWidth: 1 }}
            />

          </View>
        ))}

        {/* 버튼 */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 20
        }}>
          <TouchableOpacity onPress={closeModal}>
            <Text>취소</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={saveEdit}>
            <Text style={{ color: '#007AFF' }}>저장</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

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
