import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, TextInput, ScrollView, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DESTINATION_OPTIONS = ['국내', '아시아', '유럽', '아메리카', '오세아니아'];
const API_URL = 'https://triplan-backend-qwrs.onrender.com';

export default function DestinationPicker({ value = [], onChange }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selected, setSelected] = useState(value);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleOption = (option) => {
    if (selected.includes(option)) {
      setSelected(prev => prev.filter(s => s !== option));
    } else {
      setSelected(prev => [...prev, option]);
    }
  };

  const handleAddCustom = () => {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    if (selected.includes(trimmed)) {
      Alert.alert('알림', '이미 추가된 여행지예요.');
      return;
    }
    setSelected(prev => [...prev, trimmed]);
    setCustomInput('');
    setShowCustomInput(false);
  };

  const handleRemove = (item) => {
    setSelected(prev => prev.filter(s => s !== item));
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      Alert.alert('알림', '여행지를 하나 이상 선택해주세요.');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_URL}/users/preferred-destination`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ destinations: selected }),
      });
      const data = await res.json();
      if (data.success) {
        onChange?.(selected);
        setModalVisible(false);
      } else {
        Alert.alert('오류', '저장에 실패했습니다.');
      }
    } catch (e) {
      console.log('선호 여행지 저장 에러:', e);
      Alert.alert('오류', '저장 중 문제가 발생했습니다.');
    }
  };

  const handleOpen = () => {
    setSelected(value); // 모달 열 때 현재 값으로 초기화
    setModalVisible(true);
  };

  return (
    <View>
      {/* 현재 선택된 태그들 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRow}>
        {value.length === 0 ? (
          <Text style={styles.emptyText}>선호 여행지를 선택해주세요</Text>
        ) : (
          value.map((item, idx) => (
            <View key={idx} style={styles.tag}>
              <Text style={styles.tagText}>📍 {item}</Text>
            </View>
          ))
        )}
        <TouchableOpacity style={styles.editBtn} onPress={handleOpen}>
          <Text style={styles.editBtnText}>{value.length === 0 ? '+ 추가' : '수정'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 선택 모달 */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>

            <View style={styles.handle} />
            <Text style={styles.title}>선호 여행지 선택</Text>
            <Text style={styles.sub}>여러 개 선택 가능해요</Text>

            {/* 기본 옵션들 */}
            <View style={styles.optionRow}>
              {DESTINATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[styles.option, selected.includes(option) && styles.optionActive]}
                  onPress={() => toggleOption(option)}>
                  <Text style={[styles.optionText, selected.includes(option) && styles.optionTextActive]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}

              {/* 기타 직접입력 버튼 */}
              <TouchableOpacity
                style={[styles.option, showCustomInput && styles.optionActive]}
                onPress={() => setShowCustomInput(prev => !prev)}>
                <Text style={[styles.optionText, showCustomInput && styles.optionTextActive]}>
                  기타 ✏️
                </Text>
              </TouchableOpacity>
            </View>

            {/* 직접 입력 */}
            {showCustomInput && (
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  placeholder="예) 도쿄, 파리, 제주도"
                  placeholderTextColor="#aaa"
                  value={customInput}
                  onChangeText={setCustomInput}
                  onSubmitEditing={handleAddCustom}
                />
                <TouchableOpacity style={styles.customAddBtn} onPress={handleAddCustom}>
                  <Text style={styles.customAddBtnText}>추가</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 선택된 항목들 */}
            {selected.length > 0 && (
              <View style={styles.selectedBox}>
                <Text style={styles.selectedTitle}>선택됨</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.selectedRow}>
                    {selected.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.selectedTag}
                        onPress={() => handleRemove(item)}>
                        <Text style={styles.selectedTagText}>📍 {item}</Text>
                        <Text style={styles.selectedTagRemove}> ✕</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* 저장 버튼 */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // 태그 표시
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  tag: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1, borderColor: '#FF6B6B',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12,
  },
  tagText: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },
  emptyText: { fontSize: 13, color: '#aaa' },
  editBtn: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 12,
  },
  editBtnText: { fontSize: 12, color: '#fff', fontWeight: 'bold' },

  // 모달
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#ddd', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 4 },
  sub: { fontSize: 13, color: '#aaa', marginBottom: 20 },

  // 옵션
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  option: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#eee',
    backgroundColor: '#f9f9f9',
  },
  optionActive: { borderColor: '#FF6B6B', backgroundColor: 'rgba(255,107,107,0.08)' },
  optionText: { fontSize: 14, color: '#666', fontWeight: 'bold' },
  optionTextActive: { color: '#FF6B6B' },

  // 직접 입력
  customRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  customInput: {
    flex: 1, borderWidth: 1, borderColor: '#FFD1D1',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 14, color: '#333',
  },
  customAddBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 12,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  customAddBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },

  // 선택된 항목
  selectedBox: { marginBottom: 20 },
  selectedTitle: { fontSize: 12, color: '#aaa', fontWeight: 'bold', marginBottom: 8 },
  selectedRow: { flexDirection: 'row', gap: 8 },
  selectedTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FF6B6B', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  selectedTagText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  selectedTagRemove: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },

  // 버튼
  saveBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { color: '#aaa', fontSize: 14 },
});