import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, Alert, ActivityIndicator, Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://triplan-backend-qwrs.onrender.com';

export default function AIItineraryCard({ data, messageId, roomId, myUserId, isConfirmed = false }) {
  const [openDay, setOpenDay] = useState(0);
  const [voteState, setVoteState] = useState({
    agreeCount: 0,
    disagreeCount: 0,
    totalMembers: 0,
    myVote: null,
    closed: false,
    expiresAt: null,
  });
  const [voting, setVoting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // 투표 현황 불러오기
  useEffect(() => {
    if (isConfirmed || !messageId || !roomId) return;
    fetchVotes();
    checkOwner();
  }, [messageId]);

  const fetchVotes = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/posts/chat-rooms/${roomId}/itinerary/${messageId}/votes`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) setVoteState(data);
    } catch (e) {
      console.log('투표 현황 조회 실패:', e);
    }
  };

  const checkOwner = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/posts/chat-rooms/${roomId}/members`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      // 방장 = 첫 번째 멤버 (joined_at 기준)
      if (data.success && data.members.length > 0) {
        const sorted = [...data.members].sort(
          (a, b) => new Date(a.joined_at) - new Date(b.joined_at)
        );
        setIsOwner(sorted[0].users?.id === myUserId);
      }
    } catch (e) {}
  };

  const handleVote = async (vote) => {
    if (voting || voteState.myVote || voteState.closed) return;
    setVoting(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(
        `${API_URL}/posts/chat-rooms/${roomId}/itinerary/${messageId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ vote }),
        }
      );
      const data = await res.json();
      if (data.success) {
        setVoteState(prev => ({
          ...prev,
          agreeCount: data.agreeCount,
          disagreeCount: data.disagreeCount,
          totalMembers: data.totalMembers,
          myVote: vote,
          closed: data.confirmed ? true : prev.closed,
        }));
      } else {
        Alert.alert('알림', data.message);
      }
    } catch (e) {
      console.log('투표 에러:', e);
    } finally {
      setVoting(false);
    }
  };

  const handleClose = async () => {
    Alert.alert('투표 마감', '투표를 마감할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '마감',
        style: 'destructive',
        onPress: async () => {
          setClosing(true);
          try {
            const token = await AsyncStorage.getItem('token');
            const res = await fetch(
              `${API_URL}/posts/chat-rooms/${roomId}/itinerary/${messageId}/close`,
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
              }
            );
            const data = await res.json();
            if (data.success) {
              setVoteState(prev => ({
                ...prev,
                agreeCount: data.agreeCount,
                disagreeCount: data.disagreeCount,
                closed: true,
              }));
            }
          } catch (e) {
            console.log('마감 에러:', e);
          } finally {
            setClosing(false);
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      const text = data.days
        .map(d => `📅 ${d.label}\n${d.spots.map(s => `  ${s.time} ${s.name}`).join('\n')}`)
        .join('\n\n');
      await Share.share({ message: `✈️ ${data.title}\n\n${text}` });
    } catch (e) {
      console.log('공유 에러:', e);
    }
  };

  if (!data?.days?.length) return null;

  // 만료 시간 계산
  const expiresAt = voteState.expiresAt ? new Date(voteState.expiresAt) : null;
  const now = new Date();
  const isExpired = expiresAt && now > expiresAt;
  const hoursLeft = expiresAt
    ? Math.max(0, Math.floor((expiresAt - now) / (1000 * 60 * 60)))
    : null;

  const majority = Math.floor((voteState.totalMembers || 1) / 2) + 1;
  const isClosed = voteState.closed || isExpired;

  return (
    <View style={styles.card}>

      {/* 헤더 */}
      <View style={[styles.header, isConfirmed && styles.headerConfirmed]}>
        <Text style={styles.headerIcon}>{isConfirmed ? '✅' : '🗓'}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{data.title}</Text>
          <Text style={styles.headerSub}>
            {isConfirmed ? '확정된 일정' : 'AI 동선 최적화 완료'}
          </Text>
        </View>
        {isConfirmed && (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>공유하기</Text>
          </TouchableOpacity>
        )}
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

      <Text style={styles.dayLabel}>{data.days[openDay]?.label}</Text>

      {/* 타임라인 */}
      <View style={styles.timeline}>
        {data.days[openDay]?.spots.map((spot, i) => (
          <View key={i} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <Text style={styles.timeText}>{spot.time}</Text>
              <View style={styles.dot} />
              {i < data.days[openDay].spots.length - 1 && <View style={styles.line} />}
            </View>
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

      {/* 투표 영역 (확정 전에만 표시) */}
      {!isConfirmed && messageId && roomId && (
        <View style={styles.voteBox}>

          {/* 투표 현황 바 */}
          <View style={styles.voteHeader}>
            <Text style={styles.voteTitle}>
              {isClosed ? '🔒 투표 마감' : '🗳 일정 찬반 투표'}
            </Text>
            {!isClosed && hoursLeft !== null && (
              <Text style={styles.voteExpiry}>⏱ {hoursLeft}시간 남음</Text>
            )}
          </View>

          <View style={styles.voteProgress}>
            <View style={styles.voteBar}>
              {voteState.totalMembers > 0 && (
                <View
                  style={[
                    styles.voteBarFill,
                    {
                      width: `${(voteState.agreeCount / voteState.totalMembers) * 100}%`,
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.voteCount}>
              <Text style={styles.agreeCount}>✅ 찬성 {voteState.agreeCount}</Text>
              <Text style={styles.voteNeed}>과반수 {majority}명 필요</Text>
              <Text style={styles.disagreeCount}>❌ 반대 {voteState.disagreeCount}</Text>
            </View>
          </View>

          {/* 투표 버튼 */}
          {!isClosed && !voteState.myVote && (
            <View style={styles.voteBtns}>
              <TouchableOpacity
                style={styles.agreeBtn}
                onPress={() => handleVote('agree')}
                disabled={voting}>
                {voting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.agreeBtnText}>✅ 찬성</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disagreeBtn}
                onPress={() => handleVote('disagree')}
                disabled={voting}>
                <Text style={styles.disagreeBtnText}>❌ 반대</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 이미 투표함 */}
          {!isClosed && voteState.myVote && (
            <View style={styles.myVoteBox}>
              <Text style={styles.myVoteText}>
                {voteState.myVote === 'agree' ? '✅ 찬성으로 투표했어요' : '❌ 반대로 투표했어요'}
              </Text>
            </View>
          )}

          {/* 방장 마감 버튼 */}
          {!isClosed && isOwner && (
            <TouchableOpacity
              style={styles.closeVoteBtn}
              onPress={handleClose}
              disabled={closing}>
              {closing
                ? <ActivityIndicator size="small" color="#aaa" />
                : <Text style={styles.closeVoteBtnText}>방장 투표 마감</Text>
              }
            </TouchableOpacity>
          )}

        </View>
      )}

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
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#FF6B6B',
  },
  headerConfirmed: { backgroundColor: '#00b894' },
  headerIcon: { fontSize: 20 },
  headerTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

  shareBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  shareBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

  dayTabScroll: { paddingLeft: 12, marginTop: 10, marginBottom: 4 },
  dayTabRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  dayTab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFE8D6' },
  dayTabActive: { backgroundColor: '#FF6B6B' },
  dayTabText: { fontSize: 12, fontWeight: 'bold', color: '#FF6B6B' },
  dayTabTextActive: { color: '#fff' },

  dayLabel: { fontSize: 13, fontWeight: 'bold', color: '#555', paddingHorizontal: 16, paddingVertical: 8 },

  timeline: { paddingHorizontal: 16, paddingBottom: 16 },
  timelineItem: { flexDirection: 'row', gap: 12, minHeight: 60 },
  timelineLeft: { alignItems: 'center', width: 48, paddingTop: 2 },
  timeText: { fontSize: 11, color: '#FF6B6B', fontWeight: 'bold', marginBottom: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF6B6B', borderWidth: 2, borderColor: '#fff' },
  line: { flex: 1, width: 2, backgroundColor: '#FFD8A8', marginTop: 2 },
  spotCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FFE8D6' },
  spotName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  spotDetail: { fontSize: 12, color: '#666', lineHeight: 18, marginBottom: 4 },
  tipBox: { backgroundColor: '#FFF3E0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 },
  tipText: { fontSize: 11, color: '#E67E22' },

  // 투표
  voteBox: {
    margin: 12,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE8D6',
  },
  voteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  voteTitle: { fontSize: 14, fontWeight: '900', color: '#333' },
  voteExpiry: { fontSize: 12, color: '#FF6B6B', fontWeight: 'bold' },

  voteProgress: { marginBottom: 14 },
  voteBar: {
    height: 8, backgroundColor: '#f0f0f0', borderRadius: 4,
    overflow: 'hidden', marginBottom: 8,
  },
  voteBarFill: { height: '100%', backgroundColor: '#00b894', borderRadius: 4 },
  voteCount: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  agreeCount: { fontSize: 13, color: '#00b894', fontWeight: 'bold' },
  voteNeed: { fontSize: 11, color: '#aaa' },
  disagreeCount: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' },

  voteBtns: { flexDirection: 'row', gap: 10 },
  agreeBtn: { flex: 1, backgroundColor: '#00b894', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  agreeBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  disagreeBtn: { flex: 1, backgroundColor: '#f0f0f0', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  disagreeBtnText: { color: '#555', fontWeight: '900', fontSize: 14 },

  myVoteBox: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center' },
  myVoteText: { fontSize: 13, color: '#555', fontWeight: 'bold' },

  closeVoteBtn: { marginTop: 10, paddingVertical: 8, alignItems: 'center' },
  closeVoteBtnText: { fontSize: 12, color: '#aaa', fontWeight: 'bold', textDecorationLine: 'underline' },
});