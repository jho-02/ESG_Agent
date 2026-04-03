# ESG Agent UI 개발자 문서

이 폴더는 `Node.js`로 바로 실행 가능한 정리 버전입니다.  
실무자가 기업을 선택하고, 6개 카테고리 점수를 검토한 뒤, 필요한 경우 세부 지표를 모달 창에서 수정하는 UI를 제공합니다.

## 1. 빠른 시작

### 요구 사항

- Node.js 18 이상 권장
- Windows, macOS, Linux 모두 가능

### 실행

```bash
cd C:\Users\Pc\Desktop\ESG_agent_ui\프로젝트
npm start
```

브라우저에서 아래 주소로 접속합니다.

```text
http://localhost:3100
```

헬스체크:

```text
http://localhost:3100/healthz
```

템플릿 API:

```text
http://localhost:3100/api/template
```

## 2. 프로젝트 구조

```text
프로젝트/
├─ data/
│  └─ template.xlsx
├─ public/
│  ├─ app.js
│  ├─ index.html
│  └─ styles.css
├─ src/
│  └─ template-loader.js
├─ .gitignore
├─ package.json
├─ README.md
└─ server.js
```

### 파일 역할

- `server.js`
  - HTTP 서버 엔트리포인트
  - 정적 파일 서빙
  - `/api/template` 응답
  - `/healthz` 헬스체크 제공
- `data/template.xlsx`
  - 엑셀 템플릿 원본
  - 서버가 이 파일을 읽어 카테고리/섹션/지표 구조를 만듦
- `src/template-loader.js`
  - `.xlsx` 내부 XML을 읽어 템플릿 구조로 변환
- `public/index.html`
  - HTML 마크업과 대부분의 스타일 정의
- `public/app.js`
  - 클라이언트 상태 관리 및 UI 렌더링
  - 기업 선택, 연도 전환, 순위 기준 전환, 카테고리 모달 편집 처리
- `public/styles.css`
  - 보조 스타일 파일

## 3. 현재 UI 동작

### 핵심 흐름

1. 왼쪽에서 `기업 순위`를 확인합니다.
2. 가운데에서 현재 선택 기업의 6개 카테고리 점수를 봅니다.
3. 카테고리를 누르면 아래로 펼쳐지는 대신 `세부 지표 편집 모달`이 뜹니다.
4. 모달 안에서 세부 지표를 확인하고 수정합니다.

### 현재 구현된 주요 기능

- 기업 순위
  - `통합 순위 / 건전성 / 공정성 / 사회공헌 / 소비자 보호 / 환경경영 / 직원만족` 기준 전환 가능
  - 현재 보고 있는 카테고리를 바꿔도 왼쪽 순위 기준은 자동 변경되지 않음
- 검색
  - 검색어를 입력해도 왼쪽 순위 목록은 유지
  - 검색은 순위 재산정이 아니라 `기업 빠른 선택` 용도로 동작
- 연도 전환
  - 현재 연도 / 전년도 / 재작년 데이터 전환
  - 선택 연도 기준으로 점수와 세부 지표 갱신
- 세부 지표 편집
  - 카테고리 클릭 시 대형 모달 창에서 편집
  - 일부 지표는 다른 카테고리 값을 참조

## 4. 데이터 구조

### 템플릿 구조

`template-loader.js`는 엑셀 색상과 헤더를 읽어 아래 구조를 만듭니다.

- 공통 필드
- 카테고리
- 섹션
- 입력 지표
- 계산 지표
- 섹션 점수 필드
- 카테고리 총점 필드

### 프론트 상태

`public/app.js`의 주요 상태는 다음과 같습니다.

- `selectedCompanyId`
  - 현재 선택 기업
- `selectedYear`
  - 현재 선택 연도
- `rankingCategoryKey`
  - 왼쪽 기업 순위 기준
- `activeCategoryKey`
  - 현재 점검 중인 카테고리
- `editorModalCategoryKey`
  - 현재 편집 모달에서 열려 있는 카테고리

### 연도 데이터

각 기업은 연도별 데이터를 별도로 가집니다.

- `company.yearValues[연도]`
- `company.values`
  - 현재 선택 연도에 매핑된 실제 작업 값

## 5. 서버 동작

### 정적 파일 서빙

- `/` 요청 시 `public/index.html` 반환
- 그 외 `/app.js`, `/styles.css` 등 정적 파일 서빙
- 존재하지 않는 경로는 `index.html`로 fallback

### API

#### `GET /healthz`

응답 예시:

```json
{
  "ok": true
}
```

#### `GET /api/template`

응답 예시:

```json
{
  "sourceWorkbook": "template.xlsx",
  "generatedAt": "...",
  "categories": []
}
```

## 6. 점수 계산 관련 주의

현재 점수 계산은 실제 엑셀 평가식을 완전히 재현한 것이 아닙니다.

- 엑셀의 구조와 색상 단계는 반영
- UI 프로토타입용 더미/시뮬레이션 값 포함
- 실제 운영용으로 쓰려면 항목별 산식 정의 또는 수식 포함 원본 엑셀 기준으로 교체 필요

즉, 현재 프로젝트는 `실무 UI 검토용 프로토타입`에 더 가깝습니다.

## 7. 자주 수정할 지점

### 포트 변경

```bash
PORT=3100 npm start
```

Windows PowerShell:

```powershell
$env:PORT=3100
npm start
```

### 엑셀 파일 경로 변경

`server.js`

```js
const TEMPLATE_PATH = path.join(__dirname, "data", "template.xlsx");
```

### 기본 연도 개수 변경

`public/app.js`

```js
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index);
```

예를 들어 5개년으로 늘리려면 `length: 5`로 바꾸면 됩니다.

### 왼쪽 순위 기준 기본값 변경

`public/app.js`

```js
rankingCategoryKey: "integrated"
```

### 모달 크기 변경

`public/index.html`

```css
.editor-modal-panel {
  width: min(1240px, 100%);
}
```

## 8. 디버깅 체크리스트

### 서버는 뜨는데 화면이 비어 있음

- `http://localhost:3100/api/template` 응답 확인
- `data/template.xlsx` 존재 여부 확인
- 브라우저 콘솔 에러 확인

### 엑셀 API가 500 에러

- `data/template.xlsx` 경로 확인
- 엑셀 파일 손상 여부 확인
- `src/template-loader.js` 파싱 실패 로그 확인

### 순위가 이상함

- 현재 `rankingCategoryKey` 기준인지 확인
- 검색은 순위 필터가 아니라 기업 선택용이라는 점 확인

### 연도 전환이 안 먹음

- `selectedYear` 값이 바뀌는지 확인
- `syncAllCompaniesForSelectedYear()` 호출 여부 확인
- `company.yearValues` 구조 확인

## 9. 권장 후속 작업

- 실제 엑셀 산식 기반 점수 계산으로 교체
- 기업 검색 자동완성 추가
- 세부 지표 편집 모달에 저장/되돌리기 기능 추가
- 데이터 저장 API 연동
- 사용자 권한/로그인 추가

## 10. 실행 검증 예시

```bash
cd C:\Users\Pc\Desktop\ESG_agent_ui\프로젝트
npm start
```

브라우저:

```text
http://localhost:3100
```

API 확인:

```text
http://localhost:3100/api/template
http://localhost:3100/healthz
```

## Port Note

- This clean project uses `http://localhost:3100` by default.
- If `http://localhost:3000` shows an older blank app, that is a different server.
- Run `npm start` inside `C:\Users\Pc\Desktop\ESG_agent_ui\프로젝트`.
