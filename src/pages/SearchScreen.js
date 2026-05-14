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
  Clipboard,
  ImageBackground,
  SafeAreaView
} from 'react-native';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop';

const DESTINATION_OPTIONS = ['전체', '국내', '아시아', '유럽', '아메리카', '오세아니아/기타'];
const TYPE_OPTIONS = ['전체', 'TUAJ', 'TUAP', 'TURJ', 'TURP', 'TNAJ', 'TNAP', 'TNRJ', 'TNRP', 'CUAJ', 'CUAP', 'CURJ', 'CURP', 'CNAJ', 'CNAP', 'CNRJ', 'CNRP'];

// ✨ 새로 추가된 필터 옵션
const DURATION_OPTIONS = ['전체', '당일치기', '1박 2일', '2박 3일', '3박 이상'];
const GENDER_OPTIONS = ['전체', '동성만', '성별 무관'];
const THEME_OPTIONS = ['전체', '빵지순례', '역사/문화', '힐링/휴양', '액티비티', '쇼핑'];

const REGION_KEYWORDS = {
  '국내': ['국내', '서울', '부산', '제주', '강릉', '속초', '인천', '대구', '대전', '광주', '전주', '경주', '여수', '강원'],
  '아시아': ['아시아', '일본', '도쿄', '오사카', '후쿠오카', '삿포로', '중국', '대만', '타이베이', '홍콩', '마카오', '태국', '방콕', '베트남', '다낭', '나트랑', '필리핀', '세부', '싱가포르', '발리'],
  '유럽': ['유럽', '영국', '런던', '프랑스', '파리', '이탈리아', '로마', '스위스', '스페인', '바르셀로나', '독일', '체코', '프라하'],
  '아메리카': ['아메리카', '미국', '뉴욕', 'LA', '하와이', '캐나다', '토론토', '밴쿠버', '멕시코', '남미', '브라질'],
  '오세아니아/기타': ['오세아니아', '호주', '시드니', '뉴질랜드', '괌', '사이판', '아프리카', '이집트', '중동', '기타']
};

export default function SearchScreen({navigation }) {
  const [searchText, setSearchText] = useState('');
  const [writeVisible, setWriteVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  // ✨ 드롭다운 열림/닫힘 상태
  const [destOpen, setDestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  // ✨ 실제 적용된 필터 상태
  const [selectedDestination, setSelectedDestination] = useState('전체');
  const [selectedType, setSelectedType] = useState('전체');
  const [selectedDuration, setSelectedDuration] = useState('전체');
  const [selectedGender, setSelectedGender] = useState('전체');
  const [selectedTheme, setSelectedTheme] = useState('전체');
  const [recruitOnly, setRecruitOnly] = useState(false);

  // ✨ 모달 내 임시 필터 상태
  const [tempDestination, setTempDestination] = useState('전체');
  const [tempType, setTempType] = useState('전체');
  const [tempDuration, setTempDuration] = useState('전체');
  const [tempGender, setTempGender] = useState('전체');
  const [tempTheme, setTempTheme] = useState('전체');
  const [tempRecruitOnly, setTempRecruitOnly] = useState(false);

  const [showMoreFilters, setShowMoreFilters] = useState(false); // 상세 필터 보기 토글

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [myUserId, setMyUserId] = useState(null);

  const [editPost, setEditPost] = useState(null);
  const [profileVisible,setProfileVisible] = useState(false);
  const [otherUser,setOtherUser] = useState(null);
  const [profileImage,setProfileImage] = useState(null);

  const closeAllDropdowns = () => {
    setDestOpen(false); setTypeOpen(false); setDurationOpen(false); setGenderOpen(false); setThemeOpen(false);
  };

  const openModal = () => {
    setTempDestination(selectedDestination);
    setTempType(selectedType);
    setTempDuration(selectedDuration);
    setTempGender(selectedGender);
    setTempTheme(selectedTheme);
    setTempRecruitOnly(recruitOnly);

    closeAllDropdowns();
    setShowMoreFilters(false);
    setModalVisible(true);
  };

  const applyFilter = () => {
    setSelectedDestination(tempDestination);
    setSelectedType(tempType);
    setSelectedDuration(tempDuration);
    setSelectedGender(tempGender);
    setSelectedTheme(tempTheme);
    setRecruitOnly(tempRecruitOnly);
    setModalVisible(false);
  };

  const clearFilter = () => {
    setSelectedDestination('전체');
    setSelectedType('전체');
    setSelectedDuration('전체');
    setSelectedGender('전체');
    setSelectedTheme('전체');
    setRecruitOnly(false);
  };

  const isFiltered = selectedDestination !== '전체' || selectedType !== '전체' || selectedDuration !== '전체' || selectedGender !== '전체' || selectedTheme !== '전체' || recruitOnly;

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

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://10.0.2.2:3000/users/others?id='+selectedPost.user_id, {
          headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        setSelectedPost(null);
        setProfileVisible(true);
        setOtherUser(result.user);
      }
    } catch (error) {
      console.log('다른 사용자 프로필 정보 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileImage = async (post) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch('http://10.0.2.2:3000/users/others?id='+post.user_id, {
          headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
          setProfileImage(result.user.profile_image);
      }
    } catch (error) {
      console.log('다른 사용자 프로필 이미지 에러:', error);
    } finally {
      setLoading(false);
    }
  };

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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) {
        Alert.alert('참여 완료', '채팅방에 참여했습니다!');
        fetchPosts();
        fetchJoinedRooms();
      } else {
        Alert.alert('오류', result.message);
      }
    } catch (error) {
      console.log('참여하기 에러:', error);
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

  const handleCopyFriendCode = () => {
    Clipboard.setString(otherUser?.friend_code);
    Alert.alert('복사 완료', '친구 코드가 복사되었습니다!');
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch = searchText === '' ||
                          post.bio.includes(searchText) ||
                          post.destination.includes(searchText);

    let matchesDestination = false;
    if (selectedDestination === '전체') {
      matchesDestination = true;
    } else {
      const keywords = REGION_KEYWORDS[selectedDestination] || [];
      matchesDestination = keywords.some(keyword => post.destination.includes(keyword));
    }

    const matchesType = selectedType === '전체' || post.users?.travel_type === selectedType;
    const matchesRecruit = !recruitOnly || post.current_people < post.max_people;

    // ✨ 새 필터 조건 적용 (서버 데이터 구조에 맞게 필드명 확인 필요)
    const matchesDuration = selectedDuration === '전체' || post.days === selectedDuration;
    const matchesGender = selectedGender === '전체' || post.gender_rule === selectedGender;
    const matchesTheme = selectedTheme === '전체' || post.theme === selectedTheme;

    return matchesSearch && matchesDestination && matchesType && matchesRecruit && matchesDuration && matchesGender && matchesTheme;
  });

  return (
    <ImageBackground source={{ uri: BACKGROUND_IMAGE_URI }} style={styles.backgroundImage} blurRadius={4}>
      <View style={styles.overlay} />
      <SafeAreaView style={styles.container}>

        <View style={styles.topBar}>
          <TextInput
            style={styles.searchBar}
            placeholder="어떤 여행을 찾고 계신가요?"
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#888"
          />
          <TouchableOpacity
            style={[styles.filterButton, isFiltered && styles.filterButtonActive]}
            onPress={openModal}>
            <Text style={[styles.filterButtonText, isFiltered && styles.filterButtonTextActive]}>
              필터 {isFiltered ? '●' : '▼'}
            </Text>
          </TouchableOpacity>
        </View>

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
            {selectedDuration !== '전체' && (
              <View style={styles.appliedTag}>
                <Text style={styles.appliedTagText}>🗓 {selectedDuration}</Text>
              </View>
            )}
            {selectedGender !== '전체' && (
              <View style={styles.appliedTag}>
                <Text style={styles.appliedTagText}>👥 {selectedGender}</Text>
              </View>
            )}
            {selectedTheme !== '전체' && (
              <View style={styles.appliedTag}>
                <Text style={styles.appliedTagText}>🎒 {selectedTheme}</Text>
              </View>
            )}
            {recruitOnly && (
              <View style={styles.appliedTag}>
                <Text style={styles.appliedTagText}>✅ 모집 중</Text>
              </View>
            )}
            <TouchableOpacity onPress={clearFilter} style={styles.clearFilterButton}>
                <Text style={styles.clearFilterText}>✕ 초기화</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={styles.feed} contentContainerStyle={styles.feedContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>여행 계획을 불러오는 중...</Text>
            </View>
          ) : filteredPosts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>조건에 맞는 게시글이 없습니다.</Text>
            </View>
          ) : (
            filteredPosts.map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.card}
                activeOpacity={0.9}
                onPress={() => {
                  setSelectedPost(post);
                  fetchProfileImage(post);
                }}>

                <View style={styles.badgeRow}>
                  {post.user_id === myUserId && (
                    <View style={[styles.badge, { backgroundColor: '#FF6B6B' }]}>
                      <Text style={styles.badgeText}>내 글</Text>
                    </View>
                  )}
                  {joinedRooms[post.id] && (
                    <View style={[styles.badge, { backgroundColor: '#34C759' }]}>
                      <Text style={styles.badgeText}>참여 중</Text>
                    </View>
                  )}
                  {post.current_people >= post.max_people && (
                    <View style={[styles.badge, { backgroundColor: '#999' }]}>
                      <Text style={styles.badgeText}>마감됨</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.bio}>{post.bio}</Text>

                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{post.users?.nickname || post.users?.name}</Text>
                  <Text style={styles.metaDot}>·</Text>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={[styles.badge, { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 1, borderColor: '#FF6B6B' }]}>
                      <Text style={[styles.badgeText, { color: '#FF6B6B' }]}>{post.users?.travel_type ?? '성향 미설정'}</Text>
                    </View>
                    {post.users?.travel_type && (
                      <TouchableOpacity onPress={() => setInfoVisible(true)}>
                        <Text style={{ fontSize: 16 }}>❔</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                </View>

                <View style={styles.travelInfo}>
                  <Text style={styles.travelTag}>📍 {post.destination}</Text>
                  {post.departure_date ? <Text style={styles.travelTag}>🛫 {post.departure_date}</Text> : null}
                  <Text style={styles.travelTag}>🗓 {post.days}</Text>
                  <Text style={[styles.travelTag, post.current_people >= post.max_people && { color: '#999', borderColor: '#ccc' }]}>
                    👥 {post.current_people}/{post.max_people}명
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
          <View style={{ height: 80 }} />
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={() => setWriteVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        <Modal visible={writeVisible} animationType="slide" onRequestClose={() => setWriteVisible(false)}>
          <WriteScreen onClose={() => { setWriteVisible(false); fetchPosts(); }} />
        </Modal>

        <Modal visible={!!editPost} animationType="slide" onRequestClose={() => setEditPost(null)}>
          <EditPostScreen post={editPost} onClose={() => { setEditPost(null); fetchPosts(); }} />
        </Modal>

        <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
          <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setSelectedPost(null)}>
            <TouchableOpacity style={styles.detailBox} activeOpacity={1} onPress={() => {}}>
              <View style={styles.detailHeader}>
                 <TouchableOpacity onPress={() => fetchProfile()}>
                    {profileImage === null ?
                      <Image style={styles.avatar} /> :
                      <Image style={styles.avatar} source={{uri : profileImage}} />
                    }
                </TouchableOpacity>
                <View>
                  <Text style={styles.userName}>{selectedPost?.users?.nickname || selectedPost?.users?.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                    <View style={[styles.badge, { backgroundColor: 'rgba(255, 107, 107, 0.15)' }]}>
                      <Text style={[styles.badgeText, { color: '#FF6B6B' }]}>{selectedPost?.users?.travel_type ?? '성향 미설정'}</Text>
                    </View>
                    {selectedPost?.users?.travel_type && (
                      <TouchableOpacity onPress={() => setInfoVisible(true)}>
                        <Text style={{ fontSize: 16 }}>❔</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  {selectedPost?.user_id === myUserId && (
                    <>
                      <TouchableOpacity onPress={() => { setEditPost(selectedPost); setSelectedPost(null); }}>
                        <Text style={{ fontSize: 14, color: '#FF6B6B', fontWeight: 'bold' }}>수정</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDelete(selectedPost?.id)}>
                        <Text style={{ fontSize: 14, color: '#aaa', fontWeight: 'bold' }}>삭제</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity onPress={() => setSelectedPost(null)}>
                    <Text style={{ fontSize: 24, color: '#333', fontWeight: '300' }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.detailBio}>{selectedPost?.bio}</Text>

              <View style={styles.travelInfo}>
                <Text style={styles.travelTag}>📍 {selectedPost?.destination}</Text>
                {selectedPost?.departure_date ? <Text style={styles.travelTag}>🛫 {selectedPost?.departure_date}</Text> : null}
                <Text style={styles.travelTag}>🗓 {selectedPost?.days}</Text>
                <Text style={styles.travelTag}>👥 {selectedPost?.current_people}/{selectedPost?.max_people}명</Text>
              </View>

              {selectedPost?.plan ? (
                <View style={styles.detailPlanBox}>
                  <Text style={styles.detailPlanTitle}>📋 간단 계획</Text>
                  <Text style={styles.detailPlan}>{selectedPost?.plan}</Text>
                </View>
              ) : null}

              {joinedRooms[selectedPost?.id] ? (
                <TouchableOpacity
                  style={[styles.joinButton, { backgroundColor: '#fff', borderWidth: 1, borderColor: '#FF6B6B' }]}
                  onPress={() => {
                    const roomId = joinedRooms[selectedPost?.id];
                    setSelectedPost(null);
                    navigation.navigate('채팅', {
                      screen: 'ChatRoom',
                      params: {
                        roomId,
                        title: `${selectedPost?.destination} ${selectedPost?.days} 여행`,
                        destination: selectedPost?.destination,
                        days: selectedPost?.days,
                        departure_date: selectedPost?.departure_date,
                        bio: selectedPost?.bio,
                        max_people: selectedPost?.max_people,
                      }
                    });
                  }}>
                  <Text style={[styles.joinButtonText, { color: '#FF6B6B' }]}>채팅방으로 이동 →</Text>
                </TouchableOpacity>
              ) : selectedPost?.current_people >= selectedPost?.max_people ? (
                <View style={[styles.joinButton, { backgroundColor: '#ccc' }]}>
                  <Text style={styles.joinButtonText}>모집 마감</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.joinButton} onPress={async () => { await handleJoin(selectedPost?.id); setSelectedPost(null); }}>
                  <Text style={styles.joinButtonText}>참여하기</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

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
                      <View style={[styles.badge, { backgroundColor: 'rgba(255, 107, 107, 0.1)', borderWidth: 1, borderColor: '#FF6B6B' }]}>
                        <Text style={[styles.badgeText, { color: '#FF6B6B' }]}>{otherUser?.travel_type ?? '성향 미설정'}</Text>
                      </View>
                      {otherUser?.travel_type && (
                        <TouchableOpacity onPress={() => setInfoVisible(true)}>
                          <Text style={{ fontSize: 16 }}>❔</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
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

        <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
            <View style={styles.modalBox}>
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                <Text style={styles.modalTitle}>여행 필터</Text>

                <TouchableOpacity style={styles.dropdownHeader} onPress={() => { closeAllDropdowns(); setDestOpen(!destOpen); }}>
                  <Text style={styles.dropdownLabel}>📍 여행지</Text>
                  <Text style={styles.dropdownValue}>{tempDestination} {destOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {destOpen && (
                  <View style={styles.dropdownList}>
                    {DESTINATION_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt} style={[styles.dropdownItem, tempDestination === opt && styles.dropdownItemActive]} onPress={() => { setTempDestination(opt); setDestOpen(false); }}>
                        <Text style={[styles.dropdownItemText, tempDestination === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <TouchableOpacity style={[styles.dropdownHeader, { marginTop: 12 }]} onPress={() => { closeAllDropdowns(); setTypeOpen(!typeOpen); }}>
                  <Text style={styles.dropdownLabel}>🧭 성향</Text>
                  <Text style={styles.dropdownValue}>{tempType} {typeOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>
                {typeOpen && (
                  <ScrollView style={[styles.dropdownList, { maxHeight: 180 }]} nestedScrollEnabled={true}>
                    {TYPE_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt} style={[styles.dropdownItem, tempType === opt && styles.dropdownItemActive]} onPress={() => { setTempType(opt); setTypeOpen(false); }}>
                        <Text style={[styles.dropdownItemText, tempType === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* 상세 필터 더보기 토글 버튼 */}
                <TouchableOpacity
                  style={{ marginTop: 20, alignItems: 'center', paddingVertical: 10 }}
                  onPress={() => setShowMoreFilters(!showMoreFilters)}
                >
                  <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 14 }}>
                    상세 필터 {showMoreFilters ? '접기 ▲' : '더보기 ▼'}
                  </Text>
                </TouchableOpacity>

                {showMoreFilters && (
                  <>
                    <TouchableOpacity style={[styles.dropdownHeader, { marginTop: 12 }]} onPress={() => { closeAllDropdowns(); setDurationOpen(!durationOpen); }}>
                      <Text style={styles.dropdownLabel}>🗓 여행 기간</Text>
                      <Text style={styles.dropdownValue}>{tempDuration} {durationOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {durationOpen && (
                      <View style={styles.dropdownList}>
                        {DURATION_OPTIONS.map(opt => (
                          <TouchableOpacity key={opt} style={[styles.dropdownItem, tempDuration === opt && styles.dropdownItemActive]} onPress={() => { setTempDuration(opt); setDurationOpen(false); }}>
                            <Text style={[styles.dropdownItemText, tempDuration === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity style={[styles.dropdownHeader, { marginTop: 12 }]} onPress={() => { closeAllDropdowns(); setGenderOpen(!genderOpen); }}>
                      <Text style={styles.dropdownLabel}>👥 동행 성별</Text>
                      <Text style={styles.dropdownValue}>{tempGender} {genderOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {genderOpen && (
                      <View style={styles.dropdownList}>
                        {GENDER_OPTIONS.map(opt => (
                          <TouchableOpacity key={opt} style={[styles.dropdownItem, tempGender === opt && styles.dropdownItemActive]} onPress={() => { setTempGender(opt); setGenderOpen(false); }}>
                            <Text style={[styles.dropdownItemText, tempGender === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity style={[styles.dropdownHeader, { marginTop: 12 }]} onPress={() => { closeAllDropdowns(); setThemeOpen(!themeOpen); }}>
                      <Text style={styles.dropdownLabel}>🎒 여행 테마</Text>
                      <Text style={styles.dropdownValue}>{tempTheme} {themeOpen ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {themeOpen && (
                      <View style={styles.dropdownList}>
                        {THEME_OPTIONS.map(opt => (
                          <TouchableOpacity key={opt} style={[styles.dropdownItem, tempTheme === opt && styles.dropdownItemActive]} onPress={() => { setTempTheme(opt); setThemeOpen(false); }}>
                            <Text style={[styles.dropdownItemText, tempTheme === opt && styles.dropdownItemTextActive]}>{opt}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={[styles.dropdownHeader, { marginTop: 16, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 4 }]}
                  onPress={() => setTempRecruitOnly(!tempRecruitOnly)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownLabel}>✅ 모집 중인 방만 보기</Text>
                  <View style={[styles.checkbox, tempRecruitOnly && styles.checkboxActive]}>
                    {tempRecruitOnly && <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>✓</Text>}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.applyButton} onPress={applyFilter}>
                  <Text style={styles.applyButtonText}>적용하기</Text>
                </TouchableOpacity>

              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>

        <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
          <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🧭 4가지 여행 성향 척도</Text>

              <View style={{ gap: 12, marginBottom: 24 }}>
                <Text style={styles.infoText}>📍 <Text style={styles.highlightText}>T / C</Text> : 도심 투어 (Town) vs 자연 휴양 (Country)</Text>
                <Text style={styles.infoText}>📸 <Text style={styles.highlightText}>U / N</Text> : 유명 관광지 (Usual) vs 숨은 명소 (New)</Text>
                <Text style={styles.infoText}>🏃‍♂️ <Text style={styles.highlightText}>A / R</Text> : 활동적인 (Active) vs 여유로운 (Relax)</Text>
                <Text style={styles.infoText}>📝 <Text style={styles.highlightText}>J / P</Text> : 계획적인 (J) vs 즉흥적인 (P)</Text>
              </View>

              <TouchableOpacity style={styles.applyButton} onPress={() => setInfoVisible(false)}>
                <Text style={styles.applyButtonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: '100%', height: '100%' },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(245, 247, 250, 0.45)' },
  container: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#333',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  filterButtonActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  filterButtonText: { fontSize: 14, color: '#555', fontWeight: 'bold' },
  filterButtonTextActive: { color: '#fff' },

  appliedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    gap: 8,
    alignItems: 'center',
  },
  appliedTag: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  appliedTagText: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' },

  clearFilterButton: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4 },
  clearFilterText: { fontSize: 12, color: '#888', fontWeight: 'bold' },

  feed: { flex: 1 },
  feedContent: { padding: 16, gap: 16 },

  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },
  bio: { fontSize: 17, color: '#222', fontWeight: '900', marginBottom: 10, lineHeight: 24 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 6 },
  metaText: { fontSize: 13, color: '#555', fontWeight: '600' },
  metaDot: { fontSize: 13, color: '#ccc' },

  travelInfo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  travelTag: {
    fontSize: 12,
    color: '#444',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee'
  },

  fab: {
    position: 'absolute',
    bottom: 30,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6B6B',
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 4 }
  },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '400', lineHeight: 36 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, backgroundColor: 'rgba(255,255,255,0.7)', padding: 30, borderRadius: 20 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: 'bold' },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    paddingBottom: 40,
  },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#eee', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 18, fontWeight: '900', color: '#333' },
  detailBio: { fontSize: 20, fontWeight: '900', color: '#222', marginBottom: 16, lineHeight: 28 },

  detailPlanBox: { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginTop: 16, marginBottom: 16, borderWidth: 1, borderColor: '#eee' },
  detailPlanTitle: { fontSize: 15, fontWeight: '900', color: '#FF6B6B', marginBottom: 8 },
  detailPlan: { fontSize: 15, color: '#444', lineHeight: 24 },

  joinButton: { backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  joinButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  profileModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingBottom: 40,
  },
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

  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: 24, padding: 24, width: '85%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, color: '#333', textAlign: 'center' },

  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  dropdownLabel: { fontSize: 15, color: '#333', fontWeight: 'bold' },
  dropdownValue: { fontSize: 15, color: '#FF6B6B', fontWeight: 'bold' },
  dropdownList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 16, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemActive: { backgroundColor: 'rgba(255, 107, 107, 0.05)' },
  dropdownItemText: { fontSize: 15, color: '#555' },
  dropdownItemTextActive: { color: '#FF6B6B', fontWeight: 'bold' },

  applyButton: { backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },

  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },

  infoBox: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    elevation: 5,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  highlightText: {
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
});