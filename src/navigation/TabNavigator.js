import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import HomeScreen from '../pages/HomeScreen';
import SearchScreen from '../pages/SearchScreen';
import ChatScreen from '../pages/ChatScreen';
import ProfileScreen from '../pages/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator({ setIsLoggedIn }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {height: 60, paddingBottom: 8},
        headerShown: false,
      }}>
      <Tab.Screen name="홈" component={HomeScreen} />
      <Tab.Screen name="탐색" component={SearchScreen} />
      <Tab.Screen name="채팅" component={ChatScreen} />
      <Tab.Screen name="프로필">
        {() => <ProfileScreen setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}