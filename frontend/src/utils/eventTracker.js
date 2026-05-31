function normalizeText(value, fallback = "") {
  const text = String(value ?? fallback).trim();
  return text || fallback;
}

function normalizeMockUserId(userId) {
  return normalizeText(userId, "mock-user-unknown");
}

function normalizeVariant(variant) {
  return normalizeText(variant, "unassigned");
}

function buildTimestamp(date) {
  if (date instanceof Date && !Number.isNaN(date.getTime())) {
    return date.toISOString();
  }

  return new Date().toISOString();
}

export function createTrackingEvent(eventName, options = {}, config = {}) {
  const payload = {
    eventName: normalizeText(eventName, "unknown-event"),
    mockUserId: normalizeMockUserId(options.mockUserId ?? options.userId),
    variant: normalizeVariant(options.variant),
    timestamp: buildTimestamp(options.timestamp ? new Date(options.timestamp) : undefined),
    experimentName: normalizeText(options.experimentName, "week11-feature-flag-ab-test"),
    properties: {
      ...(config.properties && typeof config.properties === "object" ? config.properties : {}),
      ...(options.properties && typeof options.properties === "object" ? options.properties : {})
    }
  };

  return payload;
}

export function trackExperimentEvent(eventName, options = {}, config = {}) {
  const event = createTrackingEvent(eventName, options, config);
  const shouldLogToConsole = config.emitToConsole !== false;

  if (shouldLogToConsole && typeof console !== "undefined" && typeof console.log === "function") {
    console.log("[experiment-tracking]", event);
  }

  if (typeof config.sink === "function") {
    config.sink(event);
  }

  return event;
}

export function createExperimentSession(options = {}) {
  return {
    mockUserId: normalizeMockUserId(options.mockUserId),
    variant: normalizeVariant(options.variant),
    startedAt: buildTimestamp(options.startedAt ? new Date(options.startedAt) : undefined),
    experimentName: normalizeText(options.experimentName, "week11-feature-flag-ab-test")
  };
}
