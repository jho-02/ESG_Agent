# ESG Agent Frontend Dashboard

##

본 저장소는 AI Open Source Software 1~8주차 과제 제출을 위해 정리된 저장소입니다.

팀 프로젝트 `ESG Agent`의 프론트엔드 파트를 기반으로 구성되었으며, 전체 프로젝트의 주제는 **상장사 평가 자동화 ESG Agent 개발**입니다.

## Repository / Fork Note

> 원본 팀 프로젝트 저장소는 별도로 존재하며, public/private 전환 과정에서 fork 연결 정보가 끊어져 본 저장소에 프로젝트 맥락을 별도로 명시했습니다.
> 
## Repository / Fork Note

원본 팀 프로젝트 저장소는 별도로 존재합니다.

원래 fork 기반으로 관리하려 했으나, GitHub 저장소의 public/private 전환 과정에서 fork 연결 정보가 유지되지 않거나 끊어진 상태입니다.

따라서 본 README에 원본 프로젝트 맥락과 프론트엔드 담당 범위를 명시합니다.

## 프로젝트 배경

ESG Agent는 경실련 수요를 바탕으로 국내 상장 기업의 재무 및 지배구조 건전성, 윤리적 평가를 자동화하기 위한 프로젝트입니다.

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

