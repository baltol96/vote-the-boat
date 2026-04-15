# Design System — Vote the Boat

## Product Context
- **What this is:** 국회의원·지방자치단체장 의정활동 투명성 플랫폼. 지도에서 내 지역구를 클릭하면 의원의 법안·표결·출석 정보를 확인할 수 있음
- **Who it's for:** 선거권을 가진 대한민국 시민. 내 지역구 의원이 무엇을 하고 있는지 알고 싶은 사람
- **Space/industry:** Civic tech, government transparency, parliamentary monitoring
- **Project type:** Map-centric web app (지도 기반 데이터 대시보드)

## Aesthetic Direction
- **Direction:** Industrial/Utilitarian with Civic Soul
- **Decoration level:** Minimal — 타이포그래피와 데이터가 주역. 맵 오션 그라디언트가 유일한 표현적 요소
- **Mood:** 차분한 투명성. 판단하지 않고, 정보를 제공하는 객관적 어조. 시민이 위압감 없이 접근할 수 있는 따뜻함
- **Reference sites:** GovTrack.us, TheyWorkForYou.com, OpenStates.org (Plural Policy), open.assembly.go.kr

## Typography
- **Display/Hero:** Manrope (800/700/600/500) — 기하학적 산세리프. 개성 있으면서 신뢰감. 브랜드 폰트로 로고·헤딩·멤버 이름·수치에 사용
- **Body:** Plus Jakarta Sans (700/600/500/400) — Inter보다 따뜻하고 소형 사이즈에서도 가독성 우수. 본문·레이블·검색·툴팁 등 모든 UI 텍스트에 사용
- **UI/Labels:** Plus Jakarta Sans (body와 동일)
- **Data/Tables:** Plus Jakarta Sans with `font-variant-numeric: tabular-nums` — 숫자 정렬이 필요한 통계, 표결 참여율, 법안 건수 등에 사용
- **Code:** JetBrains Mono (필요 시)
- **Loading:** Google Fonts CDN
  ```html
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  ```
- **Scale:**
  - Hero: 36px / 800 / line-height 1.15
  - Section Title: 22px / 800 / line-height 1.3
  - Member Name: 18px / 800 / line-height 1.3
  - Body: 15px / 400 / line-height 1.6
  - UI Text: 13px / 500 / line-height 1.5
  - Label: 12px / 600 / line-height 1.4
  - Section Label: 11px / 600 / uppercase / letter-spacing 0.04em
  - Caption: 10px / 600 / line-height 1.3

## Color
- **Approach:** Restrained — 틸 하나의 악센트 + 뉴트럴. 색은 드물고 의미 있게 사용
- **Primary:** `#0d6e69` — 모든 시빅 테크가 파란색일 때, 틸은 "시민적이지만 관공서가 아닌" 정체성
- **Primary Container:** `#b8dedd` — 배경, 배지, 하이라이트
- **Primary Deep:** `#063d3a` — 로고, 강조, 컨테이너 위 텍스트
- **Surfaces (Light):**
  - Lowest: `#f8fafd`
  - Default: `#f4f7fb`
  - Low: `#eaeff6`
  - High: `#dde4ee`
  - Bright: `#ffffff`
- **Text:**
  - On Surface: `#1a2535`
  - Muted: `#5a6a7e`
  - Outline: `rgba(100,135,165,0.4)`
  - Outline Subtle: `rgba(100,135,165,0.2)`
- **Semantic:**
  - Success: `#16a34a`
  - Warning: `#d97706`
  - Error: `#dc2626`
  - Info: `#2563eb`
- **Map (Signature Brand Surface):**
  - Ocean BG: `#2a8fa8`
  - Ocean Center: `#3aa5bf`
  - Ocean Edge: `#1a6a80`
  - District Idle: `#a8c87a` / Border `#789a50`
  - District Hover: `#0d6e69` / Border `#0a5550`
  - District Selected: `#0a5550` / Border `#0d6e69`
  - Glow: `rgba(13, 110, 105, 0.3)`
- **Dark mode:** Surface를 slate-900 계열로 반전, 틸을 cyan-400(`#2dd4bf`)으로 시프트하여 어두운 배경에서 대비 확보
  - Surface Lowest: `#0c1220`
  - Surface Default: `#111827`
  - Surface Low: `#1a2438`
  - Surface High: `#243044`
  - Surface Bright: `#1e293b`
  - On Surface: `#e2e8f0`
  - Muted: `#94a3b8`
  - Primary: `#2dd4bf`
  - Primary Container: `#134e4a`
  - Primary Deep: `#99f6e4`

## Spacing
- **Base unit:** 4px
- **Density:** Comfortable — 시민 데이터에 충분한 여백을 주되 화면을 낭비하지 않는 밀도
- **Scale:** 2xs(2px) xs(4px) sm(8px) md(16px) lg(24px) xl(32px) 2xl(48px) 3xl(64px)

## Layout
- **Approach:** Hybrid — 지도는 creative/immersive, 데이터 패널은 grid-disciplined
- **Grid:** 지도 전체 뷰포트 + 사이드 패널 440px. 모바일에서 바텀 시트로 전환
- **Max content width:** 960px (독립 페이지 콘텐츠)
- **Breakpoint:** 768px (데스크톱/모바일 전환)
- **Border radius:**
  - sm: 4px (인라인 요소, 아바타 내부)
  - md: 8px (버튼, 인풋, 카드 내부 요소, 탭)
  - lg: 12px (카드, 드롭다운, 패널 섹션)
  - xl: 16px (모달, 컨테이너)
  - full: 9999px (배지, 힌트 바, 카운트 필)

## Motion
- **Approach:** Minimal-functional — 이해를 돕는 전환만. "객관적 정보 제공" 제품 철학과 일치
- **Easing:**
  - Enter: `cubic-bezier(0, 0, 0.2, 1)` (ease-out)
  - Exit: `cubic-bezier(0.4, 0, 1, 1)` (ease-in)
  - Move: `cubic-bezier(0.4, 0, 0.2, 1)` (ease-in-out)
- **Duration:**
  - Micro: 100ms — 호버, 포커스 등 즉각 피드백
  - Short: 200ms — 버튼 전환, 탭 전환, 색상 변경
  - Medium: 350ms — 패널 슬라이드, 맵 줌, 테마 전환

## CSS Variables Reference
```css
:root {
  /* Primary */
  --color-primary:            #0d6e69;
  --color-primary-container:  #b8dedd;
  --color-primary-fixed:      #063d3a;

  /* Surfaces */
  --color-surface:            #f4f7fb;
  --color-surface-low:        #eaeff6;
  --color-surface-high:       #dde4ee;
  --color-surface-bright:     #ffffff;
  --color-surface-lowest:     #f8fafd;

  /* Text */
  --color-on-surface:         #1a2535;
  --color-on-surface-muted:   #5a6a7e;
  --color-outline-variant:    rgba(100,135,165,0.4);

  /* Semantic */
  --color-success:            #16a34a;
  --color-warning:            #d97706;
  --color-error:              #dc2626;
  --color-info:               #2563eb;

  /* Map */
  --color-map-bg:             #2a8fa8;
  --color-map-ocean-center:   #3aa5bf;
  --color-map-ocean-edge:     #1a6a80;
  --color-map-idle:           #a8c87a;
  --color-map-idle-border:    #789a50;
  --color-map-hover:          #0d6e69;
  --color-map-hover-border:   #0a5550;
  --color-map-selected:       #0a5550;
  --color-map-selected-border:#0d6e69;
  --color-map-glow:           rgba(13, 110, 105, 0.3);
}
```

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-15 | Initial design system created | /design-consultation: 기존 디자인을 정형화. 경쟁사 리서치(GovTrack, TheyWorkForYou, OpenStates, 열린국회) 기반 |
| 2026-04-15 | Inter 폰트 제거, 2폰트 스택으로 통합 | Inter는 가장 과용되는 폰트. Jakarta가 더 따뜻하고 개성 있음. 2폰트 = 더 명확한 위계, 더 빠른 로딩 |
| 2026-04-15 | 틸(#0d6e69) 프라이머리 유지 | 모든 시빅 테크가 블루. 틸은 "시민적이지만 관공서가 아닌" 차별화 |
| 2026-04-15 | 맵 오션 그라디언트를 브랜드 시그니처로 격상 | 대부분의 시빅 테크는 흰 배경에 지도를 놓음. V/B의 지도는 뷰포트를 채우고 오션 색이 브랜드를 전달 |
| 2026-04-15 | 모션 듀레이션 표준화 (100/200/350ms) | 기존 코드에 0.2s, 0.28s, 0.3s 혼재. 3단계로 통일 |
