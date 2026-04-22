import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';


export default function ProfileScreen({setIsLoggedIn}) {
  const [travelStyle, setTravelStyle] = useState('분석 중...');

  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      const loadTravelStyle = async () => {
        try {
          const saved = await AsyncStorage.getItem('travelStyle');
          setTravelStyle(saved || '테스트 미진행');
        } catch (e) {
          setTravelStyle('불러오기 실패');
        }
      };
      loadTravelStyle();
    }, [])
  );

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          await GoogleSignin.signOut();
          await AsyncStorage.removeItem('token');
          setIsLoggedIn(false);
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      {/* 상단 프로필 영역 */}
      <View style={styles.header}>
        <Image
          source={{uri: 'https://via.placeholder.com/100'}}
          style={styles.profileImage}
        />
        <Text style={styles.name}>닉네임</Text>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>프로필 수정</Text>
        </TouchableOpacity>
      </View>

      {/* 정보 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 정보</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>닉네임</Text>
          <Text style={styles.infoValue}>kim123</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>여행타입</Text>

          <View style={styles.typeContainer}>
            <Text style={[styles.infoValue, { color: '#4A90E2', fontWeight: 'bold' }]}>
              {travelStyle}
            </Text>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => navigation.navigate('TestIntro')}
            >
              <Text style={styles.retakeButtonText}>다시하기</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>

      {/* 메뉴 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>설정</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Icon name="person-outline" size={24}/><Text style={styles.menuText}>계정 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
         <Icon name="settings" size={28} /><Text style={styles.menuText}>알림 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Icon name="log-out-outline" size={24}/><Text style={[styles.menuText, {color: '#FF3B30'}]}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 최근에 올린 여행 계획 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 여행 계획</Text>
        <ScrollView horizontal />
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
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
    backgroundColor: '#ddd',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#555555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 28,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItem: {
    flexDirection : 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  retakeButton: {
    backgroundColor: '#4A90E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});