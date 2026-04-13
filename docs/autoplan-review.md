# Vote the Boat v2 — /autoplan Review

<!-- /autoplan restore point: ~/.gstack/projects/vtb-autoplan/main-autoplan-restore-20260413.md -->

## Context

Vote the Boat는 한국 국회의원·지자체장 의정활동 투명성 플랫폼. 지도 기반으로
내 지역구 대표자 정보를 제공. 현재 국회의원 MVP가 동작하며, v2에서 지자체장 +
선거 후보자 비교 + 법안 인사이트를 추가.

**Design doc**: `docs/design-v2.md` (APPROVED, 9/10 spec review)
**데드라인**: 2026-05-04 (21일, 3주)
**스택**: Spring Boot 3.x + Next.js 14 + PostgreSQL + Redis
**Codex**: 사용 불가. `[subagent-only]` 모드.

## Review Pipeline Status

| Phase | Skill | Status | Findings |
|-------|-------|--------|----------|
| 1. CEO | plan-ceo-review | DONE | 3 CRITICAL, 3 HIGH, 1 MEDIUM |
| 2. Design | plan-design-review | DONE | Avg 4.3/10, 7 dimensions reviewed |
| 3. Eng | plan-eng-review | DONE | 2 HIGH, 4 MEDIUM, 1 HIGH(collective) |
| 3.5 DX | plan-devex-review | SKIPPED (consumer app, not dev tool) | — |

---

## Phase 1: CEO Review (Strategy & Scope) [subagent-only]

### CEO Findings (severity order)

**CRITICAL-1: 후보자 데이터 타이밍 역전**
후보자 등록 공시는 ~5/10. 데드라인은 5/4. Week 3 전체가 실제 데이터 없이 빌드됨.
FIX: 2022년 지방선거 데이터로 테스트 픽스처 구성. 또는 검증 불가 수용.

**CRITICAL-2: 지자체장 API 미검증**
"체계적 API 없음"이라고 인정하면서 Week 2에서 해결된 것처럼 취급.
FIX: Day 1에 모든 외부 API 가용성 검증 스파이크 실행.

**CRITICAL-3: 스코프 과부하**
3개 주요 기능 + SEO + 카카오톡 SDK + Web Share + 바텀시트를 1인이 21일에.
각 기능이 단독으로 2-3주 규모. 디그레이드 플랜이 실제 플랜.
FIX: 법안 인사이트+공유 OR 선거 후보자. 3개 동시는 비현실적.

**HIGH-1: 모드 전환 UX**
유저는 "모드"로 생각 안 함. "이 지역 누가 대표하나"로 생각.
FIX: 지역 클릭 → 해당 지역 모든 대표자(의원+지자체장) 한 패널에 표시.

**HIGH-2: 텍스트 전용 OG의 한계**
텍스트 OG 메타태그는 카카오톡에서 참여도 거의 0. "점수 없는 팩트 시각화"
(법안 분야 파이차트, 표결 패턴 바) OG 이미지는 철학에 위배 안 됨.
FIX: 점수 없는 시각적 OG 이미지 도입.

**HIGH-3: 대안 기각이 성급**
Approach A(기존 데이터로 바이럴 먼저)가 전략적으로 옳았음.
300명 의원 데이터가 이미 있음. 외부 API 리스크 없이 수요 검증 가능.

**MEDIUM: 참여 루프 부재**
알림("의원이 X에 투표"), 이벤트 트리거, 재방문 메커니즘 없음.
선거 후 트래픽 급감 구조.

### Dream State Delta
```
CURRENT: 의원 지도 + 프로필/법안/표결 (MVP 동작 중)
THIS PLAN: + 지자체장 + 선거 + 법안 인사이트 (폭 확장, 깊이 없음)
12M IDEAL: 이벤트 기반 진입 + 알림 + 커뮤니티 + 공직자 소통
GAP: 참여 루프, 재방문 메커니즘, 이벤트 트리거 전부 누락
```

### Temporal Inversion
**Hour 1 해야 할 것**: 외부 API 검증 (선관위 후보자 API, 지자체장 데이터)
**Hour 1 계획된 것**: 법안 키워드 NLP
→ 순서가 뒤집혀 있음. 로드베어링 가정부터 검증해야 함.

---

## Phase 3: Eng Review (Architecture & Implementation) [subagent-only]

### Eng Findings

**HIGH-1: DistrictMap.tsx 복잡도 폭발**
632줄, 13 refs, 8 useState. governor+election 모드 추가 시 1000줄+.
FIX: MapSelect 분리, useMapLayers 훅 추출, 모드별 strategy 패턴.

**HIGH-2: GeoJSON 시군구 경계 매핑 부재**
시군구 행정구역코드 ≠ 국회의원 선거구 SGG_Code. 지자체장 regionCode → GeoJSON feature
매핑 테이블이 없음. 파일 크기 10-20MB (분할 필요).

**HIGH-3 (collective): 미명세 항목들**
- regionCode→GeoJSON 매핑 없음
- LLM 비용 추정 없음 (~25,000건 법안)
- Flyway 마이그레이션 미언급
- governor/candidate Redis 캐싱 전략 없음
- 모바일 바텀시트 라이브러리/구현 미정
- 모드 전환 중 로딩 취소 전략 없음

**MEDIUM-1: Compare API 오케스트레이션**
`/elections/{id}/compare`가 Candidate+LocalGovernor 두 도메인 조인 필요.
오케스트레이션 서비스 미정의.

**MEDIUM-2: 에러 경로 미정의**
- 지자체장 없는 지역: 404 대신 "데이터 준비 중" 응답 필요
- 빈 후보자: 200 + `registrationStatus: PENDING` 메타데이터
- BillKeyword에 status 필드 없음 (PENDING/SUCCESS/FAILED)

**MEDIUM-3: BillKeyword 데이터 모델**
keywords를 TEXT로 저장 → JSONB 또는 junction table. LLM 요약에 source_hash 추가.

**MEDIUM-4: 배치 Rate Limiting**
기존 retry(3)가 HTTP 429도 즉시 재시도. 선관위 API 일 1000건 할당량 소진 위험.
FIX: 429에 exponential backoff. 선거 기간 배치 빈도 증가.

**MEDIUM-5: 프론트 상태 관리**
10개 useState에 3개 모드 추가 → 불가능 상태 조합 발생.
FIX: useReducer + discriminated union state.

### Architecture Diagram
```
┌─ Frontend (Next.js/Vercel) ──────────────────────┐
│  DistrictMap ──┬── MemberPanel                    │
│  (mode toggle) ├── GovernorPanel [NEW]            │
│                ├── CandidatePanel [NEW]           │
│                └── CompareView [NEW]              │
│  BillInsight [NEW]  VoteHighlights [NEW]         │
└──────────────────────┬───────────────────────────┘
                       │ REST API
┌─ Backend (Spring Boot/Railway) ──────────────────┐
│  ┌─member─┐  ┌─governor─┐  ┌─candidate─┐       │
│  │ domain │  │ domain   │  │ domain    │       │
│  │ app    │  │ app [NEW]│  │ app [NEW] │       │
│  │ adapter│  │ adapter  │  │ adapter   │       │
│  └────────┘  └──────────┘  └───────────┘       │
│  ┌─bill───┐  ┌─billkeyword──┐                   │
│  │ domain │  │ domain [NEW]  │  ← LLM/rules     │
│  └────────┘  └──────────────┘                   │
│  Spring Batch: Member|Bill|Vote|Governor|Candidate│
└──────────────────────┬───────────────────────────┘
                       │
              PostgreSQL + Redis
```

---

## Phase 2: Design Review (UI/UX) [subagent-only]

### Design Scores

| Dimension | Score | Key Issue |
|-----------|-------|-----------|
| 정보 계층 | 5/10 | 모드 클릭 시 라우팅 로직 미정의 |
| 인터랙션 상태 | 3/10 | governor/candidate 패널 상태 매트릭스 없음 |
| 모바일 UX | 4/10 | 현재 코드에 반응형 전무, 384px 하드코딩 |
| 모드 토글 | 4/10 | "선거"는 시간 이벤트, 지리 레이어와 혼재 |
| 비교 뷰 | 5/10 | 가변 길이 텍스트 정렬, 모바일 스와이프 비교 불가 |
| 공유 UX | 3/10 | 텍스트 OG → 카카오톡 CTR 극저 |
| 시각 일관성 | 6/10 | 기존 디자인 토큰 미문서화 |

### Design Fixes

**D-1**: 통합 "내 지역구" 진입점. 의원+지자체장 한 패널에. 선거 모드는 시즌 한정 토글.
**D-2**: 각 패널별 상태 매트릭스 정의 (loading/empty/error/stale).
**D-3**: Week 1부터 breakpoint 훅 + 조건부 패널 렌더링. 모든 새 컴포넌트 mobile-aware.
**D-4**: 비교 뷰는 고정 행 테이블 (카테고리=행, 후보자=열). 모바일은 스티키 헤더+스크롤.
**D-5**: 팩트 기반 OG 이미지 (의원 사진+지역구+정당, 점수 없음). ~4시간 작업.
**D-6**: MemberPanel의 카드/뱃지/탭 패턴을 공유 컴포넌트로 추출.

---

## Final Decisions

**유지 (유저 방향):**
- Approach B: 3기능 동시 개발 (법안 인사이트 + 지자체장 + 선거)
- 모드 토글: 국회의원/지자체장/선거 분리 (선거구≠행정구역이므로)
- 텍스트 OG → ~~유지~~ **변경**: 팩트 기반 OG 이미지 도입 (점수 없이)

**수용 (리뷰 권고):**
- OG 이미지: 의원 사진+지역구+정당 (`@vercel/og`로 ~4시간 작업)
- DistrictMap.tsx 리팩토링: MapSelect 분리, useMapLayers 훅, 모드별 strategy 패턴
- useReducer: 프론트 상태 관리 개선
- BillKeyword: TEXT → JSONB + status 필드 + source_hash
- 배치: 429 exponential backoff
- Day 1: 외부 API 가용성 검증 스파이크 (선관위 후보자 API, 지자체장 데이터)
- 각 패널별 상태 매트릭스 정의 (loading/empty/error/stale)
- 2022년 지방선거 데이터로 테스트 픽스처 구성

**경고 사항 (리뷰가 기각되었지만 리스크 존재):**
- 3기능 21일은 디그레이드 플랜이 실제로 발동할 가능성 높음
- 후보자 데이터는 ~5/10에야 가용, 데드라인(5/4) 이후
- 지자체장 프로필 전용 데이터는 얕은 기능이 될 수 있음

---

## Cross-Phase Themes (2+ phase에서 독립적으로 지적)

| Theme | Phases | Confidence |
|-------|--------|------------|
| **스코프 과부하**: 3기능 21일 비현실적 | CEO + Eng | HIGH |
| **모드 토글 → 통합 뷰**: 유저는 모드로 안 생각함 | CEO + Design | HIGH |
| **텍스트 OG 실패**: 카카오톡 참여도 극저 | CEO + Design | HIGH |
| **모바일 압축**: 반응형 전무, Week 3에 몰림 | Design + Eng | HIGH |
| **외부 API Day 1 검증**: 로드베어링 가정 먼저 | CEO + Eng | HIGH |

---

## Decision Audit Trail

| # | Phase | Decision | Classification | Result | Rationale |
|---|-------|----------|---------------|--------|-----------|
| 1 | CEO | Approach B→A 전환 | USER CHALLENGE | **유저 기각** | 3기능 동시 유지 |
| 2 | CEO | 지자체장 제거 | TASTE | **유저 기각** | 선거 전 통합 플랫폼 필요 |
| 3 | Design | 팩트 OG 이미지 도입 | USER CHALLENGE | **수용** | 점수 없이 사진+지역구+정당 |
| 4 | Design | 통합 지역 뷰 | TASTE | **유저 기각** | 선거구≠행정구역, 모드 전환 필수 |
| 5 | Eng | DistrictMap 리팩토링 | MECHANICAL | **수용** | strategy 패턴+훅 추출 |
| 6 | Eng | useReducer 도입 | MECHANICAL | **수용** | 불가능 상태 방지 |
| 7 | Eng | BillKeyword JSONB | MECHANICAL | **수용** | TEXT 쿼리 비효율 |
| 8 | Eng | 배치 429 backoff | MECHANICAL | **수용** | quota 보호 |
