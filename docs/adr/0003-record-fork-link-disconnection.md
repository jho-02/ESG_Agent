# ADR 0003 — Fork 연결 정보 단절 기록

Date: 2026-04-30
Status: Accepted

Context:
- 원래는 fork 기반으로 관리했으나 public/private 전환 과정에서 fork 연결 정보가 유지되지 않을 수 있음.

Decision:
- README에 원본 프로젝트 맥락과 fork 연결 정보 단절 사실을 명시한다.

Consequences:
- 사용자(심사자)는 원본 프로젝트를 별도 참조해야 함을 인지할 수 있다.
