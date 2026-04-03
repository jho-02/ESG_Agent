import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";

const COMMON_FIELD_COUNT = 18;

const CATEGORY_KEY_MAP = {
  건전성: "soundness",
  공정성: "fairness",
  사회공헌: "contribution",
  소비자보호: "consumer",
  환경경영: "environment",
  직원만족: "employee"
};

const CATEGORY_DESCRIPTION_MAP = {
  건전성: "재무 안정성, 지배구조, 투자 여력을 함께 보는 카테고리입니다.",
  공정성: "법규 준수, 공시, 시장 질서 관련 지표를 묶어 보여줍니다.",
  사회공헌: "고용, 조세, 기부, 포용성 등 사회 기여도를 보는 카테고리입니다.",
  소비자보호: "소비자 피해, 품질·보안 인증, 소비자 관련 법 준수를 확인합니다.",
  환경경영: "환경 보고, 투자, 인증, 환경법 위반 여부를 중심으로 봅니다.",
  직원만족: "안전, 교육, 임금, 복리후생, 노사관계 등 직원 경험을 다룹니다."
};

const COLOR_ROLE_MAP = {
  FF66FF66: { role: "input", tone: "core" },
  FFFFF2CC: { role: "input", tone: "indicator" },
  FF00B050: { role: "derived", tone: "derived" },
  FF00B0F0: { role: "section", tone: "section" },
  FFFF0000: { role: "category-total", tone: "category-total" },
  FFFF99FF: { role: "reference", tone: "reference" }
};

const COMMON_FIELD_ALIASES = {
  회사명: ["회사명"],
  종목코드: ["종목코드"],
  경실련업종: ["경실련업종", "업종"],
  업종: ["업종"],
  주요제품: ["주요제품"],
  상장일: ["상장일"],
  결산월: ["결산월"],
  대표자명: ["대표자명"],
  홈페이지: ["홈페이지"],
  지역: ["지역"],
  자산총계: ["자산총계", "자산"],
  부채총계: ["부채총계", "부채"],
  자본총계: ["자본총계", "자본"],
  매출액: ["매출액", "매출"],
  영업이익: ["영업이익"],
  법인세차감전계속사업이익: ["법인세차감전계속사업이익", "계속사업이익"],
  당기순이익: ["당기순이익", "순이익"]
};

export async function loadTemplate(workbookPath) {
  const fileBuffer = await fs.readFile(workbookPath);
  const entries = unzipEntries(fileBuffer);
  const workbookXml = entries.get("xl/workbook.xml") || "";
  const relationshipsXml = entries.get("xl/_rels/workbook.xml.rels") || "";
  const stylesXml = entries.get("xl/styles.xml") || "";
  const sharedStringsXml = entries.get("xl/sharedStrings.xml") || "";

  const sharedStrings = parseSharedStrings(sharedStringsXml);
  const styles = parseStyles(stylesXml);
  const sheets = parseSheets(workbookXml, relationshipsXml);

  let commonFields = [];
  const categories = [];

  for (const sheet of sheets) {
    if (stripSheetPrefix(sheet.name) === "종합") {
      continue;
    }

    const sheetXml = entries.get(`xl/${sheet.target}`) || "";
    const headerCells = parseHeaderRow(sheetXml, sharedStrings, styles);
    if (!headerCells.length) {
      continue;
    }

    const categoryLabel = stripSheetPrefix(sheet.name);
    const categoryKey = CATEGORY_KEY_MAP[categoryLabel] || slugKey(categoryLabel);
    const normalized = headerCells.map((cell) =>
      normalizeField({
        ...cell,
        sheetName: categoryLabel,
        categoryKey
      })
    );

    if (!commonFields.length) {
      commonFields = normalized.slice(0, COMMON_FIELD_COUNT).map((field) => ({
        ...field,
        shared: true
      }));
    }

    const sectionFields = normalized.slice(COMMON_FIELD_COUNT);
    const sections = [];
    let buffer = [];
    let totalField = null;

    for (const field of sectionFields) {
      if (field.role === "section") {
        sections.push(buildSection(categoryLabel, categoryKey, field, buffer));
        buffer = [];
      } else if (field.role === "category-total") {
        totalField = field;
      } else {
        buffer.push(field);
      }
    }

    const categoryWeight = totalField ? parseWeight(totalField.label) : sumSectionWeight(sections);
    categories.push({
      key: categoryKey,
      label: categoryLabel === "종합" ? "통합" : categoryLabel,
      description: CATEGORY_DESCRIPTION_MAP[categoryLabel] || "템플릿 기반 카테고리입니다.",
      totalField,
      totalWeight: categoryWeight,
      sections
    });
  }

  const commonFieldMap = new Map(commonFields.map((field) => [field.canonical, field]));
  attachCrossReferences(categories);
  attachCommonDependencies(categories, commonFields, commonFieldMap);

  return {
    sourceWorkbook: path.basename(workbookPath),
    generatedAt: new Date().toISOString(),
    profileOptions: [
      { value: "manufacturing", label: "제조·비제조업" },
      { value: "finance", label: "금융업" }
    ],
    legend: [
      { key: "input", label: "지표 입력", color: "#fff2cc", description: "사용자가 직접 넣는 원천 지표입니다." },
      { key: "derived", label: "계산 지표", color: "#00b050", description: "입력 지표에서 자동 계산됩니다." },
      { key: "section", label: "세부 점수", color: "#00b0f0", description: "계산 지표를 묶어 만든 섹션 점수입니다." },
      { key: "category-total", label: "카테고리 총점", color: "#ff0000", description: "세부 점수가 모여 카테고리 총점이 됩니다." }
    ],
    commonFields,
    categories,
    integrated: {
      key: "integrated",
      label: "통합"
    }
  };
}

function unzipEntries(buffer) {
  const entries = new Map();
  const eocdOffset = findSignature(buffer, 0x06054b50);
  const totalEntries = buffer.readUInt16LE(eocdOffset + 10);
  const centralDirectoryOffset = buffer.readUInt32LE(eocdOffset + 16);

  let pointer = centralDirectoryOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    const signature = buffer.readUInt32LE(pointer);
    if (signature !== 0x02014b50) {
      break;
    }

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
    let content;

    if (compressionMethod === 0) {
      content = compressedData;
    } else if (compressionMethod === 8) {
      content = zlib.inflateRawSync(compressedData);
    } else {
      throw new Error(`지원하지 않는 압축 방식입니다: ${compressionMethod}`);
    }

    entries.set(fileName, content.toString("utf8"));
    pointer += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function findSignature(buffer, signature) {
  for (let index = buffer.length - 22; index >= 0; index -= 1) {
    if (buffer.readUInt32LE(index) === signature) {
      return index;
    }
  }
  throw new Error("ZIP 중앙 디렉터리를 찾을 수 없습니다.");
}

function parseSheets(workbookXml, relationshipsXml) {
  const relationshipMap = new Map();
  const relationshipRegex = /<Relationship\b[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g;
  for (const match of relationshipsXml.matchAll(relationshipRegex)) {
    relationshipMap.set(match[1], match[2]);
  }

  const sheets = [];
  const sheetRegex = /<sheet\b[^>]*name="([^"]+)"[^>]*r:id="([^"]+)"[^>]*\/>/g;
  for (const match of workbookXml.matchAll(sheetRegex)) {
    sheets.push({
      name: decodeXml(match[1]),
      target: relationshipMap.get(match[2])
    });
  }

  return sheets;
}

function parseStyles(stylesXml) {
  const fills = [];
  for (const match of stylesXml.matchAll(/<fill>([\s\S]*?)<\/fill>/g)) {
    const fillXml = match[1];
    const rgbMatch = fillXml.match(/<fgColor\b[^>]*rgb="([^"]+)"/);
    const themeMatch = fillXml.match(/<fgColor\b[^>]*theme="([^"]+)"/);
    fills.push(rgbMatch ? rgbMatch[1] : themeMatch ? `theme:${themeMatch[1]}` : null);
  }

  const cellXfsBlock = stylesXml.match(/<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/);
  const styleFillIds = [];
  if (cellXfsBlock) {
    for (const match of cellXfsBlock[1].matchAll(/<xf\b([^>]*)>/g)) {
      const attributes = match[1];
      const fillIdMatch = attributes.match(/\bfillId="(\d+)"/);
      styleFillIds.push(fillIdMatch ? Number(fillIdMatch[1]) : 0);
    }
  }

  return {
    fills,
    styleFillIds
  };
}

function parseSharedStrings(sharedStringsXml) {
  const values = [];
  for (const match of sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    values.push(extractRichText(match[1]));
  }
  return values;
}

function parseHeaderRow(sheetXml, sharedStrings, styles) {
  const rowMatch = sheetXml.match(/<row\b[^>]*r="1"[^>]*>([\s\S]*?)<\/row>/);
  if (!rowMatch) {
    return [];
  }

  const cells = [];
  for (const match of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
    const attributes = match[1];
    const body = match[2];
    const refMatch = attributes.match(/\br="([^"]+)"/);
    const styleMatch = attributes.match(/\bs="(\d+)"/);
    const typeMatch = attributes.match(/\bt="([^"]+)"/);

    const ref = refMatch ? refMatch[1] : "";
    const styleIndex = styleMatch ? Number(styleMatch[1]) : 0;
    const fillId = styles.styleFillIds[styleIndex] ?? 0;
    const fillHex = styles.fills[fillId] ?? null;
    const rawType = typeMatch ? typeMatch[1] : "";

    let value = "";
    if (rawType === "s") {
      const vMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      value = sharedStrings[Number(vMatch?.[1] || 0)] || "";
    } else if (rawType === "inlineStr") {
      value = extractRichText(body);
    } else {
      const formulaMatch = body.match(/<f>([\s\S]*?)<\/f>/);
      const valueMatch = body.match(/<v>([\s\S]*?)<\/v>/);
      value = formulaMatch ? formulaMatch[1] : valueMatch?.[1] || extractRichText(body);
    }

    cells.push({
      ref,
      colIndex: columnToNumber(ref.replace(/\d+/g, "")),
      value: decodeXml(value),
      fillHex
    });
  }

  return cells.sort((left, right) => left.colIndex - right.colIndex);
}

function normalizeField(field) {
  const label = cleanLabel(field.value);
  const colorMeta = COLOR_ROLE_MAP[field.fillHex] || inferRoleFromLabel(label, field.fillHex);
  const shortLabel = toShortLabel(label);
  const canonical = canonicalizeLabel(label);
  const inputType = inferInputType(label, colorMeta.role);

  return {
    id: `${field.categoryKey}:${field.ref}`,
    categoryKey: field.categoryKey,
    sheetName: field.sheetName,
    ref: field.ref,
    label,
    shortLabel,
    canonical,
    fillHex: field.fillHex,
    role: colorMeta.role,
    tone: colorMeta.tone,
    editable: colorMeta.role === "input" || colorMeta.role === "reference",
    inputType,
    polarity: inferPolarity(label),
    options: inferOptions(label, inputType)
  };
}

function inferRoleFromLabel(label, fillHex) {
  if (label.includes("바로가기") || label.includes("시트 참조")) {
    return { role: "reference", tone: "reference" };
  }
  if (fillHex && fillHex.startsWith("theme:")) {
    return { role: "input", tone: "indicator" };
  }
  return { role: "input", tone: "indicator" };
}

function buildSection(categoryLabel, categoryKey, sectionField, precedingFields) {
  const inputs = precedingFields.filter((field) => field.role === "input" || field.role === "reference");
  const derived = precedingFields.filter((field) => field.role === "derived");
  return {
    id: `${categoryKey}:${sectionField.ref}`,
    categoryKey,
    categoryLabel,
    title: toShortLabel(sectionField.label),
    fullLabel: sectionField.label,
    scoreField: sectionField,
    weight: parseWeight(sectionField.label),
    inputs,
    derived,
    commonDependencies: [],
    crossDependencies: []
  };
}

function attachCrossReferences(categories) {
  const fieldIndex = new Map();

  for (const category of categories) {
    for (const section of category.sections) {
      for (const field of [...section.inputs, ...section.derived]) {
        const bucket = fieldIndex.get(field.canonical) || [];
        bucket.push({ categoryKey: category.key, field, section });
        fieldIndex.set(field.canonical, bucket);
      }
    }
  }

  for (const category of categories) {
    for (const section of category.sections) {
      for (const field of [...section.inputs, ...section.derived]) {
        if (!field.label.includes("시트 참조")) {
          continue;
        }

        const categoryMatch = field.label.match(/([가-힣]+)\s*시트\s*참조/);
        if (!categoryMatch) {
          continue;
        }

        const targetCategoryKey = CATEGORY_KEY_MAP[categoryMatch[1]];
        const candidates = (fieldIndex.get(field.canonical) || []).filter(
          (candidate) => candidate.categoryKey === targetCategoryKey
        );
        const target = candidates[0];

        if (!target) {
          continue;
        }

        field.linkedFieldId = target.field.id;
        field.linkedFieldLabel = target.field.shortLabel;
        field.linkedCategoryKey = targetCategoryKey;
        field.linkedSectionId = target.section.id;
        field.editable = false;
        section.crossDependencies.push({
          fieldId: field.id,
          fieldLabel: field.shortLabel,
          targetCategoryKey,
          targetSectionId: target.section.id,
          targetFieldId: target.field.id,
          targetFieldLabel: target.field.shortLabel
        });
      }
    }
  }
}

function attachCommonDependencies(categories, commonFields, commonFieldMap) {
  for (const category of categories) {
    for (const section of category.sections) {
      const combinedText = [section.fullLabel]
        .concat(section.inputs.map((field) => field.label))
        .concat(section.derived.map((field) => field.label))
        .join(" ");

      for (const commonField of commonFields) {
        const aliases = COMMON_FIELD_ALIASES[commonField.canonical] || [commonField.canonical];
        if (aliases.some((alias) => alias && combinedText.includes(alias))) {
          const sharedField = commonFieldMap.get(commonField.canonical) || commonField;
          section.commonDependencies.push({
            fieldId: sharedField.id,
            fieldLabel: sharedField.shortLabel
          });
        }
      }

      section.commonDependencies = dedupeBy(section.commonDependencies, (item) => item.fieldId);
    }
  }
}

function parseWeight(label) {
  const compact = label.replace(/\s+/g, "");
  let match;

  match = compact.match(/모두([0-9.]+)점/);
  if (match) {
    return weight(Number(match[1]), Number(match[1]));
  }

  match = compact.match(/제조·비제조만([0-9.]+)점/);
  if (match) {
    return weight(Number(match[1]), 0);
  }

  match = compact.match(/금융업?만([0-9.]+)점/);
  if (match) {
    return weight(0, Number(match[1]));
  }

  match = compact.match(/제조·비제조([0-9.]+)점\/금융업?([0-9.]+)점/);
  if (match) {
    return weight(Number(match[1]), Number(match[2]));
  }

  match = compact.match(/제조·비제조([0-9.]+)점\/금융업제외/);
  if (match) {
    return weight(Number(match[1]), 0);
  }

  match = compact.match(/금융업([0-9.]+)점\/제조·비제조제외/);
  if (match) {
    return weight(0, Number(match[1]));
  }

  match = compact.match(/금융만([0-9.]+)점\/제조·비제조제외/);
  if (match) {
    return weight(0, Number(match[1]));
  }

  match = compact.match(/제조·비제조([0-9.]+)점/);
  if (match) {
    return weight(Number(match[1]), Number(match[1]));
  }

  match = compact.match(/\(([0-9.]+)점\)/);
  if (match) {
    return weight(Number(match[1]), Number(match[1]));
  }

  match = compact.match(/([0-9.]+)점/);
  if (match) {
    return weight(Number(match[1]), Number(match[1]));
  }

  return weight(0, 0);
}

function sumSectionWeight(sections) {
  return sections.reduce(
    (accumulator, section) => ({
      manufacturing: round(accumulator.manufacturing + section.weight.manufacturing),
      finance: round(accumulator.finance + section.weight.finance)
    }),
    weight(0, 0)
  );
}

function weight(manufacturing, finance) {
  return {
    manufacturing,
    finance
  };
}

function inferInputType(label, role) {
  if (role === "derived" || role === "section" || role === "category-total") {
    return "computed";
  }
  if (label.includes("바로가기") || label.includes("홈페이지")) {
    return "url";
  }
  if (/(유\/무|유=|무=)/.test(label)) {
    return "boolean";
  }
  if (/(A\s*\/\s*B\s*\/\s*C\s*\/\s*D|A\s*~\s*F|우수\/양호\/보통\/미흡)/.test(label)) {
    return "grade";
  }
  if (/%/.test(label)) {
    return "percent";
  }
  if (/(천원|주식수|건수|총수|\(명\)|연수|금액)/.test(label)) {
    return "number";
  }
  return "text";
}

function inferOptions(label, inputType) {
  if (inputType === "grade") {
    if (label.includes("우수/양호/보통/미흡")) {
      return ["우수", "양호", "보통", "미흡", "평가미대상"];
    }
    if (label.includes("A ~ F") || label.includes("A~F")) {
      return ["A", "B", "C", "D", "E", "F"];
    }
    return ["A", "B", "C", "D"];
  }
  return [];
}

function inferPolarity(label) {
  const negativeKeywords = [
    "위반",
    "사고",
    "추징",
    "불성실",
    "괴리도",
    "부채비율",
    "분쟁",
    "불만",
    "위험",
    "비정규직비율",
    "적발",
    "과태료",
    "벌금"
  ];

  return negativeKeywords.some((keyword) => label.includes(keyword)) ? "negative" : "positive";
}

function stripSheetPrefix(name) {
  return name.replace(/^\d+\./, "");
}

function slugKey(value) {
  return value
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "")
    .toLowerCase();
}

function cleanLabel(value) {
  return decodeXml(String(value || "").trim()).replace(/\r/g, "");
}

function toShortLabel(label) {
  return label
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\(([^)]*)\)/g, "")
    .trim();
}

function canonicalizeLabel(label) {
  return toShortLabel(label)
    .replace(/\s+/g, "")
    .replace(/[0-9.]/g, "")
    .replace(/시트참조/g, "")
    .replace(/제조·비제조|금융업?|모두/g, "")
    .replace(/점|점수|평점화|총점|합계/g, "")
    .replace(/비율/g, "비율")
    .replace(/천원|보통주|유무|입력/g, "");
}

function extractRichText(xml) {
  const parts = [];
  for (const match of xml.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)) {
    parts.push(decodeXml(match[1]));
  }
  return parts.join("");
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

function columnToNumber(column) {
  return column.split("").reduce((sum, char) => sum * 26 + char.charCodeAt(0) - 64, 0);
}

function dedupeBy(items, getKey) {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function round(value) {
  return Math.round(value * 10) / 10;
}
