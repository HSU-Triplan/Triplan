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

module.exports = { searchGooglePlace };
