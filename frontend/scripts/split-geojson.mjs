/**
 * districts.geojson → 시/도별 분리 파일 생성
 *
 * 출력:
 *   public/data/sido.geojson          — 17개 시/도 dissolved 경계 (내부 선 없음)
 *   public/data/districts/{code}.geojson — 시/도별 원본 품질 지역구 파일
 *
 * 실행: node scripts/split-geojson.mjs
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { union } from '@turf/union';
import { flatten } from '@turf/flatten';
import { simplify } from '@turf/simplify';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.join(__dirname, '..');

/* ── SIDO 한글명 → 파일 코드 매핑 (단축명 + 정식명 모두 지원) ── */
const SIDO_CODE_MAP = {
  '서울':          'seoul',
  '서울특별시':    'seoul',
  '부산':          'busan',
  '부산광역시':    'busan',
  '대구':          'daegu',
  '대구광역시':    'daegu',
  '인천':          'incheon',
  '인천광역시':    'incheon',
  '광주':          'gwangju',
  '광주광역시':    'gwangju',
  '대전':          'daejeon',
  '대전광역시':    'daejeon',
  '울산':          'ulsan',
  '울산광역시':    'ulsan',
  '세종':          'sejong',
  '세종특별자치시': 'sejong',
  '세종시':        'sejong',
  '경기':          'gyeonggi',
  '경기도':        'gyeonggi',
  '강원':          'gangwon',
  '강원도':        'gangwon',
  '강원특별자치도': 'gangwon',
  '충북':          'chungbuk',
  '충청북도':      'chungbuk',
  '충남':          'chungnam',
  '충청남도':      'chungnam',
  '전북':          'jeonbuk',
  '전라북도':      'jeonbuk',
  '전북특별자치도': 'jeonbuk',
  '전남':          'jeonnam',
  '전라남도':      'jeonnam',
  '경북':          'gyeongbuk',
  '경상북도':      'gyeongbuk',
  '경남':          'gyeongnam',
  '경상남도':      'gyeongnam',
  '제주':          'jeju',
  '제주특별자치도': 'jeju',
  '제주도':        'jeju',
};

function getSidoCode(sido) {
  const code = SIDO_CODE_MAP[sido];
  if (!code) {
    console.warn(`  ⚠ 알 수 없는 SIDO: "${sido}" — fallback 코드 사용`);
    return sido.replace(/[가-힣]/g, '').replace(/\s+/g, '') || 'unknown';
  }
  return code;
}


/* ── 메인 ── */
console.log('📂 districts.geojson 읽는 중...');
const raw     = fs.readFileSync(path.join(ROOT, 'public/data/districts.geojson'), 'utf8');
const geojson = JSON.parse(raw);
console.log(`✅ 총 피처 수: ${geojson.features.length}`);

/* SIDO 기준 그룹핑 */
const groups = new Map();
for (const feature of geojson.features) {
  const sido = feature.properties?.SIDO;
  if (!sido) { console.warn('SIDO 필드 없음:', feature.properties); continue; }
  if (!groups.has(sido)) groups.set(sido, []);
  groups.get(sido).push(feature);
}
console.log(`\n🗺  발견된 시/도 (${groups.size}개):`, [...groups.keys()].join(', '));

/* 출력 디렉터리 생성 */
const distDir = path.join(ROOT, 'public/data/districts');
fs.mkdirSync(distDir, { recursive: true });

/* ── @turf/union으로 시/도별 폴리곤 병합 ── */
console.log('\n⏳ 시/도 경계 union 중...');
const sidoFeatures = [];

for (const [sido, features] of groups) {
  const code = getSidoCode(sido);

  // MultiPolygon → Polygon으로 펼침
  const flat = flatten({ type: 'FeatureCollection', features }).features;

  // FeatureCollection 전체를 한 번에 union
  let merged;
  try {
    merged = union({ type: 'FeatureCollection', features: flat });
  } catch (e) {
    console.warn(`  ⚠ ${sido} union 실패: ${e.message} → 첫 피처 사용`);
    merged = flat[0];
  }

  // 시/도 뷰용 간소화 (tolerance=0.005°, ~500m → 도 단위에서 충분한 정밀도)
  try { merged = simplify(merged, { tolerance: 0.005, highQuality: false, mutate: true }); }
  catch { /* 일부 복잡한 멀티폴리곤 실패 무시 */ }

  merged.properties = { sido, sidoCode: code, count: features.length };

  sidoFeatures.push(merged);
  process.stdout.write(`  ${sido} ✓\n`);
}
console.log(`✅ union 완료: ${sidoFeatures.length}개 시/도`);

for (const [sido, features] of groups) {
  const code = getSidoCode(sido);

  /* 원본 품질 시/도별 파일 */
  fs.writeFileSync(
    path.join(distDir, `${code}.geojson`),
    JSON.stringify({ type: 'FeatureCollection', features })
  );

  const sizeMB = (JSON.stringify({ type: 'FeatureCollection', features }).length / 1024 / 1024).toFixed(1);
  console.log(`  ${sido.padEnd(12)} → districts/${code}.geojson  (지역구 ${String(features.length).padStart(3)}개, ${sizeMB}MB)`);
}

/* sido.geojson 출력 */
const sidoPath = path.join(ROOT, 'public/data/sido.geojson');
fs.writeFileSync(sidoPath, JSON.stringify({ type: 'FeatureCollection', features: sidoFeatures }));
const sidoSizeKB = Math.round(fs.statSync(sidoPath).size / 1024);

console.log(`\n✅ 완료!`);
console.log(`   sido.geojson       : ${sidoFeatures.length}개 시/도, ${sidoSizeKB}KB`);
console.log(`   districts/*.geojson: ${groups.size}개 파일`);
