# TDD 로그

이 문서는 12주차 테스트 자동화에서 적용한 Red-Green-Refactor 흐름을 기록한 mock 로그다.
실제 운영 데이터가 아니라 mock userId와 mock event 기반으로 작성했다.

## 핵심 기능 5개 이상

### 1. 기본 Feature Flag 반환

- Red: 기본 flag 객체가 없을 때 어떤 값이 나와야 하는지 먼저 테스트를 작성했다.
- Green: `DEFAULT_FEATURE_FLAGS`와 `getFeatureFlags()`를 구현해 통과시켰다.
- Refactor: flag 키만 반환되도록 정리했다.

### 2. optional config override

- Red: config 객체가 들어오면 flag가 덮어써져야 하는 테스트를 작성했다.
- Green: `getFeatureFlags(config)`가 override를 반영하도록 구현했다.
- Refactor: top-level flag와 `flags`, `defaultFlags`를 모두 안전하게 해석하도록 다듬었다.

### 3. role 또는 mock userId 기준 override

- Red: mock userId와 role에 따라 특정 flag가 켜지는 테스트를 작성했다.
- Green: `resolveFeatureFlagsForUser()`와 rule 판단 로직을 구현했다.
- Refactor: enable/disable 규칙을 한 함수로 정리했다.

### 4. deterministic variant 배정

- Red: 같은 mock userId는 같은 variant를 받아야 하는 테스트를 작성했다.
- Green: 문자열 기반 hash로 `assignVariant()`를 구현했다.
- Refactor: split ratio와 salt를 옵션으로 분리했다.

### 5. variant 설명 반환

- Red: Variant A/B 설명이 정확히 나오는 테스트를 작성했다.
- Green: `getVariantDescription()`을 구현했다.
- Refactor: 알 수 없는 variant 처리까지 추가했다.

### 6. mock tracking payload 생성

- Red: eventName, mockUserId, variant, timestamp가 들어가는 테스트를 작성했다.
- Green: `createTrackingEvent()`를 구현했다.
- Refactor: properties merge 규칙과 timestamp 처리 방식을 정리했다.

### 7. mock sink 기반 추적

- Red: 외부 네트워크 없이 sink로만 동작해야 하는 테스트를 작성했다.
- Green: `trackExperimentEvent()`가 return object와 sink 호출을 수행하도록 구현했다.
- Refactor: console 전송 여부를 옵션으로 제어하도록 정리했다.

## 공통 원칙

- 실제 개인정보는 사용하지 않았다.
- 실제 운영 이벤트는 사용하지 않았다.
- 테스트는 모두 mock userId와 mock event만 사용했다.
