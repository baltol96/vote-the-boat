# CLAUDE.md

## 프로젝트
국회의원·지방자치단체장 의정활동 투명성 플랫폼.
지도 기반으로 내 지역구 의원 정보를 제공하는 웹 서비스.

## 기술 스택
- **백엔드**: Java 17, Spring Boot 3.x, Spring Batch, Spring Data JPA, QueryDSL, PostgreSQL, Redis
- **프론트엔드**: Next.js 14, Tailwind CSS, React-Leaflet, Recharts
- **배포**: Vercel (FE), Railway (BE + DB)

## 핵심 설계 원칙
- 의원 고유 ID는 열린국회정보의 `MONA_CD` 기준으로 통일
- 출석률은 API 미제공 → 본회의 **표결 참여율**로 대체 표기
- 전과·재산은 선거 기간에만 공개 → 선거 직후 배치 Job으로 수집하여 DB 영구 저장
- 선거구 GeoJSON: `github.com/OhmyNews/2024_22_elec_map` (SGG_Code로 의원 매핑)

## 디렉토리 구조
```
backend/src/main/java/com/assembly/
├── collector/   # Spring Batch 수집 Job (API → DB)
├── domain/      # 엔티티별 패키지 (member, bill, vote, asset, criminal)
├── api/         # REST Controller + DTO
└── common/      # Config, Exception

frontend/
├── components/DistrictMap.tsx   # Leaflet 지도 + 선거구 클릭
├── components/MemberPanel.tsx   # 의원 상세 패널
└── pages/                       # Next.js 라우팅
```

## 주요 API
```
GET /api/v1/districts/{sggCode}/member   # 지도 클릭 → 의원 조회
GET /api/v1/members/{monaCode}           # 의원 상세
GET /api/v1/members/{monaCode}/bills     # 법안 발의 내역
GET /api/v1/members/{monaCode}/votes     # 표결 내역
GET /api/v1/members/{monaCode}/attendance # 표결 참여율
GET /api/v1/members/search               # 이름·정당·지역 검색
```

## 데이터 수집 배치 (Spring Batch)
- 매일 새벽 3시 cron 실행: 의원정보 → 법안 → 표결 순서로 Job 실행
- 재시도 3회 설정 (`faultTolerant().retry(Exception.class).retryLimit(3)`)
- 전과·재산은 수동 트리거 (선거 직후 1회성 실행)

## 공공 API 키
- `ASSEMBLY_API_KEY`: data.go.kr 서비스 키 (국회사무처·선관위·행안부 공통)
- `KAKAO_API_KEY`: 주소 검색 + 지도 타일

## 코드 작성 규칙
- 엔티티는 `@Builder` + `@NoArgsConstructor(access = PROTECTED)` 패턴 준수
- Repository는 기본 JPA + 복잡한 통계 쿼리는 QueryDSL 사용
- API 응답은 항상 DTO로 분리 (엔티티 직접 반환 금지)
- RestClient 사용 (WebClient/RestTemplate 사용 금지)
- 캐시 대상: 의원 프로필 (`@Cacheable`), 선거구-의원 매핑 테이블
