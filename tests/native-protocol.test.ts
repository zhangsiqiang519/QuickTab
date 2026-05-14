import { describe, expect, it } from "vitest";
import { validateMessage } from "../src/main/services/native-protocol";

describe("native protocol validation", () => {
  it("accepts valid messages", () => {
    expect(validateMessage({
      messageId: "1",
      protocolVersion: "1.0",
      type: "handshake",
      timestamp: Date.now(),
      payload: {}
    }).type).toBe("handshake");
  });

  it("rejects incompatible major versions", () => {
    try {
      validateMessage({
        messageId: "1",
        protocolVersion: "2.0",
        type: "handshake",
        timestamp: Date.now()
      });
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toMatchObject({ errorCode: "PROTO_VERSION_UNSUPPORTED" });
    }
  });
});
