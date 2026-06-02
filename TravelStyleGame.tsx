import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, Dimensions, StyleSheet, SafeAreaView, ImageBackground, Alert } from 'react-native';
import * as Progress from 'react-native-progress';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop';

const TravelStyleGame = ({ navigation }: any) => {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({ T: 0, C: 0, U: 0, N: 0, A: 0, R: 0, J: 0, P: 0 });
  const slideAnim = useRef(new Animated.Value(0)).current;

  const questions = [
    // ── T/C 축 — 활동형 vs 여유형 (걷기 기준) ──────────────────
    {
      q: '관광지 간 거리가 도보 30분이라면?',
      options: [
        { text: '걸어가면서 주변 구경하는 게 더 재밌지!', type: 'T' },
        { text: '시간 아깝다, 교통수단 타고 이동하자', type: 'C' },
      ],
    },
    {
      q: '하루 여행에서 몇 걸음 정도 걷는 걸 선호하나요?',
      options: [
        { text: '1만 보 이상도 OK, 많이 걸어야 제대로 여행한 느낌', type: 'T' },
        { text: '5천 보 이하, 꼭 필요한 이동만 하고 싶다', type: 'C' },
      ],
    },
    {
      q: '유명 관광지인데 주차장에서 20분을 걸어야 한다면?',
      options: [
        { text: '걸어가면서 분위기 느끼는 것도 여행이지!', type: 'T' },
        { text: '좀 더 가까이 세울 수 있는 방법을 찾아본다', type: 'C' },
      ],
    },
    {
      q: '여행 첫날 저녁, 발이 좀 아프다. 내일 일정은?',
      options: [
        { text: '괜찮아, 내일도 열심히 걸어다니며 탐방하자!', type: 'T' },
        { text: '내일은 이동 최소화, 한 곳에서 여유롭게 즐기자', type: 'C' },
      ],
    },
    {
      q: '짐이 꽤 무거운데 숙소까지 도보 15분이라면?',
      options: [
        { text: '천천히 걸어가면서 동네 구경도 하지 뭐', type: 'T' },
        { text: '무거운 짐 들고 걷긴 힘들어, 택시 부르자', type: 'C' },
      ],
    },

    // ── U/N 축 — 도심 vs 자연 ───────────────────────────────────
    {
      q: '이번 주말, 당장 떠나고 싶은 곳은?',
      options: [
        { text: '화려한 야경과 맛집이 넘치는 핫플 도심', type: 'U' },
        { text: '파도 소리만 들리는 조용한 바다나 숲속', type: 'N' },
      ],
    },
    {
      q: '숙소를 고를 때 더 끌리는 창밖 뷰는?',
      options: [
        { text: '탁 트인 시티뷰와 높은 빌딩들', type: 'U' },
        { text: '창문 너머로 보이는 푸른 산이나 오션뷰', type: 'N' },
      ],
    },
    {
      q: '여행 중 우연히 발견하고 싶은 장소는?',
      options: [
        { text: '트렌디한 인테리어의 감성 카페나 소품샵', type: 'U' },
        { text: '사람들의 발길이 닿지 않은 숨겨진 산책로', type: 'N' },
      ],
    },
    {
      q: '여행지에서의 저녁, 내가 원하는 분위기는?',
      options: [
        { text: '힙한 펍이나 루프탑 바에서 즐기는 칵테일', type: 'U' },
        { text: '조용한 숙소 테라스에서 밤하늘 별 보며 맥주', type: 'N' },
      ],
    },
    {
      q: '내 앨범 속 여행 인생샷의 배경은 주로 어떤 곳?',
      options: [
        { text: '화려한 네온사인과 멋진 건축물 앞', type: 'U' },
        { text: '웅장한 대자연이나 예쁜 꽃밭 앞', type: 'N' },
      ],
    },

    // ── A/R 축 — 액티브 vs 힐링 ─────────────────────────────────
    {
      q: '여행지에서 아침에 일어났을 때 나의 생각은?',
      options: [
        { text: '오늘 할 액티비티가 기대돼서 벌써 설렌다!', type: 'A' },
        { text: '조식 먹고 침대에서 좀 더 뒹굴거려야지', type: 'R' },
      ],
    },
    {
      q: '이번 여행에 예산을 가장 많이 투자하고 싶은 곳은?',
      options: [
        { text: '스노클링, 패러글라이딩 등 특별한 체험', type: 'A' },
        { text: '5성급 호텔 호캉스나 미슐랭 맛집', type: 'R' },
      ],
    },
    {
      q: '여행지에서 하루 일정이 텅 비었다. 나는?',
      options: [
        { text: '근처에 할 수 있는 레저나 원데이 클래스 검색', type: 'A' },
        { text: '맛있는 거 먹고 예쁜 카페 가서 멍 때리기', type: 'R' },
      ],
    },
    {
      q: '친구가 "이번 여행은 쉬러 가자!"라고 한다면?',
      options: [
        { text: '그래도 하루 정도는 땀 흘리는 액티비티가 필수!', type: 'A' },
        { text: '무조건 풀빌라에서 수영하고 스파하면서 푹 쉬기!', type: 'R' },
      ],
    },
    {
      q: '여행 다녀와서 가장 기억에 남는 순간은?',
      options: [
        { text: '평소에 못해본 짜릿하고 새로운 경험을 했을 때', type: 'A' },
        { text: '정말 맛있는 음식을 먹고 푹 쉬면서 힐링했을 때', type: 'R' },
      ],
    },

    // ── J/P 축 — 계획 vs 즉흥 ───────────────────────────────────
    {
      q: '친구들과 여행을 가기로 했다. 내 역할은 주로?',
      options: [
        { text: '비행기, 숙소, 동선을 엑셀표로 쫙 정리하는 역할', type: 'J' },
        { text: '친구들이 짠 계획에 "오 좋아!" 하며 호응하는 역할', type: 'P' },
      ],
    },
    {
      q: '여행 출발 전날 밤, 나의 상태는?',
      options: [
        { text: '짐은 이미 다 쌌고, 내일 입을 옷까지 세팅 완료!', type: 'J' },
        { text: '일단 자고, 내일 아침에 일어나서 대충 챙기지 뭐', type: 'P' },
      ],
    },
    {
      q: '여행 중 찾은 맛집이 문을 닫았다! 나의 반응은?',
      options: [
        { text: '플랜 B 리스트를 열어서 근처 다른 식당으로 간다', type: 'J' },
        { text: '아쉽네~ 그냥 걷다가 맛있어 보이는 곳 들어가자', type: 'P' },
      ],
    },
    {
      q: '나에게 "여행 계획"이란?',
      options: [
        { text: '시간 단위로 동선을 짜야 마음이 편안해진다', type: 'J' },
        { text: '비행기랑 숙소만 예약하면 계획 끝 아닌가?', type: 'P' },
      ],
    },
    {
      q: '이번 여행에서 내가 더 행복을 느끼는 순간은?',
      options: [
        { text: '내가 짠 계획대로 착착 완벽하게 일정이 진행될 때', type: 'J' },
        { text: '계획에 없던 예쁜 장소를 우연히 발견했을 때', type: 'P' },
      ],
    },
  ];

  const saveResult = async (finalType: string) => {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        navigation.replace('Result', { result: finalType });
        return;
      }

      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/travel-type', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ travelType: finalType }),
      });

      if (response.status === 401) {
        await AsyncStorage.removeItem('token');
      }

      navigation.replace('Result', { result: finalType });
    } catch (error) {
      console.log('성향 저장 에러:', error);
      navigation.replace('Result', { result: finalType });
    }
  };

  const handleSelect = (type: string) => {
    const newScores = { ...scores, [type]: scores[type] + 1 };
    setScores(newScores);

    Animated.timing(slideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      if (step < questions.length - 1) {
        setStep(step + 1);
        slideAnim.setValue(width);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        const r1 = newScores.T >= newScores.C ? 'T' : 'C';
        const r2 = newScores.U >= newScores.N ? 'U' : 'N';
        const r3 = newScores.A >= newScores.R ? 'A' : 'R';
        const r4 = newScores.J >= newScores.P ? 'J' : 'P';
        const finalResult = `${r1}${r2}${r3}${r4}`;
        saveResult(finalResult);
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: BACKGROUND_IMAGE_URI }}
        style={styles.backgroundImage}
        blurRadius={8}
        resizeMode="cover">
        <View style={styles.overlay} />
        <View style={styles.content}>

          <View style={styles.progressSection}>
            <Text style={styles.progressText}>
              여행지까지 남은 거리: {Math.round(((questions.length - step) / questions.length) * 100)}km
            </Text>
            <Progress.Bar
              progress={(step + 1) / questions.length}
              width={width * 0.8}
              color="#FF6B6B"
              height={10}
              borderRadius={5}
            />
          </View>

          <Animated.View style={[styles.card, { transform: [{ translateX: slideAnim }] }]}>
            <Text style={styles.stepIndicator}>{step + 1} / {questions.length}</Text>
            <Text style={styles.questionText}>{questions[step].q}</Text>

            <View style={styles.buttonContainer}>
              {questions[step].options.map((opt, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.choiceBtn, i === 0 ? styles.btnLeft : styles.btnRight]}
                  onPress={() => handleSelect(opt.type)}>
                  <Text style={styles.btnText}>{opt.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

        </View>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  backgroundImage: { flex: 1, width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.75)' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressSection: { position: 'absolute', top: 40, alignItems: 'center' },
  progressText: { marginBottom: 10, fontWeight: 'bold', color: '#555' },
  card: {
    width: width * 0.85,
    backgroundColor: 'white',
    borderRadius: 30,
    padding: 30,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    alignItems: 'center',
    marginTop: 60,
  },
  stepIndicator: { fontSize: 14, color: '#AAA', fontWeight: 'bold', marginBottom: 15 },
  questionText: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', color: '#333', marginBottom: 30, lineHeight: 28 },
  buttonContainer: { width: '100%' },
  choiceBtn: { padding: 18, borderRadius: 15, alignItems: 'center', borderWidth: 2, marginBottom: 12 },
  btnLeft: { backgroundColor: '#E3F2FD', borderColor: '#2196F3' },
  btnRight: { backgroundColor: '#FFF3E0', borderColor: '#FF9800' },
  btnText: { fontSize: 16, fontWeight: 'bold', color: '#444', textAlign: 'center' },
});

export default TravelStyleGame;