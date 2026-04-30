# Week 07 — 기본 CI/CD 구성 (프론트엔드 기준)

요구사항:
- Lint / Test / Build 자동화
- Matrix 전략 (Node 버전 등)
- Secrets 사용 예시 (환경 변수 네임만 문서화)
- Artifact 업로드/다운로드
- mock deploy 단계 포함

## 실행 결과 및 증빙

- Workflow 파일: `.github/workflows/ci.yml`
- Actions 실행 내역: GitHub Actions 탭의 `CI` 워크플로우 최신 실행
- Node.js Matrix: 18.x / 20.x
- 실행 단계:
  1. Install
  2. Lint
  3. Test
  4. Build
  5. Artifact Upload

## Secrets 사용

실제 API Key는 공개 저장소에 포함하지 않는다.  
GitHub Actions에서는 다음과 같은 이름만 예시로 사용한다.

- `SAMPLE_API_KEY`
- `VITE_API_BASE_URL`

실제 값은 GitHub Repository Settings → Secrets and variables → Actions에 등록한다.

## Artifact 업로드/다운로드

CI 실행 결과로 build artifact가 업로드되며, Actions 실행 상세 페이지에서 다운로드할 수 있다.

## Mock Deploy

실제 배포 서버 정보는 공개하지 않으므로, 본 과제에서는 deploy 단계를 mock deploy로 문서화한다.
