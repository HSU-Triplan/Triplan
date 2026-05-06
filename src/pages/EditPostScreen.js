import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, SafeAreaView, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

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
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>게시글 수정</Text>
        <TouchableOpacity onPress={handleSubmit}>
          <Text style={styles.submitButton}>완료</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>📍 여행지 <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={destination} onChangeText={setDestination} placeholderTextColor="#aaa" />

        <Text style={styles.label}>🗓 여행 일수 <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={days} onChangeText={setDays} placeholderTextColor="#aaa" />

        <Text style={styles.label}>👥 모집 인원 <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={maxPeople} onChangeText={setMaxPeople} keyboardType="numeric" placeholderTextColor="#aaa" />

        <Text style={styles.label}>✏️ 한 줄 소개 <Text style={styles.required}>*</Text></Text>
        <TextInput style={styles.input} value={bio} onChangeText={setBio} placeholderTextColor="#aaa" />

        <Text style={styles.label}>🛫 출발 날짜</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>{formatDate(departureDate)}</Text>
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
          placeholderTextColor="#aaa"
        />
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: { fontSize: 18, color: '#666', paddingHorizontal: 4 },
  headerTitle: { fontSize: 17, fontWeight: 'bold', color: '#333' },
  submitButton: { fontSize: 16, fontWeight: 'bold', color: '#4A90E2' },
  form: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  label: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8, marginTop: 16 },
  required: { color: '#FF3B30' },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: { height: 120 },
  dateButton: { backgroundColor: '#f5f5f5', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  dateButtonText: { fontSize: 15, color: '#333' },
});