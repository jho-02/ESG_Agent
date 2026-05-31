# Week 11 - Feature Flags 및 점진적 배포 실습

이번 주차는 공개 저장소 기준으로 실제 데이터 없이, 더미데이터와 mock 결과만 사용하는 Feature Flag 및 A/B 테스트 구조를 추가하는 실습 문서다.
기존 `public/` 화면 파일은 수정하지 않고, 테스트 가능한 순수 함수 모듈과 문서만 추가했다.

## 구현 파일

- `frontend/src/config/featureFlags.js`
- `frontend/src/utils/abTest.js`
- `frontend/src/utils/eventTracker.js`

## Feature Flag 3개

| Flag | 목적 | 기본값 | 대상 제어 예시 |
|---|---|---:|---|
| `chatbotPanel` | 챗봇 UI 표시 여부 제어 | `false` | mock userId 또는 role 기반 활성화 |
| `evidenceDownload` | 근거자료 및 전체 자료 다운로드 영역 표시 여부 제어 | `false` | 검토자 역할 또는 특정 mock userId 기반 활성화 |
| `newDashboardUi` | 새 UI 디자인 적용 여부 제어 | `false` | A/B 실험 또는 제한 사용자에게만 활성화 |

## Feature Flag 동작 방식

`featureFlags.js`는 다음 순서로 값을 해석한다.

1. 기본값 `DEFAULT_FEATURE_FLAGS`를 사용한다.
2. `window.__FEATURE_FLAGS__`가 있으면 이를 덮어쓴다.
3. optional config 객체의 `defaultFlags`, `flags`, `rules`를 다시 반영한다.
4. userId 또는 role 기준 규칙이 있으면 해당 사용자에 대해 최종 값을 결정한다.

이 구조는 브라우저에서 `process.env`가 없더라도 안전하게 동작하도록 설계했다.

## 사용자 기준 토글 제어

`resolveFeatureFlagsForUser(user, config)`는 mock userId와 role을 기준으로 flag를 제어한다.
문서와 코드에서는 실제 개인정보 대신 `mock-user-001` 같은 예시 ID만 사용한다.

예시 규칙:

- `mock-user-001`은 `chatbotPanel` 활성화
- `reviewer` role은 `evidenceDownload` 활성화
- `admin` role은 `newDashboardUi` 활성화

## A/B 테스트

`abTest.js`는 mock userId를 입력받아 항상 같은 variant를 배정하는 deterministic 로직을 사용한다.

| Variant | 설명 | 사용 목적 |
|---|---|---|
| `A` | 기존 대시보드 중심 UI | 현재 UI 기준 유지 |
| `B` | 요약 리포트 강조형 UI | 새 UI 강조형 실험 |

### 사용자 할당 일관성

할당은 `userId + salt`를 문자열 기반 hash로 계산해 결정한다.
같은 mock userId는 같은 variant를 계속 받으므로, 세션이 달라도 실험 배정이 흔들리지 않는다.

## 이벤트 추적

`eventTracker.js`는 외부 분석 도구로 전송하지 않는다.
대신 다음 정보가 포함된 mock payload를 만든다.

- 이벤트 이름
- mock userId
- variant
- timestamp
- experimentName
- properties

필요 시 `console.log`로 확인하거나, `sink` 함수를 주입해 테스트할 수 있다.

## 최소 integration 방법

실제 화면 파일은 수정하지 않고, 다음처럼 연결할 수 있다.

```js
import { resolveFeatureFlagsForUser, isFeatureEnabled } from "./src/config/featureFlags.js";
import { assignVariant } from "./src/utils/abTest.js";
import { trackExperimentEvent } from "./src/utils/eventTracker.js";

const mockUser = { userId: "mock-user-001", role: "reviewer" };
const flags = resolveFeatureFlagsForUser(mockUser, {
  rules: {
    chatbotPanel: { enabledUserIds: ["mock-user-001"] },
    evidenceDownload: { enabledRoles: ["reviewer"] },
    newDashboardUi: { enabledRoles: ["admin"] }
  }
});

if (isFeatureEnabled("chatbotPanel", mockUser)) {
  trackExperimentEvent("chatbot_panel_shown", {
    mockUserId: mockUser.userId,
    variant: assignVariant(mockUser.userId)
  });
}
```

이 예시는 integration demo 수준이며, `public/app.js`, `public/index.html`, `public/styles.css`는 수정하지 않는다.

## Canary rollout은 향후 확장 계획

선택과제인 `1% -> 10% -> 50% -> 100%` Canary rollout과 자동 롤백은 이번 범위에서 실제 구현하지 않는다.
대신 향후 확장 계획으로만 남긴다.

- rollout 단계별 비율 전환
- 오류율 상승 시 자동 롤백
- 세그먼트별 제한 배포

## 실험 로그와 rollout 문서

- rollout 설정은 `docs/experiments/feature-flag-rollout.md`에 정리한다.
- 실험 로그 예시는 `docs/experiments/ab-test-log.md`에 정리한다.

## 공개 저장소 준수 사항

- 실제 데이터, API Key, DB URL, 고객사 정보는 작성하지 않는다.
- 실제 사용자 ID 대신 mock userId만 사용한다.
- 공개 저장소에서는 더미데이터와 mock 결과만 사용한다고 명시한다.
