import React, { useState, useCallback, useEffect } from 'react';
import EditPostScreen from './EditPostScreen';
import { useFocusEffect } from '@react-navigation/native';
import WriteScreen from './WriteScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Alert,
  Image,
  Clipboard
} from 'react-native';

const DESTINATION_OPTIONS = ['전체', '국내', '일본', '유럽', '동남아'];
const TYPE_OPTIONS = ['전체', 'TUAJ', 'TUAP', 'TURJ', 'TURP', 'TNAJ', 'TNAP', 'TNRJ', 'TNRP', 'CUAJ', 'CUAP', 'CURJ', 'CURP', 'CNAJ', 'CNAP', 'CNRJ', 'CNRP'];

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [writeVisible, setWriteVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [destOpen, setDestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [selectedDestination, setSelectedDestination] = useState('전체');
  const [selectedType, setSelectedType] = useState('전체');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [tempDestination, setTempDestination] = useState('전체');
  const [tempType, setTempType] = useState('전체');
  const [editPost, setEditPost] = useState(null);
  const [profileVisible,setProfileVisible] = useState(false);
  const [otherUser,setOtherUser] = useState(null);

  const openModal = () => {
    setTempDestination(selectedDestination);
    setTempType(selectedType);
    setDestOpen(false);
    setTypeOpen(false);
    setModalVisible(true);
  };

  const applyFilter = () => {
    setSelectedDestination(tempDestination);
    setSelectedType(tempType);
    setModalVisible(false);
  };

  const isFiltered =
    selectedDestination !== '전체' || selectedType !== '전체';

    const fetchPosts = useCallback(async () => {
      setLoading(true);
      try {
        const response = await fetch('http://10.0.2.2:3000/posts');
        const result = await response.json();
        if (result.success) {
          setPosts(result.posts);
        }
      } catch (error) {
        console.log('게시글 불러오기 에러:', error);
      } finally {
        setLoading(false);
      }
    }, []);

    const fetchJoinedRooms = useCallback(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const meRes = await fetch('http://10.0.2.2:3000/users/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const meData = await meRes.json();
        if (meData.success) setMyUserId(meData.user.id);
        const response = await fetch('http://10.0.2.2:3000/posts/my-chats', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json();
        if (result.success) {
          const map = {};
          result.chats.forEach(chat => {
            const postId = chat.chat_rooms?.post_id;
            const roomId = chat.chat_rooms?.id;
            if (postId && roomId) map[postId] = roomId;
          });
          setJoinedRooms(map);
        }
      } catch (error) {
        console.log('참여 목록 에러:', error);
      }
    }, []);

    //다른 사용자 프로필 정보 가져오는 함수
     const fetchProfile = async () => {
          setLoading(true);

          try {

           const token = await AsyncStorage.getItem('token');
            const response = await fetch('http://10.0.2.2:3000/users/others?id='+selectedPost.user_id, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const result = await response.json();
            if (result.success) {
                console.log(result)
              setSelectedPost(null)
              setProfileVisible(true)
              setOtherUser(result.user)
            }
          } catch (error) {
            console.log('다른 사용자 프로필 정보 불러오기 에러:', error);
          } finally {
            setLoading(false);
          }
        }

    useFocusEffect(
      useCallback(() => {
        fetchPosts();
        fetchJoinedRooms();
      }, [fetchPosts, fetchJoinedRooms])
    );

    const handleJoin = async (postId) => {

    const post = posts.find(p => p.id === postId);
      if (post && post.current_people >= post.max_people) {
        Alert.alert('참여 불가', '모집 인원이 가득 찼습니다!');
        return;
      }
      try {
        const token = await AsyncStorage.getItem('token');

        const response = await fetch(`http://10.0.2.2:3000/posts/${postId}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (result.success) {
          console.log('채팅방 ID:', result.chat_room_id);
          Alert.alert('참여 완료', '채팅방에 참여했습니다!');
          fetchPosts(); // 인원 수 새로고침
          fetchJoinedRooms();
        } else {
          Alert.alert('오류', result.message);
        }
      } catch (error) {
        console.log('참여하기 에러:', error);
        Alert.alert('오류', '네트워크 오류가 발생했습니다.');
      }
    };
        const handleDelete = async (postId) => {
          Alert.alert('게시글 삭제', '정말 삭제하시겠어요?', [
            { text: '취소', style: 'cancel' },
            {
              text: '삭제',
              style: 'destructive',
              onPress: async () => {
                try {
                  const token = await AsyncStorage.getItem('token');
                  const response = await fetch(`http://10.0.2.2:3000/posts/${postId}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                  });
                  const result = await response.json();
                  if (result.success) {
                    setSelectedPost(null);
                    fetchPosts();
                    fetchJoinedRooms();
                  } else {
                    Alert.alert('오류', result.message);
                  }
                } catch (error) {
                  console.log('삭제 에러:', error);
                }
              },
            },
          ]);
        };

 //친구 코드 복사하는 함수
 const handleCopyFriendCode = () => {
    Clipboard.setString(otherUser?.friend_code);
    Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };
  return (
    <View style={styles.container}>
      {/* 검색바 + 필터 버튼 */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchBar}
          placeholder="여행지, 성향으로 검색"
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#aaa"
        />
        <TouchableOpacity
          style={[styles.filterButton, isFiltered && styles.filterButtonActive]}
          onPress={openModal}>
          <Text style={[styles.filterButtonText, isFiltered && styles.filterButtonTextActive]}>
            필터 {isFiltered ? '●' : '▼'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 적용된 필터 표시 */}
      {isFiltered && (
        <View style={styles.appliedRow}>
          {selectedDestination !== '전체' && (
            <View style={styles.appliedTag}>
              <Text style={styles.appliedTagText}>📍 {selectedDestination}</Text>
            </View>
          )}
          {selectedType !== '전체' && (
            <View style={styles.appliedTag}>
              <Text style={styles.appliedTagText}>🧭 {selectedType}</Text>
            </View>
          )}
        </View>
      )}

      {/* 피드 영역 */}
      <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent}>
        {loading ? (
          <Text style={styles.emptyText}>불러오는 중...</Text>
        ) : posts.length === 0 ? (
          <Text style={styles.emptyText}>게시글이 없습니다.</Text>
        ) : (
            posts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                onPress={() => setSelectedPost(post)}>

                {/* 내 글 / 참여 중 배지 */}
                <View style={styles.badgeRow}>
                  {post.user_id === myUserId && (
                    <View style={[styles.badge, { backgroundColor: '#FF9500' }]}>
                      <Text style={styles.badgeText}>내 글</Text>
                    </View>
                  )}
                  {joinedRooms[post.id] && (
                    <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
                      <Text style={styles.badgeText}>참여 중</Text>
                    </View>
                  )}
                </View>
                {/* 한 줄 소개 */}
                <Text style={styles.bio}>{post.bio}</Text>

                {/* 닉네임 + 여행 성향 */}
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>
                    {post.users?.nickname || post.users?.name}
                  </Text>
                  <Text style={styles.metaDot}>·</Text>
                  <Text style={styles.metaType}>
                    {post.users?.travel_type ?? '성향 미설정'}
                  </Text>
                </View>

                {/* 여행지 + 출발날짜 + 일수 + 참가인원 */}
                <View style={styles.travelInfo}>
                  <Text style={styles.travelTag}>📍 {post.destination}</Text>
                  {post.departure_date ? (
                    <Text style={styles.travelTag}>🛫 {post.departure_date}</Text>
                  ) : null}
                  <Text style={styles.travelTag}>🗓 {post.days}</Text>
                  <Text style={styles.travelTag}>👥 {post.current_people}/{post.max_people}명</Text>
                </View>

              </TouchableOpacity>
            ))
        )}
      </ScrollView>

      {/* + 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setWriteVisible(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

        {/* 글 작성 모달 */}
        <Modal
          visible={writeVisible}
          animationType="slide"
          onRequestClose={() => setWriteVisible(false)}>
          <WriteScreen onClose={() => {
            setWriteVisible(false);
            fetchPosts(); // 작성 후 피드 새로고침
          }} />
        </Modal>

        {/* 게시글 수정 모달 */}
        <Modal
          visible={!!editPost}
          animationType="slide"
          onRequestClose={() => setEditPost(null)}>
          <EditPostScreen
            post={editPost}
            onClose={() => {
              setEditPost(null);
              fetchPosts();
            }}
          />
        </Modal>

        {/* 게시글 상세 모달 */}
        <Modal
          visible={!!selectedPost}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedPost(null)}>
          <TouchableOpacity
            style={styles.detailOverlay}
            activeOpacity={1}
            onPress={() => setSelectedPost(null)}>
            <TouchableOpacity
              style={styles.detailBox}
              activeOpacity={1}
              onPress={() => {}}>

              {/* 헤더 */}
              <View style={styles.detailHeader}>
                <TouchableOpacity style={styles.avatar} onPress={()=>{
                    fetchProfile()
                }}/>
                <View>
                  <Text style={styles.userName}>
                    {selectedPost?.users?.nickname || selectedPost?.users?.name}
                  </Text>
                  <Text style={styles.travelType}>
                    {selectedPost?.users?.travel_type ?? '성향 미설정'}
                  </Text>
                </View>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  {selectedPost?.user_id === myUserId && (
                    <>
                      <TouchableOpacity onPress={() => {
                        setEditPost(selectedPost);
                        setSelectedPost(null);
                      }}>
                        <Text style={{ fontSize: 14, color: '#4A90E2', fontWeight: 'bold' }}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(selectedPost?.id)}>
                        <Text style={{ fontSize: 14, color: '#FF3B30', fontWeight: 'bold' }}>삭제</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={() => setSelectedPost(null)}>
                    <Text style={{ fontSize: 18, color: '#aaa' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 한 줄 소개 */}
              <Text style={styles.detailBio}>{selectedPost?.bio}</Text>

              {/* 여행 정보 */}
              <View style={styles.travelInfo}>
                <Text style={styles.travelTag}>📍 {selectedPost?.destination}</Text>
                {selectedPost?.departure_date ? (
                  <Text style={styles.travelTag}>🛫 {selectedPost?.departure_date}</Text>
                ) : null}
                <Text style={styles.travelTag}>🗓 {selectedPost?.days}</Text>
                <Text style={styles.travelTag}>
                  👥 {selectedPost?.current_people}/{selectedPost?.max_people}명
                </Text>
              </View>

              {/* 간단 계획 */}
              {selectedPost?.plan ? (
                <View style={styles.detailPlanBox}>
                  <Text style={styles.detailPlanTitle}>📋 간단 계획</Text>
                  <Text style={styles.detailPlan}>{selectedPost?.plan}</Text>
                </View>
              ) : null}

              {/* 참여하기 / 채팅방으로 이동 버튼 */}
              {joinedRooms[selectedPost?.id] ? (
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: '#34C759' }]}
                  onPress={() => {
                    setSelectedPost(null);
                    console.log('채팅방 이동:', joinedRooms[selectedPost?.id]);
                  }}>
                  <Text style={styles.joinButtonText}>채팅방으로 이동 →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={async () => {
                    await handleJoin(selectedPost?.id);
                    setSelectedPost(null);
                  }}>
                  <Text style={styles.joinButtonText}>참여하기</Text>
                </TouchableOpacity>
              )}

            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        {/* 사용자 프로필 화면 모달 */}
        <Modal
          visible={profileVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setProfileVisible(false)}>

           <TouchableOpacity
              style={styles.detailOverlay}
              activeOpacity={1}
              onPress={() => setProfileVisible(false)}>
               <View>
                     {/* 상단 프로필 영역 */}
                          <View style={styles.header} >
                            <Image
                              source={{ uri: otherUser?.profile_image }}
                              style={styles.profileImage}
                            />
                            <Text style={styles.name}>{otherUser?.name || otherUser?.nickname}</Text>
                            {otherUser?.bio ? (
                              <Text style={styles.bioPreview}>{otherUser?.bio}</Text>
                            ) : null}

                          </View>

                          {/* 내 정보 카드 */}
                          <View style={styles.card}>
                            <Text style={styles.cardTitle}>내 정보</Text>

                            {/* 닉네임 */}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>닉네임</Text>
                              <Text style={styles.infoValue}>{otherUser?.name || otherUser?.nickname}</Text>
                            </View>

                            {/* 여행 타입 */}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>여행 타입</Text>
                              <View style={styles.typeContainer}>
                                <Text style={[styles.infoValue, { color: '#4A90E2', fontWeight: 'bold' }]}>
                                  {otherUser?.travel_type}
                                </Text>

                              </View>
                            </View>

                            {/* 친구 코드 */}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>친구 코드</Text>
                              <View style={styles.friendCodeContainer}>
                                <Text style={styles.infoValue}>{otherUser?.friend_code}</Text>
                                <TouchableOpacity
                                  style={styles.copyButton}
                                  onPress={handleCopyFriendCode}
                                  >
                                  <Text style={styles.copyButtonText}>복사</Text>
                                </TouchableOpacity>
                              </View>
                            </View>

                            {/* 생년월일 */}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>생년월일</Text>
                              <Text style={styles.infoValue}>
                                {otherUser?.birth_year || '미설정'}
                              </Text>
                            </View>

                            {/* 성별 */}
                            <View style={styles.infoRow}>
                              <Text style={styles.infoLabel}>성별</Text>
                              <Text style={styles.infoValue}>
                                {otherUser?.gender || '미설정'}
                              </Text>
                            </View>

                            {/* 소개 */}
                            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                              <Text style={styles.infoLabel}>소개</Text>
                              <Text style={[styles.infoValue, { flex: 1, textAlign: 'right' }]}>
                                {otherUser?.bio || '미설정'}
                              </Text>
                            </View>
                          </View>
               </View>
            </TouchableOpacity>


        </Modal>

      {/* 필터 모달 */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}>
          <TouchableOpacity
            style={styles.modalBox}
            activeOpacity={1}
            onPress={() => {}}>
            <Text style={styles.modalTitle}>필터</Text>

            {/* 여행지 드롭다운 */}
            <TouchableOpacity
              style={styles.dropdownHeader}
              onPress={() => {
                setDestOpen(!destOpen);
                setTypeOpen(false);
              }}>
              <Text style={styles.dropdownLabel}>📍 여행지</Text>
              <Text style={styles.dropdownValue}>
                {tempDestination} {destOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {destOpen && (
              <View style={styles.dropdownList}>
                {DESTINATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownItem,
                      tempDestination === opt && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setTempDestination(opt);
                      setDestOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        tempDestination === opt && styles.dropdownItemTextActive,
                      ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 성향 드롭다운 */}
            <TouchableOpacity
              style={[styles.dropdownHeader, { marginTop: 12 }]}
              onPress={() => {
                setTypeOpen(!typeOpen);
                setDestOpen(false);
              }}>
              <Text style={styles.dropdownLabel}>🧭 성향</Text>
              <Text style={styles.dropdownValue}>
                {tempType} {typeOpen ? '▲' : '▼'}
              </Text>
            </TouchableOpacity>
            {typeOpen && (
              <ScrollView
                style={[styles.dropdownList, { maxHeight: 180 }]}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}>
                {TYPE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.dropdownItem,
                      tempType === opt && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setTempType(opt);
                      setTypeOpen(false);
                    }}>
                    <Text
                      style={[
                        styles.dropdownItemText,
                        tempType === opt && styles.dropdownItemTextActive,
                      ]}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* 적용 버튼 */}
            <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
              <Text style={styles.applyButtonText}>적용</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  filterButtonActive: {
    backgroundColor: '#4A90E2',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: 'bold',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  appliedRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 8,
  },
  appliedTag: {
    backgroundColor: '#EAF2FB',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  appliedTagText: {
    fontSize: 13,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  feedArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#aaa',
    fontSize: 15,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  fabText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  feed: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ddd',
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
  },
  travelType: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 2,
  },
  travelInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  destination: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  days: {
    fontSize: 14,
    color: '#666',
  },
  maxPeople: {
    fontSize: 14,
    color: '#666',
  },
  bio: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
  },
  plan: {
    fontSize: 13,
    color: '#888',
    marginBottom: 10,
    lineHeight: 18,
  },
  joinButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownLabel: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold',
  },
  dropdownValue: {
    fontSize: 14,
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownItemActive: {
    backgroundColor: '#EAF2FB',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextActive: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
  applyButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  departureDate: {
    fontSize: 14,
    color: '#666',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#888',
  },
  metaDot: {
    fontSize: 12,
    color: '#bbb',
  },
  metaType: {
    fontSize: 12,
    color: '#4A90E2',
  },
  travelTag: {
    fontSize: 13,
    color: '#555',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  detailBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  detailBio: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  detailPlanBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  detailPlanTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 6,
  },
  detailPlan: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  header: {
      alignItems: 'center',
      backgroundColor: '#f5f5f5',
      paddingVertical: 30,
      paddingHorizontal: 20,
      marginBottom: 16,
    },
    profileImage: {
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 12,
      backgroundColor: '#ddd',
    },
    name: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 4,
    },
    bioPreview: {
      fontSize: 14,
      color: '#888',
      marginBottom: 8,
      textAlign: 'center',
    },
    editButton: {
      backgroundColor: '#555',
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 28,
      marginTop: 8,
    },
    editButtonText: {
      color: '#fff',
      fontWeight: 'bold',
    },
    card: {
      backgroundColor: '#fff',
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 12,
      padding: 16,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
      paddingBottom: 8,
    },
    infoLabel: {
      fontSize: 15,
      color: '#666',
    },
    infoValue: {
      fontSize: 15,
      fontWeight: '500',
    },
    menuItem: {
      flexDirection : 'row',
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: '#eee',
    },
    menuText: {
      fontSize: 16,
    },
    copyButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        marginLeft: 8,
      },
});