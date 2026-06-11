// ─────────────────────────────────────────────
// 공용 유틸 함수 모음
// ─────────────────────────────────────────────

export const BASE_URL = 'https://triplan-backend-qwrs.onrender.com';

/**
 * ISO 문자열 → 한국 시간 오전/오후 HH:MM 포맷
 * 에뮬레이터 UTC 오프셋 차이 수동 보정
 */
export const formatTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const koreaOffset = 9 * 60;
  const localOffset = date.getTimezoneOffset();
  const koreaTime = new Date(date.getTime() + (koreaOffset + localOffset) * 60 * 1000);
  const h = koreaTime.getHours();
  const m = String(koreaTime.getMinutes()).padStart(2, '0');
  const ampm = h < 12 ? '오전' : '오후';
  const hour = h % 12 || 12;
  return `${ampm} ${hour}:${m}`;
};

/**
 * 날짜 Date 객체 → YYYY-MM-DD 문자열
 */
export const formatDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * days 값 정규화 → "3박4일" 형태
 * DB에는 숫자로 저장되어 있을 수 있음
 */
export const formatDays = (days) => {
  if (!days) return '';
  return String(days).includes('박')
    ? days
    : `${days}박${Number(days) + 1}일`;
};

/**
 * D-Day 계산
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {string} 'D-Day' | 'D-N' | 'D+N'
 */
export const calcDDay = (dateStr) => {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target - today) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'D-Day';
  if (diff > 0) return `D-${diff}`;
  return `D+${Math.abs(diff)}`;
};

/**
 * 시간대별 인사말
 */
export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6)  return '좋은 새벽이에요 🌙';
  if (hour < 12) return '좋은 아침이에요 ☀️';
  if (hour < 18) return '좋은 오후예요 🌤';
  return '좋은 저녁이에요 🌆';
};