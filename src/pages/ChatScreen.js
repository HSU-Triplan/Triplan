import React from 'react';
import {
  View, Text, FlatList,
  TouchableOpacity, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
export default function ChatScreen({ navigation }) {
 

  const rooms = [
    {
      id: "1",
      name: "부산 여행방",
      lastMessage: "일정 언제 짤까?",
      time: "오후 3:20",
      unread: 3,
      image: "https://via.placeholder.com/50",
      sleep: 2,
      days: 3,
      members: 4
    },
    {
      id: "2",
      name: "제주 여행방",
      lastMessage: "렌트카 예약했어",
      time: "어제",
      unread: 0,
      image: "https://via.placeholder.com/50",
      sleep: 2,
      days: 5,
      members: 2
    }
  ];

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("ChatRoom", { roomId: item.id })
      }
    >

      {/* 상단 */}
      <View style={styles.topRow}>
        <Image source={{ uri: item.image }} style={styles.avatar} />

        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.message} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>

        <View style={styles.right}>
          <Text style={styles.time}>{item.time}</Text>

          {item.unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>

      {/* 하단 여행 정보 */}
      <View style={styles.bottomRow}>
        <Text style={styles.info}>📅 {item.sleep}박 {item.days}일</Text>
        <Text style={styles.info}>👥 {item.members}명</Text>
      </View>

    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={styles.header}>
        
      </View>
      <FlatList
      data={rooms}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ padding: 10 }}
    />
</SafeAreaView>

  );
};

const styles = StyleSheet.create({

  card: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 12,
    marginBottom: 12,

    // 그림자 (iOS)
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,

    // 그림자 (Android)
    elevation: 3
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 20,
    marginRight: 10
  },

  name: {
    fontWeight: 'bold',
    fontSize: 16
  },

  message: {
    color: '#666',
    marginTop: 3
  },

  right: {
    alignItems: 'flex-end'
  },

  time: {
    fontSize: 12,
    color: '#999'
  },

  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingHorizontal: 6,
    marginTop: 4
  },

  badgeText: {
    color: '#fff',
    fontSize: 12
  },

  bottomRow: {
    flexDirection: 'row',
    marginTop: 10
  },

  info: {
    marginRight: 10,
    fontSize: 12,
    color: '#444'
  }

});