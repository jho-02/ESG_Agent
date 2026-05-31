# 헬스체크 가이드

## 목적

배포 후 서비스가 정상 동작하는지 빠르게 확인하기 위한 체크 항목을 정리한다.

## 애플리케이션 헬스체크

기본 경로:

- `GET /healthz`

응답 기대값:

- HTTP 200
- JSON 본문에 `ok: true`

예시 확인:

```bash
curl http://localhost:3100/healthz
```

## Docker 헬스체크

- 컨테이너 실행 후 `localhost:3100/healthz` 응답을 확인한다.
- 이미지 배포 후에도 동일한 경로로 상태 확인을 유지한다.

예시:

```bash
docker run --rm -p 3100:3100 esg-agent-frontend
curl http://localhost:3100/healthz
```

## GitHub Pages 확인

GitHub Pages는 정적 배포이므로 서버 헬스체크 대신 화면 접근 여부를 확인한다.

- 메인 페이지가 열리는지 확인
- 정적 자산이 깨지지 않는지 확인
- mock 데이터 화면이 정상 노출되는지 확인

## 모니터링 기준

- 배포 직후 1회 응답 확인
- 오류가 반복되면 최근 Actions 로그 확인
- 컨테이너 기반 운영에서는 CloudWatch 또는 동등한 로그 시스템 확인

## 수동 확인 필요

- 실제 모니터링 서비스 연결 여부
- 알림 채널 이메일/슬랙/팀즈 설정
- 운영 환경의 임계치 값