import { createHash } from "node:crypto";

export function hashAppleSubject(appleSubject: string) {
  return createHash("sha256").update(`learnhanzhi:apple-subject:${appleSubject}`).digest("hex");
}
