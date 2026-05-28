import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// onAddSpotToSchedule: (spot) => void  ← ChatRoomScreen에서 주입
export default function AIMessageCard({
 data,
 onAddSpotToSchedule,
 currentSpotCount = 0,
 days = 1
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [selectedSpot, setSelectedSpot] = useState(0);
  const mapRef = useRef(null);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  if (!data?.destinations?.length) return null;
  const dest = data.destinations[selectedIdx] ?? data.destinations[0];

  const validSpots = dest.spots?.filter(s => s.lat && s.lng) ?? [];
  const getRegion = () => {
    if (validSpots.length === 0) return null;
    const lats = validSpots.map(s => s.lat);
    const lngs = validSpots.map(s => s.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.05),
    };
  };

  const handleDestChange = (idx) => {
    setSelectedIdx(idx);
    setSelectedSpot(0);
    setTimeout(() => {
      const region = getRegion();
      if (region && mapRef.current) mapRef.current.animateToRegion(region, 600);
    }, 100);
  };

  const handleSpotPress = (spot, idx) => {
    setSelectedSpot(idx);
    if (spot.lat && spot.lng && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: spot.lat, longitude: spot.lng,
        latitudeDelta: 0.01, longitudeDelta: 0.01,
      }, 500);
    }
  };

  // 일정 추가 버튼
  const handleAddToSchedule = (spot) => {
    const maxSpots = (Number(days) + 1) * 2;
    const willExceed = (currentSpotCount + 1) > maxSpots;

    Alert.alert(
      willExceed ? '⚠️ 일정이 많아요' : '일정에 추가',
      willExceed
        ? `${days}박${Number(days) + 1}일 여행 권장 일정(${maxSpots}곳)을 초과해요.\n그래도 "${spot.name}"을 추가할까요?`
        : `"${spot.name}"을 일정에 추가할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '추가',
          onPress: () => {
            if (onAddSpotToSchedule) {
              onAddSpotToSchedule({
                time: '',
                place: spot.name,
                detail: spot.description || '',
              });
              Alert.alert('✅ 추가됐어요', `"${spot.name}"이 일정에 추가됐어요!\n헤더의 일정 버튼에서 확인하세요.`);
            }
          },
        },
      ]
    );
  };

  const region = getRegion();

  return (
    <View style={styles.card}>

      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>✈️</Text>
        <Text style={styles.headerText}>{data.summary}</Text>
      </View>

      {/* 여행지 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        <View style={styles.tabRow}>
          {data.destinations.map((d, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.tab, selectedIdx === i && styles.tabActive]}
              onPress={() => handleDestChange(i)}>
              <Text style={[styles.tabText, selectedIdx === i && styles.tabTextActive]}>
                {i + 1}. {d.name}
              </Text>
              <Text style={[styles.tabCountry, selectedIdx === i && { color: '#ddd' }]}>
                {d.country}
                {d.travelTime ? ` · ${d.travelTime}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 장소 핀 탭 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pinTabScroll}>
        <View style={styles.pinTabRow}>
          {dest.spots.map((spot, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.pinTab, selectedSpot === i && styles.pinTabActive]}
              onPress={() => handleSpotPress(spot, i)}>
              <View style={[styles.pinNum, selectedSpot === i && styles.pinNumActive]}>
                <Text style={[styles.pinNumText, selectedSpot === i && { color: '#fff' }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.pinTabText, selectedSpot === i && styles.pinTabTextActive]} numberOfLines={1}>
                {spot.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 추천 이유 */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonText}>{dest.reason}</Text>
      </View>

      {/* 지도 토글 버튼 */}
      <TouchableOpacity
        style={styles.mapToggleBtn}
        onPress={() => setIsMapExpanded(prev => !prev)}>
        <Text style={styles.mapToggleText}>
          {isMapExpanded ? '🗺 지도 접기 ▲' : '🗺 지도 보기 ▼'}
        </Text>
      </TouchableOpacity>

      {isMapExpanded && (
        region ? (
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={dest.isKorea ? undefined : PROVIDER_GOOGLE}
            initialRegion={region}>
            {validSpots.length > 1 && (
              <Polyline
                coordinates={validSpots.map(s => ({ latitude: s.lat, longitude: s.lng }))}
                strokeColor="#6C5CE7" strokeWidth={2.5} lineDashPattern={[6, 3]}
              />
            )}
            {validSpots.map((spot, i) => (
              <Marker
                key={i}
                coordinate={{ latitude: spot.lat, longitude: spot.lng }}
                title={`${i + 1}. ${spot.name}`}
                description={spot.description}
                onPress={() => setSelectedSpot(i)}>
                <View style={styles.markerWrap}>
                  <View style={[styles.markerBubble, selectedSpot === i && styles.markerBubbleActive]}>
                    <Text style={styles.markerNum}>{i + 1}</Text>
                  </View>
                  <View style={[styles.markerTail, selectedSpot === i && styles.markerTailActive]} />
                </View>
              </Marker>
            ))}
          </MapView>
        ) : (
          <View style={styles.mapFallback}>
            <Text style={styles.mapFallbackText}>🗺 지도 정보를 불러올 수 없어요</Text>
          </View>
        )
      )}

      {/* 장소 카드 + 일정 추가 버튼 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotScroll}>
        <View style={styles.spotRow}>
          {dest.spots.map((spot, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.spotCard, selectedSpot === i && styles.spotCardActive]}
              onPress={() => handleSpotPress(spot, i)}
              activeOpacity={0.85}>

              {spot.photoUrl ? (
                <Image source={{ uri: spot.photoUrl }} style={styles.spotPhoto} />
              ) : (
                <View style={styles.spotPhotoPlaceholder}>
                  <Text style={styles.spotPhotoNum}>{i + 1}</Text>
                </View>
              )}

              <View style={styles.spotInfo}>
                <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
                <Text style={styles.spotDesc} numberOfLines={2}>{spot.description}</Text>
                {spot.address ? (
                  <Text style={styles.spotAddress} numberOfLines={1}>📍 {spot.address}</Text>
                ) : null}
                {spot.placeUrl ? (
                  <TouchableOpacity onPress={() => Linking.openURL(spot.placeUrl)}>
                    <Text style={styles.spotLink}>카카오맵 →</Text>
                  </TouchableOpacity>
                ) : null}

                {/* 일정 추가 버튼 */}
                <TouchableOpacity
                  style={styles.addScheduleBtn}
                  onPress={() => handleAddToSchedule(spot)}>
                  <Text style={styles.addScheduleBtnText}>+ 일정 추가</Text>
                </TouchableOpacity>
              </View>

            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F0EEFF',
    borderRadius: 16,
    marginHorizontal: 12,
    marginVertical: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C9B8FF',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  headerIcon: { fontSize: 18 },
  headerText: { fontSize: 14, fontWeight: 'bold', color: '#3D2B9E', flex: 1 },

  tabScroll: { paddingLeft: 12, marginBottom: 4 },
  tabRow: { flexDirection: 'row', gap: 8, paddingRight: 16 },
  tab: {
    backgroundColor: '#E8E0FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    alignItems: 'center', minWidth: 90,
  },
  tabActive: { backgroundColor: '#6C5CE7' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#6C5CE7' },
  tabTextActive: { color: '#fff' },
  tabCountry: { fontSize: 10, color: '#888', marginTop: 2 },

  pinTabScroll: { paddingLeft: 12, marginBottom: 6 },
  pinTabRow: { flexDirection: 'row', gap: 6, paddingRight: 16 },
  pinTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#C9B8FF',
  },
  pinTabActive: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  pinNum: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E8E0FF',
    justifyContent: 'center', alignItems: 'center',
  },
  pinNumActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  pinNumText: { fontSize: 11, fontWeight: 'bold', color: '#6C5CE7' },
  pinTabText: { fontSize: 12, color: '#555', maxWidth: 80 },
  pinTabTextActive: { color: '#fff', fontWeight: 'bold' },

  reasonBox: {
    backgroundColor: '#fff',
    marginHorizontal: 12, marginVertical: 8,
    borderRadius: 10, padding: 12,
  },
  reasonText: { fontSize: 13, color: '#444', lineHeight: 20 },

  map: { height: 220, marginHorizontal: 12, borderRadius: 12, marginBottom: 8 },
  mapFallback: {
    height: 100, marginHorizontal: 12, borderRadius: 12, marginBottom: 8,
    backgroundColor: '#E8E0FF', justifyContent: 'center', alignItems: 'center',
  },
  mapFallbackText: { fontSize: 13, color: '#888' },

  markerWrap: { alignItems: 'center' },
  markerBubble: {
    backgroundColor: '#6C5CE7', width: 28, height: 28,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff', elevation: 4,
  },
  markerBubbleActive: { backgroundColor: '#FF6B6B', width: 34, height: 34, borderRadius: 17 },
  markerNum: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#6C5CE7',
  },
  markerTailActive: { borderTopColor: '#FF6B6B' },

  spotScroll: { marginBottom: 14 },
  spotRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10 },
  spotCard: {
    width: 170, backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8E0FF',
  },
  spotCardActive: { borderColor: '#6C5CE7', borderWidth: 2 },
  spotPhoto: { width: '100%', height: 100 },
  spotPhotoPlaceholder: {
    width: '100%', height: 100, backgroundColor: '#E8E0FF',
    justifyContent: 'center', alignItems: 'center',
  },
  spotPhotoNum: { fontSize: 28, fontWeight: 'bold', color: '#6C5CE7' },
  spotInfo: { padding: 10 },
  spotName: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  spotDesc: { fontSize: 11.5, color: '#666', lineHeight: 16, marginBottom: 4 },
  spotAddress: { fontSize: 10.5, color: '#999', marginBottom: 4 },
  spotLink: { fontSize: 11, color: '#6C5CE7', fontWeight: 'bold', marginBottom: 6 },

  // 일정 추가 버튼
  addScheduleBtn: {
    backgroundColor: '#6C5CE7',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  addScheduleBtnText: {
    color: '#fff', fontSize: 12, fontWeight: 'bold',
  },
  mapToggleBtn: {
    marginHorizontal: 12,
    marginBottom: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#E8E0FF',
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  mapToggleText: {
    fontSize: 12,
    color: '#6C5CE7',
    fontWeight: 'bold',
  },
});