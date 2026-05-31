# Week 12 - Shift-Left 테스트 자동화

이번 주차는 11주차에서 만든 순수 함수 유틸을 중심으로 단위 테스트를 추가하고, CI에서 자동으로 실행되도록 구성한 실습이다.
공개 저장소이므로 실제 데이터, API Key, DB URL, 고객사 정보는 사용하지 않고 mock userId와 mock event만 사용했다.

## 구현 파일

- `frontend/src/__tests__/featureFlags.test.js`
- `frontend/src/__tests__/abTest.test.js`
- `frontend/src/__tests__/eventTracker.test.js`
- `frontend/vitest.config.js`
- `.github/workflows/test.yml`

## 테스트 대상

### featureFlags.js

- 기본 Feature Flag 값 확인
- optional config override 확인
- role 또는 mock userId 기준 flag override 확인
- `isFeatureEnabled` 동작 확인

### abTest.js

- 같은 mock userId는 항상 같은 variant를 받는지 확인
- 서로 다른 mock userId가 A/B 중 하나로 배정되는지 확인
- Variant 설명 반환 함수 확인

### eventTracker.js

- mock tracking payload 구조 확인
- timestamp, eventName, mockUserId, variant 포함 여부 확인
- 외부 네트워크 전송 없이 return object 또는 mock sink로 동작하는지 확인

## CI 자동 실행 구조

`.github/workflows/test.yml`에서 `frontend` 폴더 기준으로 테스트를 실행한다.

- Node.js 18.x / 20.x matrix 사용
- `npm install` 실행
- `npm test` 실행
- 필요 시 `npm run test:coverage` 실행
- coverage artifact 업로드

## TDD 흐름

테스트 작성은 Red-Green-Refactor 흐름으로 진행했다.

1. 기본 Feature Flag 반환 확인
2. config override 반영 확인
3. mock userId / role override 확인
4. deterministic variant 배정 확인
5. mock event payload 생성과 sink 호출 확인

## 제외 범위

Playwright 기반 E2E는 선택과제이므로 이번 범위에서 제외했다.

## 공개 저장소 준수

- 실제 사용자 데이터 미사용
- 실제 사용자 ID 미사용
- 더미데이터와 mock 결과만 사용
- 민감 정보는 문서와 테스트 코드에 포함하지 않음
