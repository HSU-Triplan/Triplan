const { GoogleGenerativeAI } = require('@google/generative-ai');
const { searchPopularGooglePlaces, searchNearbyGooglePlaces } = require('./googleMaps');
const { searchPopularKakaoPlaces, searchNearbyKakaoPlaces } = require('./kakaoMap');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ─────────────────────────────────────────────
// 공통 유틸
// ─────────────────────────────────────────────

function cleanJson(text) {
  return text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();
}

function safeParseJson(text, label) {
  try {
    return JSON.parse(cleanJson(text));
  } catch (e) {
    console.error(`[Gemini] ${label} JSON 파싱 실패:`, e.message);
    console.error(`[Gemini] 원본 응답:`, text?.slice(0, 300));
    throw new Error(`${label} 응답 파싱 실패`);
  }
}

async function ask(prompt, label) {
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text || text.trim().length === 0) {
    throw new Error(`${label} 빈 응답`);
  }
  return text;
}

// ─────────────────────────────────────────────
// 국내 여부 판단
// ─────────────────────────────────────────────

const KOREA_KEYWORDS = [
  '국내', '서울', '부산', '제주', '강릉', '속초', '경주', '여수',
  '전주', '대구', '대전', '광주', '인천', '강원', '수원', '춘천',
  '통영', '거제', '울산', '포항', '안동', '군산', '목포', '순천',
];

function checkIsKorea(destination) {
  return KOREA_KEYWORDS.some(k => destination.includes(k));
}

// ─────────────────────────────────────────────
// 메인 함수 — 인기 장소 기반 추천
// ─────────────────────────────────────────────

async function recommendDestinations(preferences, roomInfo) {
  console.log('[Gemini] 추천 시작');

  const isKorea = checkIsKorea(roomInfo.destination || '');

  // ── Step 1: 인기 장소 15개 검색 ──────────────
  console.log('[Gemini] Step 1 - 인기 장소 검색');
  let popularPlaces = [];

  if (isKorea) {
    popularPlaces = await searchPopularKakaoPlaces(roomInfo.destination);
  } else {
    popularPlaces = await searchPopularGooglePlaces(roomInfo.destination);
  }

  if (popularPlaces.length === 0) {
    throw new Error('인기 장소 검색 결과가 없습니다.');
  }

  console.log(`[Gemini] 인기 장소 ${popularPlaces.length}개 검색 완료`);

  // ── Step 2: Gemini가 3곳 선정 (호출 1번) ──────
  console.log('[Gemini] Step 2 - Gemini 선정');

  const prefText = preferences.length > 0
    ? preferences.map(p => `- ${p.text} (${p.category})`).join('\n')
    : '없음';

  const placeList = popularPlaces
    .map((p, i) => `${i}. ${p.name} | ${p.address || ''} | ${p.category || p.types || ''}`)
    .join('\n');

  const prompt = `
당신은 여행 큐레이터입니다. 아래 인기 장소 목록에서 그룹 조건에 맞는 3곳을 선정하세요.

[여행 정보]
- 목적지: ${roomInfo.destination}
- 여행 기간: ${roomInfo.days}박${Number(roomInfo.days) + 1}일
- 출발일: ${roomInfo.departure_date || '미정'}
- 인원: ${roomInfo.max_people || '미정'}명

[그룹 선호사항]
${prefText}

[인기 장소 목록 (0번부터 시작)]
${placeList}

[선정 기준]
- 반드시 위 목록에 있는 장소만 선정 (목록에 없는 장소 추가 금지)
- 그룹 선호사항에 부합하는 곳 우선
- 3곳은 서로 성격이 다른 곳으로 구성 (자연/문화/체험/쇼핑 등)
- 이동 동선 고려 (지나치게 먼 조합 지양)
- 각 장소마다 짧고 명확한 추천 이유 작성

[응답 형식 - JSON만 출력, 다른 텍스트 절대 금지]
{
  "summary": "전체 추천 한 줄 요약",
  "selected": [
    {
      "rank": 1,
      "listIndex": 0,
      "name": "장소명",
      "reason": "추천 이유 1~2줄",
      "travelTime": "이동 시간 (예: 차로 30분)"
    },
    {
      "rank": 2,
      "listIndex": 3,
      "name": "장소명",
      "reason": "추천 이유 1~2줄",
      "travelTime": "이동 시간"
    },
    {
      "rank": 3,
      "listIndex": 7,
      "name": "장소명",
      "reason": "추천 이유 1~2줄",
      "travelTime": "이동 시간"
    }
  ]
}
`.trim();

  const text = await ask(prompt, 'Gemini 선정');
  const geminiResult = safeParseJson(text, 'Gemini 선정');

  if (!geminiResult.selected || geminiResult.selected.length === 0) {
    throw new Error('Gemini 선정 결과가 없습니다.');
  }

  // ── Step 3: 선정된 3곳 근처 장소 병렬 검색 ──────
  console.log('[Gemini] Step 3 - 근처 장소 검색 (명소 3 + 식당 2)');

  // 선정된 3곳 이름 Set (중복 방지용)
  const selectedNames = new Set(
    geminiResult.selected.map(s => s.name.trim().toLowerCase())
  );

  const destinations = await Promise.all(
    geminiResult.selected.map(async (sel) => {
      const center = popularPlaces[sel.listIndex] ?? popularPlaces.find(p => p.name === sel.name);
      if (!center) {
        console.warn(`[Gemini] listIndex ${sel.listIndex} 장소 없음, 건너뜀`);
        return null;
      }

      let nearbyAttractions = [];
      let nearbyRestaurants = [];

      if (isKorea) {
        [nearbyAttractions, nearbyRestaurants] = await Promise.all([
          searchNearbyKakaoPlaces(center.lat, center.lng, center.name, 'attraction'),
          searchNearbyKakaoPlaces(center.lat, center.lng, center.name, 'restaurant'),
        ]);
      } else {
        [nearbyAttractions, nearbyRestaurants] = await Promise.all([
          searchNearbyGooglePlaces(center.lat, center.lng, 'tourist_attraction'),
          searchNearbyGooglePlaces(center.lat, center.lng, 'restaurant'),
        ]);
      }

      // 선정된 3곳과 이름 겹치는 항목 제거
      const dedupe = (spots) => spots.filter(
        s => !selectedNames.has(s.name.trim().toLowerCase())
      );

      const spots = [
        {
          name: center.name,
          description: sel.reason,
          lat: center.lat,
          lng: center.lng,
          address: center.address || '',
          photoUrl: center.photoUrl || null,
          placeUrl: center.placeUrl || null,
          tag: '🏛 중심',
        },
        ...dedupe(nearbyAttractions).slice(0, 3).map(s => ({
          name: s.name,
          description: s.address || '',
          lat: s.lat,
          lng: s.lng,
          address: s.address || '',
          photoUrl: s.photoUrl || null,
          placeUrl: s.placeUrl || null,
          tag: '📍 명소',
        })),
        ...dedupe(nearbyRestaurants).slice(0, 2).map(s => ({
          name: s.name,
          description: s.address || '',
          lat: s.lat,
          lng: s.lng,
          address: s.address || '',
          photoUrl: s.photoUrl || null,
          placeUrl: s.placeUrl || null,
          tag: '🍽 식당',
        })),
      ];

      return {
        rank: sel.rank,
        name: center.name,
        country: isKorea ? '대한민국' : roomInfo.destination,
        isKorea,
        travelTime: sel.travelTime || '',
        reason: sel.reason,
        spots,
      };
    })
  );

  const finalResult = {
    summary: geminiResult.summary,
    destinations: destinations.filter(Boolean),
  };

  console.log('[Gemini] 완료:', JSON.stringify(finalResult).slice(0, 200));
  return finalResult;
}

// ─────────────────────────────────────────────
// 수동 메모 분류
// ─────────────────────────────────────────────

async function processPreference(newText, existingPreferences) {
  const existingText = existingPreferences.length > 0
    ? existingPreferences.map(p => `- ${p.text} (${p.category})`).join('\n')
    : '없음';

  const prompt = `
당신은 여행 선호사항 분류 전문가입니다.

[새로 추가할 항목]
"${newText}"

[기존 선호사항]
${existingText}

[카테고리 목록]
예산, 식사, 활동, 교통, 숙소, 일정, 인원, 기타

[규칙]
- 새 항목의 카테고리를 판단하세요
- 기존 항목 중 같은 카테고리나 내용이 겹치는 항목이 있으면 replaced: true로 표시
- 중복/업데이트 시 어떤 항목을 교체하는지 replacedText에 명시
- message는 사용자에게 보여줄 짧은 안내 문구

[응답 형식 - JSON만 출력]
{
  "category": "카테고리명",
  "replaced": false,
  "replacedText": null,
  "message": "안내 문구"
}
`.trim();

  const text = await ask(prompt, '선호사항 분류');
  return safeParseJson(text, '선호사항 분류');
}

// ─────────────────────────────────────────────
// 대화 정리
// ─────────────────────────────────────────────

async function summarizeConversation(messages, roomInfo = {}, memberProfiles = []) {
  const conversation = messages
    .filter(m => m.type === 'text' || !m.type)
    .map(m => {
      const name = m.senderName || '참여자';
      const text = m.text || m.content || '';
      return `${name}: ${text}`;
    })
    .filter(line => line.trim().length > 5)
    .join('\n');

  if (!conversation.trim()) {
    return { who: [], when: [], where: [], how: [], what: [] };
  }

  const knownInfo = [
    roomInfo.days ? `- 여행 기간: ${roomInfo.days}박${Number(roomInfo.days) + 1}일 (확정)` : '',
    roomInfo.departure_date ? `- 출발일: ${roomInfo.departure_date} (확정)` : '',
    roomInfo.destination ? `- 목적지: ${roomInfo.destination} (확정)` : '',
  ].filter(Boolean).join('\n');

  const memberInfo = memberProfiles.length > 0
    ? memberProfiles.map(m => `- ${m.name}: ${m.travelType}`).join('\n')
    : '정보 없음';

  const prompt = `
아래 여행 채팅 대화를 분석해서 5W 항목을 추출하세요.

${knownInfo ? `[방 정보 - 이미 확정된 사항]\n${knownInfo}\n` : ''}

[멤버 여행 성향]
${memberInfo}
(T=대중교통/C=자동차, U=도심/N=자연, A=활동/R=휴양, J=계획/P=즉흥)
- 성향 정보를 what/how 항목 추천 시 참고하세요

[대화]
${conversation}

[규칙]
- 확정된 방 정보는 반드시 when/where 항목에 포함
- 멤버 성향을 고려해 활동/이동수단 제안에 반영
- 불분명한 항목은 빈 배열
- 항목당 짧고 명확하게 (1~3단어)
- who: 인원 수, 구성
- when: 날짜, 기간
- where: 목적지, 장소
- how: 이동수단만 — 예산 절대 포함 금지
- what: 활동, 식사, 예산 등
- JSON만 출력, 다른 텍스트 절대 금지

{"who":[],"when":[],"where":[],"how":[],"what":[]}
`.trim();

  const text = await ask(prompt, '대화 요약');
  return safeParseJson(text, '대화 요약');
}

// ─────────────────────────────────────────────
// 일정 최적화
// ─────────────────────────────────────────────

async function optimizeItinerary(spots, roomInfo) {
  const days = Number(roomInfo.days) || 1;
  const destination = roomInfo.destination || '여행지';

  const spotList = spots
    .map((s, i) => `${i + 1}. ${s.place}${s.detail ? ` (${s.detail})` : ''}`)
    .join('\n');

  const prompt = `
당신은 여행 일정 플래너입니다. 아래 장소들을 바탕으로 ${days}박${days + 1}일 여행 일정을 최적화하세요.

[여행 정보]
- 목적지: ${destination}
- 여행 기간: ${days}박${days + 1}일

[추가할 장소 목록]
${spotList}

[최적화 규칙]
- 위치가 가까운 장소끼리 같은 날로 묶기
- 여행 기간에 부합하게 배치
- 하루에 최대 3곳 배치 (무리하지 않게)
- 오전/오후/저녁 시간대 자연스럽게 배분
- 이동 동선이 최소화되도록 순서 배치
- 마지막 날은 공항/이동 고려해 가벼운 일정
- 각 장소마다 실용적인 팁 한 줄 포함

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "title": "여행 제목 (예: 제주도 3박4일)",
  "days": [
    {
      "day": 1,
      "label": "1일차 - 테마 한 줄",
      "spots": [
        {
          "time": "10:00",
          "name": "장소명",
          "detail": "간단한 설명",
          "tip": "실용 팁 한 줄"
        }
      ]
    }
  ]
}
`.trim();

  const text = await ask(prompt, '일정 최적화');
  return safeParseJson(text, '일정 최적화');
}

module.exports = {
  processPreference,
  recommendDestinations,
  summarizeConversation,
  optimizeItinerary,
};