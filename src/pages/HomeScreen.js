import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen() {
  const [userName, setUserName] = useState('');
  const [myPosts, setMyPosts] = useState([]);
  const [myChats, setMyChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      // 내 정보
      const meRes = await fetch('http://10.0.2.2:3000/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) {
        setUserName(meData.user.nickname || meData.user.name || '');
      }

      // 내가 작성한 글
      const postsRes = await fetch('http://10.0.2.2:3000/users/my-posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const postsData = await postsRes.json();
      if (postsData.success) setMyPosts(postsData.posts);

      // 내가 참여한 채팅방
      const chatsRes = await fetch('http://10.0.2.2:3000/posts/my-chats', {
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

  // 모든 여행 합치기 (내 글 + 참여 중인 채팅방)
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

  // D-Day 계산
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
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요, {userName}님! 👋</Text>
        <Text style={styles.subGreeting}>오늘도 즐거운 여행 되세요 ✈️</Text>
      </View>

      {/* D-Day 카드 */}
      {nextTrip ? (
        <View style={styles.dDayCard}>
          <View style={styles.dDayBadge}>
            <Text style={styles.dDayText}>
              {calcDDay(nextTrip.departure_date) ?? '날짜 미정'}
            </Text>
          </View>
          <Text style={styles.dDayTitle}>다음 여행</Text>
          <Text style={styles.dDayDestination}>📍 {nextTrip.destination}</Text>
          <View style={styles.dDayInfo}>
            <Text style={styles.dDayInfoText}>🗓 {nextTrip.days}</Text>
            {nextTrip.departure_date ? (
              <Text style={styles.dDayInfoText}>🛫 {nextTrip.departure_date}</Text>
            ) : null}
            {nextTrip.isMyPost && (
              <View style={styles.myPostBadge}>
                <Text style={styles.myPostBadgeText}>내 글</Text>
              </View>
            )}
          </View>
          <Text style={styles.dDayBio} numberOfLines={1}>{nextTrip.bio}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>예정된 여행이 없어요 🗺</Text>
          <Text style={styles.emptySubText}>탐색 탭에서 동행을 찾아보세요!</Text>
        </View>
      )}

      {/* 여행 목록 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>내 여행 목록</Text>

        {allTrips.length === 0 ? (
          <Text style={styles.emptyListText}>참여 중인 여행이 없습니다.</Text>
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

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#7EC8FF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  dDayCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    marginBottom: 16,
  },
  dDayBadge: {
    backgroundColor: '#5296F5',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  dDayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  dDayTitle: {
    fontSize: 13,
    color: '#2563EB',
    marginBottom: 4,
  },
  dDayDestination: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  dDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  dDayInfoText: {
    fontSize: 14,
    color: '#666',
  },
  dDayBio: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 16,
    padding: 30,
    elevation: 4,
    marginBottom: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#555',
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 13,
    color: '#aaa',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  emptyListText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    gap: 14,
  },
  tripLeft: {
    width: 60,
    alignItems: 'center',
  },
  tripDDay: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7EC8FF',
  },
  tripRight: {
    flex: 1,
  },
  tripTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tripInfo: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  tripBio: {
    fontSize: 12,
    color: '#aaa',
  },
  myPostBadge: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  myPostBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
});