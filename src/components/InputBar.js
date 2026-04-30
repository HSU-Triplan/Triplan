import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';

const InputBar = ({ onSend, isAIMode, setIsAIMode }) => {

  const [text, setText] = useState("");

  // 🔥 @ 버튼 = 토글
  const onPressAt = () => {
    setIsAIMode(prev => !prev);
  };

  const handleSend = () => {
    if (!text.trim()) return;

    // 🔥 AI 모드면 그냥 AI 실행
    if (isAIMode) {
      onSend("@ " + text); // 필요하면 prefix 붙이기
    } else {
      onSend(text);
    }

    setText("");
  };

  return (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      backgroundColor: isAIMode ? '#EEE8FF' : '#fff'
    }}>

      {/* @ 버튼 */}
      <TouchableOpacity onPress={onPressAt}>
        <Text style={{
          fontSize: 20,
          marginRight: 10,
          color: isAIMode ? '#6C5CE7' : '#000'
        }}>
          @
        </Text>
      </TouchableOpacity>

      {/* 🔥 고정 @ 표시 (텍스트 아님) */}
      {isAIMode && (
        <Text style={{
          fontSize: 16,
          marginRight: 4,
          color: '#6C5CE7'
        }}>
          @
        </Text>
      )}

      <TextInput
        value={text}
        onChangeText={setText}
        style={{ flex: 1 }}
        placeholder={isAIMode ? "AI에게 요청..." : "메시지 입력"}
      />

      <TouchableOpacity onPress={handleSend}>
        <Text style={{
          fontWeight: 'bold',
          color: isAIMode ? '#6C5CE7' : '#000'
        }}>
          {isAIMode ? 'AI' : '전송'}
        </Text>
      </TouchableOpacity>

    </View>
  );
};

export default InputBar;
