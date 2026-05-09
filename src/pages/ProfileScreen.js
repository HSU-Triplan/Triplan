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
  TextInput,
  Switch,
  Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import { useRef } from 'react';

export default function ProfileScreen({ setIsLoggedIn }) {
    const navigation = useNavigation();
    const [isEditing, setIsEditing] = useState(false);
    const [dateShow,setDateShow] = useState(false);
    const [enabled,setEnabled] = useState(false);
    const [myTrips,setMyTrips] = useState([]);
    const isUploadingRef = useRef(false);

  // 임시 더미 데이터 (나중에 DB 연동)
  const [userInfo, setUserInfo] = useState({
    name: '구글이름',
    nickname: '',
    profile_image: 'https://via.placeholder.com/100',
    travel_type: '테스트 미진행',
    friend_code: 'ABC123',
    birth_year: '2000',
    gender: '여자',
    bio: '',
  });

  const [travelStyle, setTravelStyle] = useState('테스트 미진행');

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  };

useFocusEffect(
  React.useCallback(() => {
    if (isUploadingRef.current) return;
    const loadUserInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch('http://10.0.2.2:3000/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const result = await response.json();

        if (result.success && !isUploadingRef.current) {
          const user = result.user;
          setUserInfo({
            name: user.name || '',
            nickname: user.nickname || '',
            profile_image: user.profile_image || 'https://via.placeholder.com/100',
            travel_type: user.travel_type || '미설정',
            friend_code: user.friend_code || '없음',
            birth_year: user.birth_year ? String(user.birth_year) : '',
            gender: user.gender || '',
            bio: user.bio || '',
          });
          setTravelStyle(user.travel_type || '테스트 미진행');
        }

      // 최근 여행 계획 데이터 가져오기

      // 내가 참여한 채팅방
      const chatsRes = await fetch('http://10.0.2.2:3000/posts/my-recent-plans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const chatsData = await chatsRes.json();
      if (chatsData.success && !isUploadingRef.current) {
      setMyTrips(chatsData.chats);
      }
      } catch (e) {
        console.log('유저 정보 불러오기 실패:', e);
      }
    };
    loadUserInfo();
  }, [])
);

// 모든 여행
  const allTrips = [
    ...myTrips.map(c => ({
      id: `chat-${c.chat_rooms?.id}`,
      destination: c.chat_rooms?.posts?.destination,
      days: c.chat_rooms?.posts?.days,
      departure_date: c.chat_rooms?.posts?.departure_date,
      bio: c.chat_rooms?.posts?.bio,
      isMyPost: false,
    })),
  ]
    .filter(t => t.destination);

//  // D-Day 계산
//  const calcDDay = (dateStr) => {
//    if (!dateStr) return null;
//    const today = new Date();
//    today.setHours(0, 0, 0, 0);
//    const target = new Date(dateStr);
//    target.setHours(0, 0, 0, 0);
//    const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
//    if (diff === 0) return 'D-Day';
//    if (diff > 0) return `D-${diff}`;
//    return `D+${Math.abs(diff)}`;
//  };

  const displayName = userInfo.nickname || userInfo.name;

  const handleCopyFriendCode = () => {
    Clipboard.setString(userInfo.friend_code);
    showToast('복사 완료', '친구 코드가 복사되었습니다!');
  };

  const handleLogout = async () => {
    Alert.alert('로그아웃', '로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {ㄹ
          await GoogleSignin.signOut();
          await AsyncStorage.removeItem('token');
          setIsLoggedIn(false);
        },
      },
    ]);
  };

//사용자 기기에서 이미지 선택해서 프로필 이미지로 설정하는 코드
const pickImage = () => {
  isUploadingRef.current = true;
  launchImageLibrary(
    {
      mediaType: 'photo',
      selectionLimit: 1,
    },
    async (response) => {
      if (response.didCancel) {
        isUploadingRef.current = false;
        return;
      }
      if (response.errorCode) {
        isUploadingRef.current = false;
        console.log('에러', response.errorMessage);
        return;
      }

      const asset = response.assets[0];
      const uri = asset.uri;

      // 미리보기 먼저 업데이트
      setUserInfo(prev => ({ ...prev, profile_image: uri }));

      try {
        const token = await AsyncStorage.getItem('token');

        // FormData로 이미지 전송
        const formData = new FormData();
        formData.append('avatar', {
          uri: uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'avatar.jpg',
        });

        const uploadRes = await fetch('http://10.0.2.2:3000/users/upload-avatar', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
          body: formData,
        });

        const result = await uploadRes.json();

        if (result.success) {
          setUserInfo(prev => ({ ...prev, profile_image: result.profile_image }));
          showToast('변경 완료', '프로필 사진이 변경되었습니다!');
        } else {
          Alert.alert('오류', result.message);
        }
      } catch (error) {
        console.log('업로드 에러:', error);
        Alert.alert('오류', '업로드에 실패했습니다.');
      } finally{
        isUploadingRef.current = false;
      }
    }
  );
};

//정보 수정 화면
  if (isEditing) {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView>
          <View style={styles.editContainer}>
            <TouchableOpacity onPress={() => setIsEditing(false)}>
              <Text style={styles.editBarButton}>←</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>프로필 수정</Text>
            <TouchableOpacity
              onPress={async () => {
                try {
                  const token = await AsyncStorage.getItem('token');
                  const response = await fetch('http://10.0.2.2:3000/users/me', {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                      nickname: userInfo.nickname || userInfo.name,
                      birth_year: userInfo.birth_year || null,
                      gender: userInfo.gender || null,
                      bio: userInfo.bio || null,
                    }),
                  });
                  const result = await response.json();

                  if (result.success) {
                    showToast('프로필이 수정되었습니다!');
                    setIsEditing(false);
                  } else {
                    Alert.alert('오류', result.message);
                  }
                } catch (error) {
                  console.log('프로필 수정 에러:', error);
                  Alert.alert('오류', '네트워크 오류가 발생했습니다.');
                }
              }}>
              <Text style={styles.editDone}>완료</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.header}>
            <Image source={{ uri: userInfo.profile_image }} style={styles.profileImage} />
            <Icon name="images" size={24} onPress={pickImage} />
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>내 정보</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>닉네임</Text>
              <TextInput
                style={styles.textInput}
                value={userInfo.name}
                onChangeText={(newText) => setUserInfo({ ...userInfo, name: newText })}
              />
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>생년월일</Text>
              <Text style={styles.infoLabel}>{userInfo.birth_year}</Text>
              <Icon name="calendar-outline" size={24} onPress={() => setDateShow(true)} />
              {dateShow && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  onChange={(event, selectedDate) => {
                    if (event.type === 'set' && selectedDate) {
                      setUserInfo({ ...userInfo, birth_year: selectedDate.toISOString().split('T')[0] });
                      setDateShow(false);
                    }
                  }}
                />
              )}
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>성별</Text>
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <TouchableOpacity
                  onPress={() => {
                    if (userInfo.gender === '여자' || userInfo.gender === '')
                      setUserInfo({ ...userInfo, gender: '남자' });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{userInfo.gender === '남자' ? '🔘' : '⚪️'}</Text>
                  <Text> 남자</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (userInfo.gender === '남자' || userInfo.gender === '')
                      setUserInfo({ ...userInfo, gender: '여자' });
                  }}
                  style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 20 }}>{userInfo.gender === '여자' ? '🔘' : '⚪️'}</Text>
                  <Text> 여자</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.infoLabel}>소개</Text>
              <TextInput
                style={styles.textInput}
                value={userInfo.bio}
                onChangeText={(newText) => setUserInfo({ ...userInfo, bio: newText })}
              />
            </View>
          </View>
        </ScrollView>

        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Image source={{ uri: userInfo.profile_image }} style={styles.profileImage} />
          <Text style={styles.name}>{displayName}</Text>
          {userInfo.bio ? <Text style={styles.bioPreview}>{userInfo.bio}</Text> : null}
          <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
            <Text style={styles.editButtonText}>프로필 수정</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>내 정보</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>닉네임</Text>
            <Text style={styles.infoValue}>{displayName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>여행 타입</Text>
            <View style={styles.typeContainer}>
              <Text style={[styles.infoValue, { color: '#4A90E2', fontWeight: 'bold' }]}>{travelStyle}</Text>
              <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.navigate('TestIntro')}>
                <Text style={styles.retakeButtonText}>다시하기</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>친구 코드</Text>
            <View style={styles.friendCodeContainer}>
              <Text style={styles.infoValue}>{userInfo.friend_code}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyFriendCode}>
                <Text style={styles.copyButtonText}>복사</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>생년월일</Text>
            <Text style={styles.infoValue}>{userInfo.birth_year || '미설정'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>성별</Text>
            <Text style={styles.infoValue}>{userInfo.gender || '미설정'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>소개</Text>
            <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>{userInfo.bio || '미설정'}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>설정</Text>
          <TouchableOpacity style={styles.menuItem}>
            <Icon name="person-outline" size={24} />
            <Text style={styles.menuText}>계정 설정</Text>
          </TouchableOpacity>
          <View style={{ ...styles.menuItem, flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Icon name="settings" size={28} />
              <Text style={styles.menuText}>알림 설정</Text>
            </View>
            <Switch value={enabled} onValueChange={(value) => setEnabled(value)} />
          </View>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Icon name="log-out-outline" size={24} />
            <Text style={[styles.menuText, { color: '#FF3B30' }]}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.card}>
          <Text style={styles.cardTitle}>최근 여행 계획</Text>
          <ScrollView horizontal>
            {allTrips.length === 0 ? (
              <View>
                <Text style={styles.emptyText}>등록된 여행 계획이 없습니다.</Text>
              </View>
            ) : (
              allTrips.map(trip => (
                <View key={trip.id} style={styles.tripCard}>
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
          </ScrollView>
        </ScrollView>
      </ScrollView>

      <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
        <Text style={styles.toastText}>{toastMessage}</Text>
      </Animated.View>
    </View>
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

  },
    editContainer: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      backgroundColor: '#fff',
    },
    editBarButton: {
      fontSize: 18,
    },
    editTitle: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    editDone: {
      fontSize: 16,
      color: '#4A90E2',
      fontWeight: 'bold',
    },
    textInput : {
       borderWidth : 1,
        fontSize: 15,
        height : 40,
        width : 250
    },
    tripCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        elevation: 2,
        gap: 14,
        width : 100
      },
      tripLeft: {
        width: 60,
        alignItems: 'center',
      },
      tripDDay: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#4A90E2',
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
      toast: {
          position: 'absolute',
          bottom: 48,
          alignSelf: 'center',
          backgroundColor: 'rgba(0,0,0,0.75)',
          paddingVertical: 10,
          paddingHorizontal: 24,
          borderRadius: 24,
        },
        toastText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});