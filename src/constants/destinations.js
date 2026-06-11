// ─────────────────────────────────────────────
// 여행지 관련 상수 모음
// SearchScreen, MatchingScreen, DestinationPicker 등에서 공용 사용
// ─────────────────────────────────────────────

export const DESTINATION_IMAGES = {
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
  '홍콩':     'https://images.unsplash.com/photo-1536599018102-9f803c140fc1?q=80&w=600&auto=format&fit=crop',
  '마카오':   'https://images.unsplash.com/photo-1576788369575-4d16c0b2c3b3?q=80&w=600&auto=format&fit=crop',
  '중국':     'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',
  '상하이':   'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',
  '베이징':   'https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?q=80&w=600&auto=format&fit=crop',

  // 유럽
  '파리':       'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop',
  '프랑스':     'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=600&auto=format&fit=crop',
  '런던':       'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop',
  '영국':       'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?q=80&w=600&auto=format&fit=crop',
  '로마':       'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
  '이탈리아':   'https://images.unsplash.com/photo-1552832230-c0197dd311b5?q=80&w=600&auto=format&fit=crop',
  '바르셀로나': 'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=600&auto=format&fit=crop',
  '스페인':     'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=600&auto=format&fit=crop',
  '프라하':     'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=600&auto=format&fit=crop',
  '체코':       'https://images.unsplash.com/photo-1541849546-216549ae216d?q=80&w=600&auto=format&fit=crop',
  '스위스':     'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?q=80&w=600&auto=format&fit=crop',
  '그리스':     'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop',
  '산토리니':   'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop',
  '암스테르담': 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=600&auto=format&fit=crop',
  '네덜란드':   'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?q=80&w=600&auto=format&fit=crop',
  '빈':         'https://images.unsplash.com/photo-1516550893885-985c836c5bcd?q=80&w=600&auto=format&fit=crop',
  '오스트리아': 'https://images.unsplash.com/photo-1516550893885-985c836c5bcd?q=80&w=600&auto=format&fit=crop',
  '포르투갈':   'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=600&auto=format&fit=crop',
  '리스본':     'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?q=80&w=600&auto=format&fit=crop',
  '독일':       'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600&auto=format&fit=crop',
  '뮌헨':       'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=600&auto=format&fit=crop',

  // 아메리카
  '뉴욕':         'https://images.unsplash.com/photo-1522083165195-3424ed129620?q=80&w=600&auto=format&fit=crop',
  '미국':         'https://images.unsplash.com/photo-1522083165195-3424ed129620?q=80&w=600&auto=format&fit=crop',
  'LA':           'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?q=80&w=600&auto=format&fit=crop',
  '로스앤젤레스': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?q=80&w=600&auto=format&fit=crop',
  '하와이':       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  '캐나다':       'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=600&auto=format&fit=crop',
  '밴쿠버':       'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?q=80&w=600&auto=format&fit=crop',
  '멕시코':       'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=600&auto=format&fit=crop',
  '칸쿤':         'https://images.unsplash.com/photo-1518105779142-d975f22f1b0a?q=80&w=600&auto=format&fit=crop',

  // 오세아니아
  '시드니':   'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=600&auto=format&fit=crop',
  '호주':     'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?q=80&w=600&auto=format&fit=crop',
  '뉴질랜드': 'https://images.unsplash.com/photo-1469521669194-babb45599def?q=80&w=600&auto=format&fit=crop',
  '괌':       'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',
  '사이판':   'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600&auto=format&fit=crop',

  // 중동/아프리카
  '두바이': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=600&auto=format&fit=crop',
  '이집트': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=600&auto=format&fit=crop',
  '카이로': 'https://images.unsplash.com/photo-1539650116574-8efeb43e2750?q=80&w=600&auto=format&fit=crop',
  '모로코': 'https://images.unsplash.com/photo-1548013146-72479768bada?q=80&w=600&auto=format&fit=crop',

  // 디폴트
  'default': 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=600&auto=format&fit=crop',
};

// 여행지명 → 이미지 URL 반환
export const getCardImage = (destination) => {
  if (!destination) return DESTINATION_IMAGES['default'];
  const key = Object.keys(DESTINATION_IMAGES).find(k => destination.includes(k));
  return key ? DESTINATION_IMAGES[key] : DESTINATION_IMAGES['default'];
};

// 필터 옵션 상수
export const DESTINATION_OPTIONS = ['전체', '국내', '아시아', '유럽', '아메리카', '오세아니아/기타'];

export const TYPE_OPTIONS = [
  '전체',
  'TUAJ', 'TUAP', 'TURJ', 'TURP',
  'TNAJ', 'TNAP', 'TNRJ', 'TNRP',
  'CUAJ', 'CUAP', 'CURJ', 'CURP',
  'CNAJ', 'CNAP', 'CNRJ', 'CNRP',
];

export const DURATION_OPTIONS = ['전체', '당일치기', '1박2일', '2박3일', '3박 이상'];
export const GENDER_OPTIONS   = ['전체', '동성만', '성별 무관'];
export const THEME_OPTIONS    = ['전체', '빵지순례', '역사/문화', '힐링/휴양', '액티비티', '쇼핑'];

// 지역 키워드 매핑 (필터용)
export const REGION_KEYWORDS = {
  '국내': ['국내', '서울', '부산', '제주', '강릉', '속초', '인천', '대구', '대전', '광주', '전주', '경주', '여수', '강원'],
  '아시아': ['아시아', '일본', '도쿄', '오사카', '후쿠오카', '삿포로', '중국', '대만', '타이베이', '홍콩', '마카오', '태국', '방콕', '베트남', '다낭', '나트랑', '필리핀', '세부', '싱가포르', '발리'],
  '유럽': ['유럽', '영국', '런던', '프랑스', '파리', '이탈리아', '로마', '스위스', '스페인', '바르셀로나', '독일', '체코', '프라하'],
  '아메리카': ['아메리카', '미국', '뉴욕', 'LA', '하와이', '캐나다', '토론토', '밴쿠버', '멕시코', '남미', '브라질'],
  '오세아니아/기타': ['오세아니아', '호주', '시드니', '뉴질랜드', '괌', '사이판', '아프리카', '이집트', '중동', '기타'],
};

// DestinationPicker 선택 옵션
export const PICKER_OPTIONS = ['국내', '아시아', '유럽', '아메리카', '오세아니아/기타'];