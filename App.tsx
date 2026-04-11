import React, { useEffect, useState } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';

import LoginScreen from './src/pages/LoginScreen';
import TabNavigator from './src/navigation/TabNavigator';

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
        // 혹시라도 기기 저장소 에러가 나면 안전하게 테스트 화면으로 보냅니다.
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

// 3. 설문조사 화면
const TestScreen = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({ T: 0, C: 0, U: 0, N: 0, A: 0, R: 0, J: 0, P: 0 });

  const questions = [
    { q: '공항에서 숙소로 이동할 때 나는?', options: [{ text: '버스나 지하철 노선을 검색한다', type: 'T' }, { text: '편하게 택시나 렌트카를 이용한다', type: 'C' }] },
    { q: '여행지에서 다음 장소로 이동해야 할 때 나의 생각은?', options: [{ text: '걸어가면서 주변 풍경도 구경해야지', type: 'T' }, { text: '시간 아깝다, 차 타고 빨리 이동하자', type: 'C' }] },
    { q: '버스를 타야 하는데 배차 간격이 1시간이라고 한다.', options: [{ text: '주변을 둘러보며 시간을 때우고 기다린다', type: 'T' }, { text: '1시간은 무리야, 바로 택시를 부른다', type: 'C' }] },
    { q: '렌트카를 빌리려는데 예상보다 꽤 비싸다.', options: [{ text: '그 돈으로 맛있는 거 먹자! 대중교통 이용', type: 'T' }, { text: '여행은 무조건 편해야지! 돈을 더 내고 빌린다', type: 'C' }] },
    { q: '여행지에서 짐이 꽤 무거운 상황이다.', options: [{ text: '짐칸이 있는 대중교통을 잘 찾아서 타면 돼', type: 'T' }, { text: '무조건 트렁크에 넣을 수 있는 차가 최고야', type: 'C' }] },
    { q: '이번 주말, 당장 떠나고 싶은 곳은?', options: [{ text: '화려한 야경과 맛집이 넘치는 핫플 도심', type: 'U' }, { text: '파도 소리만 들리는 조용한 바다나 숲속', type: 'N' }] },
    { q: '숙소를 고를 때 더 끌리는 창밖 뷰는?', options: [{ text: '탁 트인 시티뷰와 높은 빌딩들', type: 'U' }, { text: '창문 너머로 보이는 푸른 산이나 오션뷰', type: 'N' }] },
    { q: '여행 중 우연히 발견하고 싶은 장소는?', options: [{ text: '트렌디한 인테리어의 감성 카페나 소품샵', type: 'U' }, { text: '사람들의 발길이 닿지 않은 숨겨진 산책로', type: 'N' }] },
    { q: '여행지에서의 저녁, 내가 원하는 분위기는?', options: [{ text: '힙한 펍이나 루프탑 바에서 즐기는 칵테일', type: 'U' }, { text: '조용한 숙소 테라스에서 밤하늘 별 보며 맥주', type: 'N' }] },
    { q: '내 앨범 속 여행 인생샷의 배경은 주로 어떤 곳?', options: [{ text: '화려한 네온사인과 멋진 건축물 앞', type: 'U' }, { text: '웅장한 대자연이나 예쁜 꽃밭 앞', type: 'N' }] },
    { q: '여행지에서 아침에 일어났을 때 나의 생각은?', options: [{ text: '오늘 할 액티비티가 기대돼서 벌써 설렌다!', type: 'A' }, { text: '조식 먹고 침대에서 좀 더 뒹굴거려야지', type: 'R' }] },
    { q: '이번 여행에 예산을 가장 많이 투자하고 싶은 곳은?', options: [{ text: '스노클링, 패러글라이딩 등 특별한 체험', type: 'A' }, { text: '5성급 호텔 호캉스나 미슐랭 맛집', type: 'R' }] },
    { q: '여행지에서 하루 일정이 텅 비었다. 나는?', options: [{ text: '근처에 할 수 있는 레저나 원데이 클래스 검색', type: 'A' }, { text: '맛있는 거 먹고 예쁜 카페 가서 멍 때리기', type: 'R' }] },
    { q: '친구가 "이번 여행은 쉬러 가자!"라고 한다면?', options: [{ text: '그래도 하루 정도는 땀 흘리는 액티비티가 필수!', type: 'A' }, { text: '무조건 풀빌라에서 수영하고 스파하면서 푹 쉬기!', type: 'R' }] },
    { q: '여행 다녀와서 가장 기억에 남는 순간은 언제인가?', options: [{ text: '평소에 못해본 짜릿하고 새로운 경험을 했을 때', type: 'A' }, { text: '정말 맛있는 음식을 먹고 푹 쉬면서 힐링했을 때', type: 'R' }] },
    { q: '친구들과 여행을 가기로 했다. 내 역할은 주로?', options: [{ text: '비행기, 숙소, 동선을 엑셀표로 쫙 정리하는 역할', type: 'J' }, { text: '친구들이 짠 계획에 "오 좋아!" 하며 호응하는 역할', type: 'P' }] },
    { q: '여행 출발 전날 밤, 나의 상태는?', options: [{ text: '짐은 이미 다 쌌고, 내일 입을 옷까지 세팅 완료!', type: 'J' }, { text: '일단 자고, 내일 아침에 일어나서 대충 챙기지 뭐', type: 'P' }] },
    { q: '여행 중 찾은 맛집이 문을 닫았다! 나의 반응은?', options: [{ text: '플랜 B 리스트를 열어서 근처 다른 식당으로 간다', type: 'J' }, { text: '아쉽네~ 그냥 걷다가 맛있어 보이는 곳 들어가자', type: 'P' }] },
    { q: '나에게 "여행 계획"이란?', options: [{ text: '시간 단위로 동선을 짜야 마음이 편안해진다', type: 'J' }, { text: '비행기랑 숙소만 예약하면 계획 끝 아닌가?', type: 'P' }] },
    { q: '이번 여행에서 내가 더 행복을 느끼는 순간은?', options: [{ text: '내가 짠 계획대로 착착 완벽하게 일정이 진행될 때', type: 'J' }, { text: '계획에 없던 예쁜 장소를 우연히 발견했을 때', type: 'P' }] }
  ];

  const handleSelect = async (type: string) => {
    // @ts-ignore (TypeScript 에러 방지용 - 지우지 마세요!)
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);

    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      const r1 = newScores.T >= newScores.C ? 'T' : 'C';
      const r2 = newScores.U >= newScores.N ? 'U' : 'N';
      const r3 = newScores.A >= newScores.R ? 'A' : 'R';
      const r4 = newScores.J >= newScores.P ? 'J' : 'P';
      const finalResult = `${r1}${r2}${r3}${r4}`;

      await AsyncStorage.setItem('travelStyle', finalResult);
      navigation.replace('Result', { result: finalResult });
    }
  };

  return (
    <SafeAreaView style={styles.testContainer}>
      <Text style={styles.progressText}>{`${step + 1} / 20`}</Text>
      <Text style={styles.questionTitle}>{questions[step].q}</Text>
      {questions[step].options.map((opt, i) => (
        <TouchableOpacity key={i} style={styles.optionButton} onPress={() => handleSelect(opt.type)}>
          <Text style={styles.buttonText}>{opt.text}</Text>
        </TouchableOpacity>
      ))}
    </SafeAreaView>
  );
};

// 4. 결과 화면
const ResultScreen = ({ route, navigation }: any) => {
  // 에러 방지: 파라미터가 혹시라도 없을 경우를 대비한 안전 장치
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

// 5. 메인 App
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
  testContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#fff' },
  subtitle: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 10, lineHeight: 26 },
  optionButton: { backgroundColor: '#4A90E2', paddingVertical: 18, paddingHorizontal: 15, borderRadius: 10, marginBottom: 15 },
  confirmButton: { backgroundColor: '#4A90E2', paddingVertical: 15, paddingHorizontal: 60, borderRadius: 10, marginTop: 40 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  progressText: { fontSize: 14, color: '#888', marginBottom: 20, textAlign: 'center' },
  questionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333', lineHeight: 30 },
  resultText: { fontSize: 70, fontWeight: '900', color: '#FF6B6B', marginVertical: 20, letterSpacing: 5 },
});