import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

export default function AIItineraryCard({ data }) {
  const [openDay, setOpenDay] = useState(0);

  if (!data?.days?.length) return null;

  return (
    <View style={styles.card}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>🗓</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{data.title}</Text>
          <Text style={styles.headerSub}>AI 동선 최적화 완료</Text>
        </View>
      </View>

      {/* 일차 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayTabScroll}>
        <View style={styles.dayTabRow}>
          {data.days.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.dayTab, openDay === i && styles.dayTabActive]}
              onPress={() => setOpenDay(i)}>
              <Text style={[styles.dayTabText, openDay === i && styles.dayTabTextActive]}>
                {d.day}일차
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 선택된 일차 라벨 */}
      <Text style={styles.dayLabel}>{data.days[openDay]?.label}</Text>

      {/* 타임라인 */}
      <View style={styles.timeline}>
        {data.days[openDay]?.spots.map((spot, i) => (
          <View key={i} style={styles.timelineItem}>
            {/* 왼쪽 타임라인 선 */}
            <View style={styles.timelineLeft}>
              <Text style={styles.timeText}>{spot.time}</Text>
              <View style={styles.dot} />
              {i < data.days[openDay].spots.length - 1 && <View style={styles.line} />}
            </View>

            {/* 오른쪽 카드 */}
            <View style={styles.spotCard}>
              <Text style={styles.spotName}>{spot.name}</Text>
              {spot.detail ? <Text style={styles.spotDetail}>{spot.detail}</Text> : null}
              {spot.tip ? (
                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>💡 {spot.tip}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF9F0',
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFD8A8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: '#FF6B6B',
  },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  dayTabScroll: { paddingLeft: 12, marginTop: 10, marginBottom: 4 },
  dayTabRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  dayTab: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFE8D6',
  },
  dayTabActive: { backgroundColor: '#FF6B6B' },
  dayTabText: { fontSize: 12, fontWeight: 'bold', color: '#FF6B6B' },
  dayTabTextActive: { color: '#fff' },

  dayLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#555',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  timeline: { paddingHorizontal: 16, paddingBottom: 16 },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 60,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 48,
    paddingTop: 2,
  },
  timeText: {
    fontSize: 11,
    color: '#FF6B6B',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#FF6B6B',
    borderWidth: 2, borderColor: '#fff',
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: '#FFD8A8',
    marginTop: 2,
  },
  spotCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  spotName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  spotDetail: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 4 },
  tipBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  tipText: { fontSize: 11, color: '#E67E22' },
});