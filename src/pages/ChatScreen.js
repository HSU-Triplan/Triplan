import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
export default function ChatScreen({ navigation }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchChats = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://10.0.2.2:3000/posts/my-chats', {
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


  const handleLeave = async (roomId) => {
    Alert.alert('채팅방 나가기', '채팅방을 나가시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '나가기',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('token');
            const response = await fetch(`http://10.0.2.2:3000/posts/chat-rooms/${roomId}/leave`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            const result = await response.json();
            if (result.success) {
              fetchChats();
            } else {
              Alert.alert('오류', result.message);
            }
          } catch (error) {
            console.log('나가기 에러:', error);
          }
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      fetchChats();
    }, [fetchChats])
  );

  return (
    <View style={styles.container}>

      <ScrollView style={styles.list}>
        {loading ? (
          <Text style={styles.emptyText}>불러오는 중...</Text>
        ) : chats.length === 0 ? (
          <Text style={styles.emptyText}>참여한 채팅방이 없습니다.</Text>
        ) : (
          chats.map((chat) => {
            const room = chat.chat_rooms;
            const post = room?.posts;
            const author = post?.users;

            return (
            <TouchableOpacity
              key={room?.id}
              style={styles.chatItem}
              onPress={() => navigation.navigate('ChatRoom', {
                roomId: room?.id,
                title: `${post?.destination} ${post?.days} 여행`,
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
                  {post?.destination} {post?.days} 여행
                </Text>
                <Text style={styles.chatSub}>
                  {post?.days} {post?.departure_date ? `· 🛫 ${post.departure_date}` : ''}
                </Text>
                <Text style={styles.chatBio} numberOfLines={1}>{post?.bio}</Text>
              </View>
              <TouchableOpacity
                style={styles.leaveButton}
                onPress={() => handleLeave(room?.id)}>
                <Text style={styles.leaveButtonText}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  chatSub: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  chatBio: {
    fontSize: 13,
    color: '#aaa',
  },
  emptyText: {
    textAlign: 'center',
    color: '#aaa',
    fontSize: 15,
    marginTop: 60,
  },
  leaveButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
});