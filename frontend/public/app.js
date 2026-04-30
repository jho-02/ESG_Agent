const state = {
  template: null,
  indexes: null,
  availableYears: [],
  profile: "manufacturing",
  selectedYear: new Date().getFullYear(),
  activeCategoryKey: null,
  rankingCategoryKey: "integrated",
  activeSectionId: null,
  search: "",
  businessSegment: "all",
  chatMessages: [],
  externalCalculationResult: null,
  sectionFilter: "all",
  relationFilter: "all",
  linkOnly: false,
  tab: "integrated",
  companies: [],
  selectedCompanyId: null,
  pageSize: 30,
  integratedPage: 1,
  rankingPage: 1,
  modalCategoryKey: null,
  editorModalCategoryKey: null,
  detailModalState: null,
  values: {},
  lastChangedFieldId: null
};

const els = {};
const DEFAULT_YEAR_OPTIONS = Array.from({ length: 3 }, (_, index) => new Date().getFullYear() - index);
const YEAR_OPTIONS = DEFAULT_YEAR_OPTIONS;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    // UI 초기화 진입점입니다.
    // 화면 DOM을 찾고, 동적 패널을 붙이고, /api/template에서 초기 데이터를 받아옵니다.
    setupEls();
    applyStaticLabels();
    mountDashboardPanels();
    mountBusinessSegmentFilter();
    mountAiTools();
    bindEvents();

    if (window.__TEMPLATE_DATA__) {
      state.template = window.__TEMPLATE_DATA__;
    } else {
      // 현재 초기 데이터 연결 지점입니다.
      // 지금은 server.js의 /api/template가 template.xlsx를 읽어 내려줍니다.
      // store 파일 시스템 기반으로 바꾸면 이 호출을 /api/companies, /api/company 등으로 분리하면 됩니다.
      const response = await fetch("/api/template");
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const detail = payload?.detail || payload?.message || `HTTP ${response.status}`;
        throw new Error(`템플릿 데이터를 불러오지 못했습니다. ${detail}`);
      }
      state.template = await response.json();
    }

    state.indexes = buildIndexes(state.template);
    state.activeCategoryKey = "integrated";
    state.availableYears = (state.template.years?.length ? state.template.years : DEFAULT_YEAR_OPTIONS)
      .map((year) => Number(year))
      .filter((year) => Number.isFinite(year))
      .sort((left, right) => right - left);
    state.selectedYear = state.availableYears[0] || DEFAULT_YEAR_OPTIONS[0];

    fillSelect(els.profileSelect, state.availableYears.map((year) => ({
      value: String(year),
      label: `${year}년`
    })));
    fillSelect(els.sectionFilter, [
      { value: "all", label: "전체 섹션" },
      { value: "active", label: "배점 있는 섹션" },
      { value: "inactive", label: "배점 없는 섹션" }
    ]);
    fillSelect(els.relationFilter, [
      { value: "all", label: "전체" },
      { value: "direct", label: "직접 입력 중심" },
      { value: "common", label: "공통정보 참조" },
      { value: "cross", label: "연결 항목 포함" }
    ]);

    els.profileSelect.value = String(state.selectedYear);
    els.sectionFilter.value = state.sectionFilter;
    els.relationFilter.value = state.relationFilter;

    state.companies = createCompaniesFromWorkbook(state.template);
    if (!state.companies.length) {
      throw new Error("엑셀에서 표시할 기업 데이터 행을 찾지 못했습니다. 각 시트 2행 이하에 회사별 값이 있어야 합니다.");
    }
    syncAllCompaniesForSelectedYear();
    selectCompanyById(state.companies.find((company) => company.profile === state.profile)?.id || state.companies[0]?.id, true);
    render();
  } catch (error) {
    console.error(error);
    showFatalError(error);
  }
}

function showFatalError(error) {
  const detail = error instanceof Error ? error.message : String(error);
  const target = els.companyFocus || document.body;
  target.innerHTML = `
    <div style="border:1px solid #fecaca;background:#fff1f2;color:#7f1d1d;padding:18px;border-radius:18px;line-height:1.7;">
      <div style="font-size:18px;font-weight:800;margin-bottom:6px;">화면 초기화에 실패했습니다.</div>
      <div style="font-size:14px;">${escapeHtml(detail)}</div>
      <div style="font-size:13px;margin-top:8px;">올바른 프로젝트 폴더에서 서버를 실행했는지 확인하세요.</div>
    </div>
  `;
}

function applyStaticLabels() {
  const integratedTab = document.querySelector('[data-tab="integrated"]');
  const rankingTab = document.querySelector('[data-tab="ranking"]');
  const detailTab = document.querySelector('[data-tab="detail"]');
  if (integratedTab) integratedTab.textContent = "카테고리 보기";
  if (rankingTab) rankingTab.textContent = "기업 목록";
  if (detailTab) detailTab.textContent = "세부 지표 편집";
  if (detailTab) detailTab.style.display = "none";
  const header = document.querySelector(".header");
  if (header) header.remove();
  const brandTitle = document.querySelector(".brand-title");
  const brandSub = document.querySelector(".brand-sub");
  const brandIcon = document.querySelector(".brand-icon");
  if (brandIcon) brandIcon.textContent = "E";
  if (brandTitle) brandTitle.textContent = "경실련 ESG 대시보드";
  if (brandSub) brandSub.textContent = "기업 점검용 카테고리 검토 화면";
  const sidebarPrimaryButton = document.querySelector(".menu-stack .button");
  if (sidebarPrimaryButton) sidebarPrimaryButton.textContent = "통합 순위";
  const menuLabel = document.querySelector(".sidebar .menu-label");
  if (menuLabel) menuLabel.textContent = "검색과 연도";
  const yearHelper = document.querySelector(".content .helper-note");
  if (yearHelper) yearHelper.textContent = "기준 연도";
  if (els.manualInput) els.manualInput.placeholder = "기업명, 업종, 지역 검색";
  if (els.keyword) els.keyword.placeholder = "예: 다온파인솔루션";
  if (els.searchBtn) els.searchBtn.textContent = "검색";
  if (els.sectorButtons) els.sectorButtons.remove();
  const questionPanel = els.questionGrid?.parentElement;
  if (questionPanel) questionPanel.remove();
  const aiCardTitle = els.aiExample?.closest(".card")?.querySelector("h3");
  if (aiCardTitle) aiCardTitle.textContent = "AI 패널";
  const previewCardTitle = els.previewName?.closest(".card")?.querySelector("h3");
  if (previewCardTitle) previewCardTitle.textContent = "현재 선택 기업 점수 미리보기";
  if (els.legendPanel?.previousElementSibling) {
    els.legendPanel.previousElementSibling.textContent = "검토 안내";
  }
}

function mountDashboardPanels() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar || !els.ranking) return;

  if (els.ranking.parentElement !== sidebar) {
    sidebar.appendChild(els.ranking);
  }
}

function mountBusinessSegmentFilter() {
  // 왼쪽 사이드바의 기업 유형 선택 UI입니다.
  // 기본값은 "전체"이고, 드롭다운에서 금융/비금융/제조/비제조를 선택합니다.
  // 분류 기준은 matchesBusinessSegment(), isFinanceCompany(), isManufacturingCompany()에서 조정합니다.
  const menuStack = document.querySelector(".sidebar .menu-stack");
  if (!menuStack || document.getElementById("businessSegmentPanel")) return;

  const panel = document.createElement("div");
  panel.id = "businessSegmentPanel";
  panel.className = "summary-box";
  panel.style.display = "grid";
  panel.style.gap = "10px";
  panel.innerHTML = `
    <div class="helper-note" style="font-weight:800;color:#334155;">기업 유형</div>
    <select id="businessSegmentSelect" class="select" style="height:44px;font-size:13px;">
      ${[
        ["all", "전체"],
        ["finance", "금융"],
        ["non-finance", "비금융"],
        ["manufacturing", "제조"],
        ["non-manufacturing", "비제조"]
      ].map(([value, label]) => `<option value="${value}" ${state.businessSegment === value ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
  menuStack.appendChild(panel);
}

function renderBusinessSegmentFilter() {
  const select = document.getElementById("businessSegmentSelect");
  if (select) select.value = state.businessSegment;
}

function mountAiTools() {
  // 오른쪽 AI 패널 UI입니다.
  // 사용자가 질문을 입력하면 handleChatSubmit() -> requestExternalCalculation() 순서로 외부 계산/Agent 서버에 연결됩니다.
  // "AI 답변 근거자료" 버튼들은 마지막 AI 응답의 excelDownloadUrl/evidenceUrls를 사용합니다.
  const aiCard = els.aiExample?.closest(".card");
  if (!aiCard || document.getElementById("aiChatInput")) return;

  aiCard.innerHTML = `
    <h3>AI 패널</h3>
    <div id="aiChatLog" style="display:grid;gap:10px;max-height:260px;overflow:auto;margin-bottom:12px;"></div>
    <textarea id="aiChatInput" class="textarea" placeholder="무엇이든 물어보세요"></textarea>
    <button id="aiChatSend" class="button" type="button" style="margin-top:10px;">질문 보내기</button>
    <div class="summary-box" style="margin-top:14px;">
      <strong style="display:block;margin-bottom:10px;">AI 답변 근거자료</strong>
      <div style="display:grid;gap:8px;">
        <button id="downloadExcelBtn" class="sub-button" type="button">답변 근거 엑셀 다운로드</button>
        <button id="openEvidenceBtn" class="sub-button" type="button">근거 사이트 열기</button>
        <button id="copyEvidenceBtn" class="sub-button" type="button">근거 URL 복사</button>
      </div>
    </div>
  `;

  els.aiExample = document.getElementById("aiExample");
  els.aiChatLog = document.getElementById("aiChatLog");
  els.aiChatInput = document.getElementById("aiChatInput");
  els.aiChatSend = document.getElementById("aiChatSend");
  els.downloadExcelBtn = document.getElementById("downloadExcelBtn");
  els.openEvidenceBtn = document.getElementById("openEvidenceBtn");
  els.copyEvidenceBtn = document.getElementById("copyEvidenceBtn");
  renderChatMessages();
}

function setupEls() {
  els.sectorButtons = document.getElementById("sectorButtons");
  els.manualInput = document.getElementById("manualInput");
  els.keyword = document.getElementById("keyword");
  els.searchBtn = document.getElementById("searchBtn");
  els.profileSelect = document.getElementById("profileSelect");
  els.sectionFilter = document.getElementById("sectionFilter");
  els.relationFilter = document.getElementById("relationFilter");
  els.linkOnly = document.getElementById("linkOnly");
  els.companyFocus = document.getElementById("companyFocus");
  els.kpiGrid = document.getElementById("kpiGrid");
  els.integrated = document.getElementById("tab-integrated");
  els.ranking = document.getElementById("tab-ranking");
  els.detail = document.getElementById("tab-detail");
  els.questionGrid = document.getElementById("questionGrid");
  els.aiExample = document.getElementById("aiExample");
  els.previewName = document.getElementById("previewName");
  els.previewMeta = document.getElementById("previewMeta");
  els.previewScore = document.getElementById("previewScore");
  els.previewBars = document.getElementById("previewBars");
  els.legendPanel = document.getElementById("legendPanel");
  els.categoryModal = document.getElementById("categoryModal");
  els.modalBody = document.getElementById("modalBody");
  els.editorModal = document.getElementById("editorModal");
  els.editorModalBody = document.getElementById("editorModalBody");
  els.detailModal = document.getElementById("detailModal");
  els.detailModalBody = document.getElementById("detailModalBody");
  els.tabButtons = [...document.querySelectorAll("[data-tab]")];
}

function bindEvents() {
  els.manualInput.addEventListener("input", onSearchInput);
  els.keyword.addEventListener("input", onKeywordInput);
  els.searchBtn.addEventListener("click", onSearchSubmit);

  els.profileSelect.addEventListener("change", (event) => {
    state.selectedYear = Number(event.target.value) || state.availableYears[0] || DEFAULT_YEAR_OPTIONS[0];
    syncAllCompaniesForSelectedYear();
    const company = getSelectedCompany();
    if (company) {
      selectCompanyById(company.id, true);
    }
    render();
  });

  els.sectionFilter.addEventListener("change", (event) => {
    state.sectionFilter = event.target.value;
    syncActiveSection(getSelectedModel());
    resetPages();
    render();
  });

  els.relationFilter.addEventListener("change", (event) => {
    state.relationFilter = event.target.value;
    syncActiveSection(getSelectedModel());
    resetPages();
    render();
  });

  els.linkOnly.addEventListener("change", (event) => {
    state.linkOnly = event.target.checked;
    syncActiveSection(getSelectedModel());
    resetPages();
    render();
  });

  els.aiChatSend?.addEventListener("click", handleChatSubmit);
  els.aiChatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      handleChatSubmit();
    }
  });
  document.getElementById("businessSegmentSelect")?.addEventListener("change", handleBusinessSegmentChange);
  els.downloadExcelBtn?.addEventListener("click", downloadCurrentCompanyExcel);
  els.openEvidenceBtn?.addEventListener("click", openPrimaryEvidenceUrl);
  els.copyEvidenceBtn?.addEventListener("click", copyPrimaryEvidenceUrl);

  els.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      if (state.tab === "integrated") {
        state.activeCategoryKey = "integrated";
        state.modalCategoryKey = null;
      }
      render();
    });
  });

  document.body.addEventListener("click", handleClick);
  document.body.addEventListener("change", handleFieldChange);
}

function onSearchInput(event) {
  state.search = event.target.value.trim();
  els.keyword.value = state.search;
  applySearchSelection(state.search);
  render();
}

function onKeywordInput(event) {
  state.search = event.target.value.trim();
  els.manualInput.value = state.search;
  applySearchSelection(state.search);
  render();
}

function onSearchSubmit() {
  state.search = els.keyword.value.trim();
  els.manualInput.value = state.search;
  applySearchSelection(state.search);
  render();
}

function handleBusinessSegmentChange(event) {
  // 기업 유형 드롭다운 변경 처리입니다.
  // UI 내부 필터만 바꾸며, 계산 서버와는 직접 연결되지 않습니다.
  state.businessSegment = event.target.value || "all";
  const visibleCompanies = getProfileCompanies();
  if (visibleCompanies.length && !visibleCompanies.some((company) => company.id === state.selectedCompanyId)) {
    selectCompanyById(visibleCompanies[0].id, true);
  }
  resetPages();
  render();
}

function resetPages() {
  state.integratedPage = 1;
  state.rankingPage = 1;
}

function syncAllCompaniesForSelectedYear() {
  state.companies.forEach((company) => {
    const yearKey = String(state.selectedYear);
    company.values = getCompanyValuesForYear(company, yearKey);
    refreshCompany(company);
  });
}

function applySearchSelection(query) {
  const keyword = String(query || "").trim().toLowerCase();
  if (!keyword) return;

  const companies = getProfileCompanies();
  const exactMatch = companies.find((company) => company.name.toLowerCase() === keyword);
  const partialMatch = companies.find((company) => company.name.toLowerCase().includes(keyword) || company.searchText.includes(keyword));
  const target = exactMatch || partialMatch;
  if (target) {
    selectCompanyById(target.id, true);
  }
}

function handleClick(event) {
  if (event.target.id === "editorModal") {
    state.editorModalCategoryKey = null;
    state.activeCategoryKey = "integrated";
    render();
    return;
  }

  const closeEditorModalButton = event.target.closest("[data-close-editor-modal]");
  if (closeEditorModalButton) {
    state.editorModalCategoryKey = null;
    state.activeCategoryKey = "integrated";
    render();
    return;
  }

  if (event.target.id === "detailModal") {
    state.detailModalState = null;
    render();
    return;
  }

  const closeDetailModalButton = event.target.closest("[data-close-detail-modal]");
  if (closeDetailModalButton) {
    state.detailModalState = null;
    render();
    return;
  }

  const stageModalButton = event.target.closest("[data-stage-modal]");
  if (stageModalButton) {
    state.detailModalState = {
      stage: stageModalButton.dataset.stageModal,
      categoryKey: stageModalButton.dataset.stageCategoryKey,
      sectionId: stageModalButton.dataset.stageSectionId
    };
    render();
    return;
  }

  if (event.target.id === "categoryModal") {
    state.modalCategoryKey = null;
    render();
    return;
  }

  const closeModalButton = event.target.closest("[data-close-modal]");
  if (closeModalButton) {
    state.modalCategoryKey = null;
    render();
    return;
  }

  const modalButton = event.target.closest("[data-modal-category]");
  if (modalButton) {
    state.modalCategoryKey = modalButton.dataset.modalCategory;
    render();
    return;
  }

  const pageButton = event.target.closest("[data-page-target]");
  if (pageButton) {
    const pageTarget = pageButton.dataset.pageTarget;
    const pageNumber = Number(pageButton.dataset.pageNumber || 1);
    if (pageTarget === "integrated") state.integratedPage = pageNumber;
    if (pageTarget === "ranking") state.rankingPage = pageNumber;
    render();
    return;
  }

  const companyButton = event.target.closest("[data-company-id]");
  if (companyButton) {
    selectCompanyById(companyButton.dataset.companyId, true);
    state.editorModalCategoryKey = null;
    state.detailModalState = null;
    state.activeCategoryKey = "integrated";
    state.tab = "integrated";
    render();
    return;
  }

  const categoryButton = event.target.closest("[data-category-key]");
  if (categoryButton) {
    const nextCategoryKey = categoryButton.dataset.categoryKey;
    state.activeCategoryKey = nextCategoryKey;
    state.tab = "integrated";
    state.modalCategoryKey = null;
    state.detailModalState = null;
    state.editorModalCategoryKey = nextCategoryKey === "integrated" ? null : nextCategoryKey;
    syncActiveSection(getSelectedModel());
    resetPages();
    render();
    return;
  }

  const sectionButton = event.target.closest("[data-section-id]");
  if (sectionButton) {
    state.activeSectionId = sectionButton.dataset.sectionId;
    state.detailModalState = null;
    state.tab = sectionButton.dataset.targetTab || "detail";
    render();
  }
}

function handleFieldChange(event) {
  const rankingSelect = event.target.closest("[data-ranking-category-select]");
  if (rankingSelect) {
    state.rankingCategoryKey = rankingSelect.value || "integrated";
    render();
    return;
  }

  const fieldControl = event.target.closest("[data-field-id]");
  if (!fieldControl) return;

  const field = state.indexes.fieldLookup.get(fieldControl.dataset.fieldId);
  if (!field || field.linkedFieldId) return;

  const company = getSelectedCompany();
  if (!company) return;

  company.values[field.id] = readFieldValue(field, fieldControl);
  state.values = company.values;
  state.lastChangedFieldId = field.id;
  refreshCompany(company);
  render();
}

function buildIndexes(template) {
  const categoryLookup = new Map();
  const sectionLookup = new Map();
  const fieldLookup = new Map();
  const dependencyIndex = new Map();

  for (const field of template.commonFields) fieldLookup.set(field.id, field);

  for (const category of template.categories) {
    categoryLookup.set(category.key, category);
    if (category.totalField) fieldLookup.set(category.totalField.id, category.totalField);

    for (const section of category.sections) {
      sectionLookup.set(section.id, { category, section });
      fieldLookup.set(section.scoreField.id, section.scoreField);
      [...section.inputs, ...section.derived].forEach((field) => fieldLookup.set(field.id, field));

      const dependencyIds = new Set();
      section.inputs.forEach((field) => dependencyIds.add(field.linkedFieldId || field.id));
      section.derived.forEach((field) => field.linkedFieldId && dependencyIds.add(field.linkedFieldId));
      section.commonDependencies.forEach((dependency) => dependencyIds.add(dependency.fieldId));
      section.crossDependencies.forEach((dependency) => dependencyIds.add(dependency.targetFieldId));

      dependencyIds.forEach((fieldId) => {
        const bucket = dependencyIndex.get(fieldId) || [];
        bucket.push(section.id);
        dependencyIndex.set(fieldId, bucket);
      });
    }
  }

  return { categoryLookup, sectionLookup, fieldLookup, dependencyIndex };
}

function ensureProfileDefaults() {
  const industry = getProfileLabel(state.profile);
  for (const field of state.template.commonFields) {
    if (field.shortLabel === "업종" || field.shortLabel === "경실련 업종") {
      state.values[field.id] = state.values[field.id] || industry;
    }
  }
}

function createCompaniesFromWorkbook(template) {
  const workbookCompanies = Array.isArray(template.companies) ? template.companies : [];
  return workbookCompanies.map((company, index) => {
    const yearEntries = Object.fromEntries(
      Object.entries(company.yearValues || {}).map(([year, values]) => [String(year), { ...values }])
    );
    const yearKeys = Object.keys(yearEntries).sort((left, right) => Number(right) - Number(left));
    const firstYearKey = yearKeys[0];

    return {
      id: company.id || `excel-${index + 1}`,
      companyNo: company.companyNo || "",
      name: company.name || `기업 ${index + 1}`,
      profile: company.profile === "finance" ? "finance" : "manufacturing",
      region: company.region || "-",
      size: company.size || "미분류",
      industry: company.industry || "-",
      disclosure: company.disclosure || "엑셀 데이터",
      yearValues: yearEntries,
      values: firstYearKey ? yearEntries[firstYearKey] : {},
      snapshot: null,
      summary: "",
      badges: [],
      searchText: ""
    };
  });
}

function getCompanyValuesForYear(company, yearKey) {
  if (!company?.yearValues) return company?.values || {};
  return company.yearValues[String(yearKey)]
    || company.yearValues[Object.keys(company.yearValues).sort((left, right) => Number(right) - Number(left))[0]]
    || company.values
    || {};
}

function createMockCompanies(count) {
  return Array.from({ length: count }, (_, index) => {
    const profile = index % 4 === 0 ? "finance" : "manufacturing";
    const company = createMockCompany(index, profile);
    refreshCompany(company);
    return company;
  });
}

function createMockCompany(index, profile) {
  const companyNo = String(index + 1).padStart(3, "0");
  const region = REGIONS[index % REGIONS.length];
  const size = COMPANY_SIZES[index % COMPANY_SIZES.length];
  const industryList = profile === "finance" ? FINANCE_INDUSTRIES : MANUFACTURING_INDUSTRIES;
  const industry = industryList[index % industryList.length];
  const name = createCompanyName(index, profile);
  const disclosure = DISCLOSURE_TYPES[index % DISCLOSURE_TYPES.length];
  const yearValues = Object.fromEntries(
    YEAR_OPTIONS.map((year, yearIndex) => [
      String(year),
      buildCompanyValues(index + yearIndex * 37, { profile, name, region, size, industry, disclosure, companyNo, year })
    ])
  );

  return {
    id: `company-${companyNo}`,
    companyNo,
    name,
    profile,
    region,
    size,
    industry,
    disclosure,
    yearValues,
    values: yearValues[String(state.selectedYear)],
    snapshot: null,
    summary: "",
    badges: [],
    searchText: ""
  };
}
function buildCompanyValues(index, meta) {
  const values = {};
  const random = createRandom(index + 1);
  const scaleBySize = {
    대기업: meta.profile === "finance" ? 4200000 : 2600000,
    중견기업: meta.profile === "finance" ? 1800000 : 900000,
    중소기업: meta.profile === "finance" ? 620000 : 260000
  };

  const assetBase = scaleBySize[meta.size] * (0.85 + random() * 0.55);
  const debtRatio = meta.profile === "finance" ? 0.72 + random() * 0.16 : 0.32 + random() * 0.38;
  const capital = Math.max(assetBase * (1 - debtRatio), assetBase * 0.08);
  const debt = Math.max(assetBase - capital, 0);
  const revenue = assetBase * (0.48 + random() * 0.82);
  const opIncome = revenue * (0.04 + random() * 0.13);
  const preTax = opIncome * (0.88 + random() * 0.26);
  const netIncome = preTax * (0.72 + random() * 0.18);

  for (const field of state.template.commonFields) {
    values[field.id] = seedCommonField(field, meta, random, { assetBase, debt, capital, revenue, opIncome, preTax, netIncome });
  }

  for (const category of state.template.categories) {
    for (const section of category.sections) {
      for (const field of section.inputs) {
        if (!field.linkedFieldId) values[field.id] = seedSectionField(field, meta, random, values);
      }
    }
  }

  return values;
}

function seedCommonField(field, meta, random, financials) {
  switch (field.shortLabel) {
    case "회사명": return meta.name;
    case "사업보고서 바로가기": return `https://reports.example.com/${meta.companyNo}`;
    case "종목코드": return String(100000 + Number(meta.companyNo));
    case "경실련 업종": return getProfileLabel(meta.profile);
    case "업종": return meta.industry;
    case "주요제품": return meta.profile === "finance" ? `${meta.industry} 서비스` : `${meta.industry} 제품`;
    case "상장일": return `${2010 + (Number(meta.companyNo) % 13)}-${String((Number(meta.companyNo) % 12) + 1).padStart(2, "0")}-${String((Number(meta.companyNo) % 27) + 1).padStart(2, "0")}`;
    case "결산월": return `${(Number(meta.companyNo) % 12) + 1}월`;
    case "대표자명": return EXECUTIVE_NAMES[Number(meta.companyNo) % EXECUTIVE_NAMES.length];
    case "홈페이지": return `https://${slugify(meta.name)}.example.com`;
    case "지역": return meta.region;
    case "자산총계": return roundNumber(financials.assetBase);
    case "부채총계": return roundNumber(financials.debt);
    case "자본총계": return roundNumber(financials.capital);
    case "매출액": return roundNumber(financials.revenue);
    case "영업이익": return roundNumber(financials.opIncome);
    case "법인세차감전 계속사업이익": return roundNumber(financials.preTax);
    case "당기순이익": return roundNumber(financials.netIncome);
    default: return seedByType(field, meta, random);
  }
}

function seedSectionField(field, meta, random, values) {
  const label = `${field.shortLabel} ${field.label}`.toLowerCase();

  if (field.inputType === "boolean") {
    const negative = field.polarity === "negative" || /위반|사고|중대재해|부실|사망|불이행|제재|벌점|분쟁|하자|오염|배출/.test(label);
    return random() < (negative ? 0.18 : 0.62) ? 1 : 0;
  }

  if (field.inputType === "grade") {
    const options = field.options?.length ? field.options : ["A", "B", "C", "D"];
    return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  }

  if (field.inputType === "percent") {
    return /위반|사고|불만|민원|배출/.test(label) ? round(4 + random() * 18) : round(38 + random() * 54);
  }

  if (field.inputType === "number") {
    if (/발행주식|자기주식|의결|지분|주식/.test(label)) return roundNumber(500000 + random() * 22000000);
    if (/임원|사외이사/.test(label)) return roundNumber(2 + random() * 18);
    if (/직원|근로자|고용|채용|장애인|여성/.test(label)) return roundNumber(meta.size === "대기업" ? 300 + random() * 4200 : meta.size === "중견기업" ? 120 + random() * 900 : 30 + random() * 220);
    if (/건수|횟수|위반|사고|분쟁|민원|벌점|제재/.test(label)) return roundNumber(random() * 4);
    if (/점수|평가|만족도/.test(label)) return round(55 + random() * 40);
    if (/금액|비용|지출|급여|퇴직급여|기부|세금/.test(label)) {
      const revenue = getCommonValue(values, "매출액");
      return roundNumber(revenue ? revenue * (0.004 + random() * 0.028) : 1500 + random() * 25000);
    }
    if (/매출|자산|이익|부채|자본/.test(label)) return roundNumber(5000 + random() * 500000);
    return roundNumber(1 + random() * 99);
  }

  if (field.inputType === "url") {
    return `https://evidence.example.com/${slugify(meta.name)}/${slugify(field.shortLabel)}`;
  }

  if (/해당없음=1/.test(label)) return random() < 0.84 ? "1" : "0";
  if (/사업자번호|법인등록번호/.test(label)) return `${Number(meta.companyNo) + 1100000000}`;
  if (/내용|설명|현황|비고/.test(label)) return `${meta.name} ${trimTitle(field.shortLabel)} 점검 메모`;
  return seedByType(field, meta, random);
}

function seedByType(field, meta, random) {
  if (field.inputType === "boolean") return random() < 0.5 ? 1 : 0;
  if (field.inputType === "grade") {
    const options = field.options?.length ? field.options : ["A", "B", "C"];
    return options[Math.min(options.length - 1, Math.floor(random() * options.length))];
  }
  if (field.inputType === "number" || field.inputType === "percent") return roundNumber(1 + random() * 100);
  if (field.inputType === "url") return `https://${slugify(meta.name)}.example.com/${slugify(field.shortLabel)}`;
  return `${meta.name} ${trimTitle(field.shortLabel)}`;
}

function selectCompanyById(companyId, syncProfile = false) {
  const company = state.companies.find((item) => item.id === companyId);
  if (!company) return;

  state.selectedCompanyId = company.id;
  company.values = getCompanyValuesForYear(company, String(state.selectedYear));
  state.values = company.values;
  if (syncProfile) {
    state.profile = company.profile;
  }

  ensureProfileDefaults();
  refreshCompany(company);
  syncActiveSection(company.snapshot.model);
}

function refreshCompany(company) {
  company.snapshot = computeCompanySnapshot(company);
  company.summary = buildCompanySummary(company);
  company.badges = buildCompanyBadges(company);
  company.searchText = buildCompanySearchText(company);
  return company.snapshot;
}

function computeCompanySnapshot(company) {
  const previousValues = state.values;
  const previousProfile = state.profile;

  state.values = company.values;
  state.profile = company.profile;
  ensureProfileDefaults();
  const model = buildModel();

  state.values = previousValues;
  state.profile = previousProfile;

  const topSections = model.categories.flatMap((category) =>
    category.sections
      .filter((section) => section.isActive)
      .map((section) => ({
        categoryKey: category.key,
        categoryLabel: category.label,
        sectionId: section.id,
        title: section.title,
        weightedScore: section.weightedScore,
        normalizedScore: section.normalizedScore
      }))
  ).sort((a, b) => b.weightedScore - a.weightedScore || b.normalizedScore - a.normalizedScore).slice(0, 4);

  return {
    model,
    totalScore: model.totalScore,
    strongestCategory: model.strongestCategory,
    weakestCategory: model.weakestCategory,
    linkedCount: model.linkedSections.length,
    topSections
  };
}

function buildModel() {
  const categories = state.template.categories.map((category) => computeCategoryState(category));
  const categoryMap = new Map(categories.map((category) => [category.key, category]));
  const fallbackTotalScore = round(categories.reduce((sum, category) => sum + category.totalScore, 0));
  const fallbackTotalMax = round(categories.reduce((sum, category) => sum + category.totalMax, 0));
  const workbookTotal = toNumber(state.values.__integratedTotal);
  const hasWorkbookTotal = hasValue(state.values.__integratedTotal);
  const totalScore = hasWorkbookTotal ? workbookTotal : fallbackTotalScore;
  const totalMax = hasWorkbookTotal ? 100 : fallbackTotalMax;
  const linkedSections = categories.flatMap((category) => category.sections.filter((section) => section.crossDependencies.length > 0));
  const rankedCategories = [...categories].sort((a, b) => b.totalScore - a.totalScore);

  return {
    categories,
    categoryMap,
    totalScore,
    totalMax,
    linkedSections,
    normalizedTotal: totalMax ? clamp(round((totalScore / totalMax) * 100), 0, 100) : clamp(round(totalScore), 0, 100),
    strongestCategory: rankedCategories[0] || null,
    weakestCategory: rankedCategories[rankedCategories.length - 1] || null
  };
}

function computeCategoryState(category) {
  const sections = category.sections.map((section) => computeSectionState(category, section));
  const fallbackTotalScore = round(sections.reduce((sum, section) => sum + section.weightedScore, 0));
  const totalMax = round(sections.reduce((sum, section) => sum + section.maxWeight, 0));
  const workbookCategoryScore = readWorkbookCategoryScore(category);
  const totalScore = workbookCategoryScore ?? fallbackTotalScore;
  return { ...category, sections, totalScore, totalMax, normalizedScore: totalMax ? clamp(round((totalScore / totalMax) * 100), 0, 100) : clamp(round(totalScore), 0, 100) };
}

function computeSectionState(category, section) {
  const commonFields = section.commonDependencies.map((dependency) => state.indexes.fieldLookup.get(dependency.fieldId)).filter(Boolean).map((field) => computeFieldResult(field));
  const inputResults = section.inputs.map((field) => computeFieldResult(field));
  const derivedResults = section.derived.map((field) => computeDerivedResult(field, commonFields, inputResults));
  const maxWeight = section.weight[state.profile] || 0;
  const workbookSectionScore = readWorkbookSectionScore(section);
  const weightedScore = workbookSectionScore !== null ? round(workbookSectionScore) : 0;
  const normalizedScore = maxWeight ? clamp(round((weightedScore / maxWeight) * 100), 0, 100) : clamp(round(weightedScore), 0, 100);

  return {
    ...section,
    categoryLabel: category.label,
    commonFields,
    inputResults,
    derivedResults,
    normalizedScore,
    maxWeight,
    weightedScore,
    isActive: maxWeight > 0
  };
}
function computeFieldResult(field) {
  const sourceField = field.linkedFieldId ? state.indexes.fieldLookup.get(field.linkedFieldId) || field : field;
  const rawValue = state.values[field.linkedFieldId || field.id];
  const numericValue = toNumber(rawValue);
  const signal = computeSignal(sourceField, rawValue, numericValue);
  return { field, rawValue, numericValue, signal, displayValue: formatFieldValue(sourceField, rawValue) };
}

function computeDerivedResult(field, commonFields, inputResults) {
  if (field.linkedFieldId) {
    const linkedField = state.indexes.fieldLookup.get(field.linkedFieldId) || field;
    const linkedValue = state.values[field.linkedFieldId];
    const numericValue = toNumber(linkedValue);
    return { field, rawValue: linkedValue, numericValue, signal: computeSignal(linkedField, linkedValue, numericValue), displayValue: formatFieldValue(linkedField, linkedValue) };
  }

  if (hasValue(state.values[field.id])) {
    const rawValue = state.values[field.id];
    const numericValue = toNumber(rawValue);
    const signal = computeSignal(field, rawValue, numericValue);
    return { field, rawValue, numericValue, signal, displayValue: formatFieldValue(field, rawValue) };
  }

  return { field, rawValue: "", numericValue: 0, signal: 0, displayValue: "-" };
}

function computeSignal(field, rawValue, numericValue) {
  if (field.inputType === "boolean") {
    const value = Number(rawValue) === 1;
    return field.polarity === "negative" ? (value ? 0 : 100) : value ? 100 : 0;
  }
  if (field.inputType === "grade") return gradeToScore(rawValue);
  if (field.inputType === "percent") {
    const percent = clamp(numericValue, 0, 100);
    return field.polarity === "negative" ? 100 - percent : percent;
  }
  if (field.inputType === "number") {
    const base = normalizeNumber(field, numericValue);
    return field.polarity === "negative" ? 100 - base : base;
  }
  if (field.inputType === "url") return rawValue ? 88 : 0;
  if (field.inputType === "text") {
    const trimmed = String(rawValue ?? "").trim();
    if (!trimmed) return 0;
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (numeric >= 0 && numeric <= 1) return numeric * 100;
      if (numeric >= 0 && numeric <= 100) return clamp(numeric, 0, 100);
    }
    return 82;
  }
  return rawValue ? 82 : 0;
}

function normalizeNumber(field, numericValue) {
  const value = Math.max(numericValue || 0, 0);
  if (field.label.includes("천원") || field.label.includes("금액") || field.label.includes("비용")) {
    const revenue = getCommonValue(state.values, "매출액");
    if (revenue > 0) return clamp((value / revenue) * 100 * 8, 0, 100);
    return clamp(Math.log10(value + 1) * 16, 0, 100);
  }
  if (field.label.includes("건수") || field.label.includes("횟수")) return clamp(100 - value * 22, 0, 100);
  if (field.label.includes("(명)") || field.label.includes("직원") || field.label.includes("주식")) return clamp(Math.log10(value + 1) * 20, 0, 100);
  return clamp(Math.log10(value + 1) * 18, 0, 100);
}

function render() {
  const company = getSelectedCompany();
  if (!company) return;

  company.values = getCompanyValuesForYear(company, String(state.selectedYear));
  refreshCompany(company);
  state.values = company.values;
  state.profile = company.profile;
  els.profileSelect.value = String(state.selectedYear);

  const model = company.snapshot.model;
  syncActiveSection(model);
  const activeCategory = getActiveCategory(model);
  const activeSection = getActiveSection(activeCategory);
  const filteredCompanies = getProfileCompanies();
  const rankingMaps = buildRankingMaps(filteredCompanies);

  renderCompanyFocus(company, model, filteredCompanies, rankingMaps);
  renderCategoryButtons(model, company, filteredCompanies, rankingMaps);
  renderKpis(model, activeCategory, company, filteredCompanies, rankingMaps);
  renderIntegrated(company, filteredCompanies);
  renderRanking(model, company, filteredCompanies);
  renderDetail(activeCategory, activeSection, company);
  renderQuestions(activeCategory, activeSection, company);
  renderAiExample(activeCategory, activeSection, model, company);
  renderPreview(model, company);
  renderLegend();
  renderCategoryModal(company, model);
  renderEditorModal(company, model);
  renderDetailStageModal(company, activeCategory, activeSection);
  renderBusinessSegmentFilter();
  renderTabs();
}

function getSelectedCompany() {
  return state.companies.find((company) => company.id === state.selectedCompanyId) || null;
}

function getSelectedModel() {
  return getSelectedCompany()?.snapshot?.model || buildModel();
}

function getProfileCompanies() {
  // 왼쪽 기업 순위 목록에 표시할 기업을 필터링합니다.
  // 현재는 화면 메모리의 state.companies를 사용합니다.
  // store API로 바꾸면 /api/companies?year=...&segment=... 결과를 state.companies에 넣으면 됩니다.
  return state.companies
    .filter((company) => matchesBusinessSegment(company, state.businessSegment))
    .sort((a, b) => b.snapshot.totalScore - a.snapshot.totalScore);
}

function buildRankingMaps(companies) {
  const maps = new Map();
  maps.set("integrated", new Map([...companies].sort((a, b) => b.snapshot.totalScore - a.snapshot.totalScore).map((company, index) => [company.id, index + 1])));
  for (const category of state.template.categories) {
    maps.set(category.key, new Map([...companies].sort((a, b) => getCompanyCategoryScore(b, category.key) - getCompanyCategoryScore(a, category.key)).map((company, index) => [company.id, index + 1])));
  }
  return maps;
}

function syncActiveSection(model) {
  const activeCategory = getActiveCategory(model);
  if (!activeCategory) {
    state.activeSectionId = null;
    return;
  }
  const visibleSections = filterVisibleSections(activeCategory);
  if (!visibleSections.some((section) => section.id === state.activeSectionId)) {
    state.activeSectionId = visibleSections[0]?.id || null;
  }
}

function getActiveCategory(model) {
  if (state.activeCategoryKey === "integrated") return null;
  return model.categoryMap.get(state.activeCategoryKey) || model.categories[0] || null;
}

function getActiveSection(category) {
  if (!category) return null;
  return filterVisibleSections(category).find((section) => section.id === state.activeSectionId) || null;
}

function filterVisibleSections(category) {
  return category.sections.filter((section) => {
    if (state.sectionFilter === "active" && !section.isActive) return false;
    if (state.sectionFilter === "inactive" && section.isActive) return false;
    if (state.linkOnly && !section.crossDependencies.length) return false;
    if (state.relationFilter === "cross" && !section.crossDependencies.length) return false;
    if (state.relationFilter === "common" && !section.commonFields.length) return false;
    if (state.relationFilter === "direct" && (section.crossDependencies.length || section.commonFields.length)) return false;
    return true;
  });
}

function renderCompanyFocus(company, model, filteredCompanies, rankingMaps) {
  if (!els.companyFocus) return;

  const integratedRank = rankingMaps.get("integrated")?.get(company.id) || "-";
  const activeCategoryLabel = state.activeCategoryKey === "integrated"
    ? "카테고리를 선택해 점검"
    : displayCategoryLabel(model.categoryMap.get(state.activeCategoryKey)?.label || state.activeCategoryKey);

  els.companyFocus.innerHTML = `
    <div class="company-hero">
      <div class="company-hero-copy">
        <div class="company-hero-chip">현재 선택 기업</div>
        <div class="company-hero-name">${escapeHtml(company.name)}</div>
        <div class="company-meta">${escapeHtml(`${getProfileLabel(company.profile)} · ${company.industry} · ${company.region} · ${company.size}`)}</div>
        <div class="company-summary">${escapeHtml("아래 카테고리 점수를 먼저 눈으로 확인하고, 이상한 점수가 있으면 해당 카테고리를 눌러 세부 지표 편집으로 내려가면 됩니다.")}</div>
        <div class="category-mini-grid">
          ${model.categories.map((category) => `
            <button class="category-mini-btn${state.activeCategoryKey === category.key ? " active" : ""}" type="button" data-category-key="${category.key}">
              <span>${escapeHtml(displayCategoryLabel(category.label))}</span>
              <strong>${formatScore(category.totalScore)}</strong>
            </button>
          `).join("")}
        </div>
        <div class="focus-inline-toolbar">
          <span class="focus-pill">${escapeHtml(`기준 연도: ${state.selectedYear}년`)}</span>
          <span class="focus-pill">${escapeHtml(`현재 점검: ${activeCategoryLabel}`)}</span>
          <span class="focus-pill">${escapeHtml(`기업 수: ${filteredCompanies.length}개`)}</span>
        </div>
      </div>
      <div class="hero-rank-box">
        <div class="hero-rank-card">
          <div class="label">통합 순위</div>
          <div class="value">${escapeHtml(String(integratedRank))}</div>
          <div class="sub">${escapeHtml(`${filteredCompanies.length}개 기업 중 현재 위치`)}</div>
        </div>
        <div class="hero-note-grid">
          <div class="hero-note"><strong>통합 점수</strong><br>${formatScore(model.totalScore)}점</div>
          <div class="hero-note"><strong>강점 카테고리</strong><br>${escapeHtml(displayCategoryLabel(company.snapshot.strongestCategory?.label || "-"))}</div>
        </div>
      </div>
    </div>
  `;
}

function renderCategoryModal(company, model) {
  if (!els.categoryModal || !els.modalBody) return;

  if (!state.modalCategoryKey) {
    els.categoryModal.classList.add("hidden");
    els.modalBody.innerHTML = "";
    return;
  }

  const category = model.categoryMap.get(state.modalCategoryKey);
  if (!category) {
    state.modalCategoryKey = null;
    els.categoryModal.classList.add("hidden");
    els.modalBody.innerHTML = "";
    return;
  }

  const topSections = [...category.sections]
    .filter((section) => section.isActive)
    .sort((a, b) => b.weightedScore - a.weightedScore || b.normalizedScore - a.normalizedScore)
    .slice(0, 6);

  els.modalBody.innerHTML = `
    <div class="financial-grid">
      <div class="mini-card"><div class="label">카테고리 점수</div><div class="value">${formatScore(category.totalScore)} / ${formatScore(category.totalMax)}</div></div>
      <div class="mini-card"><div class="label">총 배점</div><div class="value">${category.totalMax.toFixed(1)}</div></div>
      <div class="mini-card"><div class="label">연결 섹션</div><div class="value">${category.sections.filter((section) => section.crossDependencies.length).length}개</div></div>
    </div>
    <div class="summary-box" style="margin-bottom:16px;">${escapeHtml(`${company.name}의 ${displayCategoryLabel(category.label)} 카테고리입니다. 상위 섹션과 점수 구조를 먼저 보고, 필요하면 세부 흐름으로 내려가면 됩니다.`)}</div>
    <div class="modal-list">
      ${topSections.map((section) => `<div class="modal-row"><strong>${escapeHtml(trimTitle(section.title))}</strong><div class="helper-note" style="margin-top:6px;">세부점수 ${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점 · 연결 ${section.crossDependencies.length}개</div></div>`).join("")}
    </div>
    <div class="category-actions">
      <button class="button" type="button" data-category-key="${category.key}">세부 흐름 보기</button>
      <button class="sub-button" type="button" data-close-modal>닫기</button>
    </div>
  `;
  els.categoryModal.classList.remove("hidden");
}

function renderEditorModal(company, model) {
  if (!els.editorModal || !els.editorModalBody) return;

  if (!state.editorModalCategoryKey || state.editorModalCategoryKey === "integrated") {
    els.editorModal.classList.add("hidden");
    els.editorModalBody.innerHTML = "";
    return;
  }

  const category = model.categoryMap.get(state.editorModalCategoryKey);
  if (!category) {
    state.editorModalCategoryKey = null;
    els.editorModal.classList.add("hidden");
    els.editorModalBody.innerHTML = "";
    return;
  }

  els.editorModalBody.innerHTML = `
    <div class="modal-head">
      <div>
        <div class="search-title">${escapeHtml(`${company.name} · ${displayCategoryLabel(category.label)} 세부 지표 편집`)}</div>
        <div class="search-sub">${escapeHtml("아래로 내려보는 대신 별도 창에서 세부 지표를 확인하고 바로 수정할 수 있도록 구성했습니다.")}</div>
      </div>
      <button class="sub-button modal-close" type="button" data-close-editor-modal>닫기</button>
    </div>
    ${buildCategoryEditorMarkup(category, company)}
  `;
  els.editorModal.classList.remove("hidden");
}

function renderDetailStageModal(company, activeCategory, activeSection) {
  if (!els.detailModal || !els.detailModalBody) return;

  if (!state.detailModalState || !activeCategory || !activeSection) {
    els.detailModal.classList.add("hidden");
    els.detailModalBody.innerHTML = "";
    return;
  }

  if (state.detailModalState.categoryKey !== activeCategory.key || state.detailModalState.sectionId !== activeSection.id) {
    state.detailModalState = null;
    els.detailModal.classList.add("hidden");
    els.detailModalBody.innerHTML = "";
    return;
  }

  const modalConfig = buildDetailModalConfig(company, activeCategory, activeSection, state.detailModalState.stage);
  if (!modalConfig) {
    state.detailModalState = null;
    els.detailModal.classList.add("hidden");
    els.detailModalBody.innerHTML = "";
    return;
  }

  els.detailModalBody.innerHTML = `
    <div class="modal-head">
      <div>
        <div class="search-title">${escapeHtml(modalConfig.title)}</div>
        <div class="search-sub">${escapeHtml(modalConfig.subtitle)}</div>
      </div>
      <button class="sub-button modal-close" type="button" data-close-detail-modal>닫기</button>
    </div>
    <div class="financial-grid">
      ${modalConfig.kpis
        .map((item) => `<div class="mini-card"><div class="label">${escapeHtml(item.label)}</div><div class="value">${escapeHtml(item.value)}</div></div>`)
        .join("")}
    </div>
    <div class="summary-box" style="margin-bottom:16px;">${escapeHtml(modalConfig.summary)}</div>
    ${modalConfig.html || `<div class="modal-list">
      ${modalConfig.rows.length ? modalConfig.rows.map((row) => `<div class="modal-row"><strong>${escapeHtml(row.label)}</strong><div class="helper-note" style="margin-top:6px;">${escapeHtml(row.value)}</div></div>`).join("") : `<div class="modal-row">표시할 세부 자료가 없습니다.</div>`}
    </div>`}
  `;
  els.detailModal.classList.remove("hidden");
}

function buildDetailModalConfig(company, category, section, stage) {
  const baseTitle = `${company.name} · ${displayCategoryLabel(category.label)} · ${trimTitle(section.title)}`;

  if (stage === "input") {
    const items = [...section.commonFields, ...section.inputResults];
    return {
      title: `${baseTitle} · 지표 입력 자료`,
      subtitle: "점수가 이상할 때 가장 먼저 확인해야 하는 원자료입니다.",
      kpis: [
        { label: "전체 원자료", value: `${items.length}개` },
        { label: "공통정보", value: `${section.commonFields.length}개` },
        { label: "직접 입력", value: `${section.inputResults.length}개` }
      ],
      summary: "입력값이 비정상적이거나 누락되면 뒤 단계 점수도 함께 흔들립니다. 이 창에서 실제 원자료를 먼저 점검하면 됩니다.",
      rows: items.map((item) => ({ label: item.field.shortLabel, value: `${item.displayValue} · 신호 ${item.signal.toFixed(1)}` }))
    };
  }

  if (stage === "derived") {
    return {
      title: `${baseTitle} · 계산 지표 자료`,
      subtitle: "입력 지표를 바탕으로 자동 계산된 중간 결과입니다.",
      kpis: [
        { label: "자동 계산", value: `${section.derivedResults.length}개` },
        { label: "연결 항목", value: `${section.crossDependencies.length}개` },
        { label: "세부 점수", value: `${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점` }
      ],
      summary: "입력은 정상인데 점수가 어색하면 이 계산 지표가 어떻게 나왔는지 먼저 보면 됩니다.",
      rows: section.derivedResults.map((item) => ({ label: item.field.shortLabel, value: `${item.displayValue} · 신호 ${item.signal.toFixed(1)}` }))
    };
  }

  if (stage === "section") {
    const sectionSources = [...section.commonFields, ...section.inputResults, ...section.derivedResults];
    return {
      title: `${baseTitle} · 세부 점수 자료`,
      subtitle: "파랑 단계 점수가 어떤 값들을 묶어서 나왔는지 보는 창입니다.",
      kpis: [
        { label: "세부 점수", value: `${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점` },
        { label: "배점", value: `${section.maxWeight.toFixed(1)}점` },
        { label: "참조 개수", value: `${sectionSources.length}개` }
      ],
      summary: "섹션 점수는 입력값과 계산값을 합쳐서 만들어집니다. 특정 섹션이 튀면 이 단계에서 묶인 자료를 같이 보면 됩니다.",
      rows: [
        { label: "세부 점수", value: `${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점` },
        { label: "카테고리 반영 점수", value: `${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점` },
        ...sectionSources.map((item) => ({ label: item.field.shortLabel, value: `${item.displayValue} · 신호 ${item.signal.toFixed(1)}` }))
      ]
    };
  }

  if (stage === "total") {
    const rankedSections = [...category.sections]
      .filter((item) => item.isActive)
      .sort((left, right) => right.weightedScore - left.weightedScore || right.normalizedScore - left.normalizedScore);
    return {
      title: `${company.name} · ${displayCategoryLabel(category.label)} · 총점 자료`,
      subtitle: "빨강 단계 총점이 어떤 섹션들로 구성되는지 보는 창입니다.",
      kpis: [
        { label: "카테고리 총점", value: `${category.totalScore.toFixed(1)} / ${category.totalMax.toFixed(1)}` },
        { label: "활성 섹션", value: `${rankedSections.length}개` },
        { label: "강점 섹션", value: trimTitle(rankedSections[0]?.title || "-") }
      ],
      summary: "카테고리 총점은 세부 점수가 누적되어 만들어집니다. 총점이 이상해 보일 때는 어느 섹션이 끌어올리거나 깎고 있는지 여기서 확인하면 됩니다.",
      rows: rankedSections.map((item) => ({ label: trimTitle(item.title), value: `세부점수 ${formatScore(item.weightedScore)} / ${formatScore(item.maxWeight)}점` }))
    };
  }

  if (stage === "links") {
    const commonRows = section.commonFields.map((item) => ({
      label: item.field.shortLabel,
      value: `공통정보 값 ${item.displayValue}`
    }));
    const dependencyRows = section.crossDependencies.map((dependency) => ({
      label: dependency.fieldLabel,
      value: `${findCategoryLabel(dependency.targetCategoryKey)}의 ${dependency.targetFieldLabel} 값을 참조`
    }));
    return {
      title: `${baseTitle} · 연결 관계 자료`,
      subtitle: "이 섹션이 다른 공통정보와 카테고리 값을 어떻게 참조하는지 보는 창입니다.",
      kpis: [
        { label: "공통정보 참조", value: `${commonRows.length}개` },
        { label: "카테고리 연동", value: `${dependencyRows.length}개` },
        { label: "총 연결 수", value: `${commonRows.length + dependencyRows.length}개` }
      ],
      summary: "점수 원인을 추적할 때는 어떤 입력값을 직접 쓰고, 어떤 값은 다른 카테고리에서 끌어오는지 먼저 확인하면 됩니다.",
      rows: [...commonRows, ...dependencyRows]
    };
  }

  if (stage === "summary") {
    return {
      title: `${baseTitle} · 해석 요약`,
      subtitle: "사용자에게 보여줄 해석 문장을 따로 모은 창입니다.",
      kpis: [
        { label: "기업", value: company.name },
        { label: "카테고리", value: displayCategoryLabel(category.label) },
        { label: "섹션 점수", value: `${formatScore(section.weightedScore)} / ${formatScore(section.maxWeight)}점` }
      ],
      summary: "메인 화면에서는 숫자 흐름만 보고, 실제 해석 문장은 이 창에서만 확인하는 구조입니다.",
      rows: [
        { label: "업종 그룹", value: getProfileLabel(company.profile) },
        { label: "연결 구조", value: [...section.crossDependencies.map((dependency) => `${findCategoryLabel(dependency.targetCategoryKey)}의 ${dependency.targetFieldLabel}`), ...section.commonFields.map((item) => `공통정보 ${item.field.shortLabel}`)].join(", ") || "직접 입력 중심" },
        { label: "사용자용 요약", value: buildSectionSummary(category, section, company) }
      ]
    };
  }

  if (stage === "edit") {
    const editableItems = dedupeByFieldId([...section.commonFields.filter((item) => !item.field.linkedFieldId), ...section.inputResults]);
    return {
      title: `${baseTitle} · 입력값 조정`,
      subtitle: "점수 이상 여부를 확인할 때 필요한 입력 항목만 따로 보는 창입니다.",
      kpis: [
        { label: "수정 가능", value: `${editableItems.length}개` },
        { label: "직접 입력", value: `${section.inputResults.length}개` },
        { label: "공통정보", value: `${section.commonFields.filter((item) => !item.field.linkedFieldId).length}개` }
      ],
      summary: "메인 화면에서 길게 펼치지 않고, 실제 조정이 필요할 때만 이 창에서 입력값을 바꾸면 됩니다.",
      rows: [],
      html: `<div class="field-edit-grid">${editableItems.map((item) => renderFieldEditor(item.field, item.rawValue)).join("")}</div>`
    };
  }

  return null;
}

function renderCategoryButtons(model, company, filteredCompanies, rankingMaps) {
  const entries = [{
    key: "integrated",
    label: "통합",
    description: `${company.snapshot.totalScore.toFixed(1)}점${rankingMaps.get("integrated")?.get(company.id) ? ` · ${filteredCompanies.length}개 중 ${rankingMaps.get("integrated").get(company.id)}위` : ""}`
  }, ...model.categories.map((category) => ({
    key: category.key,
    label: displayCategoryLabel(category.label),
    description: `${formatScore(category.totalScore)}점${rankingMaps.get(category.key)?.get(company.id) ? ` · ${filteredCompanies.length}개 중 ${rankingMaps.get(category.key).get(company.id)}위` : ""}`
  }))];

  els.sectorButtons.innerHTML = entries.map((item) => `
    <button class="sub-button${state.activeCategoryKey === item.key ? " active" : ""}" data-category-key="${item.key}">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
        <div>
          <div style="font-weight:700;font-size:14px;">${escapeHtml(item.label)}</div>
          <div style="font-size:12px;opacity:.85;line-height:1.5;">${escapeHtml(item.description)}</div>
        </div>
        <div style="font-size:16px;">›</div>
      </div>
    </button>
  `).join("");
}

function renderKpis(model, activeCategory, company, filteredCompanies, rankingMaps) {
  const activeRank = activeCategory ? rankingMaps.get(activeCategory.key)?.get(company.id) : rankingMaps.get("integrated")?.get(company.id);
  const cards = [
    { label: "전체 기업 수", value: `${state.companies.length}개`, sub: `${getBusinessSegmentLabel(state.businessSegment)} ${filteredCompanies.length}개` },
    { label: "현재 선택 기업", value: company.name, sub: `${company.industry} · ${company.region}` },
    { label: activeCategory ? `${activeCategory.label} 점수` : "통합 총점", value: `${formatScore(activeCategory ? activeCategory.totalScore : model.totalScore)}점`, sub: activeRank ? `${filteredCompanies.length}개 중 ${activeRank}위` : "순위 계산 없음" },
    { label: "연결 섹션", value: `${company.snapshot.linkedCount}개`, sub: company.snapshot.strongestCategory ? `강점 ${company.snapshot.strongestCategory.label}` : "강점 분석 준비" }
  ];

  els.kpiGrid.innerHTML = cards.map((card) => `
    <div class="kpi">
      <div class="kpi-label">${escapeHtml(card.label)}</div>
      <div class="kpi-value">${escapeHtml(card.value)}</div>
      <div class="kpi-sub">${escapeHtml(card.sub)}</div>
    </div>
  `).join("");
}

function renderIntegrated(selectedCompany, filteredCompanies) {
  const model = selectedCompany.snapshot.model;
  const categories = model.categories;
  els.integrated.innerHTML = `
    <h3>${escapeHtml(`${selectedCompany.name} 카테고리 점검판`)}</h3>
    <div class="helper-note" style="margin-bottom:14px;">${escapeHtml("현재 선택 기업의 6개 카테고리를 한눈에 보고, 필요한 카테고리만 눌러 세부 지표 편집 화면으로 내려갑니다.")}</div>
    <div class="category-grid">
      ${categories.map((category) => renderCategoryCard(category)).join("")}
    </div>
  `;
}

function renderCompanyCard(company, selectedCompanyId) {
  const outline = company.id === selectedCompanyId ? "border-color:#0f172a;background:#f8fafc;" : "";
  return `
    <button class="result-item" data-company-id="${company.id}" data-target-tab="integrated" style="${outline}">
      <div class="result-flex">
        <div style="text-align:left;">
          <div class="company-name">${escapeHtml(company.name)}</div>
          <div class="company-meta">${escapeHtml(`${getProfileLabel(company.profile)} · ${company.industry} · ${company.region} · ${company.size}`)}</div>
          <div class="company-summary">${escapeHtml(company.summary)}</div>
          <div>${company.badges.slice(0, 3).map((badge) => `<span class="badge">${escapeHtml(badge)}</span>`).join("")}</div>
        </div>
        <div class="score-box"><small>총점</small><strong>${company.snapshot.totalScore.toFixed(1)}</strong></div>
      </div>
    </button>
  `;
}

function renderCategoryCard(category) {
  const isActive = state.activeCategoryKey === category.key;
  const topSection = [...category.sections]
    .filter((section) => section.isActive)
    .sort((a, b) => b.weightedScore - a.weightedScore || b.normalizedScore - a.normalizedScore)[0];

  return `
    <div class="category-card${isActive ? " active" : ""}">
      <div class="category-card-head">
        <div>
          <div class="category-card-title">${escapeHtml(displayCategoryLabel(category.label))}</div>
          <div class="helper-note">${escapeHtml("점수를 먼저 확인하고, 이상하면 바로 세부 지표로 내려가 수정합니다.")}</div>
        </div>
        <div class="category-card-score">
          <small>점수</small>
          <strong>${formatScore(category.totalScore)}</strong>
        </div>
      </div>
      <div class="bar"><div class="bar-fill" style="width:${getCategoryBarPercent(category)}%"></div></div>
      <div class="helper-note">${escapeHtml(`대표 세부 항목: ${topSection ? trimTitle(topSection.title) : "없음"} · 세부 항목 ${category.sections.filter((section) => section.isActive).length}개`)}</div>
      <div>${category.sections.slice(0, 3).map((section) => `<span class="badge">${escapeHtml(trimTitle(section.title))}</span>`).join("")}</div>
      <div class="category-actions">
        <button class="button" type="button" data-category-key="${category.key}">세부 지표 보기</button>
      </div>
    </div>
  `;
}

function renderSectionEditorCard(section, company, category) {
  const editableItems = dedupeByFieldId([...section.commonFields.filter((item) => !item.field.linkedFieldId), ...section.inputResults]);
  const linkedNotes = [
    ...section.crossDependencies.map((dependency) => `${findCategoryLabel(dependency.targetCategoryKey)}의 ${dependency.targetFieldLabel} 참조`),
    ...section.commonFields.map((item) => `공통정보 ${item.field.shortLabel}`)
  ];

  return `
    <div class="card" style="padding:20px;margin-bottom:16px;">
      <div class="category-card-head" style="margin-bottom:14px;">
        <div>
          <div class="category-card-title" style="margin-bottom:4px;">${escapeHtml(trimTitle(section.title))}</div>
          <div class="helper-note">${escapeHtml(`${company.name}의 ${displayCategoryLabel(category.label)} 카테고리 안에서 직접 확인하고 수정하는 세부 지표입니다.`)}</div>
        </div>
        <div class="category-card-score">
          <small>세부 점수</small>
          <strong>${formatScore(section.weightedScore)}</strong>
        </div>
      </div>
      ${linkedNotes.length ? `<div class="summary-box" style="margin-bottom:16px;"><strong style="display:block;margin-bottom:8px;">연동 참고</strong><div class="helper-note">${escapeHtml(linkedNotes.join(", "))}</div></div>` : ""}
      ${editableItems.length ? `<div class="field-edit-grid">${editableItems.map((item) => renderFieldEditor(item.field, item.rawValue)).join("")}</div>` : `<div class="summary-box">이 섹션에서 직접 수정할 수 있는 지표가 없습니다.</div>`}
    </div>
  `;
}

function renderCompanyTable(pageState, selectedCompany, activeCategory, pageTarget) {
  const scoreLabel = activeCategory ? `${activeCategory.label} 점수` : "총점";
  const pageInfo = `${pageState.startIndex + 1}-${pageState.endIndex} / ${pageState.totalItems}개`;

  return `
    <div class="page-toolbar">
      <div class="page-info">${escapeHtml(pageInfo)}</div>
      ${renderPagination(pageState, pageTarget)}
    </div>
    <div class="table-scroll">
      <div class="ranking-wrap">
        <div class="ranking-header">
          <div>순위</div>
          <div>기업</div>
          <div>메타</div>
          <div>연결</div>
          <div>강점</div>
          <div style="text-align:right;">${escapeHtml(scoreLabel)}</div>
        </div>
        ${pageState.items.map((company, index) => {
          const score = activeCategory ? getCompanyCategoryScore(company, activeCategory.key) : company.snapshot.totalScore;
          const strongest = activeCategory ? getTopSectionLabel(company, activeCategory.key) : company.snapshot.strongestCategory?.label || "-";
          const outline = company.id === selectedCompany.id ? "background:#f8fafc;" : "";

          return `<button class="ranking-row" data-company-id="${company.id}" data-target-tab="integrated" style="${outline}"><div>${pageState.startIndex + index + 1}</div><div style="font-weight:700;">${escapeHtml(company.name)}</div><div>${escapeHtml(`${company.industry} · ${company.region} · ${company.size}`)}</div><div>${company.snapshot.linkedCount}개</div><div>${escapeHtml(strongest)}</div><div style="text-align:right;font-weight:700;">${score.toFixed(1)}</div></button>`;
        }).join("")}
      </div>
    </div>
    <div class="page-toolbar" style="margin-top:12px;">
      <div class="page-info">${escapeHtml(`${pageState.totalPages}페이지 중 ${pageState.page}페이지`)}</div>
      ${renderPagination(pageState, pageTarget)}
    </div>
  `;
}

function paginateItems(items, requestedPage, pageSize) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = clamp(requestedPage || 1, 1, totalPages);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  return {
    items: items.slice(startIndex, endIndex),
    page,
    pageSize,
    totalItems,
    totalPages,
    startIndex,
    endIndex
  };
}

function renderPagination(pageState, pageTarget) {
  if (pageState.totalPages <= 1) {
    return "";
  }

  const pageNumbers = buildPageNumbers(pageState.page, pageState.totalPages);
  const prevPage = Math.max(1, pageState.page - 1);
  const nextPage = Math.min(pageState.totalPages, pageState.page + 1);

  return `
    <div class="pagination-controls">
      <button class="sub-button page-btn" data-page-target="${pageTarget}" data-page-number="${prevPage}" ${pageState.page === 1 ? "disabled" : ""}>이전</button>
      ${pageNumbers
        .map((pageNumber) => `<button class="${pageNumber === pageState.page ? "button" : "sub-button"} page-btn" data-page-target="${pageTarget}" data-page-number="${pageNumber}">${pageNumber}</button>`)
        .join("")}
      <button class="sub-button page-btn" data-page-target="${pageTarget}" data-page-number="${nextPage}" ${pageState.page === pageState.totalPages ? "disabled" : ""}>다음</button>
    </div>
  `;
}

function buildPageNumbers(currentPage, totalPages) {
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, start + 4);
  const adjustedStart = Math.max(1, end - 4);
  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
}

function renderRanking(model, selectedCompany, filteredCompanies) {
  const rankingCategoryKey = state.rankingCategoryKey || "integrated";
  const rankingCategory = rankingCategoryKey === "integrated" ? null : model.categoryMap.get(rankingCategoryKey) || null;
  const rankedCompanies = [...filteredCompanies].sort((a, b) => {
    const aScore = rankingCategory ? getCompanyCategoryScore(a, rankingCategory.key) : a.snapshot.totalScore;
    const bScore = rankingCategory ? getCompanyCategoryScore(b, rankingCategory.key) : b.snapshot.totalScore;
    return bScore - aScore || b.snapshot.totalScore - a.snapshot.totalScore;
  });
  const rankingOptions = [
    { value: "integrated", label: "통합 순위" },
    ...model.categories.map((category) => ({
      value: category.key,
      label: displayCategoryLabel(category.label)
    }))
  ];

  els.ranking.innerHTML = `
    <div class="sidebar-panel-title">
      <h3>기업 순위</h3>
      <span>${escapeHtml(`${rankedCompanies.length}개`)}</span>
    </div>
    <div style="margin-bottom:12px;">
      <select class="select" data-ranking-category-select style="height:44px;font-size:13px;">
        ${rankingOptions.map((option) => `<option value="${escapeAttr(option.value)}" ${option.value === rankingCategoryKey ? "selected" : ""}>${escapeHtml(option.label)}</option>`).join("")}
      </select>
    </div>
    <div class="helper-note" style="margin-bottom:14px;">${escapeHtml("한 번에 5개 정도가 보이도록 줄였고, 휠로 내려가면서 전체 기업을 볼 수 있습니다.")}</div>
    ${rankedCompanies.length ? `
      <div class="sidebar-ranking-list">
        ${rankedCompanies.map((company, index) => {
          const score = rankingCategory ? getCompanyCategoryScore(company, rankingCategory.key) : company.snapshot.totalScore;
          const active = company.id === selectedCompany.id ? " active" : "";
          return `
            <button class="sidebar-ranking-item${active}" data-company-id="${company.id}" data-target-tab="integrated" type="button">
              <div class="sidebar-rank-badge">${index + 1}</div>
              <div>
                <div class="sidebar-ranking-name">${escapeHtml(company.name)}</div>
              </div>
              <div class="sidebar-ranking-score">
                <strong>${score.toFixed(1)}</strong>
              </div>
            </button>
          `;
        }).join("")}
      </div>
    ` : `<div class="summary-box">검색 조건에 맞는 순위 데이터가 없습니다.</div>`}
  `;
}
function renderDetail(activeCategory, activeSection, company) {
  if (!activeCategory) {
    renderIntegratedDetail(company);
    return;
  }
  els.detail.innerHTML = buildCategoryEditorMarkup(activeCategory, company, { includeBackButton: true });
}

function buildCategoryEditorMarkup(activeCategory, company, options = {}) {
  const { includeBackButton = false } = options;
  const visibleSections = filterVisibleSections(activeCategory);
  if (!visibleSections.length) {
    return `<h3>${escapeHtml(activeCategory.label)} 상세</h3><div class="summary-box">현재 필터 조건에 맞는 섹션이 없습니다.</div>`;
  }
  const editableCount = visibleSections.reduce((sum, section) => sum + dedupeByFieldId([...section.commonFields.filter((item) => !item.field.linkedFieldId), ...section.inputResults]).length, 0);
  const linkedCount = visibleSections.reduce((sum, section) => sum + section.crossDependencies.length, 0);

  return `
    <h3>${escapeHtml(`${company.name} · ${displayCategoryLabel(activeCategory.label)} 세부 지표`)}</h3>
    <div class="helper-note" style="margin-bottom:16px;">${escapeHtml("이 화면은 점수가 맞는지 눈으로 확인하고 바로 수정하는 화면입니다. 계산 흐름은 빼고, 세부 지표만 한 번에 보이도록 정리했습니다.")}</div>
    ${includeBackButton ? `<div style="margin-bottom:16px;"><button class="sub-button" type="button" data-category-key="integrated" style="width:auto;">카테고리 보드로 돌아가기</button></div>` : ""}
    <div class="detail-grid compact">
      <div>
        <div class="financial-grid">
          <div class="mini-card"><div class="label">선택 기업 총점</div><div class="value">${company.snapshot.totalScore.toFixed(1)}점</div></div>
          <div class="mini-card"><div class="label">${escapeHtml(activeCategory.label)} 점수</div><div class="value">${formatScore(activeCategory.totalScore)}점</div></div>
          <div class="mini-card"><div class="label">세부 지표 수</div><div class="value">${editableCount}개</div></div>
          <div class="mini-card"><div class="label">연동 항목</div><div class="value">${linkedCount}개</div></div>
        </div>
        ${visibleSections.map((section) => renderSectionEditorCard(section, company, activeCategory)).join("")}
      </div>
    </div>
  `;
}

function renderIntegratedDetail(company) {
  const model = company.snapshot.model;
  els.detail.innerHTML = `
    <h3>${escapeHtml(`${company.name} · 세부 지표 편집`)}</h3>
    <div class="summary-box" style="margin-bottom:16px;">카테고리 보기에서 건전성, 공정성, 사회공헌, 소비자 보호, 환경경영, 직원만족 중 하나를 먼저 누르면 그 카테고리의 세부 지표 편집 화면이 열립니다.</div>
    <div class="category-grid">
      ${model.categories.map((category) => `<button class="result-item" data-category-key="${category.key}"><div class="result-flex"><div><div class="company-name" style="font-size:16px;">${escapeHtml(displayCategoryLabel(category.label))}</div><div class="company-summary">세부 지표 확인 및 수정</div></div><div class="score-box"><small>점수</small><strong>${formatScore(category.totalScore)}</strong></div></div></button>`).join("")}
    </div>
  `;
}

function renderQuestions(activeCategory, activeSection, company) {
  if (!els.questionGrid || !els.questionGrid.isConnected) return;
  const questions = activeCategory ? [
    `${company.name}의 ${activeCategory.label} 세부 지표를 다시 확인해줘`,
    `${displayCategoryLabel(activeCategory.label)}에서 수정 가능한 항목만 보여줘`,
    `${company.name}의 ${activeCategory.label} 연동 항목을 알려줘`
  ] : [
    `${company.name}의 6개 카테고리 점수를 먼저 확인해줘`,
    `${company.name}에서 점수가 낮은 카테고리를 보여줘`,
    `${company.name}의 세부 지표를 수정하려면 어디를 눌러야 해?`
  ];
  els.questionGrid.innerHTML = questions.map((question) => `<button class="sub-button" style="font-size:13px;padding:12px 14px;">${escapeHtml(question)}</button>`).join("");
}

function renderAiExample(activeCategory, activeSection, model, company) {
  if (!els.aiExample) return;

  if (!activeCategory) {
    els.aiExample.textContent = `${company.name}의 6개 카테고리 점수를 먼저 확인하세요. 점수가 이상해 보이는 카테고리를 누르면 세부 지표 편집 화면으로 이동해 바로 값을 수정할 수 있습니다.`;
    return;
  }
  els.aiExample.textContent = `${company.name}의 ${displayCategoryLabel(activeCategory.label)} 세부 지표 편집 화면입니다. 아래 지표를 눈으로 확인하면서 필요한 항목만 수정하면 됩니다. 계산 흐름은 생략하고, 실무자가 바로 검토하기 쉬운 구조로 맞췄습니다.`;
}

async function handleChatSubmit() {
  // 채팅 전송 진입점입니다.
  // 여기서는 UI 메시지를 추가하고, 외부 계산/Agent 서버 요청은 requestExternalCalculation()에 위임합니다.
  const question = els.aiChatInput?.value.trim();
  if (!question) return;

  els.aiChatInput.value = "";
  addChatMessage("user", question);
  addChatMessage("assistant", "외부 계산 결과를 요청하는 중입니다...");

  const payload = buildExternalCalculationPayload(question);
  try {
    const result = await requestExternalCalculation(payload);
    state.chatMessages.pop();
    applyExternalCalculationResult(result);
    addChatMessage("assistant", state.externalCalculationResult.answer);
  } catch (error) {
    state.chatMessages.pop();
    addChatMessage("assistant", `외부 계산 결과를 불러오지 못했습니다.\n${error instanceof Error ? error.message : String(error)}`);
  }
  renderChatMessages();
}

function addChatMessage(role, text) {
  state.chatMessages.push({
    role,
    text,
    createdAt: new Date().toISOString()
  });
  renderChatMessages();
}

function renderChatMessages() {
  if (!els.aiChatLog) return;

  const messages = state.chatMessages;

  els.aiChatLog.innerHTML = messages.map((message) => {
    const isUser = message.role === "user";
    return `
      <div style="justify-self:${isUser ? "end" : "start"};max-width:92%;padding:11px 13px;border-radius:14px;background:${isUser ? "#0f172a" : "#f1f5f9"};color:${isUser ? "#fff" : "#0f172a"};font-size:13px;line-height:1.6;white-space:pre-wrap;">
        ${escapeHtml(message.text)}
      </div>
    `;
  }).join("");
  els.aiChatLog.scrollTop = els.aiChatLog.scrollHeight;
}

function buildExternalCalculationPayload(question) {
  // 외부 계산/Agent 서버로 보낼 요청 데이터입니다.
  // 연결 담당자는 외부 서버가 필요한 값이 더 있으면 이 객체에 필드를 추가하면 됩니다.
  // 예: scorecard, metrics, facts, records, selectedSection 등
  const company = getSelectedCompany();
  const model = company?.snapshot?.model || null;
  const activeCategory = model ? getActiveCategory(model) : null;

  return {
    question,
    year: state.selectedYear,
    businessSegment: state.businessSegment,
    company: company ? {
      id: company.id,
      name: company.name,
      code: company.companyNo,
      profile: company.profile,
      industry: company.industry
    } : null,
    activeCategory: activeCategory ? {
      key: activeCategory.key,
      label: activeCategory.label,
      score: activeCategory.totalScore
    } : null,
    categories: model ? model.categories.map((category) => ({
      key: category.key,
      label: category.label,
      score: category.totalScore,
      maxScore: category.totalMax
    })) : []
  };
}

async function requestExternalCalculation(payload) {
  // ============================================================
  // 외부 계산 서버 연결 지점
  // ============================================================
  // 이 프로젝트는 여기서 엑셀을 직접 계산하지 않습니다.
  // 다른 사람이 만든 계산 서버/API가 있으면 이 함수 안의 샘플 응답을 지우고
  // 아래 방식 중 하나로 연결하면 됩니다.
  //
  // 전체 흐름:
  // 1. 사용자가 채팅 입력
  // 2. handleChatSubmit()
  // 3. buildExternalCalculationPayload(question)에서 현재 기업/연도/카테고리 정보를 payload로 구성
  // 4. 바로 이 requestExternalCalculation(payload)에서 외부 계산 서버로 payload 전송
  // 5. applyExternalCalculationResult(result)가 응답을 UI에 반영
  // 6. answer는 채팅창에 표시
  // 7. excelDownloadUrl은 "답변 근거 엑셀 다운로드" 버튼에 연결
  // 8. evidenceUrls는 "근거 사이트 열기" / "근거 URL 복사" 버튼에 연결
  //
  // 외부 서버 응답 형식 예시:
  // {
  //   answer: "AI가 사용자에게 보여줄 판단근거 문장",
  //   excelDownloadUrl: "https://example.com/result.xlsx",
  //   evidenceUrls: ["https://example.com/evidence/1", "https://example.com/evidence/2"]
  // }
  //
  // ------------------------------------------------------------
  // 방식 A. 프론트에서 외부 계산 서버를 직접 호출하는 방식
  // ------------------------------------------------------------
  // 장점: 빠르게 연결 가능
  // 단점: 외부 서버 주소/API 키가 브라우저에 노출될 수 있음
  //
  // const response = await fetch("https://YOUR-CALC-SERVER/esg/analyze", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload)
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`외부 계산 서버 오류: ${response.status}`);
  // }
  //
  // return await response.json();
  //
  // ------------------------------------------------------------
  // 방식 B. server.js를 중계 서버로 사용하는 방식
  // ------------------------------------------------------------
  // 실제 운영에서는 이 방식을 권장합니다.
  // API 키, 내부 계산 서버 주소, CORS 문제를 server.js 안에 숨길 수 있습니다.
  //
  // public/app.js는 우리 Node 서버만 호출:
  //
  // const response = await fetch("/api/analyze", {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(payload)
  // });
  //
  // if (!response.ok) {
  //   throw new Error(`분석 API 오류: ${response.status}`);
  // }
  //
  // return await response.json();
  //
  // 그 다음 server.js에 POST /api/analyze를 만들고,
  // server.js 안에서 실제 외부 계산 서버를 호출하면 됩니다.
  //
  // server.js 쪽 중계 예시:
  //
  // if (url.pathname === "/api/analyze" && req.method === "POST") {
  //   const body = await readJsonBody(req);
  //   const calcResponse = await fetch("https://YOUR-CALC-SERVER/esg/analyze", {
  //     method: "POST",
  //     headers: {
  //       "Content-Type": "application/json",
  //       "Authorization": `Bearer ${process.env.CALC_API_KEY}`
  //     },
  //     body: JSON.stringify(body)
  //   });
  //   const result = await calcResponse.json();
  //   res.writeHead(calcResponse.status, { "Content-Type": "application/json; charset=utf-8" });
  //   res.end(JSON.stringify(result));
  //   return;
  // }

  const companyName = payload.company?.name || "선택 기업 없음";
  const categoryText = payload.activeCategory ? `${payload.activeCategory.label} ${formatScore(payload.activeCategory.score)}점` : "전체 카테고리";
  return {
    answer: `[연결 샘플]\n${companyName} 기준 ${categoryText}에 대한 질문입니다.\n\n외부 계산 서버 연결 후 이 위치에 판단근거가 표시됩니다.\n\n질문: ${payload.question}`,
    excelDownloadUrl: "",
    evidenceUrls: []
  };
}

function applyExternalCalculationResult(result) {
  // 외부 계산/Agent 서버 응답을 UI 상태로 저장하는 함수입니다.
  // 응답 필드명이 다르면 여기서 매핑만 바꾸면 됩니다.
  state.externalCalculationResult = {
    answer: result?.answer || "외부 계산 서버에서 답변을 받지 못했습니다.",
    excelDownloadUrl: result?.excelDownloadUrl || "",
    evidenceUrls: Array.isArray(result?.evidenceUrls) ? result.evidenceUrls.filter(Boolean) : []
  };
}

function downloadCurrentCompanyExcel() {
  // "답변 근거 엑셀 다운로드" 버튼 처리입니다.
  // 원칙적으로는 마지막 AI 응답의 excelDownloadUrl을 다운로드합니다.
  // excelDownloadUrl이 없을 때만 현재 화면 값을 임시 xls로 내려받습니다.
  const company = getSelectedCompany();
  if (!company?.snapshot) {
    addChatMessage("assistant", "다운로드할 기업 데이터가 없습니다.");
    return;
  }

  // ============================================================
  // 외부 계산 결과 엑셀 다운로드 연결 지점
  // ============================================================
  // 계산 서버가 result.excelDownloadUrl을 내려주면 아래 if 문이 바로 사용합니다.
  // 예: { excelDownloadUrl: "https://YOUR-CALC-SERVER/files/result.xlsx" }
  if (state.externalCalculationResult?.excelDownloadUrl) {
    window.location.href = state.externalCalculationResult.excelDownloadUrl;
    return;
  }

  // 외부 서버가 아직 없을 때만 현재 화면 데이터를 임시 xls로 다운로드합니다.
  const rows = [
    ["기업명", company.name],
    ["기준연도", state.selectedYear],
    ["총점", formatScore(company.snapshot.totalScore)],
    [],
    ["카테고리", "점수", "배점"]
  ];

  company.snapshot.model.categories.forEach((category) => {
    rows.push([displayCategoryLabel(category.label), formatScore(category.totalScore), formatScore(category.totalMax)]);
  });

  const tableHtml = `
    <table>
      ${rows.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell ?? ""))}</td>`).join("")}</tr>`).join("")}
    </table>
  `;
  const blob = new Blob([`\ufeff${tableHtml}`], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(company.name) || "company"}_${state.selectedYear}_ESG_결과.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function openPrimaryEvidenceUrl() {
  const url = getEvidenceUrls(getSelectedCompany())[0];
  if (!url) {
    addChatMessage("assistant", "연결된 근거 사이트 URL이 없습니다. 외부 계산 서버 응답의 evidenceUrls를 이 버튼에 연결하면 됩니다.");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

async function copyPrimaryEvidenceUrl() {
  const url = getEvidenceUrls(getSelectedCompany())[0];
  if (!url) {
    addChatMessage("assistant", "복사할 근거 URL이 없습니다.");
    return;
  }

  try {
    await navigator.clipboard.writeText(url);
    addChatMessage("assistant", `근거 URL을 복사했습니다.\n${url}`);
  } catch {
    addChatMessage("assistant", `클립보드 복사가 막혀 있습니다. 아래 URL을 직접 복사하세요.\n${url}`);
  }
}

function getEvidenceUrls(company) {
  // "근거 사이트 열기" / "근거 URL 복사" 버튼에서 사용하는 URL 목록입니다.
  // 외부 계산/Agent 서버가 evidenceUrls를 내려주면 그것을 최우선으로 사용합니다.
  if (state.externalCalculationResult?.evidenceUrls?.length) {
    return state.externalCalculationResult.evidenceUrls;
  }

  if (!company || !state.indexes?.fieldLookup) return [];

  const urls = [];
  for (const field of state.indexes.fieldLookup.values()) {
    const value = company.values?.[field.id];
    if (field.inputType === "url" && hasValue(value)) urls.push(String(value));
    if (/^https?:\/\//.test(String(value || ""))) urls.push(String(value));
  }

  // 외부 계산 서버가 판단근거 URL을 내려주면
  // applyExternalCalculationResult(result)에서 state.externalCalculationResult.evidenceUrls에 저장되고
  // 이 함수가 그 URL을 우선 사용합니다.
  return [...new Set(urls)];
}

function renderPreview(model, company) {
  els.previewName.textContent = company.name;
  els.previewMeta.textContent = `${state.selectedYear}년 · ${getProfileLabel(company.profile)} · ${company.industry} · ${company.region} · ${company.size}`;
  els.previewScore.textContent = formatScore(model.totalScore);
  els.previewBars.innerHTML = scoreBars(model.categories.map((category) => ({
    label: category.label,
    value: category.totalScore,
    percent: getCategoryBarPercent(category)
  })));
}

function renderLegend() {
  const items = [
    { color: "#dbeafe", title: "1. 기업 선택", desc: "기업 목록에서 회사를 누르면 해당 회사의 6개 카테고리 점수가 먼저 보입니다." },
    { color: "#dcfce7", title: "2. 카테고리 확인", desc: "건전성, 공정성, 사회공헌, 소비자 보호, 환경경영, 직원만족 점수를 눈으로 먼저 확인합니다." },
    { color: "#fee2e2", title: "3. 세부 지표 수정", desc: "점수가 이상하면 카테고리를 눌러 세부 지표를 보고 바로 수정하면 됩니다." }
  ];
  els.legendPanel.innerHTML = items.map((item) => `<div class="legend-item"><span class="legend-dot" style="background:${item.color};"></span><div><div style="font-weight:700;margin-bottom:4px;">${escapeHtml(item.title)}</div><div class="helper-note">${escapeHtml(item.desc)}</div></div></div>`).join("");
}

function renderTabs() {
  els.tabButtons.forEach((button) => {
    button.className = `${button.dataset.tab === state.tab ? "button" : "sub-button"} tab-btn`;
  });
  els.integrated.classList.remove("hidden");
  els.ranking.classList.remove("hidden");
  els.detail.classList.add("hidden");
}

function renderFieldEditor(field, value) {
  const tag = field.linkedFieldId ? "link" : field.role === "derived" ? "derived" : "input";
  if (field.linkedFieldId) {
    return `<div class="field-card"><label><span>${escapeHtml(field.shortLabel)}</span><div class="tone-row"><span class="tone-chip ${tag}">참조</span><span class="helper-note">${escapeHtml(findCategoryLabel(field.linkedCategoryKey))} 연동</span></div><div class="summary-box">${escapeHtml(formatFieldValue(field, state.values[field.linkedFieldId]))}</div></label></div>`;
  }
  return `<div class="field-card"><label><span>${escapeHtml(field.shortLabel)}</span><div class="tone-row"><span class="tone-chip ${tag}">${escapeHtml(field.inputType === "boolean" ? "예/아니오" : field.inputType === "grade" ? "등급" : "입력")}</span></div>${renderFieldControl(field, value)}</label></div>`;
}

function renderFieldControl(field, value) {
  if (field.inputType === "boolean") {
    return `<select class="select" data-field-id="${field.id}"><option value="1" ${Number(value) === 1 ? "selected" : ""}>예</option><option value="0" ${Number(value) === 0 ? "selected" : ""}>아니오</option></select>`;
  }
  if (field.inputType === "grade") {
    const options = field.options?.length ? field.options : ["A", "B", "C", "D"];
    return `<select class="select" data-field-id="${field.id}">${options.map((option) => `<option value="${escapeHtml(option)}" ${value === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select>`;
  }
  if (field.inputType === "text" && field.label.includes("내용")) {
    return `<textarea class="textarea" data-field-id="${field.id}">${escapeHtml(value || "")}</textarea>`;
  }
  const inputType = field.inputType === "number" || field.inputType === "percent" ? "number" : field.inputType === "url" ? "url" : "text";
  return `<input class="text-input" data-field-id="${field.id}" type="${inputType}" value="${escapeAttr(value ?? "")}" ${inputType === "number" ? 'step="0.1"' : ""}>`;
}

function renderResultItems(items, emptyMessage) {
  return items.length ? items.map((item) => renderPolicyItem(item.field.shortLabel, item.displayValue)).join("") : `<div class="policy-item">${escapeHtml(emptyMessage)}</div>`;
}

function renderPolicyItem(label, value) {
  return `<div class="policy-item"><strong>${escapeHtml(label)}</strong><br>${escapeHtml(String(value))}</div>`;
}

function scoreBars(items) {
  return `<div class="score-bars">${items.map((item) => `<div class="row"><div class="top"><span>${escapeHtml(item.label)}</span><strong>${formatScore(item.value)}</strong></div><div class="bar"><div class="bar-fill" style="width:${clamp(item.percent ?? item.value, 0, 100)}%"></div></div></div>`).join("")}</div>`;
}

function buildCompanySummary(company) {
  return `${company.snapshot.strongestCategory?.label || "강점"} 점수가 상대적으로 높고 ${company.snapshot.weakestCategory?.label || "보완"} 카테고리는 추가 확인이 필요합니다. 엑셀에 저장된 값 기준 화면입니다.`;
}

function buildCompanyBadges(company) {
  return [...company.snapshot.topSections.slice(0, 2).map((item) => `${item.categoryLabel} · ${trimTitle(item.title)}`), `${company.region} · ${company.size}`];
}

function buildCompanySearchText(company) {
  const sectionTokens = company.snapshot.model.categories.flatMap((category) => category.sections.map((section) => `${category.label} ${section.title} ${section.fullLabel}`));
  return [company.name, company.industry, company.region, company.size, company.disclosure, getProfileLabel(company.profile), company.summary, ...company.badges, ...sectionTokens].join(" ").toLowerCase();
}

function buildSectionSummary(category, section, company) {
  const strongest = [...section.commonFields, ...section.inputResults].sort((a, b) => b.signal - a.signal)[0];
  const weakest = [...section.commonFields, ...section.inputResults].sort((a, b) => a.signal - b.signal)[0];
  const relation = section.crossDependencies.length ? "다른 카테고리와 연결된 입력이 있어서 참조값을 같이 확인하는 편이 좋습니다." : "현재 섹션 안의 입력만 조정해도 점수 변화를 바로 볼 수 있습니다.";
  return `${company.name}의 ${category.label} 중 ${trimTitle(section.title)} 섹션은 ${section.maxWeight.toFixed(1)}점 배점입니다. 현재 강한 입력은 ${strongest?.field.shortLabel || "-"}, 약한 입력은 ${weakest?.field.shortLabel || "-"}입니다. ${relation}`;
}

function getCompanyCategoryScore(company, categoryKey) {
  return company.snapshot.model.categoryMap.get(categoryKey)?.totalScore || 0;
}

function getTopSectionLabel(company, categoryKey) {
  const category = company.snapshot.model.categoryMap.get(categoryKey);
  const section = category ? [...category.sections].sort((a, b) => b.weightedScore - a.weightedScore)[0] : null;
  return section ? trimTitle(section.title) : "-";
}

function getCategoryBarPercent(category) {
  return category.totalMax ? clamp((category.totalScore / category.totalMax) * 100, 0, 100) : clamp(category.totalScore, 0, 100);
}

function formatScore(value) {
  return Number(value || 0).toFixed(1);
}

function readWorkbookSectionScore(section) {
  const rawValue = state.values[section.scoreField.id];
  return hasValue(rawValue) ? round(toNumber(rawValue)) : null;
}

function readWorkbookCategoryScore(category) {
  if (category.totalField && hasValue(state.values[category.totalField.id])) {
    return round(toNumber(state.values[category.totalField.id]));
  }

  const integratedValue = state.values[`__integratedCategory:${category.key}`];
  return hasValue(integratedValue) ? round(toNumber(integratedValue)) : null;
}

function findCategoryLabel(categoryKey) {
  return state.template.categories.find((category) => category.key === categoryKey)?.label || "다른 카테고리";
}

function readFieldValue(field, control) {
  if (field.inputType === "boolean") return Number(control.value);
  if (field.inputType === "number" || field.inputType === "percent") return control.value === "" ? 0 : Number(control.value);
  return control.value;
}

function formatFieldValue(field, value) {
  if (value === null || value === undefined || value === "") return "-";
  if (field.inputType === "boolean") return Number(value) === 1 ? "예" : "아니오";
  if (field.inputType === "number") return Number(value).toLocaleString("ko-KR");
  if (field.inputType === "percent") return `${Number(value).toFixed(1)}%`;
  return String(value);
}

function hasValue(value) {
  return !(value === null || value === undefined || String(value).trim() === "");
}

function fillSelect(selectEl, items) {
  selectEl.innerHTML = items.map((item) => `<option value="${escapeAttr(item.value)}">${escapeHtml(item.label)}</option>`).join("");
}

function matchesBusinessSegment(company, segment) {
  if (!company || segment === "all") return true;

  const finance = isFinanceCompany(company);
  const manufacturing = isManufacturingCompany(company);

  if (segment === "finance") return finance;
  if (segment === "non-finance") return !finance;
  if (segment === "manufacturing") return manufacturing;
  if (segment === "non-manufacturing") return !finance && !manufacturing;
  return true;
}

function isFinanceCompany(company) {
  const text = `${company.profile || ""} ${company.industry || ""} ${company.disclosure || ""}`;
  return company.profile === "finance" || /금융|은행|보험|증권|카드|캐피탈|자산운용/.test(text);
}

function isManufacturingCompany(company) {
  if (isFinanceCompany(company)) return false;
  const text = `${company.profile || ""} ${company.industry || ""} ${company.name || ""}`;
  return /제조|생산|공업|장비|기계|전자|자동차|화학|반도체|소재|바이오|식품|철강/.test(text);
}

function getBusinessSegmentLabel(segment) {
  const labels = {
    all: "전체",
    finance: "금융",
    "non-finance": "비금융",
    manufacturing: "제조",
    "non-manufacturing": "비제조"
  };
  return labels[segment] || "전체";
}

function getProfileLabel(profile) {
  return profile === "finance" ? "금융업" : "제조 및 비제조업";
}

function displayCategoryLabel(label) {
  return label === "소비자보호" ? "소비자 보호" : label;
}

function trimTitle(value) {
  return String(value || "").replace(/\n/g, " ").replace(/^\d+\.\s*/, "").trim();
}

function getCommonValue(values, shortLabel) {
  const field = state.template.commonFields.find((item) => item.shortLabel === shortLabel);
  return field ? toNumber(values[field.id]) : 0;
}

function createCompanyName(index, profile) {
  const prefix = COMPANY_NAME_PREFIXES[index % COMPANY_NAME_PREFIXES.length];
  const middle = COMPANY_NAME_MIDDLES[Math.floor(index / COMPANY_NAME_PREFIXES.length) % COMPANY_NAME_MIDDLES.length];
  const tail = profile === "finance" ? FINANCE_NAME_TAILS[index % FINANCE_NAME_TAILS.length] : MANUFACTURING_NAME_TAILS[index % MANUFACTURING_NAME_TAILS.length];
  return `${prefix}${middle}${tail}`;
}

function createRandom(seed) {
  let value = (seed * 1103515245 + 12345) % 2147483647;
  return () => {
    value = (value * 48271) % 2147483647;
    return value / 2147483647;
  };
}

function dedupeByFieldId(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.field.id)) return false;
    seen.add(item.field.id);
    return true;
  });
}

function slugify(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9가-힣-]/g, "").replace(/-+/g, "-");
}

function gradeToScore(grade) {
  if (grade === "우수" || grade === "A") return 100;
  if (grade === "양호" || grade === "B") return 82;
  if (grade === "보통" || grade === "C") return 64;
  if (grade === "미흡" || grade === "D") return 36;
  return 18;
}

function scoreToGrade(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 55) return "C";
  if (score >= 35) return "D";
  return "E";
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toNumber(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value || "").replace(/,/g, "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function roundNumber(value) {
  return Math.round(value);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

const REGIONS = ["수도권", "충청권", "영남권", "호남권", "강원권", "제주권"];
const COMPANY_SIZES = ["대기업", "중견기업", "중소기업"];
const DISCLOSURE_TYPES = ["ESG 보고서", "지속가능경영보고서", "사업보고서", "통합 공시"];
const MANUFACTURING_INDUSTRIES = ["자동차부품", "반도체장비", "화학소재", "식품제조", "물류", "에너지", "건설", "바이오", "통신장비", "생활소비재"];
const FINANCE_INDUSTRIES = ["은행", "증권", "보험", "자산운용", "핀테크", "여신전문", "저축은행", "신용평가"];
const EXECUTIVE_NAMES = ["김민준", "이서연", "박도윤", "최서윤", "정하준", "한지우", "신도현", "윤하은", "장지호", "오유진"];
const COMPANY_NAME_PREFIXES = ["가온", "다온", "라온", "새론", "해온", "시온", "누리", "한빛", "하람", "온유", "도담", "미래", "신성", "청운", "현대", "세림", "우진", "대명", "태성", "진명"];
const COMPANY_NAME_MIDDLES = ["테크", "에코", "네오", "파인", "브릿지", "프라임", "에이스", "유니온", "코어", "비전", "솔라", "퍼스트", "하이", "그린", "윈드", "리더", "오션", "인포", "로지", "스톤"];
const MANUFACTURING_NAME_TAILS = ["산업", "솔루션", "모빌리티", "시스템", "에너지", "케미칼", "정밀", "소재", "로보틱스", "메카닉스"];
const FINANCE_NAME_TAILS = ["금융", "캐피탈", "투자", "증권", "보험", "자산운용", "핀테크", "신탁"];
