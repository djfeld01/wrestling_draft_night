import crypto from "crypto";

export const AUTH_CODE_LENGTH = 6;
export const AUTH_CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

export function generateAuthCode(): string {
  const bytes = crypto.randomBytes(AUTH_CODE_LENGTH);
  let code = "";
  for (let i = 0; i < AUTH_CODE_LENGTH; i++) {
    code += AUTH_CODE_CHARS[bytes[i] % AUTH_CODE_CHARS.length];
  }
  return code;
}
