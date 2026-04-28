import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
} from 'react-native';

export default function WriteScreen({ onClose }) {
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState('');
  const [maxPeople, setMaxPeople] = useState('');
  const [bio, setBio] = useState('');
  const [plan, setPlan] = useState('');
  const [departureDate, setDepartureDate] = useState('');

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
        departure_date: departureDate || null,
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}>

        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>동행 모집 글 작성</Text>
          <TouchableOpacity onPress={handleSubmit}>
            <Text style={styles.submitButton}>완료</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.form} keyboardShouldPersistTaps="handled">

          {/* 여행지 */}
          <Text style={styles.label}>📍 여행지 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) 도쿄, 제주도"
            value={destination}
            onChangeText={setDestination}
            placeholderTextColor="#aaa"
          />

          {/* 여행 일수 */}
          <Text style={styles.label}>📅 여행 일수 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) 3박 4일"
            value={days}
            onChangeText={setDays}
            placeholderTextColor="#aaa"
          />

          {/* 모집 인원 */}
          <Text style={styles.label}>👥 모집 인원 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) 2"
            value={maxPeople}
            onChangeText={setMaxPeople}
            keyboardType="numeric"
            placeholderTextColor="#aaa"
          />

          {/* 출발 날짜 */}
          <Text style={styles.label}>📅 출발 날짜</Text>
          <TextInput
            style={styles.input}
            placeholder="예) 2026-06-01"
            value={departureDate}
            onChangeText={setDepartureDate}
            placeholderTextColor="#aaa"
          />

          {/* 한 줄 소개 */}
          <Text style={styles.label}>✏️ 한 줄 소개 <Text style={styles.required}>*</Text></Text>
          <TextInput
            style={styles.input}
            placeholder="예) 같이 맛집 탐방해요!"
            value={bio}
            onChangeText={setBio}
            placeholderTextColor="#aaa"
          />

          {/* 간단 계획 */}
          <Text style={styles.label}>🗺 간단 계획</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="여행 계획을 간단히 적어주세요."
            value={plan}
            onChangeText={setPlan}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            placeholderTextColor="#aaa"
          />

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  closeButton: {
    fontSize: 18,
    color: '#666',
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
  },
  submitButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4A90E2',
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
  },
  textArea: {
    height: 120,
  },
});