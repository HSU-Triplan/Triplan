import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GoogleSignin,
} from '@react-native-google-signin/google-signin';
import {PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';

// 🌟 동일한 세계 랜드마크 배경 이미지
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop';

GoogleSignin.configure({
  webClientId: '391196068887-pqdqp1l6c8m69po4s4as60i3pger5aip.apps.googleusercontent.com',
});

export default function LoginScreen({ setIsLoggedIn ,navigation }) {
  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.signOut();
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const { idToken } = userInfo.data;

      const response = await fetch('https://triplan-backend-qwrs.onrender.com/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      const result = await response.json();

      if (result.success) {
        await AsyncStorage.setItem('token', result.token);
        const token = result.token;

        setIsLoggedIn(true);
        navigation.replace('AuthRouter');


        (async () => {

            //알람 권한 요청
            await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );

            //fcm 토큰 얻기
            const fcmToken = await messaging().getToken();
            console.log(fcmToken);
            //fcm토큰 저장
            await fetch('https://triplan-backend-qwrs.onrender.com/users/saveFcmToken',{
                method : 'POST',
                headers: { Authorization: `Bearer ${token}` , 'Content-Type' : 'application/json'},
                body : JSON.stringify({ fcm_token : fcmToken }),
            });
        })();
      }
    } catch (error) {
      console.log('로그인 에러:', error);
    }
  };

  return (
    <ImageBackground
      source={{ uri: BACKGROUND_IMAGE_URI }}
      style={styles.backgroundImage}
      blurRadius={5} // 로그인 화면은 배경을 살짝 덜 흐리게 해서 개방감을 줬어요
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          {/* 🌟 로고 및 타이틀 섹션 */}
          <View style={styles.logoSection}>
            <Text style={styles.emoji}>✈️</Text>
            <Text style={styles.title}>Triplan</Text>
            <View style={styles.titleUnderline} />
            <Text style={styles.subtitle}>내 취향에 딱 맞는{'\n'}여행 동행을 찾아보세요</Text>
          </View>

          {/* 🌟 글래스모피즘 로그인 카드 */}
          <View style={styles.loginCard}>
            <Text style={styles.loginHint}>여행의 시작은 로그인부터!</Text>
            <TouchableOpacity style={styles.button} onPress={handleGoogleLogin}>
              <View style={styles.googleIconContainer}>
                 <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.buttonText}>구글로 계속하기</Text>
            </TouchableOpacity>
            <Text style={styles.footerText}>로그인 시 서비스 이용약관에 동의하게 됩니다.</Text>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.2)' // 밝은 느낌을 유지
  },
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 30,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: { fontSize: 60, marginBottom: 10 },
  title: {
    fontSize: 48,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -1,
  },
  titleUnderline: {
    width: 40,
    height: 4,
    backgroundColor: '#FF6B6B', // 산호색 포인트 바
    borderRadius: 2,
    marginTop: -4,
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 18,
    color: '#444',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '500',
  },

  // 🌟 로그인 카드 (글래스모피즘)
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    padding: 30,
    borderRadius: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  loginHint: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B', // 산호색 버튼
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FF6B6B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  footerText: {
    marginTop: 20,
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
  },
});