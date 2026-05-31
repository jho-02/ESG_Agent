# Feature Flag Rollout 설정

이 문서는 공개 저장소 기준의 mock rollout 설정을 기록한다.
실제 운영 데이터나 고객사 정보는 포함하지 않는다.

## 롤아웃 원칙

- 기본값은 모두 `off` 또는 `false`로 시작한다.
- 검토 대상 사용자만 선택적으로 활성화한다.
- 실제 운영 반영 전에는 mock userId로만 검증한다.

## flag별 상태

| Flag | 기본 상태 | mock rollout 상태 | 비고 |
|---|---|---|---|
| `chatbotPanel` | off | 특정 mock userId만 on | 챗봇 UI 표시 실험 |
| `evidenceDownload` | off | reviewer role만 on | 근거자료 노출 실험 |
| `newDashboardUi` | off | 제한된 mock userId만 on | 새 UI 디자인 실험 |

## 설정 예시

```js
const mockRolloutConfig = {
  defaultFlags: {
    chatbotPanel: false,
    evidenceDownload: false,
    newDashboardUi: false
  },
  rules: {
    chatbotPanel: {
      enabledUserIds: ["mock-user-001"]
    },
    evidenceDownload: {
      enabledRoles: ["reviewer"]
    },
    newDashboardUi: {
      enabledUserIds: ["mock-user-002"],
      enabledRoles: ["admin"]
    }
  }
};
```

## 운영 전 수동 확인 필요

- 실제 환경 변수 이름과 값
- 브라우저 전역 설정 `window.__FEATURE_FLAGS__`
- 대상 사용자 세그먼트 정의
- 배포 전 회귀 여부

## 향후 확장 계획

- Canary rollout 비율을 `1% -> 10% -> 50% -> 100%`로 확장
- 오류 감지 시 자동 롤백
- 실험별 메트릭 비교 대시보드

이번 과제 범위에서는 위 확장 항목을 실제 구현하지 않는다.
