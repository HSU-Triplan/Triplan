// 채팅창에 브로드캐스트되는 정리 결과 카드
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FIELDS = [
  { key: 'who',   icon: '👥', label: '누가' },
  { key: 'when',  icon: '📅', label: '언제' },
  { key: 'where', icon: '📍', label: '어디서' },
  { key: 'how',   icon: '🚗', label: '어떻게' },
  { key: 'what',  icon: '🎯', label: '무엇을' },
];

export default function AISummaryCard({ data }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerIcon}>📋</Text>
        <Text style={styles.headerText}>여행 계획 정리</Text>
      </View>
      {FIELDS.map(({ key, icon, label }) => {
        const items = data[key] || [];
        if (items.length === 0) return null;
        return (
          <View key={key} style={styles.row}>
            <Text style={styles.rowIcon}>{icon}</Text>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={styles.rowValue}>{items.join(' · ')}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0EEFF',
    borderRadius: 14, marginHorizontal: 12, marginVertical: 8,
    padding: 14, borderWidth: 1, borderColor: '#C9B8FF',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10,
  },
  headerIcon: { fontSize: 16 },
  headerText: { fontSize: 14, fontWeight: 'bold', color: '#3D2B9E' },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 6, marginBottom: 6,
  },
  rowIcon: { fontSize: 14, width: 20 },
  rowLabel: { fontSize: 13, fontWeight: 'bold', color: '#666', width: 48 },
  rowValue: { fontSize: 13, color: '#333', flex: 1, lineHeight: 18 },
});
