import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/pages/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';

// ★ 방금 만든 설문조사 화면 파일을 불러옵니다
import TestScreen from './src/pages/TestScreen';

const Stack = createNativeStackNavigator();

// 1. [안전 확인] 로그인 직후 성향 검사 여부를 판단하는 라우터
const AuthRouterScreen = ({ navigation }: any) => {
  useEffect(() => {
    const checkTravelStyle = async () => {
      try {
        const savedStyle = await AsyncStorage.getItem('travelStyle');
        if (savedStyle) {
          navigation.replace('Main');
        } else {
          navigation.replace('TestIntro');
        }
      } catch (e) {
        navigation.replace('TestIntro');
      }
    };
    checkTravelStyle();
  }, [navigation]);

  return <View style={{ flex: 1, backgroundColor: '#fff' }} />;
};

// 2. 안내 화면
const TestIntroScreen = ({ navigation }: any) => (
  <SafeAreaView style={styles.centerContainer}>
    <Text style={styles.questionTitle}>환영합니다! 🎉</Text>
    <Text style={styles.subtitle}>완벽한 일정을 추천해 드리기 위해{'\n'}간단한 여행 성향 테스트를 진행합니다.</Text>
    <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.navigate('Test')}>
      <Text style={styles.buttonText}>여행 성향 테스트 진행하기</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

// 3. 결과 화면
const ResultScreen = ({ route, navigation }: any) => {
  const result = route?.params?.result || '분석 중';

  return (
    <SafeAreaView style={styles.centerContainer}>
      <Text style={styles.subtitle}>성향 분석 완료!</Text>
      <Text style={styles.questionTitle}>당신의 여행 스타일은</Text>
      <Text style={styles.resultText}>{result}</Text>
      <Text style={styles.subtitle}>스타일입니다 ✈️</Text>
      <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.replace('Main')}>
        <Text style={styles.buttonText}>여행 시작하기</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// 4. 메인 App
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem('token');
      setIsLoggedIn(!!token);
    };
    checkToken();
  }, []);

  if (isLoggedIn === null) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {() => <LoginScreen setIsLoggedIn={setIsLoggedIn} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="AuthRouter" component={AuthRouterScreen} />
            <Stack.Screen name="TestIntro" component={TestIntroScreen} />
            {/* 분리한 TestScreen을 연결합니다 */}
            <Stack.Screen name="Test" component={TestScreen} />
            <Stack.Screen name="Result" component={ResultScreen} />
            <Stack.Screen name="Main">
              {() => <TabNavigator setIsLoggedIn={setIsLoggedIn} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#fff' },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 26 },
  confirmButton: { backgroundColor: '#4A90E2', paddingVertical: 15, paddingHorizontal: 60, borderRadius: 10, marginTop: 40 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  questionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333', lineHeight: 30 },
  resultText: { fontSize: 70, fontWeight: '900', color: '#FF6B6B', marginVertical: 20, letterSpacing: 5 },
});