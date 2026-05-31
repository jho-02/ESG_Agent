# 배포 전략 문서

이 문서는 10주차 배포 자동화의 운영 기준을 정리한 공통 전략 문서다.

## 기본 원칙

- 공개 저장소에는 실제 데이터, API Key, DB URL, 고객사 정보를 넣지 않는다.
- 프론트엔드 정적 결과는 mock 데이터 기준으로 먼저 검증한다.
- `frontend/server.js` 기반 동적 기능은 별도 백엔드 또는 컨테이너 배포에서 검증한다.

## 권장 배포 경로

1. PR에서는 preview artifact를 생성한다.
2. main 브랜치에서는 GitHub Pages 또는 컨테이너 배포를 수행한다.
3. Docker 기반 운영이 필요한 경우 GHCR + AWS ECS Fargate 조합을 사용한다.
4. 배포 후에는 `/healthz`로 상태를 확인한다.

## GitHub Pages 경로

- 적합 대상: 정적 UI, mock 화면, 문서용 프론트엔드
- 한계: 서버 API가 필요한 기능은 바로 동작하지 않을 수 있음
- 상태 확인: 브라우저에서 정적 로딩 확인

배포 URL 예시:

- `https://<owner>.github.io/<repo>/`

## Docker 경로

- 적합 대상: Node 기반 서버가 필요한 경우
- 장점: `frontend/server.js`와 호환성이 높음
- 운영 방식: 이미지 태그 갱신 후 롤링 배포

## AWS 경로

- 권장 조합: ECS Fargate + ALB + CloudWatch
- 상태 확인: ALB health check와 애플리케이션 `/healthz`
- 확장성: 컨테이너 기반으로 수평 확장 가능

## 수동 확인 필요

- GitHub Pages 소유자/리포지토리 URL
- GHCR 접근 권한
- AWS IAM Role, ECS Task Definition, ALB listener rule
- 실제 배포 Secret 값