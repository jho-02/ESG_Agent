# ADR 0001 — 프론트엔드 스택 선택

Date: 2026-04-30
Status: Accepted

Context:
- 프론트엔드 산출물은 React 기반이며, 프로젝트는 Node.js 환경에서 빌드/배포됩니다.

Decision:
- 프론트엔드 스택은 React, JavaScript, Chart.js(또는 기존 프로젝트 내 사용 라이브러리)를 사용합니다.

Consequences:
- CI는 Node 기반 워크플로(working-directory: frontend)로 구성합니다.
