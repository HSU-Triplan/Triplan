import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  Clipboard,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function ProfileScreen({ setIsLoggedIn }) {
  const navigation = useNavigation();

  // 임시 더미 데이터 (나중에 DB 연동)
  const [userInfo, setUserInfo] = useState({
    name: '구글이름',
    nickname: '',
    profile_image: 'https://via.placeholder.com/100',
    travel_type: '테스트 미진행',
    friend_code: 'ABC123',
    birth_year: '',
    gender: '',
    bio: '',
  });

  const [travelStyle, setTravelStyle] = useState('테스트 미진행');

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

  const displayName = userInfo.nickname || userInfo.name;

  const handleCopyFriendCode = () => {
    Clipboard.setString(userInfo.friend_code);
    Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
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
          source={{ uri: userInfo.profile_image }}
          style={styles.profileImage}
        />
        <Text style={styles.name}>{displayName}</Text>
        {userInfo.bio ? (
          <Text style={styles.bioPreview}>{userInfo.bio}</Text>
        ) : null}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProfile')}>
          <Text style={styles.editButtonText}>프로필 수정</Text>
        </TouchableOpacity>
      </View>

      {/* 내 정보 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>내 정보</Text>

        {/* 닉네임 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>닉네임</Text>
          <Text style={styles.infoValue}>{displayName}</Text>
        </View>

        {/* 여행 타입 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>여행 타입</Text>
          <View style={styles.typeContainer}>
            <Text style={[styles.infoValue, { color: '#4A90E2', fontWeight: 'bold' }]}>
              {travelStyle}
            </Text>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={() => navigation.navigate('TestIntro')}>
              <Text style={styles.retakeButtonText}>다시하기</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 성향 코드 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>성향 코드</Text>
          <Text style={[styles.infoValue, { color: '#4A90E2' }]}>
            {userInfo.travel_type || '미설정'}
          </Text>
        </View>

        {/* 친구 코드 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>친구 코드</Text>
          <View style={styles.friendCodeContainer}>
            <Text style={styles.infoValue}>{userInfo.friend_code}</Text>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyFriendCode}>
              <Text style={styles.copyButtonText}>복사</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 생년월일 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>생년월일</Text>
          <Text style={styles.infoValue}>
            {userInfo.birth_year || '미설정'}
          </Text>
        </View>

        {/* 성별 */}
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>성별</Text>
          <Text style={styles.infoValue}>
            {userInfo.gender || '미설정'}
          </Text>
        </View>

        {/* 소개 */}
        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.infoLabel}>소개</Text>
          <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
            {userInfo.bio || '미설정'}
          </Text>
        </View>
      </View>

      {/* 설정 카드 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>설정</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>계정 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>알림 설정</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={[styles.menuText, { color: '#FF3B30' }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 최근 여행 계획 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>최근 여행 계획</Text>
        <Text style={styles.emptyText}>등록된 여행 계획이 없습니다.</Text>
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
    backgroundColor: '#fff',
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
  bioPreview: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
    textAlign: 'center',
  },
  editButton: {
    backgroundColor: '#555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 28,
    marginTop: 8,
  },
  editButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: '#fff',
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
    alignItems: 'center',
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
  friendCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  copyButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: 8,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#333',
    fontWeight: 'bold',
  },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
  },
  emptyText: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
});