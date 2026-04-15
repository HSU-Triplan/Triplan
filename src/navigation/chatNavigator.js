// src/navigation/ChatStack.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ChatRoomScreen from '../pages/ChatRoomScreen';
import ChatScreen from '../pages/ChatScreen';

const Stack = createNativeStackNavigator();

const ChatStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatList"
        component={ChatScreen}
        options={{ title: "채팅" }}
      />
      <Stack.Screen
        name="ChatRoom"
        component={ChatRoomScreen}
        options={{ title: "채팅방" }}
      />
    </Stack.Navigator>
  );
};

export default ChatStack;