import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, ScrollView, RefreshControl,
  ImageBackground, SafeAreaView, StatusBar,
} from 'react-native';
//LinearGradient 일단 뺌
import Swiper from 'react-native-deck-swiper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TravelTypeModal from '../components/TravelTypeModal';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1549492423-400259a2e574?q=80&w=800&auto=format&fit=crop';

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
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState(null);
  const [selectedUserName, setSelectedUserName] = useState('');
  const [myTravelType, setMyTravelType] = useState(null);
  const [renderKey, setRenderKey] = useState(0);

  const fetchMatchingData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');

      const meRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) setMyTravelType(meData.user.travel_type);

      const response = await fetch(
        `https://triplan-backend-qwrs.onrender.com/users/matching?destination=${encodeURIComponent(destination)}`,
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
    if (!user) return;
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/matching/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ receiverId: user.id, status }),
      });
      const result = await response.json();

      if (status === 'accepted' && user.friend_code) {
        await fetch(`https://triplan-backend-qwrs.onrender.com/users/friendsAdd?friendCode=${user.friend_code}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (result.matched) {
        Alert.alert('🎉 매칭 성립!', `${user.nickname || user.name}님과 매칭됐어요!\n친구 요청도 함께 보냈습니다.`);
      }
    } catch (error) {
      console.log('스와이프 에러:', error);
    }
  };

  // ── 시작 전 화면 ──────────────────────────────
  if (!started) {
    return (
      <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
        <View style={styles.overlay} />
        <SafeAreaView style={styles.startContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.emoji}>🌊</Text>
            <Text style={styles.startTitle}>어디로 떠날까요?</Text>
            <Text style={styles.startSubtitle}>웅장한 자연이 기다리고 있어요.{'\n'}여행지를 입력하고 동행을 찾아보세요!</Text>
          </View>

          <View style={styles.formCard}>
            {allSwiped && (
              <View style={styles.allSwipedBanner}>
                <Text style={styles.allSwipedText}>🎉 모든 후보를 확인했습니다!</Text>
              </View>
            )}
            <TextInput
              style={styles.destinationInput}
              placeholder="예) 국내, 아시아, 유럽"
              value={destination}
              onChangeText={setDestination}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.startButton} onPress={fetchMatching}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.startButtonText}>매칭 시작하기</Text>}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // ── 매칭 카드 화면 ────────────────────────────
  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <View>
            <Text style={styles.headerLabel}>Exploring in</Text>
            <Text style={styles.headerTitle}>📍 {destination}</Text>
          </View>
          <TouchableOpacity onPress={() => setStarted(false)} style={styles.changeBtn}>
            <Text style={styles.changeButton}>지역 변경</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}>
          {!isDone ? (
            <View style={styles.swiperContainer}>
              <Swiper
                key={renderKey}
                ref={swiperRef}
                cards={users}
                cardIndex={cardIndex}
                cardStyle={styles.cardWrapper}
                renderCard={(user) => {
                  if (!user) return <View style={styles.card} />;

                  const age = user?.birth_year
                    ? new Date().getFullYear() - new Date(user.birth_year).getFullYear()
                    : null;

                  return (
                    <View style={styles.card}>
                      <Image
                        source={{ uri: user?.profile_image || 'https://via.placeholder.com/400' }}
                        style={styles.cardImage}
                      />
                      <View style={styles.cardGradient} />
                      <View style={styles.cardOverlay}>
                        <View style={styles.cardHeaderRow}>
                          <Text style={styles.cardName}>{user?.nickname || user?.name}</Text>
                          <TouchableOpacity
                            style={styles.compatBtn}
                            onPress={() => {
                              setSelectedUserType(user?.travel_type);
                              setSelectedUserName(user?.nickname || user?.name);
                              setTypeModalVisible(true);
                            }}
                            activeOpacity={0.8}>
                            <Text style={styles.compatBtnText}>💘 여행 궁합 보기</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.badgeRow}>
                          {user?.travel_type && (
                            <View style={styles.badge}>
                              <Text style={styles.badgeText}>{user.travel_type}</Text>
                            </View>
                          )}
                          {user?.gender && (
                            <View style={styles.infoTag}>
                              <Text style={styles.infoTagText}>{user.gender}</Text>
                            </View>
                          )}
                          {age != null && age > 0 && (
                            <View style={styles.infoTag}>
                              <Text style={styles.infoTagText}>{age}세</Text>
                            </View>
                          )}
                          {user?.preferred_destination && (
                            <View style={styles.preferredTag}>
                              <Text style={styles.preferredTagText}>
                                {'🗺 ' + user.preferred_destination.split(',').slice(0, 2).join(' · ') +
                                 (user.preferred_destination.split(',').length > 2 ? ' ...' : '')}
                              </Text>
                            </View>
                          )}
                        </View>
                        {user?.bio ? (
                          <Text style={styles.cardBio} numberOfLines={2}>{user.bio}</Text>
                        ) : null}
                      </View>
                    </View>
                  );
                }}
                onSwipedRight={(index) => {
                  setCardIndex(index + 1);
                  handleSwipe(index, 'accepted');
                  setTimeout(() => setRenderKey(prev => prev + 1), 150);
                }}
                onSwipedLeft={(index) => {
                  setCardIndex(index + 1);
                  handleSwipe(index, 'rejected');
                  setTimeout(() => setRenderKey(prev => prev + 1), 150);
                }}
                onSwipedAll={() => {
                  setIsDone(true);
                  setAllSwiped(true);
                  setStarted(false);
                }}
                backgroundColor="transparent"
                stackSize={3}
                animateCardOpacity
                overlayLabels={{
                  left:  { title: '넘기기',   style: { label: styles.overlayLabelLeft,  wrapper: styles.overlayWrapperLeft  } },
                  right: { title: '동행 신청', style: { label: styles.overlayLabelRight, wrapper: styles.overlayWrapperRight } },
                }}
              />
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>🏜️</Text>
              <Text style={styles.emptyText}>매칭 가능한 동행이 없습니다</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => setStarted(false)}>
                <Text style={styles.retryButtonText}>다른 장소 찾아보기</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <TravelTypeModal
        visible={typeModalVisible}
        onClose={() => setTypeModalVisible(false)}
        myType={myTravelType}
        otherType={selectedUserType}
        otherName={selectedUserName}
      />

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.4)' },
  container: { flex: 1 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 24, paddingVertical: 16 },
  headerLabel: { fontSize: 12, color: '#555', fontWeight: '700', marginBottom: 2 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a' },
  changeBtn: { backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  changeButton: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' },

  startContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  emoji: { fontSize: 64, marginBottom: 12 },
  startTitle: { fontSize: 30, fontWeight: '900', color: '#111', marginBottom: 10 },
  startSubtitle: { fontSize: 16, color: '#333', textAlign: 'center', lineHeight: 24, fontWeight: '500' },
  formCard: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 32, padding: 24, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 10 },
  destinationInput: { backgroundColor: '#fff', borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, fontSize: 16, color: '#333', marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  startButton: { backgroundColor: '#FF6B6B', borderRadius: 18, paddingVertical: 18, alignItems: 'center', shadowColor: '#FF6B6B', shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 } },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  swiperContainer: { flex: 1, marginTop: -10 },
  cardWrapper: { top: 0, left: 0, bottom: 80, width: '100%' },

  // ── 카드 ──────────────────────────────────────
  card: {
    flex: 0.82,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
    backgroundColor: '#111',
  },

  // 이미지 전체 배경
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },

  // 하단 그라데이션 (순수 View로 구현)
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '55%',
    backgroundColor: 'transparent',
    // 투명 → 어둡게 그라데이션 효과 (단색으로 근사)
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    // 여러 레이어로 그라데이션 효과
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0,
  },

  // 점수 뱃지 — 우상단
  scoreTag: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: 'rgba(255,243,205,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 3,
  },
  scoreText: { fontSize: 13, color: '#856404', fontWeight: 'bold' },

  // 하단 정보 오버레이
  cardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  cardName: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    flex: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // 궁합 버튼
  compatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.5,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  compatBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.2,
  },

  // 배지 행
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  badge: {
    backgroundColor: 'rgba(255,107,107,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: { fontSize: 12, color: '#fff', fontWeight: '900', letterSpacing: 1 },
  infoTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  infoTagText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },

  cardBio: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 19,
    fontWeight: '500',
  },

  // 스와이프 오버레이
  overlayLabelLeft: { backgroundColor: '#FF3B30', color: '#fff', fontSize: 28, fontWeight: 'bold', padding: 12, borderRadius: 10 },
  overlayWrapperLeft: { alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 40, marginLeft: -40 },
  overlayLabelRight: { backgroundColor: '#34C759', color: '#fff', fontSize: 28, fontWeight: 'bold', padding: 12, borderRadius: 10 },
  overlayWrapperRight: { alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 40, marginRight: 40 },

  allSwipedBanner: { backgroundColor: '#FFF0F0', padding: 14, borderRadius: 14, marginBottom: 16, alignItems: 'center' },
  allSwipedText: { color: '#FF6B6B', fontWeight: 'bold', fontSize: 14 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, backgroundColor: 'rgba(255,255,255,0.85)', margin: 20, borderRadius: 20, padding: 30 },
  emptyEmoji: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 18, color: '#444', fontWeight: '700', marginBottom: 24 },
  retryButton: { backgroundColor: '#FF6B6B', paddingHorizontal: 28, paddingVertical: 16, borderRadius: 18 },
  retryButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  preferredTag: {
    backgroundColor: 'rgba(108,92,231,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  preferredTagText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
});