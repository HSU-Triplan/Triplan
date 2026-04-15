// components/InputBar.js
import React, { useState } from 'react';
import { View, Text, TextInput,  TouchableOpacity, StyleSheet } from 'react-native';

const InputBar = ({ onSend }) => {

  const [text, setText] = useState("");
  const [inputKey, setInputKey] = useState(0);

  const handleSend = () => {
    if (!text.trim()) return;

    onSend(text);
    setText("");

     setInputKey(prev => prev + 1); 
  };

  return (
    <View style={{ flexDirection: 'row' }}>
      <TouchableOpacity style={styles.button} onPress={() => setText(prev => "@" + prev)}>
        <Text style={styles.buttonText}>@</Text>
      </TouchableOpacity>

      <TextInput
        key={inputKey}
        value={text}
        onChangeText={setText}
        style={{ flex: 1, padding: 10, backgroundColor: '#ffffff', borderRadius: 20, marginHorizontal: 10 }}
      />

      <TouchableOpacity style={styles.button} onPress={() => onSend(text)}>
        <Text style={styles.buttonText}>전송</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#555555',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20, // 🔥 이게 핵심
    justifyContent: 'center',
    alignItems: 'center'
  },

  buttonText: {
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default InputBar;