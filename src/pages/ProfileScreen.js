import React, { useState, useRef } from 'react';
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
  Animated,
  ImageBackground,
  SafeAreaView
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import DestinationPicker from '../components/DestinationPicker';

// 🏛️ 랜드마크 배경: 이탈리아 로마 콜로세움 (Colosseum)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=800&auto=format&fit=crop';

export default function ProfileScreen({ setIsLoggedIn }) {
  const navigation = useNavigation();
  const [isEditing, setIsEditing] = useState(false);
  const [dateShow, setDateShow] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [myTrips, setMyTrips] = useState([]);
  const isUploadingRef = useRef(false);
  const [preferredDestinations, setPreferredDestinations] = useState([]);

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

          const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
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

            setPreferredDestinations(
              result.user.preferred_destination
                ? result.user.preferred_destination.split(',')
                : []
            );

          }

          const chatsRes = await fetch('https://triplan-backend-qwrs.onrender.com/posts/my-recent-plans', {
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

  const allTrips = [
    ...myTrips.map(c => ({
      id: `chat-${c.chat_rooms?.id}`,
      destination: c.chat_rooms?.posts?.destination,
      days: c.chat_rooms?.posts?.days,
      departure_date: c.chat_rooms?.posts?.departure_date,
      bio: c.chat_rooms?.posts?.bio,
      isMyPost: false,
    })),
  ].filter(t => t.destination);

  const displayName = userInfo.nickname || userInfo.name;

  const handleCopyFriendCode = () => {
    Clipboard.setString(userInfo.friend_code);
    showToast('친구 코드가 복사되었습니다!');
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

        setUserInfo(prev => ({ ...prev, profile_image: uri }));

        try {
          const token = await AsyncStorage.getItem('token');
          const formData = new FormData();
          formData.append('avatar', {
            uri: uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'avatar.jpg',
          });

          const uploadRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/upload-avatar', {
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
            showToast('프로필 사진이 변경되었습니다!');
          } else {
            Alert.alert('오류', result.message);
          }
        } catch (error) {
          console.log('업로드 에러:', error);
          Alert.alert('오류', '업로드에 실패했습니다.');
        } finally {
          isUploadingRef.current = false;
        }
      }
    );
  };

  // 🌟 [수정 모드 화면]
  if (isEditing) {
    return (
      <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
        <View style={styles.overlay} />
        <SafeAreaView style={styles.container}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.editContainer}>
              <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.iconBtn}>
                <Icon name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.editTitle}>프로필 수정</Text>
              <TouchableOpacity
                onPress={async () => {
                  try {
                    const token = await AsyncStorage.getItem('token');
                    const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
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

            <View style={styles.profileEditHeader}>
              <View>
                <Image source={{ uri: userInfo.profile_image }} style={styles.profileImageLarge} />
                <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
                  <Icon name="camera" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>내 정보 설정</Text>

              <View style={styles.infoRowEdit}>
                <Text style={styles.infoLabel}>닉네임</Text>
                <TextInput
                  style={styles.textInput}
                  value={userInfo.name}
                  onChangeText={(newText) => setUserInfo({ ...userInfo, name: newText })}
                  placeholderTextColor="#aaa"
                />
              </View>

              <View style={styles.infoRowEdit}>
                <Text style={styles.infoLabel}>생년월일</Text>
                <TouchableOpacity style={styles.dateSelector} onPress={() => setDateShow(true)}>
                  <Text style={styles.dateText}>{userInfo.birth_year || '날짜 선택'}</Text>
                  <Icon name="calendar-outline" size={20} color="#FF6B6B" />
                </TouchableOpacity>
                {dateShow && (
                  <DateTimePicker
                    value={new Date()}
                    mode="date"
                    onChange={(event, selectedDate) => {
                      if (event.type === 'set' && selectedDate) {
                        setUserInfo({ ...userInfo, birth_year: selectedDate.toISOString().split('T')[0] });
                        setDateShow(false);
                      } else {
                        setDateShow(false);
                      }
                    }}
                  />
                )}
              </View>

              <View style={styles.infoRowEdit}>
                <Text style={styles.infoLabel}>성별</Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    onPress={() => setUserInfo({ ...userInfo, gender: '남자' })}
                    style={[styles.genderBtn, userInfo.gender === '남자' && styles.genderBtnActive]}>
                    <Text style={[styles.genderText, userInfo.gender === '남자' && styles.genderTextActive]}>남자</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setUserInfo({ ...userInfo, gender: '여자' })}
                    style={[styles.genderBtn, userInfo.gender === '여자' && styles.genderBtnActive]}>
                    <Text style={[styles.genderText, userInfo.gender === '여자' && styles.genderTextActive]}>여자</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={[styles.infoRowEdit, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={[styles.infoLabel, { marginBottom: 10 }]}>한 줄 소개</Text>
                <TextInput
                  style={[styles.textInput, { width: '100%' }]}
                  value={userInfo.bio}
                  onChangeText={(newText) => setUserInfo({ ...userInfo, bio: newText })}
                  placeholder="나를 짧게 소개해 보세요!"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>

          <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </Animated.View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  // 🌟 [일반 보기 화면]
  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>

          <View style={styles.header}>
            <Image source={{ uri: userInfo.profile_image }} style={styles.profileImageLarge} />
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
              <Text style={styles.infoLabel}>선호 여행지</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
              <DestinationPicker
                value={preferredDestinations}
                onChange={setPreferredDestinations}
              />
            </View>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>여행 타입</Text>
              <View style={styles.typeContainer}>
                <Text style={[styles.infoValue, { color: '#FF6B6B', fontWeight: '900' }]}>{travelStyle}</Text>
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
              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', color: '#555' }]}>{userInfo.bio || '등록된 소개가 없습니다.'}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>계정 설정</Text>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Icon name="person-outline" size={22} color="#555" />
                <Text style={styles.menuText}>내 계정 정보</Text>
              </View>
              <Icon name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>

            <View style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <Icon name="notifications-outline" size={22} color="#555" />
                <Text style={styles.menuText}>알림 설정</Text>
              </View>
              <Switch
                value={enabled}
                onValueChange={(value) => setEnabled(value)}
                trackColor={{ false: '#ddd', true: '#FFB5B5' }}
                thumbColor={enabled ? '#FF6B6B' : '#f4f3f4'}
              />
            </View>

            <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]} onPress={handleLogout}>
              <View style={styles.menuItemLeft}>
                <Icon name="log-out-outline" size={22} color="#FF3B30" />
                <Text style={[styles.menuText, { color: '#FF3B30' }]}>로그아웃</Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={[styles.card, { paddingRight: 0, paddingBottom: 20 }]}>
            <Text style={[styles.cardTitle, { paddingRight: 16 }]}>최근 여행 계획</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {allTrips.length === 0 ? (
                <View style={{ paddingRight: 16 }}>
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
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>

        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240, 244, 248, 0.45)' },
  container: { flex: 1 },

  // 일반 뷰 헤더
  header: {
    alignItems: 'center',
    paddingVertical: 35,
    paddingHorizontal: 20,
  },
  profileImageLarge: {
    width: 110,
    height: 110,
    borderRadius: 55,
    marginBottom: 16,
    backgroundColor: '#eee',
    borderWidth: 3,
    borderColor: '#FF6B6B',
  },
  name: { fontSize: 26, fontWeight: '900', color: '#222', marginBottom: 6 },
  bioPreview: { fontSize: 14, color: '#666', marginBottom: 12, textAlign: 'center', fontWeight: '500' },
  editButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 25,
    marginTop: 4,
    elevation: 3,
  },
  editButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // 글래스모피즘 카드
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 16 },

  // 정보 뷰
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: { fontSize: 15, color: '#777', fontWeight: '600' },
  infoValue: { fontSize: 15, fontWeight: 'bold', color: '#222' },

  typeContainer: { flexDirection: 'row', alignItems: 'center' },
  retakeButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginLeft: 10,
  },
  retakeButtonText: { color: '#FF6B6B', fontSize: 12, fontWeight: 'bold' },

  friendCodeContainer: { flexDirection: 'row', alignItems: 'center' },
  copyButton: {
    backgroundColor: '#eee',
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginLeft: 10,
  },
  copyButtonText: { fontSize: 12, color: '#555', fontWeight: 'bold' },

  // 메뉴
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuText: { fontSize: 16, fontWeight: '600', color: '#333' },

  // 여행 카드
  emptyText: { color: '#aaa', fontSize: 14, marginTop: 10, marginBottom: 10 },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 240,
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  tripRight: { flex: 1 },
  tripTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  tripDestination: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  tripInfo: { fontSize: 13, color: '#888', marginBottom: 4, fontWeight: '500' },
  tripBio: { fontSize: 13, color: '#aaa' },
  myPostBadge: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  myPostBadgeText: { fontSize: 10, color: '#FF6B6B', fontWeight: 'bold' },

  // 수정 모드 전용
  editContainer: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  iconBtn: { padding: 4 },
  editTitle: { fontSize: 18, fontWeight: '900', color: '#333' },
  editDone: { fontSize: 16, color: '#FF6B6B', fontWeight: 'bold' },

  profileEditHeader: { alignItems: 'center', marginVertical: 20 },
  cameraIcon: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },

  infoRowEdit: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  textInput: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: 220,
    color: '#333',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: 220,
  },
  dateText: { fontSize: 15, color: '#333' },

  genderContainer: { flexDirection: 'row', gap: 10, width: 220 },
  genderBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    alignItems: 'center',
  },
  genderBtnActive: { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderColor: '#FF6B6B' },
  genderText: { fontSize: 15, color: '#888', fontWeight: 'bold' },
  genderTextActive: { color: '#FF6B6B' },

  // 토스트
  toast: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    elevation: 5,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});