# Week 02 — DORA 지표 자동화 구조

목표: DORA 4대 지표(Lead Time, Deployment Frequency, MTTR, Change Failure Rate)를 mock 데이터 기반으로 수집하고 대시보드에 표시하는 구조 설계
DORA 4대 지표:
- Lead Time: 코드 변경부터 배포 가능 상태까지 걸리는 시간
- Deployment Frequency: 일정 기간 동안 배포가 이루어진 횟수
- MTTR: 장애 또는 실패 발생 후 복구까지 걸린 평균 시간
- Change Failure Rate: 변경 또는 배포 중 실패가 발생한 비율
구성요소:
- 데이터 소스: mock JSON (metrics/dora-metrics.json)
- 수집 파이프라인: GitHub Actions 워크플로에서 정기 실행 및 artifact 업로드
- 프론트엔드: mock 데이터를 불러와 차트로 표시

보안: 실제 배포 기록/장애 기록은 포함하지 않음
