# Week 09 - GitHub Packages 및 의존성 보안 자동화

적용 범위:
- GitHub Packages 배포 workflow
- Docker 이미지 build/push workflow
- Dependabot 정책
- npm audit 기반 보안 스캔 workflow
- 보안 결과 리포트 구조

## 전제

이 저장소는 공개 저장소이므로 실제 데이터, API Key, DB URL, registry token 값은 포함하지 않는다.
문서와 workflow는 더미 데이터와 mock 결과만 기준으로 작성했다.

## `frontend/package.json` 변경 내용

GitHub Packages 배포를 위해 최소 범위의 설정만 조정했다.

- 패키지 이름을 scoped package로 변경: `@jho-02/esg-agent-ui-clean`
- 버전 갱신: `1.0.0 -> 1.0.1`
- `publishConfig.registry`를 `https://npm.pkg.github.com`으로 지정
- `private`는 `false`로 변경
- 공개 배포는 `GITHUB_TOKEN`만 사용하고 실제 토큰 값은 기록하지 않음

## 버전 업데이트 절차

1. `frontend/package.json`의 version을 `1.0.1`로 수정한다.
2. `frontend` 폴더 기준으로 의존성/테스트를 확인한다.
3. `frontend` 폴더에서 `npm publish`를 실행하거나 `package-publish.yml` workflow를 실행한다.
4. Git tag 예시는 `frontend-v1.0.1`처럼 관리한다.

### 수동 확인 필요

- GitHub Packages 권한 설정이 저장소/조직 정책과 일치하는지 확인 필요
- scoped package의 공개/비공개 노출 정책은 저장소 운영 방식에 따라 수동 확인 필요

## GitHub Packages 배포 workflow

파일: `.github/workflows/package-publish.yml`

workflow는 `frontend` 폴더를 작업 디렉터리로 사용한다.

- `actions/setup-node`에서 npm registry를 GitHub Packages로 지정
- `npm publish` 실행 시 `NODE_AUTH_TOKEN`은 `GITHUB_TOKEN` 사용
- 실제 비밀 값은 저장하지 않고 이름만 사용
- 태그 기반 또는 수동 실행 기반으로 배포하도록 구성

## Docker 이미지 자동 build/push

파일: `.github/workflows/docker-build.yml`

Docker 이미지는 GitHub Container Registry(GHCR) 기준으로 작성했다.

- 이미지 예시: `ghcr.io/<owner>/esg-agent-frontend`
- push 대상은 GHCR로 제한
- 로그인에는 `GITHUB_TOKEN`만 사용
- 실제 registry token, 클라우드 키는 기록하지 않음

## Docker 로컬 실행 검증

Dockerfile은 저장소 루트에 두고, `frontend/server.js`를 실행하는 구조로 작성했다.

검증 명령은 다음과 같다.

```bash
docker build -t esg-agent-frontend .
docker run --rm -p 3100:3100 esg-agent-frontend
```

브라우저 확인:

- `http://localhost:3100`
- `http://localhost:3100/healthz`

## Dependabot 정책

파일: `.github/dependabot.yml`

- npm 업데이트 대상은 `frontend` 디렉터리로 제한
- 주기적 점검은 weekly 기준
- major 업데이트는 자동머지 대상에서 제외하고 수동 검토 대상으로 둔다
- patch/minor 업데이트만 자동머지 workflow 대상

## Dependabot 자동머지 조건

파일: `.github/workflows/dependabot-auto-merge.yml`

자동머지 조건:

- PR 작성자가 `dependabot[bot]`이어야 한다
- 버전 비교 결과 major 버전이 변경되지 않아야 한다
- 즉, patch/minor 업데이트만 자동머지 대상이다

수동 검토 대상:

- major 업데이트
- 버전 형식을 파싱할 수 없는 PR
- 테스트/보안 점검 실패 PR

## npm audit 보안 스캔

파일: `.github/workflows/security-scan.yml`

- `frontend` 폴더 기준으로 `npm audit` 실행
- 결과는 JSON과 markdown 리포트 구조로 남긴다
- 리포트는 `security/npm-audit-report.md` 형식을 따른다
- 실제 실행 결과는 Actions artifact로 확인하는 구조다

## 보안 리포트 구조

파일: `security/npm-audit-report.md`

- 점검 시각
- 점검 대상
- 취약점 요약
- 조치 필요 항목
- patch/minor 자동머지 적합 여부
- major 수동 검토 여부

## Snyk 확장 계획

Snyk는 별도 토큰과 추가 설정이 필요하므로 이번 범위에서는 적용하지 않았다.
향후 확장 항목으로만 문서화한다.

## 요구사항 충족 메모

- 공개 저장소에는 더미 데이터와 mock 결과만 사용
- 실제 고객사 정보, API Key, DB URL, registry token 값은 미작성
- GitHub Packages는 `GITHUB_TOKEN` 기준으로만 설명
- Dependabot 자동머지는 patch/minor로 제한, major는 수동 검토