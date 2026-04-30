import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

import { loadTemplate } from "./template-loader.js";

const CURRENT_YEAR = new Date().getFullYear();

export async function loadWorkbook(workbookPath) {
  const template = await loadTemplate(workbookPath);
  const workbook = await parseWorkbook(workbookPath);
  const { companies, years } = buildWorkbookCompanies(template, workbook);

  return {
    ...template,
    companies,
    years,
    dataMode: "excel-values"
  };
}

async function parseWorkbook(workbookPath) {
  const fileBuffer = await fs.readFile(workbookPath);
  const entries = unzipEntries(fileBuffer);
  const workbookXml = entries.get("xl/workbook.xml") || "";
  const relationshipsXml = entries.get("xl/_rels/workbook.xml.rels") || "";
  const sharedStringsXml = entries.get("xl/sharedStrings.xml") || "";

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const relationshipMap = new Map(
    [...relationshipsXml.matchAll(/<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g)]
      .map((match) => [match[1], match[2]])
  );

  const sheets = [...workbookXml.matchAll(/<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g)]
    .map((match) => ({
      name: decodeXml(match[1]),
      normalizedName: stripSheetPrefix(decodeXml(match[1])),
      target: relationshipMap.get(match[2])
    }))
    .map((sheet) => ({
      ...sheet,
      rows: parseSheetRows(entries.get(`xl/${sheet.target}`) || "", sharedStrings)
    }));

  return { sheets };
}

function buildWorkbookCompanies(template, workbook) {
  const sheetMap = new Map(workbook.sheets.map((sheet) => [sheet.normalizedName, sheet]));
  const companyMap = new Map();
  const years = new Set();

  for (const category of template.categories) {
    const sheet = sheetMap.get(category.label);
    if (!sheet) continue;

    const fieldByColumn = buildCategoryFieldMap(template.commonFields, category);
    for (const row of sheet.rows.slice(1)) {
      const rowCells = rowToCellMap(row);
      const companyName = readRowValue(rowCells, "A");
      const companyCode = readRowValue(rowCells, "C");

      if (!hasCellValue(companyName) && !hasCellValue(companyCode)) {
        continue;
      }

      const year = detectRowYear(rowCells, template.commonFields);
      years.add(year);

      const company = upsertCompany(companyMap, {
        companyName,
        companyCode,
        profile: inferProfile(readRowValue(rowCells, "D")),
        industry: readRowValue(rowCells, "E"),
        region: readRowValue(rowCells, "K")
      });
      const yearRecord = ensureYearRecord(company, year);

      for (const [column, field] of fieldByColumn.entries()) {
        const value = rowCells.get(column);
        if (value === undefined) continue;
        yearRecord[field.id] = normalizeCellValue(value);
      }

      yearRecord.__rowNumberByCategory = yearRecord.__rowNumberByCategory || {};
      yearRecord.__rowNumberByCategory[category.key] = row.index;
      syncCompanyMeta(company, yearRecord, template.commonFields);
    }
  }

  const integratedSheet = sheetMap.get("종합");
  if (integratedSheet) {
    const categoryColumns = integratedSheet.rows[0]?.cells
      .slice(3, 3 + template.categories.length)
      .map((cell, index) => ({
        column: cell.column,
        categoryKey: template.categories[index]?.key
      }))
      .filter((item) => item.categoryKey) || [];

    const totalColumn = integratedSheet.rows[0]?.cells[3 + template.categories.length]?.column || "J";

    for (const row of integratedSheet.rows.slice(1)) {
      const rowCells = rowToCellMap(row);
      const companyName = readRowValue(rowCells, "A");
      const companyCode = readRowValue(rowCells, "B");

      if (!hasCellValue(companyName) && !hasCellValue(companyCode)) {
        continue;
      }

      const year = detectIntegratedYear(rowCells);
      years.add(year);

      const company = upsertCompany(companyMap, {
        companyName,
        companyCode,
        profile: inferProfile(readRowValue(rowCells, "C"))
      });
      const yearRecord = ensureYearRecord(company, year);
      yearRecord.__integratedTotal = normalizeCellValue(readRowValue(rowCells, totalColumn));

      for (const item of categoryColumns) {
        yearRecord[`__integratedCategory:${item.categoryKey}`] = normalizeCellValue(readRowValue(rowCells, item.column));
      }
    }
  }

  const sortedYears = [...years].sort((left, right) => right - left);
  const companies = [...companyMap.values()]
    .map((company, index) => finalizeCompany(company, template.commonFields, sortedYears, index))
    .filter((company) => Object.keys(company.yearValues).length > 0);

  return {
    companies,
    years: sortedYears.length ? sortedYears : [CURRENT_YEAR]
  };
}

function buildCategoryFieldMap(commonFields, category) {
  const fieldByColumn = new Map();
  [...commonFields, ...category.sections.flatMap((section) => [section.scoreField, ...section.inputs, ...section.derived]), category.totalField]
    .filter(Boolean)
    .forEach((field) => fieldByColumn.set(refToColumn(field.ref), field));
  return fieldByColumn;
}

function upsertCompany(companyMap, meta) {
  const key = createCompanyKey(meta.companyName, meta.companyCode);
  if (!companyMap.has(key)) {
    companyMap.set(key, {
      id: `excel-${companyMap.size + 1}`,
      companyNo: String(meta.companyCode || "").trim(),
      name: String(meta.companyName || "").trim() || `기업 ${companyMap.size + 1}`,
      profile: meta.profile || "manufacturing",
      region: String(meta.region || "").trim(),
      size: "",
      industry: String(meta.industry || "").trim(),
      disclosure: "엑셀 데이터",
      yearValues: {}
    });
  }

  const company = companyMap.get(key);
  if (!company.companyNo && meta.companyCode) company.companyNo = String(meta.companyCode).trim();
  if ((!company.name || company.name.startsWith("기업 ")) && meta.companyName) company.name = String(meta.companyName).trim();
  if (!company.industry && meta.industry) company.industry = String(meta.industry).trim();
  if (!company.region && meta.region) company.region = String(meta.region).trim();
  if (meta.profile) company.profile = meta.profile;
  return company;
}

function ensureYearRecord(company, year) {
  const yearKey = String(year || CURRENT_YEAR);
  if (!company.yearValues[yearKey]) {
    company.yearValues[yearKey] = {
      __year: Number(yearKey)
    };
  }
  return company.yearValues[yearKey];
}

function finalizeCompany(company, commonFields, sortedYears, index) {
  const yearKeys = Object.keys(company.yearValues).sort((left, right) => Number(right) - Number(left));
  const selectedYear = yearKeys[0] || String(sortedYears[0] || CURRENT_YEAR);
  const selectedValues = company.yearValues[selectedYear] || {};

  syncCompanyMeta(company, selectedValues, commonFields);
  company.size = company.size || inferCompanySize(selectedValues, commonFields);
  company.region = company.region || "-";
  company.industry = company.industry || "-";
  company.values = selectedValues;
  company.snapshot = null;
  company.summary = "";
  company.badges = [];
  company.searchText = "";
  company.id = company.id || `excel-${index + 1}`;
  return company;
}

function syncCompanyMeta(company, values, commonFields) {
  const lookup = new Map(commonFields.map((field) => [field.shortLabel, field.id]));
  const companyName = values[lookup.get("회사명")];
  const companyCode = values[lookup.get("종목코드")];
  const industry = values[lookup.get("업종")];
  const region = values[lookup.get("지역")];
  const profileLabel = values[lookup.get("경실련 업종")];

  if (hasCellValue(companyName)) company.name = String(companyName).trim();
  if (hasCellValue(companyCode)) company.companyNo = String(companyCode).trim();
  if (hasCellValue(industry)) company.industry = String(industry).trim();
  if (hasCellValue(region)) company.region = String(region).trim();
  if (hasCellValue(profileLabel)) company.profile = inferProfile(profileLabel);
  company.size = company.size || inferCompanySize(values, commonFields);
}

function detectRowYear(rowCells, commonFields) {
  const yearColumns = new Set(
    commonFields
      .filter((field) => /연도|년도/.test(field.label))
      .map((field) => refToColumn(field.ref))
  );

  for (const column of yearColumns) {
    const year = parseYearValue(readRowValue(rowCells, column));
    if (year) return year;
  }

  for (const value of rowCells.values()) {
    const year = parseYearValue(value);
    if (year) return year;
  }

  return CURRENT_YEAR;
}

function detectIntegratedYear(rowCells) {
  for (const value of rowCells.values()) {
    const year = parseYearValue(value);
    if (year) return year;
  }
  return CURRENT_YEAR;
}

function parseYearValue(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function inferProfile(value) {
  return /금융/.test(String(value || "")) ? "finance" : "manufacturing";
}

function inferCompanySize(values, commonFields) {
  const lookup = new Map((commonFields || []).map((field) => [field.shortLabel, field.id]));
  const assetValue = toNumber(values[lookup.get("자산총계")]);
  const revenueValue = toNumber(values[lookup.get("매출액")]);
  const basis = Math.max(assetValue, revenueValue);

  if (basis >= 1_500_000) return "대기업";
  if (basis >= 400_000) return "중견기업";
  if (basis > 0) return "중소기업";
  return "미분류";
}

function createCompanyKey(companyName, companyCode) {
  const code = String(companyCode || "").trim();
  const name = String(companyName || "").trim();
  return code ? `code:${code}` : `name:${name}`;
}

function parseSheetRows(sheetXml, sharedStrings) {
  const rows = [...sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)].map((match) => {
    const rowIndex = Number((match[1].match(/\br="(\d+)"/) || [, 0])[1]);
    const cells = [...match[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)]
      .map((cellMatch) => parseCell(cellMatch[1], cellMatch[2], sharedStrings))
      .filter(Boolean);

    return {
      index: rowIndex,
      cells
    };
  });

  return rows;
}

function parseCell(attributes, body, sharedStrings) {
  const ref = (attributes.match(/\br="([^"]+)"/) || [, ""])[1];
  if (!ref) return null;

  const type = (attributes.match(/\bt="([^"]+)"/) || [, ""])[1];
  const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
  const rawValue = valueMatch ? decodeXml(valueMatch[1]) : "";
  let value = "";

  if (type === "s") {
    value = sharedStrings[Number(rawValue) || 0] || "";
  } else if (type === "inlineStr") {
    value = extractRichText(body);
  } else {
    value = rawValue || extractRichText(body);
  }

  return {
    ref,
    column: refToColumn(ref),
    value
  };
}

function rowToCellMap(row) {
  const map = new Map();
  for (const cell of row.cells) {
    map.set(cell.column, cell.value);
  }
  return map;
}

function readRowValue(rowCells, column) {
  return rowCells.get(column) ?? "";
}

function refToColumn(ref) {
  return String(ref || "").replace(/\d+/g, "");
}

function normalizeCellValue(value) {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  if (!text) return "";

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return Number(text);
  }

  return text;
}

function hasCellValue(value) {
  return !(value === null || value === undefined || String(value).trim() === "");
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function stripSheetPrefix(name) {
  return String(name || "").replace(/^\d+\./, "");
}

function parseSharedStrings(sharedStringsXml) {
  return [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => extractRichText(match[1]));
}

function extractRichText(xml) {
  return [...String(xml || "").matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
    .map((match) => decodeXml(match[1]))
    .join("");
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&#10;/g, "\n")
    .replace(/&#13;/g, "")
    .replace(/&#([0-9]+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function unzipEntries(buffer) {
  const entries = new Map();
  const eocdOffset = findSignature(buffer, 0x06054b50);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  let pointer = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    const signature = buffer.readUInt32LE(pointer);
    if (signature !== 0x02014b50) break;

    const compressionMethod = buffer.readUInt16LE(pointer + 10);
    const compressedSize = buffer.readUInt32LE(pointer + 20);
    const fileNameLength = buffer.readUInt16LE(pointer + 28);
    const extraLength = buffer.readUInt16LE(pointer + 30);
    const commentLength = buffer.readUInt16LE(pointer + 32);
    const localHeaderOffset = buffer.readUInt32LE(pointer + 42);
    const fileName = buffer.toString("utf8", pointer + 46, pointer + 46 + fileNameLength);

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressedData = buffer.subarray(dataStart, dataStart + compressedSize);
    const content = compressionMethod === 0 ? compressedData : zlib.inflateRawSync(compressedData);

    entries.set(fileName, content.toString("utf8"));
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findSignature(buffer, signature) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) return index;
  }
  throw new Error("ZIP central directory not found.");
}
