import React, { useState,useRef,useEffect   } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, Dimensions, ScrollView, Alert, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import DestinationPicker from '../components/DestinationPicker';

const { width } = Dimensions.get('window');

// 🌉 아까 사용했던 감성적인 브릿지 배경 이미지
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?q=80&w=600&auto=format&fit=crop';

const ProfileEditScreen = ({ navigation, route }) => {
  const isFirstTime = route.params?.isFirstTime || false;

  // 입력 필드 상태 관리
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('남자'); // 기본값 남자
  const [birthDate, setBirthDate] = useState(new Date()); // 달력용 Date 객체
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [bio, setBio] = useState('');
  const [preferredDestinations, setPreferredDestinations] = useState([]);

  const [profileImage, setProfileImage] = useState(null);
  const isUploadingRef = useRef(false);

  useEffect(() => {
    const loadPreferred = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.user.preferred_destination) {
          setPreferredDestinations(data.user.preferred_destination.split(','));
        }
      } catch (e) {
        console.log('선호 여행지 불러오기 실패:', e);
      }
    };
    loadPreferred();
  }, []);

  const pickImage = () => {
    isUploadingRef.current = true;
    launchImageLibrary({ mediaType: 'photo', selectionLimit: 1 }, async (response) => {
      if (response.didCancel || response.errorCode) {
        isUploadingRef.current = false;
        return;
      }

      const asset = response.assets[0];
      const uri = asset.uri;
      setProfileImage(uri);  // 미리보기 즉시 반영

      try {
        const token = await AsyncStorage.getItem('token');
        const formData = new FormData();
        formData.append('avatar', {
          uri,
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
          setProfileImage(result.profile_image);
        } else {
          Alert.alert('오류', '사진 업로드에 실패했습니다.');
        }
      } catch (e) {
        console.log('업로드 에러:', e);
        Alert.alert('오류', '업로드 중 문제가 발생했습니다.');
      } finally {
        isUploadingRef.current = false;
      }
    });
  };
  // 날짜 표시 형식 변환 (YYYY-MM-DD)
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    if (!nickname.trim()) {
      Alert.alert('알림', '닉네임을 입력해주세요.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');

      const res = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nickname: nickname.trim(),
          gender,
          birth_year: formatDate(birthDate),
          bio: bio.trim(),
        }),
      });

      console.log('프로필 저장 status:', res.status);

      if (res.status === 401) {
        await AsyncStorage.removeItem('token');
        Alert.alert('세션 만료', '다시 로그인해주세요.');
        return;
      }

      await AsyncStorage.setItem('nickname', nickname.trim());

    } catch (error) {
      console.log('저장 에러:', error);
    } finally {
      // isFirstTime 여부 관계없이 뒤로 가거나 탭으로 이동
      if (isFirstTime) {
        // 스택을 완전히 초기화하고 Main으로
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main' }],
        });
      } else {
        navigation.goBack();
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={8}>
        <View style={styles.overlay} pointerEvents="none" />

        {/* 상단 헤더 */}
        <View style={styles.headerContainer}>
         <TouchableOpacity onPress={() => {
           if (isFirstTime) {
             navigation.reset({
               index: 0,
               routes: [{ name: 'Main' }],
             });
           } else {
             navigation.goBack();
           }
         }}>
           <Icon name="arrow-back" size={28} color="#333" />
         </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 설정</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.headerDone}>완료</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

         <View style={styles.profileImageSection}>
           <TouchableOpacity onPress={pickImage} style={styles.imageCircle}>
             {profileImage ? (
               <Image
                 source={{ uri: profileImage }}
                 style={{ width: 120, height: 120, borderRadius: 60 }}
                 resizeMode="cover"
               />
             ) : (
               <Text style={styles.imageInitials}>{nickname ? nickname.charAt(0) : '?'}</Text>
             )}
             <View style={styles.cameraBadge}>
               <Icon name="camera" size={18} color="#fff" />
             </View>
           </TouchableOpacity>
         </View>

          {/* 정보 설정 카드 (사진의 화이트 카드 스타일) */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>내 정보 설정</Text>

            {/* 닉네임 */}
            <View style={styles.inputRow}>
              <Text style={styles.label}>닉네임</Text>
              <TextInput
                style={styles.textInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="닉네임을 입력하세요"
              />
            </View>


            <View style={[styles.inputRow, { overflow: 'hidden' }]}>
              <Text style={styles.infoLabel}>선호 여행지</Text>
              <DestinationPicker
                value={preferredDestinations}
                onChange={setPreferredDestinations}
              />
            </View>

            {/* 생년월일 (사진과 같은 달력 아이콘 스타일) */}
            <View style={styles.inputRow}>
              <Text style={styles.label}>생년월일</Text>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateText}>{formatDate(birthDate)}</Text>
                <Icon name="calendar-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setBirthDate(selectedDate);
                }}
              />
            )}

            {/* 성별 (사진과 같은 레드 테두리 버튼 스타일) */}
            <View style={styles.inputRow}>
              <Text style={styles.label}>성별</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === '남자' && styles.genderBtnActive]}
                  onPress={() => setGender('남자')}>
                  <Text style={[styles.genderBtnText, gender === '남자' && styles.genderBtnTextActive]}>남자</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.genderBtn, gender === '여자' && styles.genderBtnActive]}
                  onPress={() => setGender('여자')}>
                  <Text style={[styles.genderBtnText, gender === '여자' && styles.genderBtnTextActive]}>여자</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 한 줄 소개 */}
            <View style={[styles.inputRow, { borderBottomWidth: 0, flexDirection: 'column', alignItems: 'flex-start' }]}>
              <Text style={[styles.label, { marginBottom: 10 }]}>한 줄 소개</Text>
              <TextInput
                style={styles.textArea}
                value={bio}
                onChangeText={setBio}
                placeholder="나를 짧게 소개해 보세요!"
                multiline
              />
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(240, 244, 248, 0.5)' },
  scrollContent: { paddingBottom: 40 },

  // 헤더 스타일
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
    backgroundColor: 'transparent',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  headerDone: { fontSize: 16, color: '#FF6B6B', fontWeight: 'bold' },

  // 프로필 사진 섹션
  profileImageSection: { alignItems: 'center', marginVertical: 30 },
  imageCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B6B', // 사진의 오렌지-레드 스타일
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
    elevation: 10,
  },
  imageInitials: { fontSize: 50, color: '#fff', fontWeight: 'bold' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF6B6B',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // 카드 스타일
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    marginHorizontal: 20,
    borderRadius: 25,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    elevation: 5,
  },
  cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 20 },

  // 입력 행 공통
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: { fontSize: 15, color: '#555', fontWeight: '600' },
  textInput: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },

  // 달력 선택기
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: { fontSize: 15, color: '#333', fontWeight: '500' },

  // 성별 버튼
  genderContainer: { flexDirection: 'row', gap: 10 },
  genderBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  genderBtnActive: { borderColor: '#FF6B6B', backgroundColor: 'rgba(255, 107, 107, 0.05)' },
  genderBtnText: { fontSize: 14, color: '#888', fontWeight: 'bold' },
  genderBtnTextActive: { color: '#FF6B6B' },

  // 자기소개
  textArea: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 15,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#333',
  }
});

export default ProfileEditScreen;