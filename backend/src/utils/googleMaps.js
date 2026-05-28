// backend/src/utils/googleMaps.js

const searchGooglePlace = async (query) => {
  try {
    // 1. Text Search로 장소 검색
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&language=ko&key=${process.env.GOOGLE_MAPS_API_KEY}`
    );
    const searchData = await searchRes.json();

    if (!searchData.results || searchData.results.length === 0) {
      console.log(`Google Places 검색 결과 없음: ${query}`);
      return null;
    }

    const place = searchData.results[0];

    // 2. 사진 URL 생성 (photo_reference → 실제 이미지 URL)
    const photoRef = place.photos?.[0]?.photo_reference;
    const photoUrl = photoRef
      ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoRef}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      : null;

    return {
      name: place.name,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      address: place.formatted_address,
      photoUrl,
      placeId: place.place_id,
    };
  } catch (error) {
    console.log('Google Places 검색 에러:', error.message);
    return null;
  }
};

// 목적지 인기 장소 검색 (상위 15개)
// searchPopularGooglePlaces — urbanRatio 파라미터 추가
async function searchPopularGooglePlaces(destination, urbanRatio = 50) {
  try {
    let query;
    if (urbanRatio >= 70) query = `popular city attractions in ${destination}`;
    else if (urbanRatio <= 30) query = `popular nature spots in ${destination}`;
    else query = `popular tourist attractions in ${destination}`;

    console.log('[Kakao] 검색 쿼리:', query);

    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    console.log('[Kakao] 응답 상태:', res.status);
    console.log('[Kakao] 결과 수:', data.documents?.length);

    return (data.results || []).slice(0, 15).map(p => ({
      name: p.name,
      address: p.formatted_address,
      lat: p.geometry?.location?.lat,
      lng: p.geometry?.location?.lng,
      rating: p.rating,
      placeId: p.place_id,
      types: p.types?.slice(0, 3).join(', '),
    }));

  } catch (e) {
    console.error('[Google] 인기 장소 검색 실패:', e.message);
    return [];
  }
}

// searchNearbyGooglePlaces — keyword 파라미터로 검색
async function searchNearbyGooglePlaces(lat, lng, keyword) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(keyword)}&location=${lat},${lng}&radius=3000&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();

    return await Promise.all(
      (data.results || []).slice(0, 3).map(async p => {
        let photoUrl = null;
        if (p.photos?.[0]?.photo_reference) {
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${p.photos[0].photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
        }
        return {
          name: p.name,
          address: p.formatted_address || p.vicinity,
          lat: p.geometry?.location?.lat,
          lng: p.geometry?.location?.lng,
          photoUrl,
          placeUrl: null,
        };
      })
    );
  } catch (e) {
    console.error('[Google] 근처 장소 검색 실패:', e.message);
    return [];
  }
}

module.exports = { searchGooglePlace, searchPopularGooglePlaces, searchNearbyGooglePlaces };