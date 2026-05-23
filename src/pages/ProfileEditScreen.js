import React, { useState } from 'react';
import {
  SafeAreaView, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ImageBackground, Dimensions, ScrollView, Alert, Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';

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

  // 날짜 표시 형식 변환 (YYYY-MM-DD)
  const formatDate = (date) => {
    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    try {
      // 1. 로컬 저장 (홈화면/마이페이지 즉시 반영용)
      await AsyncStorage.setItem('nickname', nickname);
      await AsyncStorage.setItem('gender', gender);
      await AsyncStorage.setItem('birth_year', formatDate(birthDate));
      await AsyncStorage.setItem('bio', bio);

      const token = await AsyncStorage.getItem('token');

      // 2. 서버 저장 시도 (인수인계용 코드)
      try {
        await fetch('http://10.0.2.2:3000/users/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            nickname,
            gender,
            birth_year: formatDate(birthDate),
            bio
          }),
        });
      } catch (e) {
        console.log('서버 연동 전 (로컬 저장 완료)');
      }

      // 3. 메인으로 이동
      if (isFirstTime) {
        navigation.replace('Main');
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.log('저장 에러:', error);
      Alert.alert("알림", "저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={8}>
        <View style={styles.overlay} />

        {/* 상단 헤더 */}
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>프로필 설정</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.headerDone}>완료</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* 프로필 이미지 영역 (사진의 빨간 원 스타일) */}
          <View style={styles.profileImageSection}>
            <View style={styles.imageCircle}>
               <Text style={styles.imageInitials}>{nickname ? nickname.charAt(0) : '?'}</Text>
               <View style={styles.cameraBadge}>
                 <Icon name="camera" size={18} color="#fff" />
               </View>
            </View>
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