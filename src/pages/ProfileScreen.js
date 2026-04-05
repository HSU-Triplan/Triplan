import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

export default function ProfileScreen({ setIsLoggedIn }) {
  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await GoogleSignin.signOut();
          await AsyncStorage.removeItem('token');
          setIsLoggedIn(false); // 바로 로그인 화면으로
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>👤 프로필</Text>
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 40 },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});