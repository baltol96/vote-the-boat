# CLAUDE.md

## 프로젝트
"내가 뽑은 의원은 무엇을 하고 있는가?" — 국회의원·지방자치단체장 의정활동 투명성 플랫폼.
지도 기반으로 내 지역구 대표자 정보를 제공하는 시민 감시 웹 서비스.

## 프로덕트 철학
- **이 플랫폼은 판단하지 않는다.** 점수, 등급, 순위를 매기지 않음
- 법안 발의 건수, 표결 참여율 같은 단순 수치로 "좋은 의원"을 정의하지 않음
- 어떤 법안을 발의했고, 어떤 안건에 어떤 표를 던졌는지를 보여주고, 판단은 시민이 함
- 성적표, 리포트 카드, 수/우/미/양/가 등급 시스템 절대 도입하지 않을 것
- 바이럴보다 정직한 정보 제공이 우선
- OG 이미지: 의원 사진+지역구+정당 팩트만 (점수 없음, `@vercel/og` 사용)

## 현재 상태 (v1 MVP — 동작 중)
- 지도 기반 선거구 클릭 → 국회의원 프로필 표시
- 법안 발의 내역, 표결 참여율, 의원 검색
- Spring Batch 일일 데이터 수집 (의원정보 → 법안 → 표결)

## v2 확장 계획 (2026-06 지방선거 대응)
- 상세 설계: `docs/design-v2.md` 참조
- 리뷰 결과: `docs/autoplan-review.md` 참조 (CEO/Design/Eng 3-phase 리뷰 완료)
- **데드라인**: 2026-05-04 (선거 30일 전)

### 주간 계획
| 기간 | 작업 |
|---|---|
| Week 1 (4/14-4/20) | 법안 키워드 추출·분야 분류·한줄 요약, 표결 하이라이트, SEO 선거구 페이지, 공유 버튼 |
| Week 2 (4/21-4/27) | `LocalGovernor` 도메인 + 배치, 시도·시군구 GeoJSON, 지도 모드 전환 UI |
| Week 3 (4/28-5/4) | `Candidate` 도메인 + 배치, 후보자 비교 뷰, 선거 모드 지도, 모바일 최적화 |

### v2 수용된 주요 기술 결정 (autoplan-review 기반)
- `DistrictMap.tsx` 리팩토링: MapSelect 분리, `useMapLayers` 훅 추출, 모드별 strategy 패턴
- 프론트 상태 관리: `useReducer` + discriminated union state (10개 useState 교체)
- `BillKeyword.keywords`: TEXT → JSONB + `status`(PENDING/SUCCESS/FAILED) + `source_hash` 필드
- 배치 Rate Limiting: HTTP 429에 exponential backoff (기존 즉시 재시도 → 교체)
- **Day 1 필수**: 선관위 후보자 API·지자체장 데이터 외부 API 가용성 검증 스파이크 먼저

### Degradation Plan (일정 지연 시)
- Week 1 밀리면: 법안 요약을 LLM 대신 규칙 기반(법안명 파싱)으로 단순화
- Week 2 밀리면: 지자체장을 시/도 단위만 구현 (`sido.geojson` 활용, 시군구 생략)
- 전체 밀리면: 법안 인사이트 + 선거 후보자 기본 정보 우선 배포, 지자체장은 선거 이후

## 기술 스택
- **백엔드**: Java 17, Spring Boot 3.x, Spring Batch, Spring Data JPA, QueryDSL, PostgreSQL, Redis
- **프론트엔드**: Next.js 14, Tailwind CSS, React-Leaflet, Recharts, `@vercel/og`
- **배포**: Vercel (FE), Railway (BE + DB)

## 핵심 설계 원칙
- 의원 고유 ID는 열린국회정보의 `MONA_CD` 기준으로 통일
- 출석률은 API 미제공 → 본회의 **표결 참여율**로 대체 표기
- 전과·재산은 선거 기간에만 공개 → 선거 직후 배치 Job으로 수집하여 DB 영구 저장
- 선거구 GeoJSON: `github.com/OhmyNews/2024_22_elec_map` (SGG_Code로 의원 매핑)
- 시군구 행정구역코드 ≠ 국회의원 선거구 SGG_Code → 별도 매핑 테이블 필요
- 모바일 breakpoint: 768px. 데스크톱은 사이드 패널, 모바일은 바텀 시트
- 후보자 데이터 없을 때: 200 + `registrationStatus: PENDING` (404 금지)
- 지자체장 없는 지역: 404 대신 "데이터 준비 중" 응답

## 디렉토리 구조
```
backend/src/main/java/com/assembly/
├── adapter/in/web/           # REST Controller
├── adapter/out/batch/        # Spring Batch 수집 Job (API → DB)
├── adapter/out/persistence/  # JPA Repository + Adapter
├── application/              # UseCase + Service + Port
├── domain/
│   ├── member/               # 의원
│   ├── bill/                 # 법안
│   ├── billkeyword/          # [v2] 법안 키워드·요약·분야
│   ├── vote/                 # 표결
│   ├── asset/                # 재산
│   ├── criminal/             # 전과
│   ├── governor/             # [v2] 지자체장
│   └── candidate/            # [v2] 선거 후보자
└── common/                   # Config, Exception, Security

frontend/
├── components/
│   ├── DistrictMap.tsx       # Leaflet 지도 (v2: 모드별 strategy 패턴으로 리팩토링)
│   ├── MemberPanel.tsx       # 의원 상세 패널
│   ├── GovernorPanel.tsx     # [v2] 지자체장 패널
│   ├── CandidatePanel.tsx    # [v2] 후보자 패널
│   ├── CompareView.tsx       # [v2] 후보자 비교 뷰
│   ├── BillInsight.tsx       # [v2] 법안 키워드·요약·분야 분류
│   ├── VoteHighlights.tsx    # [v2] 주요 안건 표결 하이라이트
│   └── MapModeToggle.tsx     # [v2] 국회의원/지자체장/선거 모드 전환
├── lib/api.ts                # API 클라이언트
├── lib/constants.ts          # 정당 색상 등 상수
├── pages/
│   ├── index.tsx             # 메인 (지도)
│   ├── district/[sggCode].tsx    # [v2] SEO용 선거구 랜딩
│   └── election/[regionCode].tsx # [v2] 선거 후보자 비교
└── public/data/
    ├── districts/            # 시도별 선거구 GeoJSON
    ├── sido.geojson          # 시도 경계
    └── sigungu.geojson       # [v2] 시군구 경계
```

## 데이터 모델 (핵심 엔티티)

### 기존 엔티티
| 엔티티 | PK | 주요 필드 |
|---|---|---|
| Member | `mona_cd` (VARCHAR) | name, party, district, sgg_code, elected_count, committee, photo_url |
| Bill | `bill_id` (VARCHAR) | bill_name, proposer_mona_cd, propose_date, status, is_co_proposer |
| Vote | `vote_id` (BIGINT) | bill_id, mona_cd, vote_date, result(찬성/반대/기권/불참) |
| Asset | `asset_id` (BIGINT) | mona_cd, category, amount, collected_at |
| Criminal | `criminal_id` (BIGINT) | mona_cd, charge, sentence, confirmed_date |

### v2 신규 엔티티
**BillKeyword** (법안 키워드·분류)
| 필드 | 타입 | 설명 |
|---|---|---|
| keyword_id | BIGINT(PK) | |
| bill_id | VARCHAR(FK) | |
| category | VARCHAR | 분야 (교육/경제/환경/복지/안보 등) |
| keywords | JSONB | 추출된 키워드 배열 |
| summary | TEXT | 한줄 요약 |
| status | ENUM | PENDING/SUCCESS/FAILED |
| source_hash | VARCHAR | 요약 생성 소스 해시 |
| generated_at | TIMESTAMP | |

**LocalGovernor** (지자체장)
| 필드 | 타입 | 설명 |
|---|---|---|
| governor_id | BIGINT(PK) | |
| name, party | VARCHAR | |
| region_code | VARCHAR | 지자체 코드 |
| region_name | VARCHAR | (예: 서울특별시, 부산광역시 해운대구) |
| governor_type | ENUM | METRO_MAYOR/GOVERNOR/CITY_MAYOR/COUNTY_HEAD/DISTRICT_HEAD |
| term_start | DATE | |
| photo_url, phone, email | VARCHAR | |

**Candidate** (선거 후보자)
| 필드 | 타입 | 설명 |
|---|---|---|
| candidate_id | BIGINT(PK) | |
| election_id | VARCHAR | 선관위 선거 ID |
| election_type | ENUM | LOCAL_GOVERNOR (향후 확장 예정) |
| region_code | VARCHAR | 선거구 코드 |
| name, party, candidate_number | | |
| education, career, criminal_record, property, pledge | TEXT | |
| is_incumbent | BOOLEAN | 현직 여부 |

## 주요 API
```
# v1 기존
GET /api/v1/districts/{sggCode}/member    # 선거구 → 의원 조회
GET /api/v1/members/{monaCode}            # 의원 상세
GET /api/v1/members/{monaCode}/bills      # 법안 발의 내역
GET /api/v1/members/{monaCode}/votes      # 표결 내역
GET /api/v1/members/{monaCode}/attendance # 표결 참여율
GET /api/v1/members/search                # 이름·정당·지역 통합 검색

# v2 신규 — 법안 인사이트
GET /api/v1/members/{monaCode}/bill-summary    # 법안 분야 분류 + 키워드
GET /api/v1/members/{monaCode}/vote-highlights # 주요 안건 표결 하이라이트

# v2 신규 — 지자체장
GET /api/v1/local-governors/{regionCode}  # 지자체장 상세
GET /api/v1/local-governors/search        # 지자체장 검색
GET /api/v1/regions/{regionCode}/governor # 지역 → 지자체장

# v2 신규 — 선거
GET /api/v1/elections/upcoming                 # 다가오는 선거 목록
GET /api/v1/elections/{electionId}/candidates  # 후보자 목록
GET /api/v1/elections/{electionId}/compare     # 후보자 비교
# compare 응답: { candidates: [CandidateResponse, ...], incumbent?: GovernorResponse }
```

## 데이터 수집 배치 (Spring Batch)
- 매일 새벽 3시 cron 실행: 의원정보 → 법안 → 표결 → (v2) 지자체장 → 후보자
- 재시도: `faultTolerant().retry(Exception.class).retryLimit(3)`
- **[v2 변경]** HTTP 429 응답: exponential backoff 적용 (선관위 API 일 1000건 할당량 보호)
- 전과·재산은 수동 트리거 (선거 직후 1회성 실행)
- 배치 실패 시 마지막 성공 데이터 유지 (stale but available)
- 선거 기간 중 배치 빈도 증가 고려

## 공공 API 키
- `ASSEMBLY_API_KEY`: data.go.kr 서비스 키 (국회사무처·선관위·행안부 공통)
- `KAKAO_API_KEY`: 주소 검색 + 지도 타일

## 코드 작성 규칙
- 엔티티는 `@Builder` + `@NoArgsConstructor(access = PROTECTED)` 패턴 준수
- Repository는 기본 JPA + 복잡한 통계 쿼리는 QueryDSL 사용
- API 응답은 항상 DTO로 분리 (엔티티 직접 반환 금지)
- RestClient 사용 (WebClient/RestTemplate 사용 금지)
- 캐시 대상: 의원 프로필 (`@Cacheable`), 선거구-의원 매핑 테이블, 지자체장·후보자 캐싱 전략 신규 설계 필요
- Flyway로 DB 스키마 마이그레이션 관리

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
