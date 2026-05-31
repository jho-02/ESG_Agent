import { describe, expect, it, vi } from "vitest";

import { createTrackingEvent, trackExperimentEvent } from "../utils/eventTracker.js";

describe("eventTracker", () => {
  it("mock tracking payload 구조를 생성한다", () => {
    const event = createTrackingEvent(
      "flag_viewed",
      {
        mockUserId: "mock-user-001",
        variant: "A",
        timestamp: "2026-05-31T09:00:00.000Z",
        properties: { source: "demo" }
      },
      {
        properties: { page: "dashboard" }
      }
    );

    expect(event).toEqual({
      eventName: "flag_viewed",
      mockUserId: "mock-user-001",
      variant: "A",
      timestamp: "2026-05-31T09:00:00.000Z",
      experimentName: "week11-feature-flag-ab-test",
      properties: {
        page: "dashboard",
        source: "demo"
      }
    });
  });

  it("timestamp, eventName, mockUserId, variant를 포함한다", () => {
    const event = createTrackingEvent("experiment_started", {
      mockUserId: "mock-user-002",
      variant: "B"
    });

    expect(event.eventName).toBe("experiment_started");
    expect(event.mockUserId).toBe("mock-user-002");
    expect(event.variant).toBe("B");
    expect(typeof event.timestamp).toBe("string");
    expect(event.timestamp.length).toBeGreaterThan(10);
  });

  it("외부 네트워크 전송 없이 return object와 sink로 동작한다", () => {
    const sink = vi.fn();
    const event = trackExperimentEvent(
      "feature_flag_enabled",
      {
        mockUserId: "mock-user-003",
        variant: "A"
      },
      {
        emitToConsole: false,
        sink
      }
    );

    expect(sink).toHaveBeenCalledTimes(1);
    expect(sink).toHaveBeenCalledWith(event);
    expect(event.mockUserId).toBe("mock-user-003");
  });
});