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

module.exports = { searchKakaoPlace };
