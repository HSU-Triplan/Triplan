import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ImageBackground,
  SafeAreaView,
  ActivityIndicator,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1605130284535-11dd9eedc58a?q=80&w=800&auto=format&fit=crop';

export default function FriendsScreen({ setIsLoggedIn }) {
  const [screen, setScreen] = useState('friends');
  const isUploadingRef = useRef(false);
  const [friendsList, setFriendsList] = useState([]);
  const [requestList, setRequestList] = useState([]);
  const [friendCode, setFriendCode] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sentList,setSentList] = useState([]);
  const [profileVisible,setProfileVisible] = useState(false);
  const [otherUser,setOtherUser] = useState([]);
  const [infoVisible, setInfoVisible] = useState(false);

  const fetchFriends = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/friends', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;

      const result = await response.json();

      if (result.success && !isUploadingRef.current) {
        let friends = [];
        let request = [];
        let sent = [];
        let userId = result.userId;
        console.log("user id : "+ userId);
        console.log("data : "+ JSON.stringify(result.friends))
        for (let i = 0; i < result.friends.length; i++) {
          if (result.friends[i].status === 'accept' && result.friends[i].user_id == userId) {
            friends.push(result.friends[i]);
          } else if (result.friends[i].status === 'request' && result.friends[i].user_id == userId) {
            request.push(result.friends[i]);
          }else if (result.friends[i].status === 'request' && result.friends[i].friend_id == userId) {
            sent.push(result.friends[i]);
        }
      }
          setFriendsList(friends);
          setRequestList(request);
          setSentList(sent);
      }
    }catch (e) {
      console.log('친구 정보 불러오기 실패:', e);
    }
  };

  const handleCopyFriendCode = () => {
      Clipboard.setString(otherUser?.friend_code);
      Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };

  useFocusEffect(
    useCallback(() => {
      fetchFriends();
    }, [])
  );

  const friendAdd = async () => {
    if (isSending) return;
    if (!friendCode.trim()) {
      Alert.alert('알림', '친구 코드를 입력해주세요!');
      return;
    }

    setIsSending(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        'https://triplan-backend-qwrs.onrender.com/users/friendsAdd?friendCode=' + friendCode.trim(),
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        Alert.alert('오류', '서버가 요청을 처리하지 못했습니다. 코드를 확인해주세요.');
        return;
      }

      const result = await response.json();
      if (result.state == "duplicate"){
        Alert.alert('친구 요청 중복!', '이미 친구 요청을 보냈습니다!');
        setFriendCode('');
        fetchFriends();
      }else if (result.success) {
        Alert.alert('친구 요청', '친구 요청을 보냈습니다!');
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

  const friendAccept = async (request) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        'https://triplan-backend-qwrs.onrender.com/users/friendsAccept?friendId=' + request.users?.id,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        Alert.alert('오류', '서버에서 수락 처리를 완료하지 못했습니다.');
        return;
      }

      const result = await response.json();
      if (result.success) {
        setRequestList(prev => prev.filter(req => req.users?.id !== request.users?.id));
        setFriendsList(prev => [...prev, { ...request, status: 'accept' }]);
        const displayName = request.users?.nickname || request.users?.name || '유저';
        Alert.alert('수락 완료', `${displayName}님과 친구가 되었습니다!`);
      } else {
        Alert.alert('알림', result.message || '수락 처리에 실패했습니다.');
      }
    } catch (e) {
      console.log('친구 요청 수락 실패:', e);
      Alert.alert('오류', '네트워크 문제가 발생했습니다.');
    }
  };

  const friendRefuse = async (request) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(
        'https://triplan-backend-qwrs.onrender.com/users/friendsRefuse?friendId=' + request.users?.id,
        { headers: { Authorization: `Bearer ${token}` } }
      );

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
      console.log('친구 요청 거절 실패:', e);
    }
  };

   const fetchProfile = async (friendId) => {
       //setLoading(true);
       try {
         const token = await AsyncStorage.getItem('token');
         const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/others?id=' + friendId, {
           headers: { Authorization: `Bearer ${token}` },
         });
         const result = await response.json();
         if (result.success) {

           setProfileVisible(true);
           setOtherUser(result.user);
         }
       } catch (error) {
         console.log('다른 사용자 프로필 정보 에러:', error);
       } finally {
         //setLoading(false);
       }
     };

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4} resizeMode="cover">
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>

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

          {screen === 'friends' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <Text style={styles.listTitle}>내 동행 친구</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{friendsList?.length || 0}명</Text></View>
              </View>
              {friendsList?.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>🤝</Text>
                  <Text style={styles.emptyText}>아직 등록된 친구가 없어요</Text>
                </View>
              ) : (
                friendsList?.map((friend, index) => (
                <TouchableOpacity key={index} onPress={() => fetchProfile(friend.friend_id)}>
                  <View key={index} style={styles.userCard}>
                        <Image style={styles.profileImage} source={{ uri: friend.users?.profile_image || 'https://via.placeholder.com/100' }} />
                        <View style={styles.userInfo}>
                          <Text style={styles.userName}>{friend.users?.nickname || friend.users?.name || '알 수 없는 유저'}</Text>
                          <Text style={styles.userSubText}>함께 여행할 준비 완료! ✈️</Text>
                        </View>
                  </View>
                </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {screen === 'request' && (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.headerRow}>
                <Text style={styles.listTitle}>받은 친구 요청</Text>
                <View style={styles.countBadge}><Text style={styles.countText}>{requestList?.length || 0}건</Text></View>
              </View>
              {requestList?.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyEmoji}>📭</Text>
                  <Text style={styles.emptyText}>새로운 친구 요청이 없습니다</Text>
                </View>
              ) : (
                requestList?.map((request, index) => (
                <TouchableOpacity key={index} onPress={() => fetchProfile(request.friend_id)}>
                  <View key={index} style={styles.userCard}>
                    <Image style={styles.profileImage} source={{ uri: request.users?.profile_image || 'https://via.placeholder.com/100' }} />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{request.users?.nickname || request.users?.name || '알 수 없는 유저'}</Text>
                      <Text style={styles.userSubText}>친구가 되고 싶어 해요!</Text>
                    </View>
                    <View style={styles.btnGroup}>
                      <TouchableOpacity onPress={() => friendAccept(request)} style={styles.acceptBtn}>
                        <Text style={styles.acceptBtnText}>수락</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => friendRefuse(request)} style={styles.refuseBtn}>
                        <Text style={styles.refuseBtnText}>거절</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                 </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}

          {screen === 'sent' && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                  <Text style={styles.listTitle}>보낸 친구 요청</Text>
                  <View style={styles.countBadge}><Text style={styles.countText}>{sentList?.length || 0}건</Text></View>
                </View>
                {sentList?.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyEmoji}>🛩️️</Text>
                    <Text style={styles.emptyText}>보낸 친구 요청이 없습니다</Text>
                  </View>
                ) : (
                  sentList?.map((request, index) => (
                  <TouchableOpacity key={index} onPress={() => fetchProfile(request.user_id)}>
                    <View key={index} style={styles.userCard}>
                      <Image style={styles.profileImage} source={{ uri: request.sentUsers?.profile_image || 'https://via.placeholder.com/100' }} />
                      <View style={styles.userInfo}>
                        <Text style={styles.userName}>{request.sentUsers?.nickname || request.sentUsers?.name || '알 수 없는 유저'}</Text>
                        <Text style={styles.userSubText}>친구 요청을 보냈어요!</Text>
                      </View>
                    </View>
                   </TouchableOpacity>
                  ))
                )}
              </ScrollView>
          )}

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
                disabled={isSending}>
                {isSending
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.submitBtnText}>친구 요청 보내기</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
        {/* 프로필 모달 */}
                <Modal visible={profileVisible} animationType="slide" transparent onRequestClose={() => setProfileVisible(false)}>
                  <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setProfileVisible(false)}>
                    <View style={styles.profileModalBox}>

                      <View style={styles.profileModalHeader}>
                        <Image source={{ uri: otherUser?.profile_image || 'https://via.placeholder.com/100' }} style={styles.profileImageLarge} />
                        <Text style={styles.profileModalName}>{otherUser?.name || otherUser?.nickname}</Text>
                        {otherUser?.bio ? <Text style={styles.bioPreview}>{otherUser?.bio}</Text> : null}
                      </View>

                      <View style={styles.profileCard}>
                        <Text style={styles.cardTitle}>프로필 정보</Text>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>닉네임</Text>
                          <Text style={styles.infoValue}>{otherUser?.name || otherUser?.nickname}</Text>
                        </View>

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>여행 타입</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <View style={{ backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: '#FF6B6B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                              <Text style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: 13 }}>
                                {otherUser?.travel_type ?? '성향 미설정'}
                              </Text>
                            </View>
                            {otherUser?.travel_type && (
                              <TouchableOpacity onPress={() => setInfoVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Text style={{ fontSize: 16 }}>❔</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>

                        {otherUser?.preferred_destination && (
                          <View style={[styles.infoRow, { alignItems: 'flex-start', paddingVertical: 14 }]}>
                            <Text style={styles.infoLabel}>선호 여행지</Text>
                            <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, marginLeft: 8 }}>
                              {otherUser.preferred_destination.split(',').map((dest, idx) => (
                                <View key={idx} style={{ backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: '#FF6B6B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                                  <Text style={{ color: '#FF6B6B', fontWeight: 'bold', fontSize: 12 }}>📍 {dest.trim()}</Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>친구 코드</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.infoValue}>{otherUser?.friend_code}</Text>
                            <TouchableOpacity style={styles.copyButton} onPress={handleCopyFriendCode}>
                              <Text style={styles.copyButtonText}>복사</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>생년월일</Text>
                          <Text style={styles.infoValue}>{otherUser?.birth_year || '미설정'}</Text>
                        </View>
                        <View style={styles.infoRow}>
                          <Text style={styles.infoLabel}>성별</Text>
                          <Text style={styles.infoValue}>{otherUser?.gender || '미설정'}</Text>
                        </View>
                        <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                          <Text style={styles.infoLabel}>소개</Text>
                          <Text style={[styles.infoValue, { flex: 1, textAlign: 'right', color: '#666' }]}>{otherUser?.bio || '미설정'}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Modal>

                <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
                  <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
                    <View style={{ backgroundColor: '#fff', borderRadius: 24, padding: 24, margin: 20 }}>
                      <Text style={{ fontSize: 18, fontWeight: '900', color: '#333', marginBottom: 16, textAlign: 'center' }}>
                        🧭 4가지 여행 성향 척도
                      </Text>
                      <Text style={{ fontSize: 14, color: '#555', lineHeight: 24, marginBottom: 8 }}>🥾 <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>T / C</Text> : 활동형 (많이 걷기 OK) vs 여유형</Text>
                      <Text style={{ fontSize: 14, color: '#555', lineHeight: 24, marginBottom: 8 }}>🏙 <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>U / N</Text> : 도심파 (번화가/쇼핑) vs 자연파</Text>
                      <Text style={{ fontSize: 14, color: '#555', lineHeight: 24, marginBottom: 8 }}>🏄 <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>A / R</Text> : 액티브 (체험/도전) vs 힐링형</Text>
                      <Text style={{ fontSize: 14, color: '#555', lineHeight: 24, marginBottom: 20 }}>📋 <Text style={{ fontWeight: 'bold', color: '#FF6B6B' }}>J / P</Text> : 계획파 (꼼꼼한 일정) vs 즉흥파</Text>
                      <TouchableOpacity
                        style={{ backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 14, alignItems: 'center' }}
                        onPress={() => setInfoVisible(false)}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>닫기</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Modal>
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
  tabButton: { paddingVertical: 10, paddingHorizontal: 15, borderRadius: 24, backgroundColor: 'transparent' },
  tabButtonActive: { backgroundColor: '#FF6B6B', shadowColor: '#FF6B6B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 4 },
  tabText: { fontSize: 15, fontWeight: 'bold', color: '#666' },
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

    detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    detailBox: { backgroundColor: 'rgba(255,255,255,0.98)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, paddingBottom: 40 },
    detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff' },
    userName: { fontSize: 18, fontWeight: '900', color: '#333' },
    detailBio: { fontSize: 20, fontWeight: '900', color: '#222', marginBottom: 16, lineHeight: 28 },
    detailPlanBox: { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
    detailPlanTitle: { fontSize: 15, fontWeight: '900', color: '#FF6B6B', marginBottom: 8 },
    detailPlan: { fontSize: 15, color: '#444', lineHeight: 24 },
    joinButton: { backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
    joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

    profileModalBox: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 40 },
    profileModalHeader: { alignItems: 'center', backgroundColor: '#f5f7fa', paddingVertical: 30, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
    profileImageLarge: { width: 90, height: 90, borderRadius: 45, marginBottom: 12, borderWidth: 3, borderColor: '#fff' },
    profileModalName: { fontSize: 22, fontWeight: '900', color: '#222' },
    bioPreview: { fontSize: 14, color: '#666', marginTop: 6, fontWeight: '500' },
    profileCard: { padding: 24 },
    cardTitle: { fontSize: 18, fontWeight: '900', marginBottom: 16, color: '#333' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    infoLabel: { fontSize: 15, color: '#777', fontWeight: 'bold' },
    infoValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    copyButton: { backgroundColor: '#f0f0f0', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, marginLeft: 10 },
    copyButtonText: { fontSize: 12, color: '#555', fontWeight: 'bold' },
});