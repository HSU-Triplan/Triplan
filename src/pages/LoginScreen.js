import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '391196068887-pqdqp1l6c8m69po4s4as60i3pger5aip.apps.googleusercontent.com',
});

export default function LoginScreen({ navigation }) {
const handleGoogleLogin = async () => {
  try {
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();
    const { idToken } = userInfo.data;

    // 백엔드로 토큰 전달
    const response = await fetch('http://10.0.2.2:3000/auth/google', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ idToken }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('서버 로그인 성공:', result.user);
      // 메인 화면으로 이동
      navigation.replace('Main');
    } else {
      console.log('서버 로그인 실패');
    }
  } catch (error) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      console.log('로그인 취소');
    } else {
      console.log('로그인 에러:', error);
    }
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>✈️ Triplan</Text>
      <Text style={styles.subtitle}>여행 성향 기반 동행 매칭 앱</Text>
      <TouchableOpacity style={styles.button} onPress={handleGoogleLogin}>
        <Text style={styles.buttonText}>구글로 시작하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 60,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});