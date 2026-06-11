import React from 'react';
import {
  View, Text, TouchableOpacity,
  Modal, StyleSheet,
} from 'react-native';

// ─────────────────────────────────────────────
// TravelInfoModal
// 4축 여행 성향 설명 모달
// SearchScreen, FriendsScreen, ChatRoomScreen 공용
//
// Props:
//   visible  - boolean
//   onClose  - 닫기 콜백
// ─────────────────────────────────────────────

export default function TravelInfoModal({ visible, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.box}>
          <Text style={styles.title}>🧭 4가지 여행 성향 척도</Text>
          <View style={styles.list}>
            <Text style={styles.item}>
              🥾 <Text style={styles.highlight}>T / C</Text>
              {' '}:  활동형 (많이 걷기 OK) vs 여유형 (편안한 이동)
            </Text>
            <Text style={styles.item}>
              🏙 <Text style={styles.highlight}>U / N</Text>
              {' '}:  도심파 (번화가/쇼핑) vs 자연파 (산/바다/공원)
            </Text>
            <Text style={styles.item}>
              🏄 <Text style={styles.highlight}>A / R</Text>
              {' '}:  액티브 (체험/도전) vs 힐링형 (느긋하게 충전)
            </Text>
            <Text style={styles.item}>
              📋 <Text style={styles.highlight}>J / P</Text>
              {' '}:  계획파 (꼼꼼한 일정) vs 즉흥파 (자유로운 여행)
            </Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  list: {
    gap: 12,
    marginBottom: 24,
  },
  item: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  closeBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});