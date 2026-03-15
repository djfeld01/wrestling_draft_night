import { describe, it, expect } from "vitest";
import {
  generateAuthCode,
  AUTH_CODE_LENGTH,
  AUTH_CODE_CHARS,
} from "../../lib/auth-code";

describe("generateAuthCode", () => {
  it("generates a code of the correct length", () => {
    const code = generateAuthCode();
    expect(code).toHaveLength(AUTH_CODE_LENGTH);
  });

  it("generates only uppercase alphanumeric characters", () => {
    const validChars = new Set(AUTH_CODE_CHARS.split(""));
    for (let i = 0; i < 50; i++) {
      const code = generateAuthCode();
      for (const char of code) {
        expect(validChars.has(char)).toBe(true);
      }
    }
  });

  it("generates different codes on successive calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateAuthCode());
    }
    // With 36^6 possible codes, 100 calls should produce at least 90 unique codes
    expect(codes.size).toBeGreaterThan(90);
  });
});
