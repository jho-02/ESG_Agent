# A/B 테스트 로그 예시

이 문서는 실제 사용자 데이터가 아니라 mock 실험 로그 예시다.
공개 저장소이므로 개인정보와 실제 사용자 식별자는 포함하지 않는다.

## 실험 개요

| 항목 | 내용 |
|---|---|
| 실험명 | week11-dashboard-ui-ab-test |
| 대상 | mock userId 기반 사용자 |
| Variant A | 기존 대시보드 중심 UI |
| Variant B | 요약 리포트 강조형 UI |

## 가설

- Variant A는 익숙한 레이아웃 덕분에 기본 탐색 속도가 빠를 것이다.
- Variant B는 요약 정보가 먼저 보여서 핵심 지표 확인 시간이 짧아질 것이다.

## 측정 지표

- 첫 클릭까지 걸린 시간
- 챗봇 패널 클릭률
- 근거자료 다운로드 클릭률
- 화면 체류 시간
- 실험 이탈률

## mock 실험 로그 예시

| timestamp | mockUserId | variant | eventName | result |
|---|---|---|---|---|
| 2026-05-31T09:00:00+09:00 | mock-user-001 | A | dashboard_loaded | 성공 |
| 2026-05-31T09:01:20+09:00 | mock-user-001 | A | evidence_download_clicked | 성공 |
| 2026-05-31T09:03:10+09:00 | mock-user-002 | B | dashboard_loaded | 성공 |
| 2026-05-31T09:04:05+09:00 | mock-user-002 | B | summary_focus_clicked | 성공 |

## 이벤트 추적 방식

실험 이벤트는 `frontend/src/utils/eventTracker.js`의 mock payload 구조를 따른다.
외부 분석 도구로 전송하지 않고, 콘솔 출력 또는 return object로만 검증한다.

## 판정 기준 예시

- Variant B의 첫 클릭 시간이 더 짧으면 요약 중심 UI가 유리하다고 본다.
- Variant A의 이탈률이 더 낮으면 기존 대시보드 유지가 적합하다고 본다.
- 실제 운영 반영 전에는 mock 데이터 기반으로만 확인한다.

## 수동 확인 필요

- 실제 사용자 데이터는 사용하지 말 것
- 실제 고객사 식별 정보는 사용하지 말 것
- 운영 도구 연동은 별도 승인 후 진행할 것
