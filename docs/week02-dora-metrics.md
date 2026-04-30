# Week 02 — DORA 지표 자동화 구조

목표: DORA 4대 지표(Lead Time, Deployment Frequency, MTTR, Change Failure Rate)를 mock 데이터 기반으로 수집하고 대시보드에 표시하는 구조 설계

구성요소:
- 데이터 소스: mock JSON (metrics/dora-metrics.json)
- 수집 파이프라인: GitHub Actions 워크플로에서 정기 실행 및 artifact 업로드
- 프론트엔드: mock 데이터를 불러와 차트로 표시

보안: 실제 배포 기록/장애 기록은 포함하지 않음
