import { describe, expect, it } from "vitest";

import { AB_VARIANTS, assignVariant, getVariantAssignment, getVariantDescription } from "../utils/abTest.js";

describe("abTest", () => {
  it("같은 mock userId는 항상 같은 variant를 받는다", () => {
    const first = assignVariant("mock-user-001");
    const second = assignVariant("mock-user-001");

    expect(first).toBe(second);
    expect([AB_VARIANTS.A, AB_VARIANTS.B]).toContain(first);
  });

  it("서로 다른 mock userId도 A/B 중 하나로 배정된다", () => {
    const first = assignVariant("mock-user-001");
    const second = assignVariant("mock-user-002");

    expect([AB_VARIANTS.A, AB_VARIANTS.B]).toContain(first);
    expect([AB_VARIANTS.A, AB_VARIANTS.B]).toContain(second);
  });

  it("Variant 설명을 반환한다", () => {
    expect(getVariantDescription(AB_VARIANTS.A)).toContain("기존 대시보드");
    expect(getVariantDescription(AB_VARIANTS.B)).toContain("요약 리포트");
    expect(getVariantDescription("unknown")).toBe("알 수 없는 Variant");
  });

  it("splitRatio와 salt를 반영한 assignment 정보를 반환한다", () => {
    const assignment = getVariantAssignment("mock-user-003", {
      splitRatio: 100,
      salt: "stable-salt"
    });

    expect(assignment.userId).toBe("mock-user-003");
    expect([AB_VARIANTS.A, AB_VARIANTS.B]).toContain(assignment.variant);
    expect(assignment.description).toBe(getVariantDescription(assignment.variant));
  });

  it("잘못된 splitRatio 입력도 안전하게 처리한다", () => {
    const variant = assignVariant("mock-user-004", {
      splitRatio: "not-a-number"
    });

    expect([AB_VARIANTS.A, AB_VARIANTS.B]).toContain(variant);
  });
});