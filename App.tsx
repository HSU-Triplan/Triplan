import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/pages/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';

// 방금 새로 만든 미니게임 파일을 여기서 불러온다.
import TravelStyleGame from './TravelStyleGame';

const Stack = createNativeStackNavigator();

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

const TestIntroScreen = ({ navigation }: any) => (
  <SafeAreaView style={styles.centerContainer}>
    <Text style={styles.questionTitle}>환영합니다! 🎉</Text>
    <Text style={styles.subtitle}>완벽한 일정을 추천해 드리기 위해{'\n'}간단한 여행 성향 테스트를 진행합니다.</Text>
    <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.navigate('Test')}>
      <Text style={styles.buttonText}>여행 성향 테스트 진행하기</Text>
    </TouchableOpacity>
  </SafeAreaView>
);

const ResultScreen = ({ route, navigation }: any) => {
  const result = route?.params?.result || '분석 중';

  const handleConfirm = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('성향 저장 시작:', result);

      const response = await fetch('http://10.0.2.2:3000/users/travel-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ travelType: result }),
      });

      console.log('응답 status:', response.status);
      const data = await response.json();
      console.log('서버 응답:', data);

    } catch (error) {
      console.log('성향 저장 에러:', error);
    } finally {
      navigation.replace('Main');
    }
  };

  return (
    <SafeAreaView style={styles.centerContainer}>
      <Text style={styles.subtitle}>성향 분석 완료!</Text>
      <Text style={styles.questionTitle}>당신의 여행 스타일은</Text>
      <Text style={styles.resultText}>{result}</Text>
      <Text style={styles.subtitle}>스타일입니다 ✈️</Text>
      <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
        <Text style={styles.buttonText}>여행 시작하기</Text>
      </TouchableOpacity>
    </SafeAreaView>
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

            {/* 여기가 핵심! 기존 테스트 화면 대신 우리가 만든 미니게임을 띄워준다. */}
            <Stack.Screen name="Test" component={TravelStyleGame} />

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
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F0F4F8' },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 26 },
  confirmButton: { backgroundColor: '#FF6B6B', paddingVertical: 15, paddingHorizontal: 60, borderRadius: 10, marginTop: 40 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  questionTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333', lineHeight: 30 },
  resultText: { fontSize: 70, fontWeight: '900', color: '#FF6B6B', marginVertical: 20, letterSpacing: 5 },
});