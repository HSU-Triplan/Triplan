import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Alert,
  ImageBackground,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

// 🌟 배경: 이집트 피라미드 (모험적이고 웅장한 느낌)
const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1503177119275-0aa32b3a7447?q=80&w=800&auto=format&fit=crop';

export default function EditPostScreen({ post, onClose }) {
  const [destination, setDestination] = useState(post?.destination || '');
  const [days, setDays] = useState(post?.days || '');
  const [maxPeople, setMaxPeople] = useState(String(post?.max_people || ''));
  const [bio, setBio] = useState(post?.bio || '');
  const [plan, setPlan] = useState(post?.plan || '');
  const [departureDate, setDepartureDate] = useState(
    post?.departure_date ? new Date(post.departure_date) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState(false);

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleSubmit = async () => {
    if (!destination || !days || !maxPeople || !bio) {
      Alert.alert('필수 항목을 모두 입력해주세요.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`http://10.0.2.2:3000/posts/${post.id}`, {
        method: 'PATCH',
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
        Alert.alert('수정 완료!');
        onClose();
      } else {
        Alert.alert('오류', result.message);
      }
    } catch (error) {
      console.log('수정 에러:', error);
      Alert.alert('오류', '네트워크 오류가 발생했습니다.');
    }
  };

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={3}>
      <View style={styles.overlay} />

      <SafeAreaView style={styles.container}>
        {/* 헤더 부분 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerIconBtn}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>게시글 수정</Text>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <Text style={styles.submitButton}>완료</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* 반투명 유리 카드 질감 */}
          <View style={styles.formCard}>

            <Text style={styles.label}>📍 여행지 <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholder="어디로 떠나시나요?" placeholderTextColor="#aaa" />

            <Text style={styles.label}>🗓 여행 일수 <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} value={days} onChangeText={setDays} placeholder="예: 3박 4일" placeholderTextColor="#aaa" />

            <Text style={styles.label}>👥 모집 인원 <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} value={maxPeople} onChangeText={setMaxPeople} keyboardType="numeric" placeholder="숫자만 입력" placeholderTextColor="#aaa" />

            <Text style={styles.label}>✏️ 한 줄 소개 <Text style={styles.required}>*</Text></Text>
            <TextInput style={styles.input} value={bio} onChangeText={setBio} placeholder="여행의 컨셉을 짧게 적어주세요" placeholderTextColor="#aaa" />

            <Text style={styles.label}>🛫 출발 날짜</Text>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
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

            <Text style={styles.label}>🗺 간단 계획</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={plan}
              onChangeText={setPlan}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              placeholder="방문하고 싶은 곳을 자유롭게 적어주세요."
              placeholderTextColor="#aaa"
            />
          </View>
          <View style={{ height: 40 }} />
        </ScrollView>
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
    borderRadius: 20
  },
  submitButton: { fontSize: 14, fontWeight: 'bold', color: '#fff' },

  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderRadius: 24,
    elevation: 5,
  },

  label: { fontSize: 15, fontWeight: '900', color: '#333', marginBottom: 8, marginTop: 20 },
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
    paddingVertical: 14
  },
  dateButtonText: { fontSize: 15, color: '#333', fontWeight: '500' },
  dateIcon: { fontSize: 16 },
});