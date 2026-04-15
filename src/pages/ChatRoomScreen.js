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
        locations: ["부산", "광안리"],
        schedule: ["1일차: 해운대", "2일차: 광안리"]
      }
    };

    setMessages(prev => [...prev, aiMsg]);
    setTimeout(scrollToBottom, 100);
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
          <MessageItem message={item} myId={myId} />
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

const MessageItem = ({ message, myId }) => {

  if (message.type === "ai") {
    return <AIMessageCard data={message.data} />;
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

