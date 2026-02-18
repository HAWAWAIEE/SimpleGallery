export const TRANSITIONS = [
  { id: 'fade', name: '페이드' },
  { id: 'slide-left', name: '슬라이드 (왼쪽)' },
  { id: 'slide-right', name: '슬라이드 (오른쪽)' },
  { id: 'zoom-in', name: '줌 인' },
  { id: 'zoom-out', name: '줌 아웃' },
  { id: 'flip', name: '플립' },
  { id: 'dissolve', name: '디졸브' },
  { id: 'kenburns', name: '켄 번즈' },
  { id: 'blur', name: '블러 페이드' },
  { id: 'rotate', name: '회전' },
];

export const SPEED_OPTIONS = [
  { value: 2000, label: '빠름 (2초)' },
  { value: 4000, label: '보통 (4초)' },
  { value: 6000, label: '느림 (6초)' },
  { value: 10000, label: '아주 느림 (10초)' },
];

export function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
