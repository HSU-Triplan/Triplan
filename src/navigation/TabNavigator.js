import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../pages/HomeScreen';
import SearchScreen from '../pages/SearchScreen';
import ChatStack from '../navigation/chatNavigator';
import ProfileScreen from '../pages/ProfileScreen';
import MatchingScreen from '../pages/MatchingScreen';
import FriendsScreen from '../pages/FriendsScreen';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const Tab = createBottomTabNavigator();

export default function TabNavigator({ setIsLoggedIn }) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#4A90E2',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: { height: 60, paddingBottom: 85 },
        headerShown: false,
      }}>
      <Tab.Screen name="홈" component={HomeScreen}
        options = {{
            tabBarIcon : ({color,size})=>(
                <Icon name="home" size={24} color="black"/>
            )
        }}
      />
      <Tab.Screen name="탐색" component={SearchScreen}
        options = {{
             tabBarIcon : ({color,size})=>(
                <Icon name="search" size={24} color="black"/>
            )
        }}
      />
      <Tab.Screen name="매칭" component={MatchingScreen}
        options = {{
            tabBarIcon : ({color,size})=>(
                <Icon name="people" size={24} color="black"/>
            )
        }}
      />
      <Tab.Screen name="채팅" component={ChatStack}
       options = {{
           tabBarIcon : ({color,size})=>(
               <Icon name="chatbubble-outline" size={24} color="black"/>
           )
       }}
      />
      <Tab.Screen name="친구" component={FriendsScreen}
             options = {{
                 tabBarIcon : ({color,size})=>(
                     <Icon name="people-outline" size={24} color="black"/>
                 )
             }}
            />
      <Tab.Screen name="프로필"
        options = {{
                 tabBarIcon : ({color,size})=>(
                     <Icon name="person" size={24} color="black"/>
            )
         }}>
        {() => <ProfileScreen setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}