export const DEFAULT_FEATURE_FLAGS = Object.freeze({
  chatbotPanel: false,
  evidenceDownload: false,
  newDashboardUi: false
});

const FLAG_KEYS = Object.keys(DEFAULT_FEATURE_FLAGS);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getGlobalFeatureFlagConfig() {
  if (typeof window === "undefined") {
    return {};
  }

  return isPlainObject(window.__FEATURE_FLAGS__) ? window.__FEATURE_FLAGS__ : {};
}

function extractKnownFlags(source = {}) {
  if (!isPlainObject(source)) {
    return {};
  }

  return FLAG_KEYS.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      result[key] = source[key];
    }
    return result;
  }, {});
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function normalizeUserId(user) {
  return String(user?.userId ?? user?.id ?? user?.mockUserId ?? "mock-user-unknown").trim() || "mock-user-unknown";
}

function normalizeRole(user) {
  return String(user?.role ?? user?.userRole ?? "guest").trim().toLowerCase() || "guest";
}

function collectRuleMatches(user, rule = {}) {
  const userId = normalizeUserId(user);
  const role = normalizeRole(user);
  const enabledUserIds = Array.isArray(rule.enabledUserIds) ? rule.enabledUserIds.map(String) : [];
  const disabledUserIds = Array.isArray(rule.disabledUserIds) ? rule.disabledUserIds.map(String) : [];
  const enabledRoles = Array.isArray(rule.enabledRoles) ? rule.enabledRoles.map((item) => String(item).toLowerCase()) : [];
  const disabledRoles = Array.isArray(rule.disabledRoles) ? rule.disabledRoles.map((item) => String(item).toLowerCase()) : [];

  if (disabledUserIds.includes(userId) || disabledRoles.includes(role)) {
    return false;
  }

  if (enabledUserIds.includes(userId) || enabledRoles.includes(role)) {
    return true;
  }

  return null;
}

export function getFeatureFlags(config = {}) {
  const globalConfig = getGlobalFeatureFlagConfig();
  const mergedFlags = {
    ...DEFAULT_FEATURE_FLAGS,
    ...extractKnownFlags(globalConfig),
    ...(isPlainObject(globalConfig.defaultFlags) ? globalConfig.defaultFlags : {}),
    ...(isPlainObject(config.defaultFlags) ? config.defaultFlags : {}),
    ...(isPlainObject(globalConfig.flags) ? globalConfig.flags : {}),
    ...extractKnownFlags(config),
    ...(isPlainObject(config.flags) ? config.flags : {})
  };

  return FLAG_KEYS.reduce((result, key) => {
    result[key] = normalizeBoolean(mergedFlags[key], DEFAULT_FEATURE_FLAGS[key]);
    return result;
  }, {});
}

export function resolveFeatureFlagsForUser(user = {}, config = {}) {
  const baseFlags = getFeatureFlags(config);
  const globalConfig = getGlobalFeatureFlagConfig();
  const rules = {
    ...(isPlainObject(globalConfig.rules) ? globalConfig.rules : {}),
    ...(isPlainObject(globalConfig.userOverrides) ? globalConfig.userOverrides : {}),
    ...(isPlainObject(config.rules) ? config.rules : {}),
    ...(isPlainObject(config.userOverrides) ? config.userOverrides : {})
  };

  return FLAG_KEYS.reduce((result, flagKey) => {
    const ruleDecision = collectRuleMatches(user, rules[flagKey]);
    result[flagKey] = ruleDecision === null ? baseFlags[flagKey] : ruleDecision;
    return result;
  }, {});
}

export function isFeatureEnabled(flagName, user = {}, config = {}) {
  if (!FLAG_KEYS.includes(flagName)) {
    return false;
  }

  return Boolean(resolveFeatureFlagsForUser(user, config)[flagName]);
}

export function getFeatureFlagSummary(user = {}, config = {}) {
  const flags = resolveFeatureFlagsForUser(user, config);
  return {
    userId: normalizeUserId(user),
    role: normalizeRole(user),
    flags
  };
}
