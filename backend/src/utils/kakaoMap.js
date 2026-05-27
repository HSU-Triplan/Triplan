// backend/src/utils/kakaoMap.js

const searchKakaoPlace = async (query) => {
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=1`,
      {
        headers: {
          Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}`,
        },
      }
    );
    const data = await res.json();

    if (!data.documents || data.documents.length === 0) {
      console.log(`Kakao 검색 결과 없음: ${query}`);
      return null;
    }

    const place = data.documents[0];

    return {
      name: place.place_name,
      lat: parseFloat(place.y),
      lng: parseFloat(place.x),
      address: place.road_address_name || place.address_name,
      photoUrl: null,  // Kakao Local API는 사진 미제공 → place_url로 대체
      placeUrl: place.place_url,
      placeId: place.id,
    };
  } catch (error) {
    console.log('Kakao 장소 검색 에러:', error.message);
    return null;
  }
};

// 목적지 인기 장소 검색 (상위 15개)
async function searchPopularKakaoPlaces(destination) {
  try {
    const query = `${destination} 관광지`;
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=15&sort=accuracy`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    });
    const data = await res.json();
    return (data.documents || []).map(p => ({
      name: p.place_name,
      address: p.road_address_name || p.address_name,
      lat: parseFloat(p.y),
      lng: parseFloat(p.x),
      placeUrl: p.place_url,
      category: p.category_name,
    }));
  } catch (e) {
    console.error('[Kakao] 인기 장소 검색 실패:', e.message);
    return [];
  }
}

// 중심 장소 근처 검색
async function searchNearbyKakaoPlaces(lat, lng, centerName) {
  try {
    const query = `${centerName} 근처 명소`;
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&x=${lng}&y=${lat}&radius=2000&size=5&sort=distance`;
    const res = await fetch(url, {
      headers: { Authorization: `KakaoAK ${process.env.KAKAO_REST_API_KEY}` },
    });
    const data = await res.json();
    return (data.documents || []).slice(0, 2).map(p => ({
      name: p.place_name,
      address: p.road_address_name || p.address_name,
      lat: parseFloat(p.y),
      lng: parseFloat(p.x),
      placeUrl: p.place_url,
      photoUrl: null,
    }));
  } catch (e) {
    console.error('[Kakao] 근처 장소 검색 실패:', e.message);
    return [];
  }
}

module.exports = { searchKakaoPlace, searchPopularKakaoPlaces, searchNearbyKakaoPlaces };
