# npm audit 보안 점검 리포트

이 문서는 `frontend/` 기준 보안 점검 결과를 기록하는 템플릿이다.
실제 실행 결과는 GitHub Actions artifact로 확인하고, 이 파일은 보고 구조를 정의한다.

## 기본 정보

| 항목 | 값 |
|---|---|
| 점검 대상 | frontend/ |
| 점검 방식 | npm audit |
| 결과 상태 | 수동 확인 필요 |
| 비밀 정보 | 미기록 |

## 요약 섹션

- 실행 시각: 수동 입력 또는 Actions artifact 참조
- 총 취약점 수: 수동 확인 필요
- critical: 수동 확인 필요
- high: 수동 확인 필요
- moderate: 수동 확인 필요
- low: 수동 확인 필요

## 조치 원칙

- patch/minor 업데이트는 Dependabot 자동머지 후보로 검토한다.
- major 업데이트는 수동 검토 대상으로 둔다.
- Snyk는 별도 토큰이 필요하므로 향후 확장 항목으로만 기록한다.

## 비고

- 공개 저장소에는 실제 데이터, API Key, DB URL, registry token 값을 기록하지 않는다.
- 결과 반영은 GitHub Actions 로그와 artifact를 기준으로 확인한다.