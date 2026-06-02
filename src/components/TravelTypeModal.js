import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity,
  ScrollView, Animated, Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 성향 정의
// ─────────────────────────────────────────────

const AXES = [
  {
    key: 0,
    left:  { code: 'T', label: '활동형', emoji: '🥾', desc: '걷고 탐험하는 걸 즐겨요.\n많이 걸어도 끄떡없어요!' },
    right: { code: 'C', label: '여유형', emoji: '🚗', desc: '편안하게 이동하는 걸 선호해요.\n효율적인 동선이 중요해요!' },
    title: '이동 스타일',
  },
  {
    key: 1,
    left:  { code: 'U', label: '도심파', emoji: '🏙', desc: '번화가, 카페, 쇼핑을 즐겨요.\n도시의 에너지가 좋아요!' },
    right: { code: 'N', label: '자연파', emoji: '🌿', desc: '산, 바다, 공원이 좋아요.\n자연 속에서 힐링해요!' },
    title: '선호 환경',
  },
  {
    key: 2,
    left:  { code: 'A', label: '액티브', emoji: '🏄', desc: '체험, 액티비티를 좋아해요.\n새로운 도전을 즐겨요!' },
    right: { code: 'R', label: '힐링형', emoji: '🛁', desc: '느긋하게 쉬는 게 좋아요.\n충전이 여행의 목적이에요!' },
    title: '활동 성향',
  },
  {
    key: 3,
    left:  { code: 'J', label: '계획파', emoji: '📋', desc: '미리 계획하고 예약해요.\n꼼꼼한 일정이 편해요!' },
    right: { code: 'P', label: '즉흥파', emoji: '🎲', desc: '그날그날 결정하는 게 좋아요.\n자유로운 여행이 최고예요!' },
    title: '여행 스타일',
  },
];

const COMPATIBILITY = [
  { min: 4, max: 4, label: '완벽한 파트너', emoji: '💘', color: '#FF6B6B', comment: '모든 면에서 딱 맞는 여행 파트너예요! 함께라면 어디든 완벽한 여행이 될 거예요.' },
  { min: 3, max: 3, label: '잘 맞는 편', emoji: '💖', color: '#FF8E53', comment: '대부분 비슷한 스타일이에요. 약간의 차이도 여행의 재미가 될 거예요!' },
  { min: 2, max: 2, label: '보완 관계', emoji: '✨', color: '#6C5CE7', comment: '서로 다른 매력으로 새로운 경험을 만들 수 있어요. 의외로 잘 맞을 수도!' },
  { min: 1, max: 1, label: '도전적 조합', emoji: '⚡', color: '#0984e3', comment: '스타일이 꽤 달라요. 서로의 새로운 면을 발견하는 여행이 될 거예요.' },
  { min: 0, max: 0, label: '정반대 스타일', emoji: '🔄', color: '#00b894', comment: '완전히 다른 스타일이에요! 하지만 반대끼리 끌리는 법 — 도전해볼 만해요.' },
];

// ─────────────────────────────────────────────
// 메인 컴포넌트
// ─────────────────────────────────────────────

export default function TravelTypeModal({ visible, onClose, myType, otherType, otherName }) {
  const slideAnim = useRef(new Animated.Value(600)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 600, duration: 220, useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 0,   duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!myType) return null;

  const isCompareMode = !!otherType;

  // 궁합 점수 계산
  let matchCount = 0;
  if (isCompareMode) {
    for (let i = 0; i < 4; i++) {
      if (myType[i] === otherType[i]) matchCount++;
    }
  }

  const compatibility = COMPATIBILITY.find(c => matchCount >= c.min && matchCount <= c.max);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>

          {/* 핸들 */}
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

            {/* 헤더 */}
            <View style={styles.header}>
              {isCompareMode ? (
                <>
                  <Text style={styles.title}>여행 성향 궁합</Text>
                  <View style={styles.typeRow}>
                    <TypeBadge type={myType} label="나" color="#FF6B6B" />
                    <Text style={styles.vsText}>VS</Text>
                    <TypeBadge type={otherType} label={otherName || '상대'} color="#6C5CE7" />
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.title}>나의 여행 성향</Text>
                  <TypeBadge type={myType} label="내 유형" color="#FF6B6B" size="large" />
                </>
              )}
            </View>

            {/* 궁합 점수 (비교 모드) */}
            {isCompareMode && compatibility && (
              <View style={[styles.compatBox, { borderColor: compatibility.color }]}>
                <Text style={styles.compatEmoji}>{compatibility.emoji}</Text>
                <Text style={[styles.compatLabel, { color: compatibility.color }]}>
                  {compatibility.label}
                </Text>
                <View style={styles.scoreBar}>
                  {[0,1,2,3].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.scoreDot,
                        { backgroundColor: i < matchCount ? compatibility.color : '#e0e0e0' }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.scoreLabel}>{matchCount}/4 축 일치</Text>
                <Text style={styles.compatComment}>{compatibility.comment}</Text>
              </View>
            )}

            {/* 축별 비교 */}
            <Text style={styles.sectionTitle}>
              {isCompareMode ? '축별 비교' : '성향 상세'}
            </Text>

            {AXES.map((axis) => {
              const myCode    = myType?.[axis.key];
              const otherCode = otherType?.[axis.key];
              const myAxis    = myCode === axis.left.code ? axis.left : axis.right;
              const otherAxis = otherCode === axis.left.code ? axis.left : axis.right;
              const isMatch   = isCompareMode && myCode === otherCode;

              return (
                <View key={axis.key} style={styles.axisCard}>
                  <View style={styles.axisHeader}>
                    <Text style={styles.axisTitle}>{axis.title}</Text>
                    {isCompareMode && (
                      <View style={[styles.matchBadge, { backgroundColor: isMatch ? '#FF6B6B' : '#6C5CE7' }]}>
                        <Text style={styles.matchBadgeText}>{isMatch ? '일치 ✅' : '차이 ⚡'}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.axisContent}>
                    {/* 내 성향 */}
                    <AxisItem axis={myAxis} color="#FF6B6B" label="나" />

                    {/* 상대 성향 (비교 모드) */}
                    {isCompareMode && (
                      <>
                        <View style={styles.axisDivider} />
                        <AxisItem axis={otherAxis} color="#6C5CE7" label={otherName || '상대'} />
                      </>
                    )}
                  </View>
                </View>
              );
            })}

          </ScrollView>

          {/* 닫기 버튼 */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>닫기</Text>
          </TouchableOpacity>

        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

function TypeBadge({ type, label, color, size }) {
  const isLarge = size === 'large';
  return (
    <View style={styles.typeBadgeWrap}>
      <Text style={styles.typeBadgeLabel}>{label}</Text>
      <View style={[styles.typeBadge, { borderColor: color }, isLarge && styles.typeBadgeLarge]}>
        {type.split('').map((ch, i) => (
          <Text key={i} style={[styles.typeBadgeChar, { color }, isLarge && styles.typeBadgeCharLarge]}>
            {ch}
          </Text>
        ))}
      </View>
    </View>
  );
}

function AxisItem({ axis, color, label }) {
  return (
    <View style={styles.axisItem}>
      <Text style={styles.axisItemEmoji}>{axis.emoji}</Text>
      <View style={styles.axisItemInfo}>
        <View style={styles.axisItemHeader}>
          <View style={[styles.axisCodeBadge, { backgroundColor: color }]}>
            <Text style={styles.axisCodeText}>{axis.code}</Text>
          </View>
          <Text style={[styles.axisItemLabel, { color }]}>{axis.label}</Text>
          <Text style={styles.axisWhoLabel}>{label}</Text>
        </View>
        <Text style={styles.axisItemDesc}>{axis.desc}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#ddd',
    alignSelf: 'center', marginBottom: 16,
  },

  // 헤더
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 20, fontWeight: '900', color: '#222', marginBottom: 14 },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  vsText: { fontSize: 16, fontWeight: '900', color: '#aaa' },

  // TypeBadge
  typeBadgeWrap: { alignItems: 'center', gap: 6 },
  typeBadgeLabel: { fontSize: 12, color: '#888', fontWeight: 'bold' },
  typeBadge: {
    flexDirection: 'row', gap: 3,
    borderWidth: 2, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  typeBadgeLarge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 16 },
  typeBadgeChar: { fontSize: 18, fontWeight: '900' },
  typeBadgeCharLarge: { fontSize: 26 },

  // 궁합 박스
  compatBox: {
    borderWidth: 2, borderRadius: 20,
    padding: 20, marginBottom: 24,
    alignItems: 'center', backgroundColor: '#fafafa',
  },
  compatEmoji: { fontSize: 40, marginBottom: 8 },
  compatLabel: { fontSize: 20, fontWeight: '900', marginBottom: 10 },
  scoreBar: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  scoreDot: { width: 14, height: 14, borderRadius: 7 },
  scoreLabel: { fontSize: 13, color: '#888', marginBottom: 10 },
  compatComment: {
    fontSize: 14, color: '#555', textAlign: 'center',
    lineHeight: 20, paddingHorizontal: 10,
  },

  // 섹션
  sectionTitle: {
    fontSize: 16, fontWeight: '900', color: '#333',
    marginBottom: 12,
  },

  // 축 카드
  axisCard: {
    backgroundColor: '#f8f8f8', borderRadius: 16,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#eee',
  },
  axisHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  axisTitle: { fontSize: 14, fontWeight: '900', color: '#333' },
  matchBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  matchBadgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  axisContent: { gap: 8 },
  axisDivider: { height: 1, backgroundColor: '#eee', marginVertical: 4 },

  // AxisItem
  axisItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  axisItemEmoji: { fontSize: 28, marginTop: 2 },
  axisItemInfo: { flex: 1 },
  axisItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  axisCodeBadge: {
    width: 22, height: 22, borderRadius: 11,
    justifyContent: 'center', alignItems: 'center',
  },
  axisCodeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  axisItemLabel: { fontSize: 14, fontWeight: '900' },
  axisWhoLabel: { fontSize: 11, color: '#aaa', fontWeight: 'bold' },
  axisItemDesc: { fontSize: 12, color: '#666', lineHeight: 18 },

  // 닫기 버튼
  closeBtn: {
    backgroundColor: '#FF6B6B', borderRadius: 16,
    paddingVertical: 14, alignItems: 'center',
    marginTop: 8, marginBottom: 10,
  },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});