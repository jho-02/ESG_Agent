# Week 10 - 멀티 플랫폼 배포 자동화

적용 범위:
- GitHub Pages 정적 배포 전략
- PR preview 전략
- Docker 기반 배포 전략
- AWS 기준 서버리스/컨테이너 배포 전략
- 헬스체크 및 모니터링 문서

## 전제

현재 프론트엔드는 `frontend/server.js` 기반 Node 서버를 사용할 수 있다.
따라서 정적 배포만으로 모든 기능이 바로 동작하지 않을 수 있다.
이 경우에는 GitHub Pages를 정적 미리보기/공개 화면 기준으로 사용하고, 동적 API는 별도 백엔드 또는 mock 데이터로 분리한다.

## GitHub Pages 배포 전략

파일: `.github/workflows/deploy-pages.yml`

- `frontend/public`을 정적 배포 대상로 사용
- Pages 배포는 GitHub Actions로 자동화
- 실제 API 연동이 없는 정적 화면 기준으로 먼저 배포
- 동적 기능은 `mock` 또는 별도 API가 필요하므로 수동 확인 필요

배포 URL 입력 자리:

- `https://<owner>.github.io/<repo>/`

### 수동 확인 필요

- Pages 설정에서 Source가 Actions 배포로 연결되었는지 확인 필요
- 실제 배포 URL은 저장소별로 달라지므로 GitHub Pages 설정 화면에서 확인 필요
- `frontend/server.js` 의존 기능은 정적 Pages에서 그대로 동작하지 않을 수 있음

## PR preview 전략

파일: `.github/workflows/pr-preview.yml`

PR마다 별도 preview artifact를 생성해 검토할 수 있게 구성한다.

- PR에서 `frontend/public` 기반 산출물을 만든다
- preview용 artifact를 업로드한다
- preview URL은 저장소 운영 방식에 따라 수동 연결이 필요할 수 있다
- 배포 URL 입력 자리를 문서에 남겨 둔다

preview URL 예시:

- `https://<preview-host>/<repo>/pr-<number>/`

### 수동 확인 필요

- preview 호스트가 GitHub Pages, Vercel, Netlify 중 무엇인지 수동 확정 필요
- preview URL 공개 범위는 저장소 정책에 따라 수동 확인 필요

## Docker 기반 배포 파이프라인

Docker 배포는 다음 흐름으로 정리한다.

1. `frontend` 애플리케이션을 Docker 이미지로 빌드한다.
2. 이미지를 GHCR 또는 클라우드 컨테이너 레지스트리에 푸시한다.
3. 운영 환경은 컨테이너 실행만 담당하고, 헬스체크로 상태를 확인한다.
4. 배포 후 `/healthz` 응답으로 서비스 상태를 검증한다.

이 구조는 `frontend/server.js`와의 호환성을 유지하면서 배포 자동화를 단순하게 만든다.

## AWS 기준 배포 전략

가정 플랫폼: AWS

권장 방식:

- 컨테이너 배포: AWS ECS Fargate
- 트래픽 진입점: Application Load Balancer
- 상태 점검: ALB health check + `/healthz`
- 로그: CloudWatch Logs

자동화 포인트:

- GitHub Actions에서 이미지 빌드 후 GHCR에 푸시
- AWS 배포 단계에서는 새 이미지 태그를 참조하도록 업데이트
- 배포 후 헬스체크 실패 시 롤백 검토

### 수동 확인 필요

- AWS 계정, IAM Role, ECS Task Definition, ALB 설정은 실제 계정에서 수동 확인 필요
- AWS access key 같은 민감 정보는 문서에 쓰지 않음

## 헬스체크 및 모니터링

파일: `docs/health-check.md`

- 기본 헬스체크 경로는 `/healthz`
- Docker 컨테이너는 헬스체크로 상태 검증
- GitHub Pages 정적 배포는 브라우저 접근 가능 여부를 별도로 검증
- 운영환경에서는 로그와 메트릭 경보를 함께 확인

## 요구사항 충족 메모

- 실제 클라우드 키와 토큰 값은 미작성
- 배포 URL은 입력 자리만 남김
- 정적 배포가 어려운 경우 Pages 중심 전략을 우선 적용
- Docker/클라우드 배포는 수동 확인 필요 항목을 명시