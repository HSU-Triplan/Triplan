import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🌟 배경: 한국의 미, 경복궁
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1546436836-07a91091f160?q=80&w=800&auto=format&fit=crop';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [myPosts, setMyPosts] = useState([]);
  const [myChats, setMyChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const meRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) {
        setUserName(meData.user.nickname || meData.user.name || '');
      }

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

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

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

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}>

          <View style={styles.header}>
            <Text style={styles.greeting}>반가워요, {userName}님! ✨</Text>
            <Text style={styles.subGreeting}>오늘은 어디로 떠나고 싶으신가요? ✈️</Text>
          </View>

          {nextTrip ? (
            <View style={styles.dDayCard}>
              <View style={styles.dDayBadge}>
                <Text style={styles.dDayText}>
                  {calcDDay(nextTrip.departure_date) ?? '날짜 미정'}
                </Text>
              </View>
              <Text style={styles.dDayTitle}>다가오는 여행</Text>
              <Text style={styles.dDayDestination}>📍 {nextTrip.destination}</Text>
              <View style={styles.dDayInfo}>
                <Text style={styles.dDayInfoText}>🗓 {nextTrip.days}</Text>
                {nextTrip.departure_date ? (
                  <Text style={styles.dDayInfoText}>🛫 {nextTrip.departure_date}</Text>
                ) : null}
              </View>
              <Text style={styles.dDayBio} numberOfLines={1}>{nextTrip.bio}</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>예정된 여행이 없어요 🗺</Text>
              <Text style={styles.emptySubText}>탐색 탭에서 멋진 동행을 찾아보세요!</Text>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>나의 여행 지도</Text>

            {allTrips.length === 0 ? (
              <View style={styles.emptyListContainer}>
                <Text style={styles.emptyListText}>참여 중인 여행이 없습니다.</Text>
              </View>
            ) : (
              allTrips.map(trip => (
                <View key={trip.id} style={styles.tripCard}>
                  <View style={styles.tripLeft}>
                    <Text style={styles.tripDDay}>
                      {calcDDay(trip.departure_date) ?? '날짜 미정'}
                    </Text>
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
                      {trip.days} {trip.departure_date ? `· 🛫 ${trip.departure_date}` : ''}
                    </Text>
                    <Text style={styles.tripBio} numberOfLines={1}>{trip.bio}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
          <View style={{ height: 30 }} />
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240, 244, 248, 0.45)' },
  container: { flex: 1 },

  header: {
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 15,
    color: '#FF6B6B',
    fontWeight: '700',
    marginTop: 6,
  },

  // 🌟 피드백 반영: 투명도 제거하고 깔끔한 흰색(#FFFFFF)으로 통일
  dDayCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 24,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    marginBottom: 25,
  },
  dDayBadge: {
    backgroundColor: '#FF6B6B',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 16,
  },
  dDayText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  dDayTitle: { fontSize: 13, color: '#999', fontWeight: 'bold', marginBottom: 4 },
  dDayDestination: { fontSize: 26, fontWeight: '900', color: '#222', marginBottom: 10 },
  dDayInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  dDayInfoText: { fontSize: 14, color: '#666', fontWeight: '600' },
  dDayBio: { fontSize: 13, color: '#aaa', marginTop: 6, fontWeight: '500' },

  // 🌟 빈 카드도 흰색 통일
  emptyCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    marginBottom: 25,
  },
  emptyText: { fontSize: 16, color: '#555', fontWeight: 'bold', marginBottom: 8 },
  emptySubText: { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },

  section: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 19, fontWeight: '900', color: '#333', marginBottom: 15 },

  // 🌟 일반 여행 카드도 흰색 통일
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 3,
    gap: 15,
  },
  tripLeft: { width: 65, alignItems: 'center' },
  tripDDay: { fontSize: 14, fontWeight: '900', color: '#FF6B6B' },
  tripRight: { flex: 1 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  tripDestination: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  tripInfo: { fontSize: 13, color: '#777', fontWeight: '500' },
  tripBio: { fontSize: 12, color: '#aaa', marginTop: 2 },

  myPostBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  myPostBadgeText: { fontSize: 10, color: '#FF6B6B', fontWeight: 'bold' },

  // 🌟 리스트가 비어있을 때 박스도 흰색으로 통일
  emptyListContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  emptyListText: { color: '#999', fontSize: 14, fontWeight: '600' },
});