# ADR 0004 — 하이브리드 아키텍처 채택

Date: 2026-04-30
Status: Accepted

Context:
- 정형 데이터와 비정형 데이터 처리 방식이 상이하며, 단일 LLM만으로는 비용·정확성 문제가 발생함.

Decision:
- 정형 데이터는 Rule-based / Python Interpreter 기반으로 처리하고, 비정형 데이터는 KG/LightRAG 기반 Retriever와 LLM Agent로 처리하는 하이브리드 구조를 채택한다.

Consequences:
- 시스템은 중앙 플래너, 재실행 루프, Plotter를 포함하는 복합 파이프라인을 전제로 설계된다.
