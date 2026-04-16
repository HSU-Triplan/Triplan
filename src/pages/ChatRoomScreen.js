// src/screens/ChatScreen.js
import React, { useState, useRef } from 'react';
import {
  View, FlatList, Text, TouchableOpacity,
} from 'react-native';
import InputBar from '../components/InputBar';
import { SafeAreaView } from 'react-native-safe-area-context';
import AIMessageCard from '../components/AIMessageCard';

const ChatRoomScreen = ({ route }) => {

  const { roomId } = route.params;

  const [messages, setMessages] = useState([
    { id: "1", type: "system", text: "채팅방 입장" }
  ]);
const [selectedSchedule, setSelectedSchedule] = useState(null);
  const flatListRef = useRef();
  const myId = "me";

  const sendMessage = (text) => {

    const isCommand = text.startsWith("@");

    const msg = {
      id: Date.now().toString(),
      type: isCommand ? "command" : "text",
      text,
      senderId: myId
    };

    setMessages(prev => [...prev, msg]);
    setTimeout(scrollToBottom, 100);
  };

const generateAI = () => {

  const aiMsg = {
    id: Date.now().toString(),
    type: "ai",
    data: {
      schedules: [
        {
          id: "s1",
          title: "부산 1일차",
          description: "해운대, 동백섬",
          locations: [
            { name: "해운대", lat: 35.1587, lng: 129.1604 },
            { name: "동백섬", lat: 35.1532, lng: 129.1466 }
          ]
        },
        {
          id: "s2",
          title: "부산 2일차",
          description: "광안리, 감천문화마을",
          locations: [
            { name: "광안리", lat: 35.1531, lng: 129.1187 },
            { name: "감천문화마을", lat: 35.0975, lng: 129.0106 }
          ]
        }
      ]
    }
  };

  setMessages(prev => [...prev, aiMsg]);
};

  const scrollToBottom = () => {
    flatListRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>

<FlatList
  ref={flatListRef}
  data={messages}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) =>
    <MessageItem
      message={item}
      myId={myId}
      onSelectSchedule={setSelectedSchedule} // 추가
    />
  }
/>

      {/* AI 버튼 */}
      <TouchableOpacity onPress={generateAI} style={{
        backgroundColor: '#555555',
        padding: 10,
        borderRadius: 20,
        alignSelf: 'center',
        marginBottom: 10
      }}>
        <Text style={{ fontWeight: 'bold' , color: '#fff' }}>AI 추천 받기</Text>
      </TouchableOpacity>

      <InputBar onSend={sendMessage} />

    </SafeAreaView>
  );
};

export default ChatRoomScreen;

const MessageItem = ({ message, myId,onSelectSchedule }) => {

  if (message.type === "ai") {
        return <AIMessageCard
        data={message.data}
        onSelectSchedule={onSelectSchedule} // 전달
      />
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

