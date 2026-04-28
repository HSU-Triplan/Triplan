import React, { useState, useCallback, useEffect } from 'react';
import { Modal } from 'react-native';
import WriteScreen from './WriteScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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

  // 적용 버튼 누르기 전 임시 상태
  const [tempDestination, setTempDestination] = useState('전체');
  const [tempType, setTempType] = useState('전체');

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

    useEffect(() => {
      fetchPosts();
    }, [fetchPosts]);

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
            <View key={post.id} style={styles.card}>
              {/* 작성자 정보 */}
              <View style={styles.cardHeader}>
                <View style={styles.avatar} />
                <View>
                  <Text style={styles.userName}>{post.users?.name}</Text>
                  <Text style={styles.travelType}>{post.users?.travel_type ?? '성향 미설정'}</Text>
                </View>
              </View>

              {/* 여행 정보 */}
              <View style={styles.travelInfo}>
                <Text style={styles.destination}>📍 {post.destination}</Text>
                <Text style={styles.days}>📅 {post.days}</Text>
                <Text style={styles.maxPeople}>👥 {post.current_people}/{post.max_people}명</Text>
                {post.departure_date ? (
                  <Text style={styles.departureDate}>🛫 {post.departure_date}</Text>
                ) : null}
              </View>

              {/* 한 줄 소개 */}
              <Text style={styles.bio}>{post.bio}</Text>

              {/* 간단 계획 */}
              {post.plan ? (
                <Text style={styles.plan} numberOfLines={2}>{post.plan}</Text>
              ) : null}

              {/* 참여하기 버튼 */}
              <TouchableOpacity style={styles.joinButton}>
                <Text style={styles.joinButtonText}>참여하기</Text>
              </TouchableOpacity>
            </View>
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
});