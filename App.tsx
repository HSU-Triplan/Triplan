import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Dimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/pages/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';
import TravelStyleGame from './TravelStyleGame';
import messaging from '@react-native-firebase/messaging';
import {Alert} from 'react-native';
import FlashMessage from "react-native-flash-message";
import {showMessage} from "react-native-flash-message";
import ProfileEditScreen from './src/pages/ProfileEditScreen';
import { enableLatestRenderer } from 'react-native-maps';
import { SafeAreaProvider} from 'react-native-safe-area-context';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('백그라운드 메시지:', remoteMessage);
});

const { width } = Dimensions.get('window');
const Stack = createNativeStackNavigator();

// 배경 이미지
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

const AuthRouterScreen = ({ navigation }: any) => {
  useEffect(() => {
    const checkTravelStyle = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();

        if (result.success && result.user.travel_type) {
          await AsyncStorage.setItem('travelStyle', result.user.travel_type);
          navigation.replace('Main');
        } else {
          navigation.replace('TestIntro');
        }
      } catch (e) {
        console.log('유저 정보 확인 에러:', e);
        navigation.replace('TestIntro');
      }
    };
    checkTravelStyle();
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, color: 'black' }}>서버에서 유저 정보 확인 중...⏳</Text>
    </View>
  );
};

const TestIntroScreen = ({ navigation }: any) => (
    <SafeAreaProvider>

        <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={8}>
          <View style={styles.overlay} />
          <View style={styles.centerContainer}>
            <Text style={styles.questionTitle}>환영합니다! 🎉</Text>
            <Text style={styles.subtitle}>완벽한 일정을 추천해 드리기 위해{'\n'}간단한 여행 성향 테스트를 진행합니다.</Text>
            <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.navigate('Test')}>
              <Text style={styles.buttonText}>여행 성향 테스트 진행하기</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

  </SafeAreaProvider>
);

const ResultScreen = ({ route, navigation }: any) => {
  const result = route?.params?.result || '분석 중';

  const descriptions: { [key: string]: string } = {
    T: '🚌 가성비 대중교통 여행자',
    C: '🚕 편안한 카/렌트 여행자',
    U: '🏙️ 화려한 야경의 도시파',
    N: '🌲 고요한 자연 속 힐링파',
    A: '🧗 체험 위주의 액티비티파',
    R: '🛌 푹 쉬고 즐기는 휴식파',
    J: '📝 계획대로 움직이는 완벽파',
    P: '🏃 발길 닿는 대로 자유파',
  };

  const handleConfirm = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/travel-type', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ travelType: result }),
      });

      console.log('응답 status:', response.status);
      const data = await response.json();
      console.log('서버 응답:', data);

      await AsyncStorage.setItem('travelStyle', result);
    } catch (error) {
      console.log('성향 저장 에러:', error);
    } finally {
      navigation.replace('ProfileEdit', { isFirstTime: true });
    }
  };

  return (
      <SafeAreaProvider style={{flex:1}}>

          <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={8}>
            <View style={styles.overlay} />

            <View style={styles.centerContainer}>
              <Text style={styles.resultTitle}>성향 분석 완료!</Text>
              <Text style={styles.questionTitle}>당신의 여행 스타일은</Text>

              <View style={styles.resultCard}>
                <Text style={styles.resultText}>{result}</Text>

                <View style={styles.descContainer}>
                  {result.split('').map((char: string, index: number) => (
                    <Text key={index} style={styles.descText}>{descriptions[char]}</Text>
                  ))}
                </View>

                <View style={styles.divider} />
                <Text style={styles.guideTitle}>[ 성향 지표 ]</Text>
                <View style={styles.guideContainer}>
                  <View style={styles.guideRow}>
                    <Text style={styles.guideText}>T(대중교통) / C(자동차)</Text>
                    <Text style={styles.guideText}>U(도심) / N(자연)</Text>
                  </View>
                  <View style={styles.guideRow}>
                    <Text style={styles.guideText}>A(활동) / R(휴양)</Text>
                    <Text style={styles.guideText}>J(계획) / P(즉흥)</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                <Text style={styles.buttonText}>여행 시작하기</Text>
              </TouchableOpacity>
            </View>
          </ImageBackground>

    </SafeAreaProvider>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
    checkToken();
    //fcm foreground 처리하는 코드
    const unsubscribe = messaging().onMessage(async remoteMessage => {
        console.log("fcm 메시지 수신 : ",remoteMessage);

        showMessage({
            message :  remoteMessage.notification?.title || '알림',
            description :
                 remoteMessage.notification?.body || "",
            type : "info",
        });
    });
  }, []);

  if (isLoggedIn === null) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 20, color: 'black' }}>자동 로그인 확인 중...🔑</Text>
      </View>
    );
  }

  return (
      <SafeAreaProvider style={{flex:1}}>
            <NavigationContainer>
              <FlashMessage position="top"/>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!isLoggedIn ? (
                  <Stack.Screen name="Login">
                    {() => <LoginScreen setIsLoggedIn={setIsLoggedIn} />}
                  </Stack.Screen>
                ) : (
                  <>
                    <Stack.Screen name="AuthRouter" component={AuthRouterScreen} />
                    <Stack.Screen name="TestIntro" component={TestIntroScreen} />
                    <Stack.Screen name="Test" component={TravelStyleGame} />
                    <Stack.Screen name="Result" component={ResultScreen} />
                    {/* 👇 3. 네비게이션 스택에 프로필 화면을 등록했습니다. */}
                    <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
                    <Stack.Screen name="Main">
                      {() => <TabNavigator setIsLoggedIn={setIsLoggedIn} />}
                    </Stack.Screen>
                  </>
                )}
              </Stack.Navigator>
            </NavigationContainer>

    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.7)' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  resultTitle: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  questionTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 5 },
  resultCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 25,
    borderRadius: 30,
    alignItems: 'center',
    width: width * 0.85,
    marginVertical: 20,
    elevation: 5
  },
  resultText: { fontSize: 60, fontWeight: '900', color: '#FF6B6B', letterSpacing: 5, marginBottom: 15 },
  descContainer: { alignItems: 'flex-start', width: '100%', paddingLeft: 10, marginBottom: 5 },
  descText: { fontSize: 15, color: '#444', fontWeight: 'bold', marginBottom: 5 },
  divider: { width: '100%', height: 1, backgroundColor: '#DDD', marginVertical: 15 },
  guideTitle: { fontSize: 13, color: '#888', fontWeight: 'bold', marginBottom: 10 },
  guideContainer: { width: '100%' },
  guideRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  guideText: { fontSize: 12, color: '#777', fontWeight: '600' },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 26 },
  confirmButton: { backgroundColor: '#FF6B6B', paddingVertical: 15, paddingHorizontal: 60, borderRadius: 10 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
});