import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1546436836-07a91091f160?q=80&w=800&auto=format&fit=crop';

const QUICK_TABS = [
  { label: '동행 찾기',    sub: '새로운 여행 동행을\n탐색해보세요',   emoji: '🔍', tab: '탐색' },
  { label: '여행 매칭',    sub: '성향이 맞는 동행을\n찾아보세요',     emoji: '💘', tab: '매칭' },
  { label: '내 채팅방',    sub: '여행 멤버들과\n대화해보세요',        emoji: '💬', tab: '채팅' },
  { label: '친구 관리',    sub: '친구를 추가하고\n함께 여행해요',     emoji: '🤝', tab: '친구' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const [userName, setUserName] = useState('');
  const [myChats, setMyChats] = useState([]);
  const [myPosts, setMyPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const meRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) setUserName(meData.user.nickname || meData.user.name || '');

      const postsRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/my-posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const postsData = await postsRes.json();
      if (postsData.success) setMyPosts(postsData.posts);

      const chatsRes = await fetch('https://triplan-backend-qwrs.onrender.com/posts/my-chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const chatsData = await chatsRes.json();
      if (chatsData.success) setMyChats(chatsData.chats);

    } catch (error) {
      console.log('홈 데이터 에러:', error);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const allTrips = [
    ...myPosts.map(p => ({
      id: `post-${p.id}`,
      destination: p.destination,
      days: p.days,
      departure_date: p.departure_date,
      bio: p.bio,
      isMyPost: true,
    })),
    ...myChats.map(c => ({
      id: `chat-${c.chat_rooms?.id}`,
      destination: c.chat_rooms?.posts?.destination,
      days: c.chat_rooms?.posts?.days,
      departure_date: c.chat_rooms?.posts?.departure_date,
      bio: c.chat_rooms?.posts?.bio,
      isMyPost: false,
    })),
  ]
    .filter(t => t.destination)
    .sort((a, b) => {
      if (!a.departure_date) return 1;
      if (!b.departure_date) return -1;
      return new Date(a.departure_date) - new Date(b.departure_date);
    });

  const calcDDay = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'D-Day';
    if (diff > 0) return `D-${diff}`;
    return `D+${Math.abs(diff)}`;
  };

  const nextTrip = allTrips.find(t => {
    if (!t.departure_date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(t.departure_date);
    target.setHours(0, 0, 0, 0);
    return target >= today;
  });

  // 시간대별 인사말
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6)  return '좋은 새벽이에요 🌙';
    if (hour < 12) return '좋은 아침이에요 ☀️';
    if (hour < 18) return '좋은 오후예요 🌤';
    return '좋은 저녁이에요 🌆';
  };

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}>

          {/* 인사말 */}
          <View style={styles.header}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{userName}님 👋</Text>
            <Text style={styles.subGreeting}>오늘은 어디로 떠나고 싶으신가요? ✈️</Text>
          </View>

          {/* D-Day 카드 */}
          {nextTrip ? (
            <View style={styles.dDayCard}>
              <View style={styles.dDayBadge}>
                <Text style={styles.dDayText}>{calcDDay(nextTrip.departure_date) ?? '날짜 미정'}</Text>
              </View>
              <Text style={styles.dDayTitle}>다가오는 여행</Text>
              <Text style={styles.dDayDestination}>📍 {nextTrip.destination}</Text>
              <View style={styles.dDayInfo}>
                <Text style={styles.dDayInfoText}>🗓 {nextTrip.days}</Text>
                {nextTrip.departure_date && (
                  <Text style={styles.dDayInfoText}>🛫 {nextTrip.departure_date}</Text>
                )}
              </View>
              <Text style={styles.dDayBio} numberOfLines={1}>{nextTrip.bio}</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>예정된 여행이 없어요 🗺</Text>
              <Text style={styles.emptySubText}>탐색 탭에서 멋진 동행을 찾아보세요!</Text>
            </View>
          )}

          {/* 빠른 탭 이동 2x2 그리드 */}
          <View style={styles.sectionHeader}>
          </View>
          <View style={styles.gridContainer}>
            {QUICK_TABS.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.gridCard}
                onPress={() => navigation.navigate(item.tab)}
                activeOpacity={0.85}>
                <Text style={styles.gridEmoji}>{item.emoji}</Text>
                <Text style={styles.gridLabel}>{item.label}</Text>
                <Text style={styles.gridSub}>{item.sub}</Text>
                <View style={styles.gridArrow}>
                  <Text style={styles.gridArrowText}>→</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 나의 여행 리스트 */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>나의 여행</Text>
            <Text style={styles.sectionCount}>{allTrips.length}개</Text>
          </View>

          {allTrips.length === 0 ? (
            <View style={styles.emptyListContainer}>
              <Text style={styles.emptyListText}>참여 중인 여행이 없습니다.</Text>
            </View>
          ) : (
            <View style={styles.tripList}>
              {allTrips.map(trip => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripLeft}>
                    <Text style={styles.tripDDay}>{calcDDay(trip.departure_date) ?? '미정'}</Text>
                  </View>
                  <View style={styles.tripRight}>
                    <View style={styles.tripTitleRow}>
                      <Text style={styles.tripDestination}>{trip.destination}</Text>
                      {trip.isMyPost && (
                        <View style={styles.myPostBadge}>
                          <Text style={styles.myPostBadgeText}>내 글</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.tripInfo}>
                      {trip.days}{trip.departure_date ? ` · 🛫 ${trip.departure_date}` : ''}
                    </Text>
                    <Text style={styles.tripBio} numberOfLines={1}>{trip.bio}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240, 244, 248, 0.45)' },
  container: { flex: 1 },

  // 헤더
  header: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 36 },
  greeting: { fontSize: 15, color: '#666', fontWeight: '700', marginBottom: 4 },
  userName: { fontSize: 28, fontWeight: '900', color: '#222', letterSpacing: -0.5, marginBottom: 6 },
  subGreeting: { fontSize: 14, color: '#FF6B6B', fontWeight: '700' },

  // D-Day 카드
  dDayCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 28,
  },
  dDayBadge: { backgroundColor: '#FF6B6B', alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, marginBottom: 14 },
  dDayText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  dDayTitle: { fontSize: 12, color: '#999', fontWeight: 'bold', marginBottom: 4 },
  dDayDestination: { fontSize: 24, fontWeight: '900', color: '#222', marginBottom: 10 },
  dDayInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  dDayInfoText: { fontSize: 13, color: '#666', fontWeight: '600' },
  dDayBio: { fontSize: 12, color: '#aaa', marginTop: 4, fontWeight: '500' },

  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -16,
    borderRadius: 24,
    padding: 36,
    alignItems: 'center',
    marginBottom: 28,
    elevation: 6,
  },
  emptyText: { fontSize: 16, color: '#555', fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },

  // 섹션 헤더
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#222' },
  sectionCount: { fontSize: 13, color: '#aaa', fontWeight: 'bold' },

  // 2x2 그리드
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 28,
  },
  gridCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 20,
    padding: 18,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  gridEmoji: { fontSize: 28, marginBottom: 10 },
  gridLabel: { fontSize: 16, fontWeight: '900', color: '#222', marginBottom: 4 },
  gridSub: { fontSize: 11, color: '#888', lineHeight: 16, marginBottom: 12 },
  gridArrow: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B6B',
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  gridArrowText: { color: '#fff', fontWeight: '900', fontSize: 14 },

  // 나의 여행 리스트
  tripList: { paddingHorizontal: 20, gap: 10 },
  tripCard: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    gap: 14,
  },
  tripLeft: { width: 58, alignItems: 'center' },
  tripDDay: { fontSize: 13, fontWeight: '900', color: '#FF6B6B', textAlign: 'center' },
  tripRight: { flex: 1 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  tripDestination: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tripInfo: { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 2 },
  tripBio: { fontSize: 12, color: '#bbb' },
  myPostBadge: { backgroundColor: 'rgba(255,107,107,0.1)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#FF6B6B' },
  myPostBadgeText: { fontSize: 10, color: '#FF6B6B', fontWeight: 'bold' },

  emptyListContainer: { marginHorizontal: 20, backgroundColor: 'rgba(255,255,255,0.85)', padding: 24, borderRadius: 18, alignItems: 'center' },
  emptyListText: { color: '#aaa', fontSize: 14, fontWeight: '600' },
});