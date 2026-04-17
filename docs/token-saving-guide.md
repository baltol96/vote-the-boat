# Claude Code 토큰 절약 가이드

> vote-the-boat 프로젝트의 과거 41개 세션(약 29MB, 2,900 assistant turns) 로그 분석 기반.
> 누적 과금성 토큰 약 8.77M 중 **20~30% 절감 여지**가 확인됨.

---

## 1. 현재 사용 패턴 요약

| 항목 | 수치 | 해석 |
|---|---|---|
| 세션 수 | 41 | — |
| 세션당 평균 assistant turn | 70.7 | 자동화 비중 높음 (user 1회당 10턴+) |
| user 메시지 언어 | 한국어 85.8% | — |
| user 메시지 길이 중앙값 | 64자 | 대부분 짧은 지시 |
| user 메시지 길이 p99 | 77,000자+ | **상위 1%의 대형 붙여넣기가 전체 평균(2,505자)을 왜곡** |
| 도구 호출 비율 | Read 448 / Bash 438 / Edit 401 | Bash가 Read와 동급 → 과다 사용 |
| cacheRead : cacheCreate | 24 : 1 | 캐시 히트율은 매우 양호 |

---

## 2. 낭비 패턴 TOP 5와 즉시 실행 가능한 대응

### (a) 대형 에러 로그·문서 전문 붙여넣기 — 가장 큰 낭비 요인

**현상**: 5,000자 초과 user 메시지 20건, 총 **605K자**. 상위 5건만 `93K / 86K / 77K / 77K / 42K`자.
대부분 Spring Boot 스택트레이스 원문 또는 SKILL.md 전체 붙여넣기.

**영향**: 해당 세션들에서 cacheCreate만 약 200만 토큰 발생.

**개선책**:
- 에러 로그는 **예외 타입 + 직접 원인 스택 10줄**만. 하단의 Spring/Jetty/Tomcat 프레임워크 스택은 버림.
- SKILL.md 내용 공유가 필요하면 파일 경로만 제시 → Claude가 필요한 부분만 Read.
- 예: `org.springframework.dao.DataIntegrityViolationException ... at com.assembly.adapter.out.batch.MemberCollectorJob.run(MemberCollectorJob.java:87)` — 이 정도면 충분.

### (b) 같은 파일을 세션 내에서 반복 Read (전체 Read의 25.4%가 중복)

**최악 사례**:
- `8593deb6` 세션: **DistrictMap.tsx 14회** Read
- `d4207063` 세션: **index.tsx 10회** Read

**원인**: Edit 후 "변경 확인" 목적의 재Read. 하지만 Edit는 실패 시 에러를 반환하므로 사후 재Read는 거의 불필요.

**개선책**:
- Edit 성공 = 변경 완료로 신뢰.
- 꼭 확인이 필요하면 `offset/limit`로 변경 영역만 Read.
- 다른 부분 확인이 필요하면 `Grep`으로 특정 심볼만 조회.

### (c) 전체 파일 통째 Read (offset/limit 미지정)

**현상**: 상위 세션 기준 fullReads 20~30회. 일부 Read 결과가 158KB에 달함.

**개선책**:
- 탐색 단계: `Grep → 매치된 라인 주변만 Read(offset 지정)` 흐름으로 전환.
- 큰 파일(GeoJSON, 배치 Job 등)은 절대 통째로 읽지 말기. 필요한 함수만 grep.

### (d) 서브에이전트 미사용으로 메인 컨텍스트 비대화

**현상**:
- 전체 Agent/Task 호출 **15회** (세션당 평균 0.37회). 대부분 세션 0회.
- `d7b9d7c7` 세션: 221턴 규모인데 Task 2회만 사용 → cacheRead 1,189만 토큰.

**개선책**:
- "이 기능 어디서 쓰임?", "전체 구조 파악" 같은 **다중 파일 탐색은 Agent(Explore)에 위임**. Agent가 읽은 결과는 요약만 메인에 돌아옴.
- 특히 `DistrictMap.tsx`, `MemberPanel.tsx`, `index.tsx`는 프로젝트의 핫 파일이니 처음 파악할 때 Agent에 맡기기.

### (e) 하나의 세션에 너무 오래 머무름 (150턴 초과 5개)

**최장 세션**: 221턴 (`14645280`, `d80fc383`).

**영향**: cacheRead가 턴 수에 비례해 선형 증가. 긴 세션 = 턴당 입력 비용 계속 상승.

**개선책**:
- 기능 단위가 완료되면 **`/checkpoint` 후 새 세션**으로 분할.
- "버그 수정 → 배포"처럼 이질적인 작업은 같은 세션에 몰지 않기.
- 하루에 여러 작업을 할 때는 작업마다 새 세션 시작.

---

## 3. 보조 개선책

### Bash 과다 사용 (438회, Read와 동급)

`cat`, `ls`, `head`는 **CLAUDE.md 규칙상 Read/Glob을 써야 함**.
- Bash output은 줄번호·구조 메타가 없어 캐시 효율이 떨어짐.
- `ls`, `find` 대신 **Glob**. `cat`, `head` 대신 **Read**. `grep` 대신 **Grep**.
- 최악 세션: 03b519f0 Bash 66회, d80fc383 61회, 021fb82d 30회.

### ToolSearch 왕복 (16회)

자주 쓰는 MCP 도구는 deferred 상태로 두지 말고, 필요한 tool만 `ToolSearch`로 한 번에 로드.
- 지금처럼 필요할 때마다 한두 개씩 fetch하지 말고, 세션 시작 시 묶어서 요청.

### 프론트엔드 핫 파일 리팩토링 근거

Read TOP 3가 전체 Read의 **26%** 차지:
```
MemberPanel.tsx    46회
DistrictMap.tsx    40회  ← CLAUDE.md에도 리팩토링 예정으로 명시됨
index.tsx          30회
```
**이 세 파일을 분할하면** 이후 모든 세션의 Read 비용이 줄어듦. v2 계획상 `DistrictMap.tsx`는 MapSelect/useMapLayers 훅으로 분할 예정 — 우선순위를 올릴 근거가 됨.

---

## 4. 체크리스트 (세션 시작 시)

- [ ] 이번 세션 목적은 하나의 기능 단위인가? (아니면 분할)
- [ ] 에러 로그 붙여넣을 때: 프레임워크 스택 잘라냈는가?
- [ ] 긴 파일 붙여넣기 대신 파일 경로로 전달했는가?
- [ ] 다중 파일 탐색이 필요한 작업이면 Agent에 위임했는가?
- [ ] Edit 후 재Read 하지 않기 — Edit 성공을 신뢰

## 5. 체크리스트 (긴 세션 중간에)

- [ ] 현재 턴 수 100 넘었는가? → 한 기능 끝나면 `/checkpoint` + 새 세션
- [ ] 같은 파일을 이번 세션에서 5번 이상 읽었는가? → Grep으로 전환
- [ ] Bash로 `cat`/`ls`/`grep` 쓰고 있는가? → Read/Glob/Grep으로 전환

---

## 기대 효과

| 개선책 | 추정 절감 |
|---|---|
| 에러 로그 축약 | cacheCreate 약 400K 토큰 감소 |
| Edit 후 재Read 중단 | Read 트래픽 약 25% 감소 (≈400KB 입력) |
| Agent 위임 활성화 | 장기 세션 cacheRead 30~40% 감소 |
| 세션 분할 (`/checkpoint`) | 대형 세션당 cacheRead 약 50% 감소 |
| Bash → Read/Glob 전환 | Bash 트래픽 30% 감소 |

**종합: 세션당 약 20~30% 토큰 절감 가능.**
