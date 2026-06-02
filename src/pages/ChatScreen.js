import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ImageBackground, // 🌟 배경 이미지를 위해 추가
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 🌟 세계 랜드마크 배경 이미지 (에펠탑/파리 무드)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop';

export default function ChatScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts/my-chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setChats(result.chats);
      }
    } catch (error) {
      console.log('채팅방 목록 에러:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  return (
    // 🌟 1. 전체 화면을 배경 이미지로 감싸기
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={3}>
      <View style={styles.overlay} />


        {/* 🌟 2. 고급스러운 타이틀 헤더 */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>나의 여행 채팅방</Text>
          <Text style={styles.headerSub}>새로운 동행들과의 설레는 대화</Text>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>여행 기록을 불러오는 중...</Text>
            </View>
          ) : chats.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>참여한 채팅방이 없습니다. 텅 비어있네요! ✈️</Text>
            </View>
          ) : (
            chats.map((chat) => {
              const room = chat.chat_rooms;
              const post = room?.posts;
              const author = post?.users;

              return (
                // 🌟 3. 글래스모피즘(투명 유리) 둥근 카드 스타일 적용
                <TouchableOpacity
                  key={room?.id}
                  style={styles.chatCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('ChatRoom', {
                    roomId: room?.id,
                    title: `${post?.destination} 여행`,
                    destination: post?.destination,
                    days: post?.days,
                    departure_date: post?.departure_date,
                    bio: post?.bio,
                    max_people: post?.max_people,
                  })}>

                  <Image
                    source={{ uri: author?.profile_image || 'https://via.placeholder.com/50' }}
                    style={styles.avatar}
                  />

                  <View style={styles.chatInfo}>
                    <Text style={styles.chatTitle}>
                      {post?.destination} 여행
                    </Text>

                    <View style={styles.tagRow}>
                      <Text style={styles.tagText}>{post?.days}</Text>
                      {post?.departure_date ? <Text style={styles.tagText}>🛫 {post.departure_date}</Text> : null}
                    </View>

                    <Text style={styles.chatBio} numberOfLines={1}>{post?.bio}</Text>
                  </View>

                  {/* 🌟 산호색 화살표 포인트 */}
                  <Text style={styles.arrowIcon}>›</Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245, 247, 250, 0.65)' }, // 밝은 톤의 필터
  container: { flex: 1 },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#333',
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 14,
    color: '#FF6B6B', // 🌟 산호색 포인트
    fontWeight: '700',
    marginTop: 4,
  },

  list: { flex: 1 },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
    gap: 14, // 🌟 카드 사이의 간격 띄우기
  },

  // 🌟 새롭게 디자인된 카드 스타일
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // 반투명 화이트
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderRadius: 24, // 아주 둥글게
    elevation: 4, // 그림자 (안드로이드)
    shadowColor: '#000', // 그림자 (iOS)
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eee',
    borderWidth: 2,
    borderColor: '#fff', // 아바타 둥근 테두리 포인트
  },

  chatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#222',
    marginBottom: 6,
  },

  // 🌟 일정 정보 태그 스타일
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 12,
    color: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)', // 산호색 배경 연하게
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: 'bold',
    overflow: 'hidden',
  },

  chatBio: {
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },

  arrowIcon: {
    fontSize: 24,
    color: '#ccc',
    paddingLeft: 10,
    fontWeight: '300',
  },

  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: 30,
    borderRadius: 20,
    marginHorizontal: 20,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
});