import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
} from 'react-native';

// 🏝️ 랜드마크 배경: 몰디브 (Maldives - 설레는 여행 계획)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?q=80&w=800&auto=format&fit=crop';

export default function WriteScreen({ onClose }) {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [maxPeople, setMaxPeople] = useState('');
  const [bio, setBio] = useState('');
  const [plan, setPlan] = useState('');
  const [departureDate, setDepartureDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSubmit = async () => {
    if (!destination || !days || !maxPeople || !bio) {
      alert('여행지, 일수, 모집 인원, 한 줄 소개는 필수입니다.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch('http://10.0.2.2:3000/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          destination,
          days,
          max_people: parseInt(maxPeople, 10),
          bio,
          plan,
          departure_date: formatDate(departureDate),
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('게시글이 작성되었습니다!');
        onClose();
      } else {
        alert('작성 실패: ' + result.message);
      }
    } catch (error) {
      console.log('게시글 작성 에러:', error);
      alert('게시글 작성 에러');
    }
  };

  return (
    // 🌟 배경 흐림 정도 4, 투명도 조절
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}>

          {/* 투명하고 세련된 헤더 */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>동행 모집 글 작성</Text>
            <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
              <Text style={styles.submitButtonText}>완료</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* 🌟 유리 질감 폼 카드 */}
            <View style={styles.formCard}>

              <Text style={styles.label}>📍 여행지 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="예) 도쿄, 제주도"
                value={destination}
                onChangeText={setDestination}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>📅 여행 일수 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="예) 3박 4일"
                value={days}
                onChangeText={setDays}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>👥 모집 인원 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="예) 2 (숫자만 입력)"
                value={maxPeople}
                onChangeText={setMaxPeople}
                keyboardType="numeric"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>🛫 출발 날짜</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}>
                <Text style={styles.dateButtonText}>{formatDate(departureDate)}</Text>
                <Text style={styles.dateIcon}>📅</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={departureDate}
                  mode="date"
                  display="default"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDepartureDate(selectedDate);
                  }}
                />
              )}

              <Text style={styles.label}>✏️ 한 줄 소개 <Text style={styles.required}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="예) 같이 맛집 탐방해요!"
                value={bio}
                onChangeText={setBio}
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>🗺 간단 계획</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="여행 계획을 자유롭게 적어주세요."
                value={plan}
                onChangeText={setPlan}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.45)' },
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerIconBtn: { padding: 4 },
  closeButton: { fontSize: 22, color: '#555', fontWeight: 'bold' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#333' },
  submitBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  submitButtonText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },

  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderRadius: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },

  label: {
    fontSize: 15,
    fontWeight: '900',
    color: '#333',
    marginBottom: 8,
    marginTop: 20,
  },
  required: { color: '#FF6B6B' },

  input: {
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#333',
  },
  textArea: { height: 120, paddingTop: 16 },

  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dateButtonText: { fontSize: 15, color: '#333', fontWeight: '500' },
  dateIcon: { fontSize: 16 },
});