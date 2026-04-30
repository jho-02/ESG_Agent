# ESG Agent UI 연결 가이드

이 프로젝트는 ESG 기업 점검 UI입니다.

UI 자체에서 복잡한 수집/계산/RAG를 수행하지 않습니다.  
수집, 계산, Agent 처리는 외부 코드나 별도 서버에서 수행하고, 이 UI는 그 결과를 받아서 보여주는 역할입니다.

## 전체 구조

```text
수집 계층
  -> 원천 데이터 수집

계산 계층
  -> scorecard, metrics, facts, summary 생성

저장 계층
  -> 아직 DB가 없으므로 파일 시스템(store/) 사용

출력 계층
  -> xlsx, 그래프, 근거자료 파일 생성

Agent 계층
  -> LLM/RAG로 사용자 질문 답변 생성

UI 계층
  -> 위 결과를 받아 화면에 표시
```

## 현재 연결 방향

현재 UI는 아래처럼 연결되는 것을 목표로 합니다.

```text
사용자
  -> 브라우저 UI
  -> public/app.js
  -> server.js 또는 외부 계산/Agent 서버
  -> store 파일 또는 계산 결과
  -> UI에 표시
```

연결 담당자는 크게 두 가지 방식 중 하나를 선택하면 됩니다.

## 방식 A. public/app.js에서 외부 서버 직접 호출

빠르게 붙이기 좋습니다.

```text
public/app.js
  -> 외부 계산/Agent 서버
```

수정 위치:

```text
프로젝트/public/app.js
```

핵심 함수:

```js
async function requestExternalCalculation(payload) {}
```

이 함수 안에 실제 외부 서버 주소를 넣으면 됩니다.

예시:

```js
async function requestExternalCalculation(payload) {
  const response = await fetch("https://YOUR-CALC-SERVER/esg/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`외부 계산 서버 오류: ${response.status}`);
  }

  return await response.json();
}
```

주의:

- API 키가 브라우저에 노출될 수 있습니다.
- 외부 서버 CORS 설정이 필요할 수 있습니다.
- 내부망 주소를 직접 노출하면 안 되는 경우에는 권장하지 않습니다.

## 방식 B. server.js를 중계 서버로 사용

실제 운영에서는 이 방식을 권장합니다.

```text
public/app.js
  -> server.js의 /api/analyze
  -> 외부 계산/Agent 서버
```

장점:

- API 키를 숨길 수 있습니다.
- 외부 서버 주소를 숨길 수 있습니다.
- CORS 문제를 줄일 수 있습니다.
- 요청/응답 로그를 서버에서 남길 수 있습니다.

public/app.js에서는 이렇게 호출합니다.

```js
async function requestExternalCalculation(payload) {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`분석 API 오류: ${response.status}`);
  }

  return await response.json();
}
```

그리고 `server.js`에 `POST /api/analyze`를 추가하면 됩니다.

`server.js` 안에 연결 위치 주석을 표시해두었습니다.

```text
프로젝트/server.js
```

## 파일별 역할

### server.js

Node.js 서버입니다.

현재 역할:

- `public/index.html` 제공
- `public/app.js` 제공
- `public/styles.css` 제공
- `/api/template` 제공
- `data/template.xlsx` 읽기

추후 역할:

- `store/` 파일 시스템 읽기
- `/api/years` 제공
- `/api/companies` 제공
- `/api/company` 제공
- `/api/company/file` 제공
- `/api/analyze` 중계 API 제공

### public/index.html

화면의 기본 뼈대입니다.

역할:

- 왼쪽 사이드바 영역
- 가운데 기업/카테고리 영역
- 오른쪽 AI 패널 영역
- 모달 영역

외부 계산 연결 담당자가 보통 수정할 필요는 거의 없습니다.

### public/app.js

UI 동작의 핵심 파일입니다.

역할:

- 기업 목록 표시
- 기업 유형 필터 처리
- 카테고리 카드 표시
- 세부 지표 모달 표시
- AI 채팅 입력 처리
- 외부 계산/Agent 서버 호출
- AI 답변 표시
- 답변 근거자료 다운로드 처리
- 근거 URL 열기/복사 처리

연결 담당자가 가장 많이 봐야 하는 파일입니다.

### src/workbook-loader.js

현재 `data/template.xlsx`를 읽어 UI 초기 데이터를 만드는 파일입니다.

추후 `store/` 기반으로 완전히 넘어가면 이 파일은 보조용이 되거나 제거될 수 있습니다.

### src/template-loader.js

엑셀 시트/헤더/색상 구조를 읽는 파일입니다.

현재는 템플릿 구조 파싱용입니다.

## store 파일 시스템 구조

연결 담당자가 말한 저장 구조는 아래와 같습니다.

```text
store/
  .agent/
  2022/
    001143/
      computed/
        facts.json
        metrics.json
        scorecard.json
        summary.json
      harness/
        input_rows.json
      meta/
        bundle_manifest.json
        bundle_summary.md
        company_context.json
      normalized/
        records.json
      raw_assets/
        files/
          index.json
```

현재 DB가 없으므로 `store/`가 임시 DB 역할을 합니다.

## store 기반 API 권장안

`server.js`에 아래 API를 추가하는 것을 권장합니다.

```text
GET /api/years
GET /api/companies?year=2022
GET /api/company?year=2022&corp=001143
GET /api/company/file?year=2022&corp=001143&path=...
POST /api/analyze
```

### GET /api/years

`store/` 아래 연도 폴더 목록을 반환합니다.

예시 응답:

```json
{
  "years": [2022, 2023, 2024]
}
```

### GET /api/companies

특정 연도의 기업 목록을 반환합니다.

예시:

```text
GET /api/companies?year=2022
```

예시 응답:

```json
{
  "year": 2022,
  "companies": [
    {
      "corp": "001143",
      "name": "A기업",
      "industry": "제조",
      "businessSegment": "manufacturing",
      "totalScore": 81.5
    }
  ]
}
```

### GET /api/company

특정 기업의 계산 결과를 반환합니다.

예시:

```text
GET /api/company?year=2022&corp=001143
```

이 API에서 읽으면 좋은 파일:

```text
store/2022/001143/computed/scorecard.json
store/2022/001143/computed/summary.json
store/2022/001143/computed/metrics.json
store/2022/001143/computed/facts.json
store/2022/001143/meta/company_context.json
store/2022/001143/raw_assets/files/index.json
```

예시 응답:

```json
{
  "year": 2022,
  "corp": "001143",
  "company": {
    "name": "A기업",
    "industry": "제조",
    "businessSegment": "manufacturing"
  },
  "scorecard": {
    "totalScore": 81.5,
    "categories": [
      {
        "key": "soundness",
        "label": "건전성",
        "score": 18.2,
        "maxScore": 25
      }
    ]
  },
  "summary": {},
  "metrics": {},
  "facts": {},
  "files": []
}
```

### GET /api/company/file

근거자료 또는 결과 파일 다운로드 API입니다.

예시:

```text
GET /api/company/file?year=2022&corp=001143&path=result.xlsx
```

`raw_assets/files/index.json`를 기준으로 다운로드 가능한 파일을 찾으면 됩니다.

### POST /api/analyze

AI 패널 질문을 Agent/계산 서버로 넘기는 중계 API입니다.

예시 요청:

```json
{
  "question": "건전성 점수가 낮은 이유를 알려줘",
  "year": 2022,
  "company": {
    "code": "001143",
    "name": "A기업"
  },
  "activeCategory": {
    "key": "soundness",
    "label": "건전성",
    "score": 18.2
  }
}
```

예시 응답:

```json
{
  "answer": "건전성 점수가 낮은 주요 원인은 부채비율과 내부지분율 항목입니다.",
  "excelDownloadUrl": "/api/company/file?year=2022&corp=001143&path=result.xlsx",
  "evidenceUrls": [
    "/api/company/file?year=2022&corp=001143&path=evidence.pdf",
    "https://dart.fss.or.kr/..."
  ]
}
```

## public/app.js 연결 지점

### 1. 채팅 질문 전송

```js
async function handleChatSubmit() {}
```

역할:

- 사용자가 입력한 질문을 읽습니다.
- 채팅창에 사용자 질문을 추가합니다.
- `requestExternalCalculation(payload)`를 호출합니다.
- 응답을 채팅창에 표시합니다.

### 2. 외부 서버로 보낼 payload 생성

```js
function buildExternalCalculationPayload(question) {}
```

역할:

- 현재 선택 기업
- 현재 연도
- 현재 기업 유형
- 현재 선택 카테고리
- 6개 카테고리 점수

위 정보를 묶어서 외부 계산/Agent 서버로 보낼 JSON을 만듭니다.

필요한 필드가 더 있으면 이 함수에 추가하면 됩니다.

예:

```js
scorecard
metrics
facts
records
selectedSection
```

### 3. 외부 계산/Agent 서버 호출

```js
async function requestExternalCalculation(payload) {}
```

가장 중요한 연결 지점입니다.

현재는 샘플 응답을 반환합니다.

실제 연결 시:

- 샘플 응답 제거
- 외부 서버 주소로 `fetch()`
- 또는 `/api/analyze`로 내부 중계 API 호출

### 4. 외부 계산 결과를 UI 상태로 저장

```js
function applyExternalCalculationResult(result) {}
```

역할:

- `answer` 저장
- `excelDownloadUrl` 저장
- `evidenceUrls` 저장

외부 서버 응답 필드명이 다르면 여기서 매핑하면 됩니다.

### 5. 답변 근거 엑셀 다운로드

```js
function downloadCurrentCompanyExcel() {}
```

역할:

- `state.externalCalculationResult.excelDownloadUrl`이 있으면 그 URL 다운로드
- 없으면 현재 화면 데이터를 임시 xls로 다운로드

실제 운영에서는 외부 계산 서버가 만든 xlsx URL을 `excelDownloadUrl`로 내려주는 방식이 좋습니다.

### 6. 근거 URL 처리

```js
function getEvidenceUrls(company) {}
```

역할:

- 외부 서버 응답의 `evidenceUrls` 우선 사용
- 없으면 엑셀 데이터 안의 URL 값을 보조로 사용

## 외부 계산 서버 응답 형식

UI가 가장 편하게 받는 형식은 아래입니다.

```json
{
  "answer": "AI가 사용자에게 보여줄 답변입니다.",
  "excelDownloadUrl": "https://example.com/result.xlsx",
  "evidenceUrls": [
    "https://example.com/source1",
    "https://example.com/source2"
  ]
}
```

필드 설명:

- `answer`: AI 패널 채팅창에 표시됩니다.
- `excelDownloadUrl`: `답변 근거 엑셀 다운로드` 버튼에 연결됩니다.
- `evidenceUrls`: `근거 사이트 열기`, `근거 URL 복사` 버튼에 연결됩니다.

## 기업 유형 필터

UI 왼쪽에 기업 유형 드롭다운이 있습니다.

옵션:

- 전체
- 금융
- 비금융
- 제조
- 비제조

관련 함수:

```js
function matchesBusinessSegment(company, segment) {}
function isFinanceCompany(company) {}
function isManufacturingCompany(company) {}
```

분류 기준을 바꾸려면 위 함수를 수정하면 됩니다.

store API로 바꾸는 경우에는 서버에서 이미 분류된 값을 내려주고, UI는 그 값을 그대로 쓰는 방식이 더 안정적입니다.

## 현재 상태

현재 구현:

- UI 화면 구성
- 기업 유형 드롭다운
- AI 채팅 입력
- 외부 계산 서버 연결 주석
- 답변 근거 엑셀 다운로드 버튼
- 근거 사이트 열기
- 근거 URL 복사
- `/api/template` 기반 초기 데이터 로딩

아직 미구현:

- store 폴더 기반 API 실제 구현
- `/api/analyze` 실제 중계 구현
- 외부 Agent 서버 실제 연결
- 실제 xlsx 생성 서버 연결
- DB 연결

## 연결 담당자 체크리스트

1. `server.js`에서 store API를 만들지 결정합니다.
2. 보안/API 키가 필요하면 `server.js`에 `/api/analyze`를 만듭니다.
3. 빠른 테스트만 필요하면 `public/app.js`의 `requestExternalCalculation()`에서 외부 서버를 직접 호출합니다.
4. 외부 서버 응답을 `answer`, `excelDownloadUrl`, `evidenceUrls` 형태로 맞춥니다.
5. `answer`가 AI 채팅창에 뜨는지 확인합니다.
6. `답변 근거 엑셀 다운로드` 버튼이 `excelDownloadUrl`을 사용하는지 확인합니다.
7. `근거 사이트 열기`와 `근거 URL 복사`가 `evidenceUrls`를 사용하는지 확인합니다.

## 실행

```bash
cd C:\Users\Pc\Desktop\ESG_agent_ui
npm start
```

```text
http://localhost:3100
```

## 문제 확인

서버 상태:

```text
http://localhost:3100/healthz
```

초기 데이터:

```text
http://localhost:3100/api/template
```

기업이 안 보이면:

- 현재 `data/template.xlsx`에 기업 데이터 행이 있는지 확인합니다.
- store API로 전환했다면 `/api/companies` 응답을 확인합니다.

AI 답변이 안 보이면:

- `requestExternalCalculation(payload)`가 실제 응답을 반환하는지 확인합니다.
- 응답에 `answer`가 있는지 확인합니다.

다운로드가 안 되면:

- 응답에 `excelDownloadUrl`이 있는지 확인합니다.
- URL이 브라우저에서 접근 가능한지 확인합니다.
