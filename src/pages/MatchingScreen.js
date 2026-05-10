import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
} from 'react-native';
import Swiper from 'react-native-deck-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

export default function MatchingScreen() {
  const [destination, setDestination] = useState('');
  const [started, setStarted] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);
  const swiperRef = useRef(null);
  const [allSwiped, setAllSwiped] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

 const fetchMatchingData = async () => {
   try {
     const token = await AsyncStorage.getItem('token');
     const response = await fetch(
       `http://10.0.2.2:3000/users/matching?destination=${encodeURIComponent(destination)}`,
       { headers: { Authorization: `Bearer ${token}` } }
     );
     const result = await response.json();
     if (result.success) {
       setUsers(result.users);
       setIsDone(false);
     }
   } catch (error) {
     console.log('매칭 에러:', error);
   }
 };

 const fetchMatching = async () => {
   if (!destination.trim()) {
     Alert.alert('여행지를 입력해주세요!');
     return;
   }
   setLoading(true);
   await fetchMatchingData();
   setStarted(true);
   setLoading(false);
 };

  const onRefresh = async () => {
    setRefreshing(true);
    setIsDone(false);
    await fetchMatchingData();
    setRefreshing(false);
  };
  const handleSwipe = async (index, status) => {
    const user = users[index];
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://10.0.2.2:3000/users/matching/swipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiverId: user.id,
          status,
        }),
      });
      const result = await response.json();
      if (result.matched) {
        Alert.alert('🎉 매칭 성립!', `${user.nickname || user.name}님과 매칭됐어요!`);
      }
    } catch (error) {
      console.log('스와이프 에러:', error);
    }
  };

  // 여행지 입력 화면
  if (!started) {
    return (
      <View style={styles.startContainer}>
      {allSwiped && (
        <View style={styles.allSwipedBanner}>
          <Text style={styles.allSwipedText}>🎉 모든 동행 후보를 확인했어요!</Text>
          <Text style={styles.allSwipedSub}>다른 여행지로 새로운 동행을 찾아보세요.</Text>
        </View>
      )}
        <Text style={styles.startTitle}>✈️ 어디로 떠날까요?</Text>
        <Text style={styles.startSubtitle}>여행지를 입력하면{'\n'}나와 맞는 동행을 찾아드려요!</Text>
        <TextInput
          style={styles.destinationInput}
          placeholder="예) 도쿄, 제주도, 파리"
          value={destination}
          onChangeText={setDestination}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          style={styles.startButton}
          onPress={fetchMatching}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startButtonText}>매칭 시작하기</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

return (
  <View style={styles.container}>
    {/* 헤더 */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>📍 {destination} 동행 매칭</Text>
      <TouchableOpacity onPress={() => setStarted(false)}>
        <Text style={styles.changeButton}>변경</Text>
      </TouchableOpacity>
    </View>

    {/* 스와이퍼 영역 */}
    <ScrollView
      contentContainerStyle={{ flex: 1 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          title="당겨서 새로고침"
        />
      }>
    {!isDone ? (
      <View style={styles.swiperContainer}>
          <Swiper
            ref={swiperRef}
            cards={users}
            cardStyle={{ top: 0, left: 0, right: 0, bottom: 0, width: '100%' }}
            renderCard={(user) => {
              if (!user) return <View style={styles.card} />;
              return (
                <View style={styles.card}>
                  <Image
                    source={{ uri: user?.profile_image || 'https://via.placeholder.com/200' }}
                    style={styles.cardImage}
                  />
                  <View style={styles.cardBody}>
                    <View style={styles.scoreTag}>
                      <Text style={styles.scoreText}>⭐ {user?.score}점</Text>
                    </View>
                    <Text style={styles.cardName}>{user?.nickname || user?.name}</Text>
                    <Text style={styles.cardType}>{user?.travel_type ?? '성향 미설정'}</Text>
                    {user?.bio ? <Text style={styles.cardBio}>{user?.bio}</Text> : null}
                    <View style={styles.cardInfo}>
                      {user?.gender ? <Text style={styles.cardInfoTag}>{user.gender}</Text> : null}
                      {user?.birth_year ? (
                        <Text style={styles.cardInfoTag}>
                          {new Date().getFullYear() - new Date(user.birth_year).getFullYear()}세
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
            onSwiped={(index) => setCardIndex(index + 1)}
            onSwipedRight={(index) => handleSwipe(index, 'accepted')}
            onSwipedLeft={(index) => handleSwipe(index, 'rejected')}
            onSwipedAll={() => {
              setIsDone(true);
              setAllSwiped(true);
              setStarted(false);
            }}
            backgroundColor="transparent"
            stackSize={2}
            disableTopSwipe
            disableBottomSwipe
            animateCardOpacity
            overlayLabels={{
              left: {
                element: (
                  <View style={styles.overlayWrapper}>
                    <Text style={styles.overlayPass}>패스</Text>
                    <Text style={styles.overlayInvite}>초대</Text>
                  </View>
                ),
                style: {
                  wrapper: {
                    backgroundColor: 'rgba(120,120,120,0.6)',
                    borderRadius: 20,
                    flex: 1,
                  },
                },
              },
              right: {
                element: (
                  <View style={styles.overlayWrapper}>
                    <Text style={styles.overlayPass}>패스</Text>
                    <Text style={styles.overlayInvite}>초대</Text>
                  </View>
                ),
                style: {
                  wrapper: {
                    backgroundColor: 'rgba(120,120,120,0.6)',
                    borderRadius: 20,
                    flex: 1,
                  },
                },
              },
            }}
          />
      </View>
    ) : (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>😢 매칭할 수 있는 유저가 없어요</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => setStarted(false)}>
          <Text style={styles.retryButtonText}>다시 시도</Text>
        </TouchableOpacity>
      </View>
    )}
   </ScrollView>
  </View>
);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  changeButton: { fontSize: 14, color: '#4A90E2', fontWeight: 'bold' },
  startContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
  },

  startTitle: { fontSize: 26, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  startSubtitle: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  destinationInput: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  startButton: {
    width: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888', marginBottom: 20 },
  retryButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryButtonText: { color: '#fff', fontWeight: 'bold' },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: 260,
    backgroundColor: '#ddd',
  },
  cardBody: { padding: 20 },
  scoreTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
  },
  scoreText: { fontSize: 13, color: '#856404', fontWeight: 'bold' },
  cardName: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardType: { fontSize: 14, color: '#4A90E2', marginBottom: 8 },
  cardBio: { fontSize: 14, color: '#666', marginBottom: 10 },
  cardInfo: { flexDirection: 'row', gap: 8 },
  cardInfoTag: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 20,
    paddingHorizontal: 40,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  allSwipedBanner: {
    backgroundColor: '#EAF2FB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    width: '100%',
  },
  allSwipedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
    marginBottom: 4,
  },
  allSwipedSub: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  overlayWrapper: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  overlayPass: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  overlayInvite: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#34C759',
  },
  swiperContainer: {
    flex: 1,
    marginBottom: 16,
  },
  actionButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});