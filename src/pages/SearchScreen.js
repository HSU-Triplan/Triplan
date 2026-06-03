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
  FlatList,
  Modal,
  StyleSheet,
  Alert,
  Image,
  Clipboard,
  ImageBackground,
  SafeAreaView
} from 'react-native';

const BACKGROUND_IMAGE_URI = 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=800&auto=format&fit=crop';

// ─────────────────────────────────────────────
// 여행지 이미지 매핑 테이블
// ─────────────────────────────────────────────
const DESTINATION_IMAGES = {
  // 국내
  '제주':     'https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?q=80&w=600&auto=format&fit=crop',
  '서울':     'https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?q=80&w=600&auto=format&fit=crop',
  '부산':     'https://images.unsplash.com/photo-1578469645742-46cae010e5d4?q=80&w=600&auto=format&fit=crop',
  '강릉':     'https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=600&auto=format&fit=crop',
  '속초':     'https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=600&auto=format&fit=crop',
  '경주':     'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=600&auto=format&fit=crop',
  '여수':     'https://images.unsplash.com/photo-1598135753163-6167c1a1ad65?q=80&w=600&auto=format&fit=crop',
  '전주':     'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=600&auto=format&fit=crop',
  '대구':     'https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?q=80&w=600&auto=format&fit=crop',
  '인천':     'https://images.unsplash.com/photo-1601621915196-2621bfb0cd6e?q=80&w=600&auto=format&fit=crop',
  '강원':     'https://images.unsplash.com/photo-1548115184-bc6544d06a58?q=80&w=600&auto=format&fit=crop',

  // 일본
  '도쿄':     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop',
  '오사카':   'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=600&auto=format&fit=crop',
  '교토':     'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=600&auto=format&fit=crop',
  '후쿠오카': 'https://images.unsplash.com/photo-1590559899731-a382839e5549?q=80&w=600&auto=format&fit=crop',
  '삿포로':   'https://images.unsplash.com/photo-1542640244-b4f5d7fb70ea?q=80&w=600&auto=format&fit=crop',
  '일본':     'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop',

  // 동남아
  '발리':     'https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=600&auto=format&fit=crop',
  '방콕':     'https://images.unsplash.com/photo-1563492065599-3520f775eeed?q=80&w=600&auto=format&fit=crop',
  '태국':     'https://images.unsplash.com/photo-1563492065599-3520f775eeed?q=80&w=600&auto=format&fit=crop',
  '싱가포르': 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?q=80&w=600&auto=format&fit=crop',
  '베트남':   'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop',
  '다낭':     'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop',
  '나트랑':   'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?q=80&w=600&auto=format&fit=crop',
  '세부':     'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=600&auto=format&fit=crop',
  '필리핀':   'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?q=80&w=600&auto=format&fit=crop',

  // 동아시아
  '대만':     'https://images.unsplash.com/photo-1470004914212-05527e49370b?q=80&w=600&auto=format&fit=crop',
  '타이베이': 'https://images.unsplash.com/photo-1470004914212-05527e49370b?q=80&w=600&auto=format&fit=crop',
  '홍콩': 'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=600&auto=format&fit=crop',
  '마카오':   'https://images.unsplash.com/photo-1576788369575-4d16c0b2c3b3?q=80&w=600&auto=format&fit=crop',
  '중국':     'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',
  '상하이':   'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',
  '베이징':   'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',

  // 유럽
  '파리':     'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop',
  '프랑스':   'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop',
  '런던':     'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop',
  '영국':     'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop',
  '로마':     'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
  '이탈리아': 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
  '바르셀로나': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=600&auto=format&fit=crop',
  '스페인':   'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=600&auto=format&fit=crop',
  '프라하':   'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=600&auto=format&fit=crop',
  '체코':     'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=600&auto=format&fit=crop',
  '스위스':   'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=600&auto=format&fit=crop',
  '그리스':   'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop',
  '산토리니': 'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop',
  '암스테르담': 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=600&auto=format&fit=crop',
  '네덜란드': 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=600&auto=format&fit=crop',
  '빈':       'https://images.unsplash.com/photo-1516550893885-985c836c5bcd?q=80&w=600&auto=format&fit=crop',
  '오스트리아': 'https://images.unsplash.com/photo-1516550893885-985c836c5bcd?q=80&w=600&auto=format&fit=crop',
  '포르투갈': 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=600&auto=format&fit=crop',
  '리스본':   'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=600&auto=format&fit=crop',
  '독일':     'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600&auto=format&fit=crop',
  '뮌헨':     'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600&auto=format&fit=crop',

  // 아메리카
  '뉴욕':     'https://images.unsplash.com/photo-1522083165195-3424ed129620?q=80&w=600&auto=format&fit=crop',
  '미국':     'https://images.unsplash.com/photo-1522083165195-3424ed129620?q=80&w=600&auto=format&fit=crop',
  'LA':       'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?q=80&w=600&auto=format&fit=crop',
  '로스앤젤레스': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?q=80&w=600&auto=format&fit=crop',
  '하와이':   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  '캐나다':   'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=600&auto=format&fit=crop',
  '밴쿠버':   'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=600&auto=format&fit=crop',
  '멕시코':   'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=600&auto=format&fit=crop',
  '칸쿤':     'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=600&auto=format&fit=crop',

  // 오세아니아
  '시드니':   'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=600&auto=format&fit=crop',
  '호주':     'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=600&auto=format&fit=crop',
  '뉴질랜드': 'https://images.unsplash.com/photo-1469521669194-babb45599def?q=80&w=600&auto=format&fit=crop',
  '괌':       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  '사이판':   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',

  // 중동/아프리카
  '두바이':   'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=600&auto=format&fit=crop',
  '이집트':   'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=600&auto=format&fit=crop',
  '카이로':   'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=600&auto=format&fit=crop',
  '모로코':   'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop',

  // 디폴트
  'default':  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop',
};

// 여행지 → 이미지 URL 반환
const getCardImage = (destination) => {
  if (!destination) return DESTINATION_IMAGES['default'];
  const key = Object.keys(DESTINATION_IMAGES).find(k => destination.includes(k));
  return key ? DESTINATION_IMAGES[key] : DESTINATION_IMAGES['default'];
};

const DESTINATION_OPTIONS = ['전체', '국내', '아시아', '유럽', '아메리카', '오세아니아/기타'];
const TYPE_OPTIONS = ['전체', 'TUAJ', 'TUAP', 'TURJ', 'TURP', 'TNAJ', 'TNAP', 'TNRJ', 'TNRP', 'CUAJ', 'CUAP', 'CURJ', 'CURP', 'CNAJ', 'CNAP', 'CNRJ', 'CNRP'];
const DURATION_OPTIONS = ['전체', '당일치기', '1박2일', '2박3일', '3박 이상'];
const GENDER_OPTIONS = ['전체', '동성만', '성별 무관'];
const THEME_OPTIONS = ['전체', '빵지순례', '역사/문화', '힐링/휴양', '액티비티', '쇼핑'];

const REGION_KEYWORDS = {
  '국내': ['국내', '서울', '부산', '제주', '강릉', '속초', '인천', '대구', '대전', '광주', '전주', '경주', '여수', '강원'],
  '아시아': ['아시아', '일본', '도쿄', '오사카', '후쿠오카', '삿포로', '중국', '대만', '타이베이', '홍콩', '마카오', '태국', '방콕', '베트남', '다낭', '나트랑', '필리핀', '세부', '싱가포르', '발리'],
  '유럽': ['유럽', '영국', '런던', '프랑스', '파리', '이탈리아', '로마', '스위스', '스페인', '바르셀로나', '독일', '체코', '프라하'],
  '아메리카': ['아메리카', '미국', '뉴욕', 'LA', '하와이', '캐나다', '토론토', '밴쿠버', '멕시코', '남미', '브라질'],
  '오세아니아/기타': ['오세아니아', '호주', '시드니', '뉴질랜드', '괌', '사이판', '아프리카', '이집트', '중동', '기타']
};

export default function SearchScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [writeVisible, setWriteVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const [destOpen, setDestOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [durationOpen, setDurationOpen] = useState(false);
  const [genderOpen, setGenderOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  const [selectedDestination, setSelectedDestination] = useState('전체');
  const [selectedType, setSelectedType] = useState('전체');
  const [selectedDuration, setSelectedDuration] = useState('전체');
  const [selectedGender, setSelectedGender] = useState('전체');
  const [selectedTheme, setSelectedTheme] = useState('전체');
  const [recruitOnly, setRecruitOnly] = useState(false);

  const [tempDestination, setTempDestination] = useState('전체');
  const [tempType, setTempType] = useState('전체');
  const [tempDuration, setTempDuration] = useState('전체');
  const [tempGender, setTempGender] = useState('전체');
  const [tempTheme, setTempTheme] = useState('전체');
  const [tempRecruitOnly, setTempRecruitOnly] = useState(false);
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [joinedRooms, setJoinedRooms] = useState({});
  const [selectedPost, setSelectedPost] = useState(null);
  const [myUserId, setMyUserId] = useState(null);
  const [editPost, setEditPost] = useState(null);
  const [profileVisible, setProfileVisible] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);

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
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts');
      const result = await response.json();
      if (result.success) setPosts(result.posts);
    } catch (error) {
      console.log('게시글 불러오기 에러:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJoinedRooms = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const meRes = await fetch('https://triplan-backend-qwrs.onrender.com/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const meData = await meRes.json();
      if (meData.success) setMyUserId(meData.user.id);

      const response = await fetch('https://triplan-backend-qwrs.onrender.com/posts/my-chats', {
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
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/others?id=' + selectedPost.user_id, {
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
      const response = await fetch('https://triplan-backend-qwrs.onrender.com/users/others?id=' + post.user_id, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (result.success) setProfileImage(result.user.profile_image);
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
      const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/${postId}/join`, {
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
            const response = await fetch(`https://triplan-backend-qwrs.onrender.com/posts/${postId}`, {
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
    const safeBio = post.bio || '';
    const safeDest = post.destination || '';
    const safePlan = post.plan || '';

    const matchesSearch = searchText === '' || safeBio.includes(searchText) || safeDest.includes(searchText);

    let matchesDestination = false;
    if (selectedDestination === '전체') {
      matchesDestination = true;
    } else {
      const keywords = REGION_KEYWORDS[selectedDestination] || [];
      matchesDestination = keywords.some(keyword => safeDest.includes(keyword));
    }

    const matchesType = selectedType === '전체' || post.users?.travel_type === selectedType;
    const current = Number(post.current_people) || 0;
    const max = Number(post.max_people) || 0;
    const matchesRecruit = !recruitOnly || current < max;
    const safeDays = post.days || '';
    const matchesDuration = selectedDuration === '전체' || safeDays.includes(selectedDuration);
    const postGender = post.gender_rule || post.users?.gender || '성별 무관';
    let matchesGender = false;
    if (selectedGender === '전체' || selectedGender === '성별 무관') {
      matchesGender = true;
    } else {
      matchesGender = postGender.includes(selectedGender);
    }
    let matchesTheme = false;
    if (selectedTheme === '전체') {
      matchesTheme = true;
    } else {
      const postTheme = post.theme || '';
      matchesTheme = postTheme.includes(selectedTheme) || safeBio.includes(selectedTheme) || safePlan.includes(selectedTheme);
    }

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
            {selectedDestination !== '전체' && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>📍 {selectedDestination}</Text></View>}
            {selectedType !== '전체' && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>🧭 {selectedType}</Text></View>}
            {selectedDuration !== '전체' && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>🗓 {selectedDuration}</Text></View>}
            {selectedGender !== '전체' && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>👥 {selectedGender}</Text></View>}
            {selectedTheme !== '전체' && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>🎒 {selectedTheme}</Text></View>}
            {recruitOnly && <View style={styles.appliedTag}><Text style={styles.appliedTagText}>✅ 모집 중</Text></View>}
            <TouchableOpacity onPress={clearFilter} style={styles.clearFilterButton}>
              <Text style={styles.clearFilterText}>✕ 초기화</Text>
            </TouchableOpacity>
          </View>
        )}

        <FlatList
          data={filteredPosts}
          keyExtractor={item => String(item.id)}
          style={styles.feed}
          contentContainerStyle={styles.feedContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item: post }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.92}
              onPress={() => {
                setSelectedPost(post);
                fetchProfileImage(post);
              }}>

              <Image
                source={{ uri: getCardImage(post.destination) }}
                style={styles.cardBgImage}
                resizeMode="cover"
              />
              <View style={styles.cardBgOverlay} />
              <View style={styles.cardContent}>
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
                    <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                      <Text style={styles.badgeText}>마감됨</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.bio} numberOfLines={2}>{post.bio}</Text>
                <View style={styles.cardMeta}>
                  <Text style={styles.metaText}>{post.users?.nickname || post.users?.name}</Text>
                  <Text style={styles.metaDot}>·</Text>
                  <View style={styles.travelTypeBadge}>
                    <Text style={styles.travelTypeBadgeText}>{post.users?.travel_type ?? '미설정'}</Text>
                  </View>
                  {post.users?.travel_type && (
                    <TouchableOpacity onPress={() => setInfoVisible(true)}>
                      <Text style={{ fontSize: 14 }}>❔</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.travelInfo}>
                  <View style={styles.travelTag}>
                    <Text style={styles.travelTagText}>📍 {post.destination}</Text>
                  </View>
                  {post.departure_date && (
                    <View style={styles.travelTag}>
                      <Text style={styles.travelTagText}>🛫 {post.departure_date}</Text>
                    </View>
                  )}
                  <View style={styles.travelTag}>
                    <Text style={styles.travelTagText}>🗓 {post.days}</Text>
                  </View>
                  <View style={[styles.travelTag, post.current_people >= post.max_people && styles.travelTagFull]}>
                    <Text style={[styles.travelTagText, post.current_people >= post.max_people && styles.travelTagTextFull]}>
                      👥 {post.current_people}/{post.max_people}명
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {loading ? '여행 계획을 불러오는 중...' : '조건에 맞는 게시글이 없습니다.'}
              </Text>
            </View>
          }
          ListFooterComponent={<View style={{ height: 80 }} />}
        />

        <TouchableOpacity style={styles.fab} onPress={() => setWriteVisible(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {/* 글쓰기 모달 */}
        <Modal visible={writeVisible} animationType="slide" onRequestClose={() => setWriteVisible(false)}>
          <WriteScreen onClose={() => { setWriteVisible(false); fetchPosts(); }} />
        </Modal>

        {/* 수정 모달 */}
        <Modal visible={!!editPost} animationType="slide" onRequestClose={() => setEditPost(null)}>
          <EditPostScreen post={editPost} onClose={() => { setEditPost(null); fetchPosts(); }} />
        </Modal>

        {/* 게시글 상세 모달 */}
        <Modal visible={!!selectedPost} animationType="slide" transparent onRequestClose={() => setSelectedPost(null)}>
          <TouchableOpacity style={styles.detailOverlay} activeOpacity={1} onPress={() => setSelectedPost(null)}>
            <TouchableOpacity style={styles.detailBox} activeOpacity={1} onPress={() => {}}>
              <View style={styles.detailHeader}>
                <TouchableOpacity onPress={() => fetchProfile()}>
                  {profileImage === null
                    ? <Image style={styles.avatar} />
                    : <Image style={styles.avatar} source={{ uri: profileImage }} />
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

              <View style={styles.detailTravelInfo}>
                <View style={styles.detailTravelTag}>
                  <Text style={styles.detailTravelTagText}>📍 {selectedPost?.destination}</Text>
                </View>
                {selectedPost?.departure_date && (
                  <View style={styles.detailTravelTag}>
                    <Text style={styles.detailTravelTagText}>🛫 {selectedPost?.departure_date}</Text>
                  </View>
                )}
                <View style={styles.detailTravelTag}>
                  <Text style={styles.detailTravelTagText}>🗓 {selectedPost?.days}</Text>
                </View>
                <View style={styles.detailTravelTag}>
                  <Text style={styles.detailTravelTagText}>👥 {selectedPost?.current_people}/{selectedPost?.max_people}명</Text>
                </View>
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

                {otherUser?.preferred_destination && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>선호 여행지</Text>
                    <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6 }}>
                      {otherUser.preferred_destination.split(',').map((dest, idx) => (
                        <View key={idx} style={[styles.badge, { backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1, borderColor: '#FF6B6B' }]}>
                          <Text style={[styles.badgeText, { color: '#FF6B6B' }]}>📍 {dest}</Text>
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

        {/* 필터 모달 */}
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

                <TouchableOpacity style={{ marginTop: 20, alignItems: 'center', paddingVertical: 10 }} onPress={() => setShowMoreFilters(!showMoreFilters)}>
                  <Text style={{ color: '#888', fontWeight: 'bold', fontSize: 14 }}>상세 필터 {showMoreFilters ? '접기 ▲' : '더보기 ▼'}</Text>
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

                <TouchableOpacity style={[styles.dropdownHeader, { marginTop: 16, borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 4 }]} onPress={() => setTempRecruitOnly(!tempRecruitOnly)} activeOpacity={0.7}>
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

        {/* 성향 설명 모달 */}
        <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
          <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>🧭 4가지 여행 성향 척도</Text>
              <View style={{ gap: 12, marginBottom: 24 }}>
                <Text style={styles.infoText}>🥾 <Text style={styles.highlightText}>T / C</Text> : 활동형 (많이 걷기 OK) vs 여유형 (편안한 이동)</Text>
                <Text style={styles.infoText}>🏙 <Text style={styles.highlightText}>U / N</Text> : 도심파 (번화가/쇼핑) vs 자연파 (산/바다/공원)</Text>
                <Text style={styles.infoText}>🏄 <Text style={styles.highlightText}>A / R</Text> : 액티브 (체험/도전) vs 힐링형 (느긋하게 충전)</Text>
                <Text style={styles.infoText}>📋 <Text style={styles.highlightText}>J / P</Text> : 계획파 (꼼꼼한 일정) vs 즉흥파 (자유로운 여행)</Text>
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

  topBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.85)', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#eee', gap: 10 },
  searchBar: { flex: 1, backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#333', borderWidth: 1, borderColor: '#eee', elevation: 2 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', elevation: 2 },
  filterButtonActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  filterButtonText: { fontSize: 14, color: '#555', fontWeight: 'bold' },
  filterButtonTextActive: { color: '#fff' },

  appliedRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(255,255,255,0.7)', gap: 8, alignItems: 'center' },
  appliedTag: { backgroundColor: 'rgba(255,107,107,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, borderWidth: 1, borderColor: '#FF6B6B' },
  appliedTagText: { fontSize: 13, color: '#FF6B6B', fontWeight: 'bold' },
  clearFilterButton: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4 },
  clearFilterText: { fontSize: 12, color: '#888', fontWeight: 'bold' },

  feed: { flex: 1 },
  feedContent: { padding: 16, gap: 16 },

  // ── 카드 ──────────────────────────────────────
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    minHeight: 180,
  },
  cardBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  cardBgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderRadius: 20,
  },
  cardContent: {
    padding: 18,
  },

  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },

  bio: { fontSize: 17, color: '#fff', fontWeight: '900', marginBottom: 10, lineHeight: 24, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  cardMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 },
  metaText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  metaDot: { fontSize: 13, color: 'rgba(255,255,255,0.4)' },
  travelTypeBadge: { backgroundColor: 'rgba(255,107,107,0.85)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  travelTypeBadgeText: { fontSize: 11, color: '#fff', fontWeight: 'bold' },

  travelInfo: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  travelTag: { backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  travelTagText: { fontSize: 12, color: '#fff', fontWeight: '600' },
  travelTagFull: { backgroundColor: 'rgba(0,0,0,0.3)', borderColor: 'rgba(255,255,255,0.15)' },
  travelTagTextFull: { color: 'rgba(255,255,255,0.5)' },

  fab: { position: 'absolute', bottom: 30, right: 24, width: 60, height: 60, borderRadius: 30, backgroundColor: '#FF6B6B', justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF6B6B', shadowOpacity: 0.4, shadowRadius: 5, shadowOffset: { width: 0, height: 4 } },
  fabText: { color: '#fff', fontSize: 32, fontWeight: '400', lineHeight: 36 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100, backgroundColor: 'rgba(255,255,255,0.7)', padding: 30, borderRadius: 20 },
  emptyText: { color: '#555', fontSize: 16, fontWeight: 'bold' },

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

  filterOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 24, padding: 24, width: '85%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20, color: '#333', textAlign: 'center' },
  dropdownHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14 },
  dropdownLabel: { fontSize: 15, color: '#333', fontWeight: 'bold' },
  dropdownValue: { fontSize: 15, color: '#FF6B6B', fontWeight: 'bold' },
  dropdownList: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#eee', borderRadius: 16, marginTop: 6, overflow: 'hidden' },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
  dropdownItemActive: { backgroundColor: 'rgba(255,107,107,0.05)' },
  dropdownItemText: { fontSize: 15, color: '#555' },
  dropdownItemTextActive: { color: '#FF6B6B', fontWeight: 'bold' },
  applyButton: { backgroundColor: '#FF6B6B', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#ddd', justifyContent: 'center', alignItems: 'center' },
  checkboxActive: { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' },
  infoBox: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, width: '85%', elevation: 5 },
  infoTitle: { fontSize: 20, fontWeight: '900', color: '#333', marginBottom: 20, textAlign: 'center' },
  infoText: { fontSize: 15, color: '#555', lineHeight: 22 },
  highlightText: { fontWeight: 'bold', color: '#FF6B6B' },
  detailTravelInfo: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 16 },
  detailTravelTag: {
    fontSize: 12,
    color: '#444',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  detailTravelTagText: { fontSize: 12, color: '#444' },
});