const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

/**
 * 여행지 추천 — JSON 구조로 반환 (지도 핀용)
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

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "summary": "전체 추천 한 줄 요약",
  "destinations": [
    {
      "rank": 1,
      "name": "여행지명 (도시명)",
      "country": "국가명",
      "isKorea": true,
      "reason": "선호사항과 연결한 추천 이유 2~3문장",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    },
    {
      "rank": 2,
      "name": "여행지명",
      "country": "국가명",
      "isKorea": false,
      "reason": "추천 이유",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    },
    {
      "rank": 3,
      "name": "여행지명",
      "country": "국가명",
      "isKorea": false,
      "reason": "추천 이유",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    }
  ]
}

주의:
- spots의 장소명은 실제 존재하는 유명 장소로 구체적으로 작성 (예: "경복궁", "도쿄 스카이트리")
- isKorea는 한국 여행지면 true, 해외면 false
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { processPreference, recommendDestinations };
