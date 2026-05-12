import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export default function AIRecommendCard({ data }) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const mapRef = useRef(null);

  const dest = data.destinations[selectedIdx];

  // 좌표 있는 spots만 필터
  const validSpots = dest.spots.filter(s => s.lat && s.lng);

  // 지도 초기 region — spots 중앙값
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

  // 여행지 탭 변경 시 지도 이동
  const handleDestChange = (idx) => {
    setSelectedIdx(idx);
    setTimeout(() => {
      const region = getRegion();
      if (region && mapRef.current) {
        mapRef.current.animateToRegion(region, 600);
      }
    }, 100);
  };

  const region = getRegion();

  return (
    <View style={styles.card}>

      {/* 요약 헤더 */}
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
              <Text style={styles.tabCountry}>{d.country}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 추천 이유 */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonText}>{dest.reason}</Text>
      </View>

      {/* 지도 */}
      {region ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={dest.isKorea ? undefined : PROVIDER_GOOGLE}
          initialRegion={region}>

          {/* 경로 선 */}
          {validSpots.length > 1 && (
            <Polyline
              coordinates={validSpots.map(s => ({ latitude: s.lat, longitude: s.lng }))}
              strokeColor="#6C5CE7"
              strokeWidth={2.5}
              lineDashPattern={[6, 3]}
            />
          )}

          {/* 핀 마커 */}
          {validSpots.map((spot, i) => (
            <Marker
              key={i}
              coordinate={{ latitude: spot.lat, longitude: spot.lng }}
              title={`${i + 1}. ${spot.name}`}
              description={spot.description}>
              <View style={styles.markerWrap}>
                <View style={styles.markerBubble}>
                  <Text style={styles.markerNum}>{i + 1}</Text>
                </View>
                <View style={styles.markerTail} />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.mapFallback}>
          <Text style={styles.mapFallbackText}>🗺 지도 정보를 불러올 수 없어요</Text>
        </View>
      )}

      {/* 장소 카드 리스트 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.spotScroll}>
        <View style={styles.spotRow}>
          {dest.spots.map((spot, i) => (
            <View key={i} style={styles.spotCard}>

              {/* 사진 or 번호 placeholder */}
              {spot.photoUrl ? (
                <Image source={{ uri: spot.photoUrl }} style={styles.spotPhoto} />
              ) : (
                <View style={styles.spotPhotoPlaceholder}>
                  <Text style={styles.spotPhotoNum}>{i + 1}</Text>
                </View>
              )}

              {/* 장소 정보 */}
              <View style={styles.spotInfo}>
                <Text style={styles.spotName} numberOfLines={1}>{spot.name}</Text>
                <Text style={styles.spotDesc} numberOfLines={2}>{spot.description}</Text>
                {spot.address ? (
                  <Text style={styles.spotAddress} numberOfLines={1}>📍 {spot.address}</Text>
                ) : null}
                {/* 카카오 장소 링크 */}
                {spot.placeUrl ? (
                  <TouchableOpacity onPress={() => Linking.openURL(spot.placeUrl)}>
                    <Text style={styles.spotLink}>카카오맵에서 보기 →</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

            </View>
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

  // 헤더
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  headerIcon: { fontSize: 18 },
  headerText: { fontSize: 14, fontWeight: 'bold', color: '#3D2B9E', flex: 1 },

  // 탭
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

  // 추천 이유
  reasonBox: {
    backgroundColor: '#fff',
    marginHorizontal: 12, marginVertical: 8,
    borderRadius: 10, padding: 12,
  },
  reasonText: { fontSize: 13, color: '#444', lineHeight: 20 },

  // 지도
  map: { height: 220, marginHorizontal: 12, borderRadius: 12, marginBottom: 8 },
  mapFallback: {
    height: 100, marginHorizontal: 12, borderRadius: 12, marginBottom: 8,
    backgroundColor: '#E8E0FF', justifyContent: 'center', alignItems: 'center',
  },
  mapFallbackText: { fontSize: 13, color: '#888' },

  // 커스텀 마커
  markerWrap: { alignItems: 'center' },
  markerBubble: {
    backgroundColor: '#6C5CE7', width: 28, height: 28,
    borderRadius: 14, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 3, elevation: 4,
  },
  markerNum: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  markerTail: {
    width: 0, height: 0,
    borderLeftWidth: 5, borderRightWidth: 5, borderTopWidth: 7,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: '#6C5CE7',
  },

  // 장소 카드
  spotScroll: { marginBottom: 14 },
  spotRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 10 },
  spotCard: {
    width: 160, backgroundColor: '#fff',
    borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#E8E0FF',
  },
  spotPhoto: { width: '100%', height: 100 },
  spotPhotoPlaceholder: {
    width: '100%', height: 100,
    backgroundColor: '#E8E0FF',
    justifyContent: 'center', alignItems: 'center',
  },
  spotPhotoNum: { fontSize: 28, fontWeight: 'bold', color: '#6C5CE7' },
  spotInfo: { padding: 10 },
  spotName: { fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  spotDesc: { fontSize: 11.5, color: '#666', lineHeight: 16, marginBottom: 4 },
  spotAddress: { fontSize: 10.5, color: '#999', marginBottom: 4 },
  spotLink: { fontSize: 11, color: '#6C5CE7', fontWeight: 'bold' },
});
