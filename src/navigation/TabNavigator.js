import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../pages/HomeScreen';
import SearchScreen from '../pages/SearchScreen';
import ChatStack from '../navigation/chatNavigator';
import ProfileScreen from '../pages/ProfileScreen';
import MatchingScreen from '../pages/MatchingScreen';
import FriendsScreen from '../pages/FriendsScreen';
import Icon from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

const TABS = [
  { name: '홈',    icon: 'home',            iconOff: 'home-outline' },
  { name: '탐색',  icon: 'search',          iconOff: 'search-outline' },
  { name: '매칭',  icon: 'people',          iconOff: 'people-outline' },
  { name: '채팅',  icon: 'chatbubble',      iconOff: 'chatbubble-outline' },
  { name: '친구',  icon: 'heart',           iconOff: 'heart-outline' },
  { name: '프로필', icon: 'person',          iconOff: 'person-outline' },
];

function TabIcon({ name, iconOn, iconOff, focused }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Icon
        name={focused ? iconOn : iconOff}
        size={22}
        color={focused ? '#FF6B6B' : '#aaa'}
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {name}
      </Text>
      {focused && <View style={styles.tabDot} />}
    </View>
  );
}

export default function TabNavigator({ setIsLoggedIn }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
      }}>

      <Tab.Screen
        name="홈"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="홈" iconOn="home" iconOff="home-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="탐색"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="탐색" iconOn="search" iconOff="search-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="매칭"
        component={MatchingScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="매칭" iconOn="people" iconOff="people-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="채팅"
        component={ChatStack}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="채팅" iconOn="chatbubble" iconOff="chatbubble-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="친구"
        component={FriendsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="친구" iconOn="heart" iconOff="heart-outline" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="프로필"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="프로필" iconOn="person" iconOff="person-outline" focused={focused} />
          ),
        }}>
        {() => <ProfileScreen setIsLoggedIn={setIsLoggedIn} />}
      </Tab.Screen>

    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 100,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -3 },
    paddingHorizontal: 4,
    paddingBottom: 8,
    paddingTop: 4,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 2,
    minWidth: 52,
  },
  tabItemActive: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
  },

  tabLabel: {
    fontSize: 10,
    color: '#aaa',
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#FF6B6B',
    fontWeight: '900',
  },

  tabDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF6B6B',
    marginTop: 1,
  },
});