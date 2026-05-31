# ESG Agent Frontend Dashboard

##

본 저장소는 AI Open Source Software 1~13주차 과제 제출을 위해 정리된 저장소입니다.

팀 프로젝트 `ESG Agent`의 프론트엔드 파트를 기반으로 구성되었으며, 전체 프로젝트의 주제는 **상장사 평가 자동화 ESG Agent 개발**입니다.

## Repository / Fork Note

> 원본 팀 프로젝트 저장소는 별도로 존재하며, public/private 전환 과정에서 fork 연결 정보가 끊어져 본 저장소에 프로젝트 맥락을 별도로 명시했습니다.
> 
## Repository / Fork Note

원본 팀 프로젝트 저장소는 별도로 존재합니다.

원래 fork 기반으로 관리하려 했으나, GitHub 저장소의 public/private 전환 과정에서 fork 연결 정보가 유지되지 않거나 끊어진 상태입니다.

따라서 본 README에 원본 프로젝트 맥락과 프론트엔드 담당 범위를 명시합니다.

## 프로젝트 배경

ESG Agent는 기업의 수요 바탕으로 국내 상장 기업의 재무 및 지배구조 건전성, 윤리적 평가를 자동화하기 위한 프로젝트입니다.

기존 수작업 기반 분석은 많은 시간과 비용이 필요하며, 단순 LLM 도입은 정형 데이터 처리에서 환각, 높은 토큰 비용, 속도 저하 문제가 발생할 수 있습니다.

이를 해결하기 위해 정형 데이터는 Rule-based 방식으로 처리하고, 비정형 데이터는 RAG 기반 분석 구조를 활용하는 하이브리드 구조를 목표로 합니다.

## 담당 범위

본 저장소는 프론트엔드 담당 범위를 중심으로 정리되었습니다.

주요 담당 내용은 다음과 같습니다.

- ESG 평가 결과 대시보드 UI
- 기업별 상세 조회 화면
- ESG 점수 카드 UI
- 챗봇 기능 도입을 위한 채팅란
- 근거자료 및 전체 자료 다운로드 영역
- GitHub 기반 협업, 문서화, CI/CD 구성

## 저장소 구조

```text
ESG_Agent/
├─ README.md
├─ docs/
├─ .github/
├─ dashboard/
├─ metrics/
└─ frontend/
   ├─ package.json
   ├─ server.js
   ├─ public/
   ├─ src/
   └─ data/
```

##실행 방법

프론트엔드 프로젝트는 frontend/ 폴더 안에 있습니다.
```
cd frontend
npm install
npm start
```
또는 package.json에 개발 서버 스크립트가 정의되어 있는 경우 다음 명령어를 사용할 수 있습니다.
```
npm run dev
```

##데이터 보안 정책

실제 운영 환경에서는 백엔드/API와 내부 데이터가 연동되어 있으나, 공개 저장소에는 실제 기업 데이터, API Key, DB 접속 정보 등 민감 정보를 포함하지 않습니다.

공개 제출용 저장소에서는 시연용 더미데이터와 템플릿 파일만 사용합니다.

frontend/data/template.xlsx: 프론트엔드 화면 시연용 더미 템플릿
frontend/src/data/mockEsgData.js: 공개용 mock ESG 데이터

실제 데이터가 필요한 경우에는 다음 경로에 보관하고 Git에는 커밋하지 않습니다.

##3주차 GitHub Project 관리

3주차 요구사항에 맞춰 다음 항목을 구성했습니다.

- Issues 11개 생성
- Bug / Feature / Chore 이슈 구성
- 라벨 체계 구성
   - bug
   - feature
   - frontend
   - ui
   - chore
   - ci

- Milestones 2개 생성
   - v0.1 Frontend MVP
   - v1.0 AI OSS Submission

- GitHub Project Board 구성
   - Backlog
   - To Do
   - In Progress
   - Review
   - Done

##4주차 PR 및 코드리뷰

GitHub Flow 기반으로 별도 브랜치를 생성하고 Pull Request를 작성했습니다.

PR 리뷰에서는 다음 태그를 사용했습니다.

- [MUST]: 반드시 수정해야 하는 항목
- [SHOULD]: 가능하면 개선하면 좋은 항목

PR 내에 [MUST], [SHOULD] 태그를 사용한 리뷰 댓글 3건을 작성했습니다.

5주차 Wiki 문서

Wiki에는 다음 문서를 작성했습니다.

- Home
- Getting Started
- Development Guide
- Troubleshooting
 
##6주차 OSS 문서화

다음 문서를 구성했습니다.

- LICENSE
- CONTRIBUTING.md
- CODE_OF_CONDUCT.md
- README.md

##7주차 CI/CD 실행 결과

GitHub Actions의 CI 워크플로우에서 Node.js 18.x / 20.x Matrix 빌드가 성공적으로 완료되었습니다.
Build artifact 2개가 생성되었습니다.
초기 워크플로우 설정 과정에서 일부 실패 기록이 발생했으나, 이후 수정 커밋에서 CI 워크플로우가 정상 실행되었습니다.

##8주차 Workflow 최적화

적용 내용은 다음과 같습니다.

- optimized-ci.yml 작성
- reusable-frontend-ci.yml 작성
- .github/actions/setup-project/action.yml Composite Action 작성
- paths 조건으로 frontend/** 변경 시 선택 실행 구성
- Reusable Workflow와 Composite Action을 통해 중복 설정을 줄이는 구조 작성

##주요 문서
- docs/week01-orientation.md
- docs/week02-dora-metrics.md
- docs/week03-project-tracking.md
- docs/week04-github-flow-code-review.md
- docs/week05-async-collaboration.md
- docs/week06-oss-inner-source.md
- docs/week07-basic-cicd.md
- docs/week08-workflow-optimization.md

기술 스택
- Frontend: JavaScript, HTML, CSS
- Runtime: Node.js
- Visualization: Chart.js 또는 프론트엔드 내 시각화 구조
- Backend 연동 예정: FastAPI
- Data/RAG 구조: MySQL/PostgreSQL, Neo4j, ChromaDB, LangChain, LangGraph
- CI/CD: GitHub Actions

## 9주차 GitHub Packages 및 의존성 보안 자동화

9주차에서는 GitHub Packages, Docker 이미지 배포, Dependabot, npm audit 기반 보안 스캔 구조를 추가했습니다.

적용 내용은 다음과 같습니다.

* `frontend/package.json` 버전 `1.0.0` → `1.0.1` 업데이트
* GitHub Packages 배포 workflow 작성
* Docker 이미지 build/push workflow 작성
* GitHub Container Registry(GHCR) 기준 Docker 배포 구조 작성
* Dependabot 스케줄 및 그룹 정책 작성
* Dependabot 자동머지 조건 workflow 작성
* npm audit 기반 보안 스캔 workflow 작성
* 보안 스캔 리포트 문서화

관련 파일은 다음과 같습니다.

* `docs/week09-packages-security.md`
* `.github/dependabot.yml`
* `.github/workflows/package-publish.yml`
* `.github/workflows/docker-build.yml`
* `.github/workflows/security-scan.yml`
* `.github/workflows/dependabot-auto-merge.yml`
* `Dockerfile`
* `security/npm-audit-report.md`

실제 registry token, API Key, DB URL은 저장소에 포함하지 않았으며, GitHub Actions에서는 `GITHUB_TOKEN` 또는 예시 Secret 이름만 사용합니다.

## 10주차 멀티 플랫폼 배포 자동화

10주차에서는 GitHub Pages 기반 프론트엔드 배포 workflow와 PR Preview 전략, Docker 기반 배포 전략을 구성했습니다.

적용 내용은 다음과 같습니다.

* GitHub Pages 배포 workflow 작성 및 실행 확인
* PR Preview artifact workflow 작성
* Docker 기반 배포 파이프라인 전략 문서화
* AWS ECS Fargate 기반 컨테이너 배포 전략 문서화
* 헬스체크 및 모니터링 문서 작성

관련 파일은 다음과 같습니다.

* `docs/week10-multiplatform-deploy.md`
* `docs/deployment-strategy.md`
* `docs/health-check.md`
* `.github/workflows/deploy-pages.yml`
* `.github/workflows/pr-preview.yml`

배포 URL은 다음과 같습니다.

* GitHub Pages: `https://jho-02.github.io/ESG_Agent/`

GitHub Pages는 `frontend/public` 정적 파일 배포 용도로 사용하며, `server.js` 기반 실행, API 중계, Agent 서버 연동은 Docker 또는 외부 컨테이너 배포 전략으로 분리했습니다.

## 11주차 Feature Flags 및 점진적 배포 실습

11주차에서는 Feature Flag 3개와 A/B 테스트, mock event tracking 구조를 추가했습니다.

Feature Flag 항목은 다음과 같습니다.

| Flag               | 목적                            |
| ------------------ | ----------------------------- |
| `chatbotPanel`     | 챗봇 UI 표시 여부 제어                |
| `evidenceDownload` | 근거자료 및 전체 자료 다운로드 영역 표시 여부 제어 |
| `newDashboardUi`   | 새 UI 디자인 적용 여부 제어             |

A/B 테스트 구성은 다음과 같습니다.

| Variant   | 설명            |
| --------- | ------------- |
| Variant A | 기존 대시보드 중심 UI |
| Variant B | 요약 리포트 강조형 UI |

관련 파일은 다음과 같습니다.

* `docs/week11-feature-flags.md`
* `docs/experiments/feature-flag-rollout.md`
* `docs/experiments/ab-test-log.md`
* `frontend/src/config/featureFlags.js`
* `frontend/src/utils/abTest.js`
* `frontend/src/utils/eventTracker.js`

실제 사용자 ID 대신 `mock userId`를 사용하며, 외부 분석 도구로 실제 이벤트를 전송하지 않고 mock payload 생성 방식으로 구성했습니다.

## 12주차 Shift-Left 테스트 자동화

12주차에서는 Vitest 기반 단위 테스트와 GitHub Actions 테스트 workflow를 추가했습니다.

적용 내용은 다음과 같습니다.

* Vitest 기반 단위 테스트 구조 작성
* 11주차 Feature Flag, A/B 테스트, event tracking 유틸 테스트 작성
* Node.js 18.x / 20.x matrix 기반 Test workflow 작성
* 테스트 커버리지 목표 80% 이상 문서화
* TDD Red-Green-Refactor 흐름 문서화
* Playwright E2E는 선택과제로 제외

테스트 결과는 다음과 같습니다.

* 단위 테스트 12개 통과
* 전체 커버리지 80% 이상 달성
* GitHub Actions `Test` workflow 성공
* Node.js 18.x / 20.x matrix 성공

관련 파일은 다음과 같습니다.

* `docs/week12-shift-left-testing.md`
* `docs/testing/coverage-report.md`
* `docs/testing/tdd-log.md`
* `.github/workflows/test.yml`
* `frontend/src/__tests__/featureFlags.test.js`
* `frontend/src/__tests__/abTest.test.js`
* `frontend/src/__tests__/eventTracker.test.js`
* `frontend/vitest.config.js`

로컬 테스트 실행 방법은 다음과 같습니다.

```bash
cd frontend
npm test
npm run test:coverage
```

테스트는 실제 운영 데이터가 아니라 mock userId, mock event, mock feature flag 설정만 사용합니다.

## 13주차 Lean Startup 실험 운영

13주차에서는 LLM 기반 가상 페르소나와 mock A/B 테스트 결과를 활용해 Lean Startup 실험 문서를 작성했습니다.

적용 내용은 다음과 같습니다.

* 사용자 시나리오 기반 실험 문서 작성
* LLM 기반 가상 페르소나 10명 구성
* 2주 운영을 가정한 mock A/B 테스트 결과 작성
* 핵심 지표 변화 측정표 작성
* Pivot 또는 Persevere 결정 문서화
* 자동 주간 리포팅은 향후 확장 계획으로만 작성

관련 파일은 다음과 같습니다.

* `docs/week13-lean-startup-experiment.md`
* `docs/experiments/persona-feedback.md`
* `docs/experiments/ab-test-results.md`
* `docs/experiments/metrics-summary.md`
* `docs/experiments/pivot-or-persevere.md`

실험 요약은 다음과 같습니다.

* Variant A: 기존 대시보드 중심 UI
* Variant B: 요약 리포트 강조형 UI
* 실험 대상: 실제 사용자가 아닌 LLM 기반 가상 페르소나 10명
* 실험 결과: Variant B가 요약 이해 속도와 만족도에서 우세한 것으로 mock 결과 구성
* 최종 결정: `Persevere`

본 실험 결과는 실제 사용자 대상 운영 결과가 아니며, 실제 사용자 개인정보, 실제 사용자 ID, 실제 기업 내부 데이터는 포함하지 않습니다.

## 9~13주차 주요 산출물 요약

| 주차      | 핵심 내용                                          | 대표 문서                                    |
| ------- | ---------------------------------------------- | ---------------------------------------- |
| Week 09 | GitHub Packages, Docker, Dependabot, npm audit | `docs/week09-packages-security.md`       |
| Week 10 | GitHub Pages, PR Preview, 배포 전략, 헬스체크          | `docs/week10-multiplatform-deploy.md`    |
| Week 11 | Feature Flags, A/B Test, Event Tracking        | `docs/week11-feature-flags.md`           |
| Week 12 | Vitest 테스트, 커버리지, TDD 로그                       | `docs/week12-shift-left-testing.md`      |
| Week 13 | Lean Startup 실험, 페르소나 피드백, Pivot/Persevere     | `docs/week13-lean-startup-experiment.md` |
