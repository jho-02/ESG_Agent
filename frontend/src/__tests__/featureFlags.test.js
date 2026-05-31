import { describe, expect, it } from "vitest";

import { DEFAULT_FEATURE_FLAGS, getFeatureFlags, isFeatureEnabled, resolveFeatureFlagsForUser } from "../config/featureFlags.js";

describe("featureFlags", () => {
  it("기본 Feature Flag 값을 반환한다", () => {
    expect(getFeatureFlags()).toEqual(DEFAULT_FEATURE_FLAGS);
  });

  it("optional config override를 반영한다", () => {
    expect(getFeatureFlags({ chatbotPanel: true, evidenceDownload: "true" })).toEqual({
      chatbotPanel: true,
      evidenceDownload: true,
      newDashboardUi: false
    });
  });

  it("role과 mock userId 기준 override를 반영한다", () => {
    const flags = resolveFeatureFlagsForUser(
      { userId: "mock-user-001", role: "reviewer" },
      {
        defaultFlags: {
          chatbotPanel: false,
          evidenceDownload: false,
          newDashboardUi: false
        },
        rules: {
          chatbotPanel: {
            enabledUserIds: ["mock-user-001"]
          },
          evidenceDownload: {
            enabledRoles: ["reviewer"]
          },
          newDashboardUi: {
            disabledUserIds: ["mock-user-001"]
          }
        }
      }
    );

    expect(flags).toEqual({
      chatbotPanel: true,
      evidenceDownload: true,
      newDashboardUi: false
    });
  });

  it("isFeatureEnabled가 단일 flag 여부를 판단한다", () => {
    expect(isFeatureEnabled("chatbotPanel", { userId: "mock-user-001" }, { chatbotPanel: true })).toBe(true);
    expect(isFeatureEnabled("evidenceDownload", { userId: "mock-user-001" }, { evidenceDownload: false })).toBe(false);
    expect(isFeatureEnabled("unknownFlag", { userId: "mock-user-001" }, { unknownFlag: true })).toBe(false);
  });
});