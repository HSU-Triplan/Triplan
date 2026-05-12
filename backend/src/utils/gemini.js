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

async function recommendDestinations(preferences, roomInfo) {
  const prefList = preferences.map(p => p.text).join(', ') || '특별한 선호사항 없음';
  const { destination, days, departure_date, max_people } = roomInfo;
  const nights = days ? Number(days) : 0;
  const totalDays = nights + 1;

  const prompt = `
너는 여행 플래너야. 아래 조건에 맞는 여행지 3곳을 추천해줘.

여행 정보:
- 출발지/희망 지역: ${destination}
- 여행 기간: ${nights}박 ${totalDays}일
- 출발 예정일: ${departure_date || '미정'}
- 인원: ${max_people || '미정'}명
- 선호사항: ${prefList}

[중요 규칙 - 반드시 지켜야 함]
1. 출발지(${destination})에서 ${nights}박 ${totalDays}일 일정에 현실적으로 이동 가능한 거리의 여행지만 추천해.
2. 1박2일이면 출발지 기준 2~3시간 이내, 2박3일이면 4시간 이내, 3박4일이면 국내 전체 가능.
3. 드라이브, 당일치기 키워드가 있으면 출발지에서 1~2시간 이내 근거리만 추천.
4. 선호사항은 여행지 선택의 참고 조건이지, 거리 제약보다 우선하지 않아.
5. 출발지가 수도권(서울/경기/인천)이면 수도권 근교 우선 추천.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "summary": "전체 추천 한 줄 요약",
  "destinations": [
    {
      "rank": 1,
      "name": "여행지명 (도시명)",
      "country": "국가명",
      "isKorea": true,
      "travelTime": "출발지에서 이동 시간 (예: 차로 1시간)",
      "reason": "출발지와 거리, 선호사항을 연결한 추천 이유 2~3문장",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    },
    { "rank": 2, "name": "...", "country": "...", "isKorea": true, "travelTime": "...", "reason": "...", "spots": [{},{}] },
    { "rank": 3, "name": "...", "country": "...", "isKorea": true, "travelTime": "...", "reason": "...", "spots": [{},{}] }
  ]
}

주의: spots의 장소명은 실제 존재하는 유명 장소로 구체적으로 작성.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini 응답 파싱 실패');
  return JSON.parse(jsonMatch[0]);
}

module.exports = { processPreference, recommendDestinations };