const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

/**
 * @요소 입력 처리: 카테고리 분류 + 중복 체크 + 확인 메시지 생성
 */
async function processPreference(newText, existingPreferences) {
  const existingList = existingPreferences.map(p => p.text).join(', ') || '없음';

  const prompt = `
너는 여행 선호사항을 분류하는 도우미야.
기존 저장된 선호사항: [${existingList}]
새로 입력된 선호사항: "${newText}"

아래 규칙을 따라:
1. 새 입력이 기존 항목 중 같은 카테고리(예산, 식사, 숙소, 교통, 테마 등)와 겹치면 replaced: true
2. 겹치지 않으면 replaced: false
3. message는 20자 이내, 친근하고 짧게

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "category": "카테고리명",
  "replaced": true or false,
  "replacedText": "교체된 기존 항목 (replaced: false면 null)",
  "message": "확인 메시지"
}

예시:
입력: "예산30만원", 기존: ["예산10만원"] → {"category":"예산","replaced":true,"replacedText":"예산10만원","message":"💰 예산을 30만원으로 업데이트했어요!"}
입력: "맛집위주", 기존: [] → {"category":"식사","replaced":false,"replacedText":null,"message":"🍽 맛집 위주로 기억할게요!"}
입력: "온천", 기존: ["맛집위주"] → {"category":"테마","replaced":false,"replacedText":null,"message":"♨️ 온천 코스로 저장했어요!"}
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  // JSON만 추출
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답 파싱 실패');

  return JSON.parse(jsonMatch[0]);
}

/**
 * 여행지 3곳 추천
 */
async function recommendDestinations(preferences, roomInfo) {
  const prefList = preferences.map(p => p.text).join(', ') || '특별한 선호사항 없음';
  const { destination, days, departure_date, max_people } = roomInfo;

  const prompt = `
너는 친근한 여행 플래너야. 아래 조건에 맞는 여행지 3곳을 추천해줘.

여행 정보:
- 출발 희망 지역/키워드: ${destination || '미정'}
- 여행 일수: ${days || '미정'}박 ${days ? Number(days) + 1 : ''}일
- 출발 예정일: ${departure_date || '미정'}
- 인원: ${max_people || '미정'}명
- 선호사항: ${prefList}

형식을 정확히 지켜서 응답해:

✈️ **여행지 추천 결과**

1️⃣ **[여행지명]**
[선호사항과 연결해서 추천 이유 2~3문장]

2️⃣ **[여행지명]**
[선호사항과 연결해서 추천 이유 2~3문장]

3️⃣ **[여행지명]**
[선호사항과 연결해서 추천 이유 2~3문장]

💡 선호사항을 더 추가하면 더 정확하게 추천해드릴 수 있어요!
`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

module.exports = { processPreference, recommendDestinations };
