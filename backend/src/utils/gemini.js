// backend/src/utils/gemini.js 전체 교체

const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ── 1. 수동 @ 선호사항 처리 ───────────────────────────────────
async function processPreference(newText, existingPreferences) {
  const existingList = existingPreferences.map(p => p.text).join(', ') || '없음';
  const prompt = `
너는 여행 선호사항을 분류하는 도우미야.
기존 저장된 선호사항: [${existingList}]
새로 입력된 선호사항: "${newText}"

규칙:
1. 같은 카테고리(예산, 식사, 숙소, 교통, 테마 등)와 겹치면 replaced: true
2. 겹치지 않으면 replaced: false
3. message는 20자 이내, 친근하고 짧게

반드시 아래 JSON만:
{
  "category": "카테고리명",
  "replaced": true or false,
  "replacedText": "교체된 항목 (없으면 null)",
  "message": "확인 메시지"
}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('파싱 실패');
  return JSON.parse(match[0]);
}

// ── 2. 여행지 추천 ────────────────────────────────────────────
async function recommendDestinations(preferences, roomInfo) {
  const prefList = preferences.map(p => p.text).join(', ') || '없음';
  const { destination, days, departure_date, max_people } = roomInfo;
  const nights = days ? Number(days) : 0;
  const prompt = `
너는 여행 플래너야. 아래 조건에 맞는 여행지 3곳을 추천해줘.

여행 정보:
- 출발지/희망 지역: ${destination}
- 여행 기간: ${nights}박 ${nights + 1}일
- 출발 예정일: ${departure_date || '미정'}
- 인원: ${max_people || '미정'}명
- 선호사항: ${prefList}

[중요 규칙]
1. 출발지(${destination})에서 ${nights}박 일정에 현실적인 거리만 추천
2. 드라이브/당일치기 키워드 있으면 1~2시간 이내 근거리만
3. 수도권 출발이면 수도권 근교 우선
4. 선호사항은 참고 조건, 거리 제약보다 우선 안 됨

반드시 아래 JSON만:
{
  "summary": "한 줄 요약",
  "destinations": [
    {
      "rank": 1,
      "name": "도시명",
      "country": "국가명",
      "isKorea": true,
      "travelTime": "이동 시간",
      "reason": "추천 이유 2~3문장",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    }
  ]
}`;
  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('파싱 실패');
  return JSON.parse(match[0]);
}

// ── 3. 대화 맥락에서 메모 자동 추출 (신규) ────────────────────
async function extractMemoFromConversation(messages, existingPreferences) {
  const existingList = existingPreferences.map(p => p.text).join(', ') || '없음';
  const conversation = messages.map(m => `${m.senderName}: ${m.text}`).join('\n');

  const prompt = `
너는 여행 채팅방을 분석하는 AI야.
아래 대화에서 여행 계획에 관련된 핵심 정보를 추출해.

대화:
${conversation}

기존 저장된 메모: [${existingList}]

추출 대상 카테고리: 여행지, 기간(박/일), 날짜, 예산, 인원, 교통수단, 숙소, 식사/맛집, 테마/활동

[규칙]
- 대화에서 명확하게 언급된 것만 추출 (추측 금지)
- 이미 메모에 있는 것과 같은 카테고리면 교체
- 새로 추출할 내용이 없으면 extracted를 빈 배열로
- text는 짧고 명확하게 (예: "2박3일", "예산 30만원", "가평")

반드시 아래 JSON만:
{
  "hasNew": true or false,
  "extracted": [
    { "text": "메모 내용", "category": "카테고리명", "replaces": "교체할 기존 메모 (없으면 null)" }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('파싱 실패');
  return JSON.parse(match[0]);
}

module.exports = { processPreference, recommendDestinations, extractMemoFromConversation };

// ── 4. 전체 대화 5W 정리 (신규) ──────────────────────────────
async function summarizeConversation(messages) {
  const conversation = messages
    .filter(m => m.type === 'text')
    .map(m => `${m.senderName}: ${m.text}`)
    .join('\n');

  const prompt = `
너는 여행 채팅방 대화를 분석하는 AI야.
아래 대화에서 여행 계획 정보를 5W 형태로 정리해줘.

대화:
${conversation}

각 항목은 여러 개일 수 있어. 확실하지 않은 건 빈 배열로 남겨.

반드시 아래 JSON 형식으로만 응답해. 다른 텍스트 없이:
{
  "who":  ["예) 3명", "성인만"],
  "when": ["예) 5월 29일 출발", "3박4일"],
  "where": ["예) 제주도", "성산일출봉"],
  "how":  ["예) 렌트카", "도보"],
  "what": ["예) 맛집탐방", "카페투어", "드라이브"]
}

주의: 대화에서 명확하게 언급된 것만 추출. 추측 금지.
`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('파싱 실패');
  return JSON.parse(match[0]);
}

module.exports = { processPreference, recommendDestinations, extractMemoFromConversation, summarizeConversation };
