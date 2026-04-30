# Week 08 — Workflow 최적화

적용 내용:
- `optimized-ci.yml` 작성
- `reusable-frontend-ci.yml` 작성
- `.github/actions/setup-project/action.yml` Composite Action 작성
- `paths` 조건으로 frontend 변경 시 선택 실행 구성
- GitHub Actions 초기 설정 과정에서 실패 기록이 있었으나, 이후 CI 워크플로우는 수정 후 성공 확인

## 최적화 적용 결과

- Workflow 파일: `.github/workflows/optimized-ci.yml`
- Reusable Workflow: `.github/workflows/reusable-frontend-ci.yml`
- Composite Action: `.github/actions/setup-project/action.yml`

## 최적화 항목

- Matrix 확장 테스트 적용
- Reusable Workflow 구성
- Composite Action을 통한 Node.js 설정 및 의존성 설치 공통화
- `paths` 조건으로 `frontend/**` 변경 시 중심으로 실행
- PR 및 main branch push 조건 분리

## 캐싱 전후 비교

| 구분 | 캐싱/최적화 전 | 캐싱/최적화 후 |
|---|---:|---:|
| CI 실행 시간 | 약 24초 | 약 20초 |
| 의존성 설치 방식 | 매번 npm install | 공통 setup action 및 선택 실행 구조 적용 |
| 실행 범위 | 모든 변경에 대해 실행 가능 | frontend 변경 중심으로 선택 실행 |
| 개선률 | - | 약 16.7% |

※ 본 수치는 GitHub Actions 실행 기록과 과제용 비교 리포트 기준의 측정값이다.

## 선택적 실행 및 배포

`paths` 조건을 활용해 `frontend/**` 또는 workflow 관련 파일이 변경될 때만 CI가 실행되도록 구성했다.  
실제 배포 서버 정보는 공개하지 않으므로, 선택적 배포는 mock deploy 구조로 문서화했다.
