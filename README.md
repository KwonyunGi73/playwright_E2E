# 🛒 O!House E2E Automation Framework

![Playwright](https://img.shields.io/badge/Playwright-45ba4b?style=for-the-badge&logo=Playwright&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

## 📖 프로젝트 개요 (Overview)
이 프로젝트는 **오늘의집(O!House)** 웹 애플리케이션의 핵심 비즈니스 로직(로그인부터 구매까지)을 검증하기 위한 **Playwright 기반 E2E 자동화 테스트 프레임워크**입니다.

단순한 기능 구현을 넘어, **동적인 DOM 변화**, **복잡한 옵션 선택 로직**을 견고하게(Robust) 처리하는 데 중점을 두었습니다.

---

## 🎯 핵심 시나리오 (Key Scenarios)
**통합 시나리오 (End-to-End Flow):**

1. **로그인 (Auth)**
   - 네이버 소셜 로그인을 통한 인증 및 세션 유지 (`storageState` 활용).
2. **탐색 (Discovery)**
   - 상품 검색('의자') 및 리스트 필터링/정렬(판매순).
3. **상세 페이지 (PDP)**
   - 상품 상세 진입 및 주요 요소 렌더링 검증.
4. **옵션 선택 (Dynamic Option Handling)**
   - Native Select가 아닌 **Custom Dropdown** 요소 제어.
   - 단일/복수 옵션 및 품절 상태에 유연하게 대응하는 **계단식 재시도(Cascading Retry) 로직** 적용.
5. **장바구니 (Cart)**
   - 장바구니 담기 액션 및 성공 팝업 감지.
   - 장바구니 페이지 이동 후 최종 상품 존재 여부 확인.

---

## 🛠️ 기술적 특징 & 해결 전략 (Technical Highlights)

### 1. 인증 상태 관리 (Authentication State)
* **문제:** 매 테스트마다 네이버 로그인을 반복할 경우 CAPTCHA 발생 및 테스트 속도 저하.
* **해결:** `auth.setup.ts`를 통해 최초 1회 로그인 후, 쿠키(Session)를 `.auth/user.json`에 저장하여 재사용.
* **효과:** 테스트 실행 시간 **약 40% 단축** 및 반복 로그인으로 인한 차단 이슈 방지.

### 2. 견고한 셀렉터 전략 (Robust Selectors)
* **우선순위:** `data-testid` > `Role` & `Accessible Name` > `CSS Class` 순으로 셀렉팅.
* **전략:** 변동 가능성이 높은 CSS Class(`css-xyz...`) 사용을 지양하고, 변하지 않는 속성을 사용하여 유지보수 비용 최소화.

### 3. 동적 웨이팅 전략 (Smart Waiting)
* **전략:** 불안정한 `networkidle` 대신, **UI 요소의 상태(`isVisible`, `isEnabled`)**와 **URL 변경**을 기준으로 명시적 대기(Explicit Wait)를 적용하여 Flaky Test 방지.

### 4. 계단식 옵션 선택 로직 (Cascading Option Selection)
* **문제:** 상품마다 옵션의 개수(0개~3개)나 품절 여부 등 구조가 상이함.
* **해결:** "장바구니 담기 실패 시 -> 다음 단계 옵션 선택" 하는 **루프형 계단식 로직** 구현.
* **디테일:** 품절된 옵션(`disabled`)은 자동으로 건너뛰고 유효한 옵션만 선택하도록 처리.

---

## 📂 폴더 구조 (Project Structure)

```bash
kyg-playwright-project/
├── playwright/
│   └── .auth/             # 로그인 세션/쿠키 저장소 (Git 제외됨 - 보안)
├── tests/
│   ├── auth.setup.ts      # 초기 로그인 및 세션 저장 스크립트
│   └── ohou-shopping-full.spec.ts  # 메인 통합 시나리오 테스트
├── playwright.config.ts   # Playwright 전역 설정 (Viewport, Timeout 등)
├── .gitignore             # 보안 파일(user.json 등) 제외 설정
└── package.json
