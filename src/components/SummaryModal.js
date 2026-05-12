import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Modal, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';

const FIELDS = [
  { key: 'who',   icon: '👥', label: '누가 (인원)' },
  { key: 'when',  icon: '📅', label: '언제 (날짜/기간)' },
  { key: 'where', icon: '📍', label: '어디서 (여행지)' },
  { key: 'how',   icon: '🚗', label: '어떻게 (이동수단)' },
  { key: 'what',  icon: '🎯', label: '무엇을 (활동)' },
];

export default function SummaryModal({ visible, summary, onApprove, onReject, onClose }) {
  const [editData, setEditData] = useState(null);

  // summary가 바뀔 때 editData 초기화
  React.useEffect(() => {
    if (summary) setEditData(JSON.parse(JSON.stringify(summary))); // deep copy
  }, [summary]);

  if (!editData) return null;

  const updateItem = (key, idx, value) => {
    setEditData(prev => {
      const updated = { ...prev };
      updated[key] = [...(prev[key] || [])];
      updated[key][idx] = value;
      return updated;
    });
  };

  const addItem = (key) => {
    setEditData(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), ''],
    }));
  };

  const removeItem = (key, idx) => {
    setEditData(prev => {
      const updated = { ...prev };
      updated[key] = prev[key].filter((_, i) => i !== idx);
      return updated;
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.box}>

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>📋 대화 정리 결과</Text>
            <Text style={styles.sub}>수정 후 승인하면 채팅방에 공유돼요</Text>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {FIELDS.map(({ key, icon, label }) => (
              <View key={key} style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>{icon}</Text>
                  <Text style={styles.sectionLabel}>{label}</Text>
                  <TouchableOpacity onPress={() => addItem(key)} style={styles.addBtn}>
                    <Text style={styles.addBtnText}>＋</Text>
                  </TouchableOpacity>
                </View>

                {(editData[key] || []).length === 0 ? (
                  <Text style={styles.emptyText}>미확인</Text>
                ) : (
                  (editData[key] || []).map((val, idx) => (
                    <View key={idx} style={styles.itemRow}>
                      <TextInput
                        style={styles.itemInput}
                        value={val}
                        onChangeText={(t) => updateItem(key, idx, t)}
                        placeholder="내용 입력"
                        placeholderTextColor="#ccc"
                      />
                      <TouchableOpacity
                        onPress={() => removeItem(key, idx)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Text style={styles.removeBtn}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            ))}
          </ScrollView>

          {/* 버튼 */}
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.rejectBtn} onPress={onReject}>
              <Text style={styles.rejectText}>거절</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.approveBtn} onPress={() => onApprove(editData)}>
              <Text style={styles.approveText}>승인 · 공유</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  box: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 34,
    maxHeight: '88%',
  },
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  sub: { fontSize: 12, color: '#888', marginTop: 4 },

  scroll: { marginBottom: 16 },

  section: {
    marginBottom: 16,
    backgroundColor: '#FAF8FF',
    borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E8E0FF',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 8, gap: 6,
  },
  sectionIcon: { fontSize: 16 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', flex: 1 },
  addBtn: {
    backgroundColor: '#6C5CE7', borderRadius: 12,
    width: 24, height: 24,
    justifyContent: 'center', alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontSize: 16, lineHeight: 20 },

  emptyText: { fontSize: 12, color: '#bbb', fontStyle: 'italic', paddingLeft: 4 },

  itemRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 6,
  },
  itemInput: {
    flex: 1, backgroundColor: '#fff',
    borderRadius: 8, borderWidth: 1, borderColor: '#C9B8FF',
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 14, color: '#333',
  },
  removeBtn: { fontSize: 14, color: '#C9B8FF', fontWeight: 'bold' },

  buttons: { flexDirection: 'row', gap: 10 },
  rejectBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f0f0f0', alignItems: 'center',
  },
  rejectText: { fontSize: 15, color: '#888', fontWeight: 'bold' },
  approveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#6C5CE7', alignItems: 'center',
  },
  approveText: { fontSize: 15, color: '#fff', fontWeight: 'bold' },
});
