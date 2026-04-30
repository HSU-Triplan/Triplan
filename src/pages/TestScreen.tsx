import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Dimensions, ImageBackground, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const LANDMARK_IMAGES = [
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1601581875039-e899893d520c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1583422409516-15d0a084c0eb?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1474044159687-1ee9f3a51722?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=800&q=80'
];

export default function TestScreen({ navigation }: any) {
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState({ T: 0, C: 0, U: 0, N: 0, A: 0, R: 0, J: 0, P: 0 });
  const [isAnimating, setIsAnimating] = useState(false);

  const panX = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

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
    if (isAnimating) return;
    setIsAnimating(true);

    // 버튼 피드백
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const scoreKey = type as keyof typeof scores;
    const newScores = { ...scores, [scoreKey]: scores[scoreKey] + 1 };
    setScores(newScores);

    // ★ 항상 왼쪽으로 날아가도록 설정 (toValue: -width)
    Animated.timing(panX, {
      toValue: -width,
      duration: 350,
      useNativeDriver: true,
    }).start(async () => {
      if (step < questions.length - 1) {
        setStep(step + 1);

        // ★ 화면 밖 오른쪽(width)에서 대기하도록 설정
        panX.setValue(width);

        // 다시 중앙으로 슬라이드 인
        Animated.timing(panX, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }).start(() => {
          setIsAnimating(false);
        });
      } else {
        const r1 = newScores.T >= newScores.C ? 'T' : 'C';
        const r2 = newScores.U >= newScores.N ? 'U' : 'N';
        const r3 = newScores.A >= newScores.R ? 'A' : 'R';
        const r4 = newScores.J >= newScores.P ? 'J' : 'P';
        const finalResult = `${r1}${r2}${r3}${r4}`;

        await AsyncStorage.setItem('travelStyle', finalResult);
        navigation.replace('Result', { result: finalResult });
      }
    });
  };

  const currentQ = questions[step];
  const progressPercent = ((step + 1) / questions.length) * 100;

  return (
    <View style={styles.rootContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <Animated.View style={[styles.animatedScreen, { transform: [{ translateX: panX }] }]}>
        <ImageBackground source={{ uri: LANDMARK_IMAGES[step] }} style={styles.bgImage} resizeMode="cover">
          <View style={styles.darkOverlay} />

          <View style={styles.card}>
            <View style={styles.progressWrapper}>
              <View style={styles.progressContainer}>
                <Animated.View style={[styles.progressBar, { width: `${progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{step + 1} / 20</Text>
            </View>

            <Text style={styles.questionTitle}>{currentQ.q}</Text>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <TouchableOpacity
                style={styles.option1Button}
                onPress={() => handleSelect(currentQ.options[0].type)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{currentQ.options[0].text}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.option2Button}
                onPress={() => handleSelect(currentQ.options[1].type)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{currentQ.options[1].text}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </ImageBackground>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#000' },
  animatedScreen: { flex: 1 },
  bgImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  card: {
    width: '90%',
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 20,
    paddingVertical: 30,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 15 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 10,
  },
  progressWrapper: { marginBottom: 30 },
  progressContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#F2F4F6',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3182F6',
    borderRadius: 4,
  },
  progressText: { fontSize: 13, color: '#8B95A1', textAlign: 'right', fontWeight: '600' },
  questionTitle: { fontSize: 24, fontWeight: '800', marginBottom: 40, textAlign: 'center', color: '#191F28', lineHeight: 34 },
  option1Button: { backgroundColor: '#3182F6', paddingVertical: 20, borderRadius: 16, marginBottom: 12 },
  option2Button: { backgroundColor: '#F04452', paddingVertical: 20, borderRadius: 16, marginBottom: 12 },
  buttonText: { color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
});