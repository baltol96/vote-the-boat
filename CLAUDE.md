# CLAUDE.md

## 프로젝트
국회의원·지방자치단체장 의정활동 투명성 플랫폼.
지도 기반으로 내 지역구 의원 정보를 제공하는 웹 서비스.

## 프로덕트 철학
- **이 플랫폼은 판단하지 않는다.** 점수, 등급, 순위를 매기지 않음
- 법안 발의 건수, 표결 참여율 같은 단순 수치로 "좋은 의원"을 정의하지 않음
- 어떤 법안을 발의했고, 어떤 안건에 어떤 표를 던졌는지를 보여주고, 판단은 시민이 함
- 성적표, 리포트 카드, 수/우/미/양/가 등급 시스템 절대 도입하지 않을 것
- 바이럴보다 정직한 정보 제공이 우선

## v2 확장 계획 (2026-06 지방선거 대응)
- 상세 설계: `docs/design-v2.md` 참조
- 데드라인: 2026-05-04 (선거 30일 전)
- **Week 1**: 법안 키워드 추출, 분야 분류, 한줄 요약, 주요 안건 표결 하이라이트
- **Week 2**: 지자체장(시장/도지사) 데이터 수집 + 지도 모드 전환
- **Week 3**: 선거 후보자 비교 기능 + 모바일 최적화

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
├── adapter/in/web/       # REST Controller
├── adapter/out/batch/    # Spring Batch 수집 Job (API → DB)
├── adapter/out/persistence/ # JPA Repository + Adapter
├── application/          # UseCase + Service + Port
├── domain/               # 엔티티 (member, bill, vote, asset, criminal)
└── common/               # Config, Exception, Security

frontend/
├── components/DistrictMap.tsx   # Leaflet 지도 + 선거구 클릭
├── components/MemberPanel.tsx   # 의원 상세 패널
├── lib/api.ts                   # API 클라이언트
├── lib/constants.ts             # 정당 색상 등 상수
├── pages/                       # Next.js 라우팅
└── public/data/districts/       # 시도별 선거구 GeoJSON
```

## 주요 API
```
# 기존 (v1)
GET /api/v1/districts/{sggCode}/member   # 지도 클릭 → 의원 조회
GET /api/v1/members/{monaCode}           # 의원 상세
GET /api/v1/members/{monaCode}/bills     # 법안 발의 내역
GET /api/v1/members/{monaCode}/votes     # 표결 내역
GET /api/v1/members/{monaCode}/attendance # 표결 참여율
GET /api/v1/members/search               # 이름·정당·지역 검색

# v2 예정 — 법안 인사이트
GET /api/v1/members/{monaCode}/bill-summary    # 법안 분야 분류 + 키워드
GET /api/v1/members/{monaCode}/vote-highlights # 주요 안건 표결 하이라이트

# v2 예정 — 지자체장
GET /api/v1/local-governors/{regionCode}       # 지자체장 상세
GET /api/v1/regions/{regionCode}/governor      # 지역 → 지자체장

# v2 예정 — 선거
GET /api/v1/elections/upcoming                 # 다가오는 선거
GET /api/v1/elections/{electionId}/candidates  # 후보자 목록
GET /api/v1/elections/{electionId}/compare     # 후보자 비교
```

## 데이터 수집 배치 (Spring Batch)
- 매일 새벽 3시 cron 실행: 의원정보 → 법안 → 표결 순서로 Job 실행
- 재시도 3회 설정 (`faultTolerant().retry(Exception.class).retryLimit(3)`)
- 전과·재산은 수동 트리거 (선거 직후 1회성 실행)

## 공공 API 키
- `ASSEMBLY_API_KEY`: data.go.kr 서비스 키 (국회사무처·선관위·행안부 공통)
- `KAKAO_API_KEY`: 주소 검색 + 지도 타일

## v2 개발 참조 문서
- `docs/design-v2.md`: v2 전체 설계 (엔티티, API, 주간 계획, 디그레이드 플랜)
- `docs/autoplan-review.md`: CEO/Design/Eng 리뷰 결과 및 최종 결정사항
- v2 관련 작업 시 위 문서를 반드시 읽고 설계와 일치하도록 구현할 것

## 코드 작성 규칙
- 엔티티는 `@Builder` + `@NoArgsConstructor(access = PROTECTED)` 패턴 준수
- Repository는 기본 JPA + 복잡한 통계 쿼리는 QueryDSL 사용
- API 응답은 항상 DTO로 분리 (엔티티 직접 반환 금지)
- RestClient 사용 (WebClient/RestTemplate 사용 금지)
- 캐시 대상: 의원 프로필 (`@Cacheable`), 선거구-의원 매핑 테이블

## Design System
Always read DESIGN.md before making any visual or UI decisions.
All font choices, colors, spacing, and aesthetic direction are defined there.
Do not deviate without explicit user approval.
In QA mode, flag any code that doesn't match DESIGN.md.

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
