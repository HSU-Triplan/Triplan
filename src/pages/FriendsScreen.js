import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, ScrollView,
  Alert, TextInput, ImageBackground, SafeAreaView, ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?q=80&w=800&auto=format&fit=crop';

// 🌟 현재 상황에 맞춰서 true / false를 선택하세요!
// true  = 내 컴퓨터에서 켠 로컬 서버 (http://10.0.2.2:3000)
// false = 클라우드 배포 서버 (https://triplan-backend-qwrs.onrender.com)
const USE_LOCAL_SERVER = true; 

const API_URL = USE_LOCAL_SERVER 
  ? 'http://10.0.2.2:3000' 
  : 'https://triplan-backend-qwrs.onrender.com';

export default function FriendsScreen({ setIsLoggedIn }) {
  const [screen, setScreen] = useState('friends'); 
  const isUploadingRef = useRef(false);
  
  const [friendsList, setFriendsList] = useState([]);
  const [requestList, setRequestList] = useState([]);
  const [sentList, setSentList] = useState([]); 
  
  const [friendCode, setFriendCode] = useState('');
  const [isSending, setIsSending] = useState(false); 

  // 1. 친구 목록 불러오기
  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friends`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) return; // 서버 응답 에러 시 무시

      const result = await response.json();
      if (result.success && !isUploadingRef.current) {
        const friendArray = result.friends || []; 
        let friends = [], request = [], sent = []; 

        for (let i = 0; i < friendArray.length; i++) {
          const friendData = friendArray[i];
          if (friendData.status === 'accept') friends.push(friendData);
          else if (friendData.status === 'request') request.push(friendData);
          else if (friendData.status === 'sent') sent.push(friendData);
        }
        setFriendsList(friends);
        setRequestList(request);
        setSentList(sent);
      }
    } catch (e) {
      console.log('친구 목록 로드 실패:', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [])
  );

  // 2. 친구 추가 요청
  const friendAdd = async () => {
    if (isSending) return; 
    if (!friendCode.trim()) {
      Alert.alert('알림', '친구 코드를 입력해주세요!');
      return;
    }
    
    setIsSending(true); 
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friendsAdd?friendCode=${friendCode.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🌟 서버가 에러를 뱉었는지 엄격하게 검사
      if (!response.ok) {
        Alert.alert('오류', '서버가 요청을 처리하지 못했습니다. 코드를 확인해주세요.');
        setIsSending(false);
        return;
      }

      const result = await response.json();
      if (result.success) {
        Alert.alert('친구 요청', '친구 요청을 성공적으로 보냈습니다!');
        setFriendCode('');
        fetchFriends(); 
      } else {
        Alert.alert('알림', result.message || '친구 추가에 실패했습니다.');
      }
    } catch (e) {
      console.log('친구 추가 실패:', e);
      Alert.alert('오류', '서버 연결에 실패했습니다.');
    } finally {
      setIsSending(false); 
    }
  };

  // 3. 친구 요청 수락
  const friendAccept = async (request) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friendsAccept?friendId=${request.users?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // 🌟 진짜로 DB 반영이 성공했는지 먼저 확인합니다!
      if (!response.ok) {
        Alert.alert('오류', '서버에서 수락 처리를 완료하지 못했습니다.');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        // 서버가 오케이 했을 때만 화면에서 확실하게 이동시켜 줍니다.
        setRequestList(prev => prev.filter(req => req.users?.id !== request.users?.id));
        setFriendsList(prev => [...prev, { ...request, status: 'accept' }]);

        const displayName = request.users?.nickname || request.users?.name || '유저';
        Alert.alert('수락 완료', `${displayName}님과 친구가 되었습니다!`);
      } else {
        Alert.alert('알림', result.message || '수락 처리에 실패했습니다.');
      }
    } catch (e) {
      console.log('친구 수락 에러:', e);
      Alert.alert('오류', '네트워크 문제가 발생했습니다.');
    }
  };

  // 4. 친구 요청 거절
  const friendRefuse = async (request) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/users/friendsRefuse?friendId=${request.users?.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        Alert.alert('오류', '서버에서 거절 처리를 완료하지 못했습니다.');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setRequestList(prev => prev.filter(req => req.users?.id !== request.users?.id));
        Alert.alert('거절 완료', '친구 요청을 거절했습니다.');
      }
    } catch (e) {
      console.log('친구 거절 에러:', e);
    }
  };

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>

        {/* 상단 탭 영역 */}
        <View style={styles.appBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.appBarScroll}>
            <TouchableOpacity style={[styles.tabButton, screen === 'friends' && styles.tabButtonActive]} onPress={() => setScreen('friends')}>
              <Text style={[styles.tabText, screen === 'friends' && styles.tabTextActive]}>내 친구</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tabButton, screen === 'request' && styles.tabButtonActive]} onPress={() => setScreen('request')}>
              <Text style={[styles.tabText, screen === 'request' && styles.tabTextActive]}>
                받은 요청 {requestList?.length > 0 ? `(${requestList.length})` : ''}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.tabButton, screen === 'sent' && styles.tabButtonActive]} onPress={() => setScreen('sent')}>
              <Text style={[styles.tabText, screen === 'sent' && styles.tabTextActive]}>보낸 요청</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.tabButton, screen === 'add' && styles.tabButtonActive]} onPress={() => setScreen('add')}>
              <Text style={[styles.tabText, screen === 'add' && styles.tabTextActive]}>친구 추가</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.contentArea}>
          {/* 내 친구 목록 */}
          {screen === 'friends' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <Text style={styles.listTitle}>내 동행 친구</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{friendsList?.length || 0}명</Text></View>
              </View>
              {friendsList?.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyEmoji}>🤝</Text><Text style={styles.emptyText}>아직 등록된 친구가 없어요</Text></View>
              ) : (
                friendsList?.map((friend, index) => (
                  <View key={index} style={styles.userCard}>
                    <Image style={styles.profileImage} source={{ uri: friend.users?.profile_image || 'https://via.placeholder.com/100' }} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{friend.users?.nickname || friend.users?.name || '알 수 없는 유저'}</Text>
                      <Text style={styles.userSubText}>함께 여행할 준비 완료! ✈️</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* 받은 요청 목록 */}
          {screen === 'request' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <Text style={styles.listTitle}>받은 친구 요청</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{requestList?.length || 0}건</Text></View>
              </View>
              {requestList?.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyEmoji}>📭</Text><Text style={styles.emptyText}>새로운 친구 요청이 없습니다</Text></View>
              ) : (
                requestList?.map((request, index) => (
                  <View key={index} style={styles.userCard}>
                    <Image style={styles.profileImage} source={{ uri: request.users?.profile_image || 'https://via.placeholder.com/100' }} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{request.users?.nickname || request.users?.name || '알 수 없는 유저'}</Text>
                      <Text style={styles.userSubText}>친구가 되고 싶어 해요!</Text>
                    </View>
                    <View style={styles.btnGroup}>
                      <TouchableOpacity onPress={() => friendAccept(request)} style={styles.acceptBtn}><Text style={styles.acceptBtnText}>수락</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => friendRefuse(request)} style={styles.refuseBtn}><Text style={styles.refuseBtnText}>거절</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* 보낸 요청 목록 */}
          {screen === 'sent' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <Text style={styles.listTitle}>내가 보낸 요청</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{sentList?.length || 0}건</Text></View>
              </View>
              {sentList?.length === 0 ? (
                <View style={styles.emptyBox}><Text style={styles.emptyEmoji}>✉️</Text><Text style={styles.emptyText}>보낸 친구 요청이 없습니다</Text></View>
              ) : (
                sentList?.map((request, index) => (
                  <View key={index} style={styles.userCard}>
                    <Image style={styles.profileImage} source={{ uri: request.users?.profile_image || 'https://via.placeholder.com/100' }} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{request.users?.nickname || request.users?.name || '알 수 없는 유저'}</Text>
                      <Text style={styles.userSubText}>상대방의 수락을 기다리는 중 ⏳</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          {/* 친구 추가 탭 */}
          {screen === 'add' && (
            <View style={styles.addFriendBox}>
              <Text style={styles.addFriendEmoji}>🔍</Text>
              <Text style={styles.addFriendTitle}>새로운 동행 찾기</Text>
              <Text style={styles.addFriendDesc}>친구가 공유해준 영문/숫자 코드를 입력해주세요.</Text>
              <View style={styles.inputContainer}>
                <TextInput 
                  value={friendCode} 
                  onChangeText={setFriendCode} 
                  placeholder="친구 코드 입력 (예: ABC123D)" 
                  placeholderTextColor="#aaa" 
                  style={styles.friendCodeInput} 
                  autoCapitalize="characters" 
                  onSubmitEditing={friendAdd} 
                />
              </View>
              <TouchableOpacity 
                style={[styles.submitBtn, isSending && { backgroundColor: '#FFB5B5' }]} 
                onPress={friendAdd} 
                disabled={isSending}
              >
                {isSending ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>친구 요청 보내기</Text>}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%', backgroundColor: '#eef2f5' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245, 247, 250, 0.45)' },
  container: { flex: 1 },
  appBar: { backgroundColor: 'rgba(255, 255, 255, 0.85)', borderBottomWidth: 1, borderBottomColor: '#eee' },
  appBarScroll: { paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 6 },
  tabButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 24, backgroundColor: 'transparent' },
  tabButtonActive: { backgroundColor: '#FF6B6B', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  tabText: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  tabTextActive: { color: '#fff' },
  contentArea: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  listTitle: { fontSize: 20, fontWeight: '900', color: '#333' },
  countBadge: { backgroundColor: 'rgba(255, 107, 107, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#FF6B6B' },
  countText: { fontSize: 13, fontWeight: 'bold', color: '#FF6B6B' },
  userCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 16, borderRadius: 20, marginBottom: 12, elevation: 3 },
  profileImage: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff' },
  userInfo: { flex: 1, marginLeft: 14 },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  userSubText: { fontSize: 13, color: '#888' },
  btnGroup: { flexDirection: 'row', gap: 8 },
  acceptBtn: { backgroundColor: '#FF6B6B', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  acceptBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  refuseBtn: { backgroundColor: '#f0f0f0', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12 },
  refuseBtnText: { color: '#666', fontWeight: 'bold', fontSize: 14 },
  addFriendBox: { backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: 30, borderRadius: 24, alignItems: 'center', marginTop: 20, elevation: 4 },
  addFriendEmoji: { fontSize: 48, marginBottom: 16 },
  addFriendTitle: { fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 8 },
  addFriendDesc: { fontSize: 14, color: '#777', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  inputContainer: { width: '100%', backgroundColor: '#f5f5f5', borderRadius: 16, borderWidth: 1, borderColor: '#eee', marginBottom: 20 },
  friendCodeInput: { paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, color: '#333', textAlign: 'center', fontWeight: 'bold', letterSpacing: 2 },
  submitBtn: { backgroundColor: '#FF6B6B', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, backgroundColor: 'rgba(255, 255, 255, 0.7)', borderRadius: 24 },
  emptyEmoji: { fontSize: 50, marginBottom: 16 },
  emptyText: { fontSize: 16, fontWeight: 'bold', color: '#666' },
});