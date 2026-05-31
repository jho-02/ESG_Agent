# 커버리지 보고서

이 문서는 12주차 단위 테스트의 커버리지 목표와 측정 범위를 정리한다.
현재 목표는 80% 이상이며, 실제 수치는 CI 실행 후 확인해서 업데이트한다.

## 커버리지 목표

| 항목 | 목표 | 현재 수치 | 비고 |
|---|---:|---:|---|
| 전체 커버리지 | 80% 이상 | CI 실행 후 업데이트 | 강제 실패 threshold는 두지 않음 |
| `featureFlags.js` | 80% 이상 | CI 실행 후 업데이트 | 이번 주차 핵심 대상 |
| `abTest.js` | 80% 이상 | CI 실행 후 업데이트 | deterministic 배정 중심 |
| `eventTracker.js` | 80% 이상 | CI 실행 후 업데이트 | mock payload 생성 중심 |

## 측정 범위

- `frontend/src/config/featureFlags.js`
- `frontend/src/utils/abTest.js`
- `frontend/src/utils/eventTracker.js`

## 정책

- 커버리지는 목표만 문서화하고 CI를 강제로 실패시키는 threshold는 두지 않는다.
- 실제 커버리지 수치는 GitHub Actions 결과와 로컬 실행 결과를 기준으로 후속 업데이트한다.
- 공개 저장소에서는 mock userId, mock event, mock feature flag 설정만 사용한다.

## 참고

- Playwright E2E는 이번 범위에서 제외했다.
- 13주차 Lean Startup 실험 운영에서는 이 커버리지 리포트를 기반으로 실험 관련 기능을 확장할 수 있다.
