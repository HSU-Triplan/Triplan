import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  Modal, StyleSheet, Alert, Clipboard,
} from 'react-native';

// ─────────────────────────────────────────────
// UserProfileModal
// SearchScreen, ChatRoomScreen, FriendsScreen 공용
//
// Props:
//   visible       - boolean
//   user          - 유저 객체 (otherUser)
//   onClose       - 닫기 콜백
//   onInfoPress   - ❔ 버튼 콜백 (성향 설명 모달 열기)
// ─────────────────────────────────────────────

export default function UserProfileModal({ visible, user, onClose, onInfoPress }) {
  const handleCopyFriendCode = () => {
    if (!user?.friend_code) return;
    Clipboard.setString(user.friend_code);
    Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}>
        <View style={styles.container}>

          {/* 헤더 */}
          <View style={styles.header}>
            <Image
              source={{ uri: user?.profile_image || 'https://via.placeholder.com/100' }}
              style={styles.profileImage}
            />
            <Text style={styles.name}>{user?.name || user?.nickname}</Text>
            {user?.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
          </View>

          {/* 정보 카드 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>프로필 정보</Text>

            {/* 닉네임 */}
            <View style={styles.row}>
              <Text style={styles.label}>닉네임</Text>
              <Text style={styles.value}>{user?.nickname || user?.name}</Text>
            </View>

            {/* 여행 타입 */}
            <View style={styles.row}>
              <Text style={styles.label}>여행 타입</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {user?.travel_type ?? '성향 미설정'}
                  </Text>
                </View>
                {user?.travel_type && onInfoPress && (
                  <TouchableOpacity
                    onPress={onInfoPress}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={{ fontSize: 16 }}>❔</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 선호 여행지 */}
            {user?.preferred_destination && (
              <View style={[styles.row, { alignItems: 'flex-start', paddingVertical: 14 }]}>
                <Text style={styles.label}>선호 여행지</Text>
                <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, marginLeft: 8 }}>
                  {user.preferred_destination.split(',').map((dest, idx) => (
                    <View key={idx} style={styles.destBadge}>
                      <Text style={styles.destBadgeText}>📍 {dest.trim()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 친구 코드 */}
            <View style={styles.row}>
              <Text style={styles.label}>친구 코드</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.value}>{user?.friend_code}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyFriendCode}>
                  <Text style={styles.copyBtnText}>복사</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 생년월일 */}
            <View style={styles.row}>
              <Text style={styles.label}>생년월일</Text>
              <Text style={styles.value}>{user?.birth_year || '미설정'}</Text>
            </View>

            {/* 성별 */}
            <View style={styles.row}>
              <Text style={styles.label}>성별</Text>
              <Text style={styles.value}>{user?.gender || '미설정'}</Text>
            </View>

            {/* 소개 */}
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>소개</Text>
              <Text style={[styles.value, { flex: 1, textAlign: 'right', color: '#666' }]}>
                {user?.bio || '미설정'}
              </Text>
            </View>
          </View>

        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    paddingVertical: 30,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  profileImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: '900',
    color: '#222',
  },
  bio: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  card: {
    padding: 24,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 16,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  label: {
    fontSize: 15,
    color: '#777',
    fontWeight: 'bold',
  },
  value: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  typeBadge: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  destBadge: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderWidth: 1,
    borderColor: '#FF6B6B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  destBadgeText: {
    color: '#FF6B6B',
    fontWeight: 'bold',
    fontSize: 12,
  },
  copyBtn: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginLeft: 10,
  },
  copyBtnText: {
    fontSize: 12,
    color: '#555',
    fontWeight: 'bold',
  },
});