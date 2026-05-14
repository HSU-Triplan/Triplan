const { GoogleGenerativeAI } = require('@google/generative-ai');

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
// 공통 컨텍스트 빌더
// ─────────────────────────────────────────────

function buildContext(preferences, roomInfo) {
  const prefText = preferences.map(p => `- ${p.text} (${p.category})`).join('\n');
  return `
[여행 정보]
- 목적지: ${roomInfo.destination}
- 여행 기간: ${roomInfo.days}박${Number(roomInfo.days) + 1}일
- 출발일: ${roomInfo.departure_date || '미정'}
- 인원: ${roomInfo.max_people || '미정'}명

[그룹 선호사항]
${prefText || '없음'}
`.trim();
}

// ─────────────────────────────────────────────
// 전문가 AI 1 — 예산 전문가
// ─────────────────────────────────────────────

async function runBudgetExpert(preferences, roomInfo) {
  const context = buildContext(preferences, roomInfo);

  const prompt = `
당신은 여행 예산 전문가입니다. 아래 정보를 바탕으로 가성비 좋은 여행지 3곳을 추천하세요.

${context}

[판단 기준]
- 예산 대비 만족도가 높은 여행지 우선
- 이동 비용(교통비)까지 고려
- 숙박/식비/입장료가 저렴하거나 무료 명소가 많은 곳
- 출발지 기준 현실적인 거리만 추천 (과도하게 먼 해외 금지)
- 실제 존재하는 여행지만 추천

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "candidates": [
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "예산 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "예산 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "예산 관점 추천 이유 1~2줄" }
  ]
}
`.trim();

  const text = await ask(prompt, '예산 전문가');
  return safeParseJson(text, '예산 전문가');
}

// ─────────────────────────────────────────────
// 전문가 AI 2 — 활동 전문가
// ─────────────────────────────────────────────

async function runActivityExpert(preferences, roomInfo) {
  const context = buildContext(preferences, roomInfo);

  const prompt = `
당신은 여행 액티비티 전문가입니다. 아래 정보를 바탕으로 그룹 성향에 맞는 여행지 3곳을 추천하세요.

${context}

[판단 기준]
- 그룹 선호사항과 여행 스타일에 맞는 활동/체험이 풍부한 곳
- 관광지, 액티비티, 문화 체험 중심
- 여행 기간에 맞게 즐길 수 있는 콘텐츠가 충분한 곳
- 출발지 기준 현실적인 거리만 추천 (과도하게 먼 해외 금지)
- 실제 존재하는 여행지만 추천
- 예산 전문가와는 다른 관점으로 추천

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "candidates": [
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "활동 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "활동 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "활동 관점 추천 이유 1~2줄" }
  ]
}
`.trim();

  const text = await ask(prompt, '활동 전문가');
  return safeParseJson(text, '활동 전문가');
}

// ─────────────────────────────────────────────
// 전문가 AI 3 — 교통 전문가
// ─────────────────────────────────────────────

async function runTransportExpert(preferences, roomInfo) {
  const context = buildContext(preferences, roomInfo);

  const prefTexts = preferences.map(p => p.text).join(' ');
  const isShortTrip = prefTexts.includes('당일') || prefTexts.includes('드라이브') || Number(roomInfo.days) <= 1;

  const prompt = `
당신은 여행 교통/이동 전문가입니다. 아래 정보를 바탕으로 이동 편의성이 좋은 여행지 3곳을 추천하세요.

${context}
${isShortTrip ? '⚠️ 당일치기 또는 드라이브 여행 키워드 감지됨 → 출발지에서 1~2시간 이내 근거리 우선 추천' : ''}

[판단 기준]
- 출발지에서 접근성이 좋은 곳 (대중교통 또는 자가용)
- 이동 시간이 여행 일수 대비 합리적인 곳
- 교통 인프라가 잘 갖춰진 곳
- 이동 경로가 단순하고 편한 곳
- 실제 존재하는 여행지만 추천

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "candidates": [
    { "name": "여행지명", "country": "국가명", "isKorea": true, "travelTime": "예) 차로 1시간 30분", "reason": "교통 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "travelTime": "예) KTX 2시간", "reason": "교통 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "travelTime": "예) 비행기 1시간", "reason": "교통 관점 추천 이유 1~2줄" }
  ]
}
`.trim();

  const text = await ask(prompt, '교통 전문가');
  return safeParseJson(text, '교통 전문가');
}

// ─────────────────────────────────────────────
// 전문가 AI 4 — 숙소 전문가 (예산+활동 결과 참고)
// ─────────────────────────────────────────────

async function runAccommodationExpert(preferences, roomInfo, budgetResult, activityResult) {
  const context = buildContext(preferences, roomInfo);

  const budgetCandidates = budgetResult.candidates.map(c => c.name).join(', ');
  const activityCandidates = activityResult.candidates.map(c => c.name).join(', ');

  const prompt = `
당신은 여행 숙소 전문가입니다. 아래 정보를 바탕으로 숙소 잡기 좋은 여행지 3곳을 추천하세요.

${context}

[예산 전문가 추천 지역]: ${budgetCandidates}
[활동 전문가 추천 지역]: ${activityCandidates}

[판단 기준]
- 반드시 위 두 전문가가 추천한 지역 주변을 중심으로 판단 (완전히 다른 지역 금지)
- 숙소 밀집도가 높아 선택지가 많은 곳
- 숙소에서 주요 관광지까지 접근성이 좋은 곳
- 다양한 가격대 숙소가 존재하는 곳 (호텔/게스트하우스/펜션 등)
- "숙소 잡기 좋은 지역" 관점으로 평가
- 실제 존재하는 여행지만 추천

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "candidates": [
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "숙소 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "숙소 관점 추천 이유 1~2줄" },
    { "name": "여행지명", "country": "국가명", "isKorea": true, "reason": "숙소 관점 추천 이유 1~2줄" }
  ]
}
`.trim();

  const text = await ask(prompt, '숙소 전문가');
  return safeParseJson(text, '숙소 전문가');
}

// ─────────────────────────────────────────────
// 전문가 AI 5 — 중재자 (최종 3곳 선정)
// ─────────────────────────────────────────────

async function runMediator(preferences, roomInfo, allResults) {
  const context = buildContext(preferences, roomInfo);

  const formatCandidates = (label, result) =>
    result.candidates.map(c => `  - ${c.name} (${c.country}): ${c.reason}`).join('\n');

  const prompt = `
당신은 여행 추천 중재자입니다. 4명의 전문가 의견을 종합해 최종 여행지 3곳을 선정하세요.

${context}

[전문가 의견]
▶ 예산 전문가:
${formatCandidates('예산', allResults.budget)}

▶ 활동 전문가:
${formatCandidates('활동', allResults.activity)}

▶ 교통 전문가:
${formatCandidates('교통', allResults.transport)}

▶ 숙소 전문가:
${formatCandidates('숙소', allResults.accommodation)}

[선정 기준]
- 여러 전문가가 동시에 추천한 지역은 우선순위 상승
- 현실성 없거나 너무 먼 여행지 제거
- 최종 3곳은 서로 다른 성격의 여행지로 구성 (다양성 확보)
- 각 여행지마다 대표 장소 3곳 포함 (실제 존재하는 곳만)
- 전문가 의견을 종합한 추천 이유 작성

[응답 형식 - JSON만 출력, 다른 텍스트 금지]
{
  "summary": "전체 추천 한 줄 요약",
  "destinations": [
    {
      "rank": 1,
      "name": "여행지명",
      "country": "국가명",
      "isKorea": true,
      "travelTime": "이동 시간 (예: 차로 1시간 30분)",
      "reason": "종합 추천 이유 2~3줄",
      "spots": [
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" },
        { "name": "장소명", "description": "한 줄 설명" }
      ]
    }
  ]
}
`.trim();

  const text = await ask(prompt, '중재자');
  return safeParseJson(text, '중재자');
}

// ─────────────────────────────────────────────
// 메인 함수 — 멀티 에이전트 파이프라인
// ─────────────────────────────────────────────

async function recommendDestinations(preferences, roomInfo) {
  console.log('[Gemini] 멀티 에이전트 추천 시작');

  // Step 1: 예산 / 활동 / 교통 병렬 실행
  console.log('[Gemini] Step 1 - 예산/활동/교통 전문가 병렬 실행');
  const [budgetResult, activityResult, transportResult] = await Promise.all([
    runBudgetExpert(preferences, roomInfo),
    runActivityExpert(preferences, roomInfo),
    runTransportExpert(preferences, roomInfo),
  ]);
  console.log('[Gemini] Step 1 완료');

  // Step 2: 숙소 전문가 (예산 + 활동 결과 참고)
  console.log('[Gemini] Step 2 - 숙소 전문가 실행');
  const accommodationResult = await runAccommodationExpert(
    preferences, roomInfo, budgetResult, activityResult
  );
  console.log('[Gemini] Step 2 완료');

  // Step 3: 중재자 최종 선정
  console.log('[Gemini] Step 3 - 중재자 실행');
  const finalResult = await runMediator(preferences, roomInfo, {
    budget: budgetResult,
    activity: activityResult,
    transport: transportResult,
    accommodation: accommodationResult,
  });
  console.log('[Gemini] 최종 결과:', JSON.stringify(finalResult).slice(0, 200));

  return finalResult;
}

// ─────────────────────────────────────────────
// 기존 함수들 (변경 없음)
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

async function summarizeConversation(messages, roomInfo = {}) {
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

  // roomInfo에서 확정 정보 주입
  const knownInfo = [
    roomInfo.days ? `- 여행 기간: ${roomInfo.days}박${Number(roomInfo.days) + 1}일 (확정)` : '',
    roomInfo.departure_date ? `- 출발일: ${roomInfo.departure_date} (확정)` : '',
    roomInfo.destination ? `- 목적지: ${roomInfo.destination} (확정)` : '',
  ].filter(Boolean).join('\n');

  const prompt = `
아래 여행 채팅 대화를 분석해서 5W 항목을 추출하세요.

${knownInfo ? `[방 정보 - 이미 확정된 사항]\n${knownInfo}\n` : ''}
[대화]
${conversation}

[규칙]
- 확정된 방 정보는 반드시 when/where 항목에 포함
- 대화에서 추가로 언급된 내용도 포함
- 불분명한 항목은 빈 배열
- 항목당 짧고 명확하게 (1~3단어)
- JSON만 출력, 다른 텍스트 절대 금지

{"who":[],"when":[],"where":[],"how":[],"what":[]}
`.trim();

  const text = await ask(prompt, '대화 요약');
  return safeParseJson(text, '대화 요약');
}

module.exports = {
  processPreference,
  recommendDestinations,
  summarizeConversation,
};
