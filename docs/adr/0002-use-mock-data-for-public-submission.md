# ADR 0002 — 공개 제출용 더미데이터 사용

Date: 2026-04-30
Status: Accepted

Context:
- 공개 저장소에 실제 고객사 데이터, API Key, DB 접속 정보 등을 포함할 수 없음.

Decision:
- 제출용 저장소에는 Sample/Demo/Test/Mock/Example 명칭의 완전 임의 데이터를 사용한다.
- 실제 내부 데이터는 `frontend/data/private/` 또는 `frontend/data/real/`에 보관하고 절대 커밋하지 않는다.

Consequences:
- README 및 CONTRIBUTING, ADR 문서에 이 정책을 명시한다.
