export const AB_VARIANTS = Object.freeze({
  A: "A",
  B: "B"
});

export const AB_VARIANT_DESCRIPTIONS = Object.freeze({
  A: "기존 대시보드 중심 UI",
  B: "요약 리포트 강조형 UI"
});

function normalizeUserId(userId) {
  return String(userId ?? "mock-user-unknown").trim() || "mock-user-unknown";
}

function createDeterministicHash(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function normalizeSplitRatio(splitRatio) {
  const parsed = Number(splitRatio);

  if (!Number.isFinite(parsed)) {
    return 50;
  }

  if (parsed <= 0) {
    return 1;
  }

  if (parsed >= 100) {
    return 99;
  }

  return Math.floor(parsed);
}

export function assignVariant(userId, config = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const salt = String(config.salt ?? "week11-ab-test").trim() || "week11-ab-test";
  const splitRatio = normalizeSplitRatio(config.splitRatio);
  const bucket = createDeterministicHash(`${salt}:${normalizedUserId}`) % 100;

  return bucket < splitRatio ? AB_VARIANTS.A : AB_VARIANTS.B;
}

export function getVariantDescription(variant) {
  return AB_VARIANT_DESCRIPTIONS[variant] || "알 수 없는 Variant";
}

export function getVariantAssignment(userId, config = {}) {
  const variant = assignVariant(userId, config);

  return {
    userId: normalizeUserId(userId),
    variant,
    description: getVariantDescription(variant)
  };
}
