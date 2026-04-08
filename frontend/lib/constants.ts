export const PARTY_COLORS: Record<string, string> = {
  '더불어민주당': '#004EA2',
  '조국혁신당':   '#004098',
  '개혁신당':     '#FF7210',
  '진보당':       '#D6001C',
  '국민의힘':     '#E61E2B',
  '새누리당':     '#E61E2B',
  '한나라당':     '#E61E2B',
};

export const PARTY_COLOR_FALLBACK = '#4a5568';

export function getPartyColor(party?: string): string {
  if (!party) return PARTY_COLOR_FALLBACK;
  for (const [key, color] of Object.entries(PARTY_COLORS)) {
    if (party.includes(key)) return color;
  }
  return PARTY_COLOR_FALLBACK;
}
