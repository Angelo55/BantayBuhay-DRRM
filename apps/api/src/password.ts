import { argon2, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const derive = promisify(argon2);
const PARAMETERS = { parallelism: 1, tagLength: 32, memory: 19456, passes: 2 };

export async function hashPassword(password: string): Promise<string> {
  const nonce = randomBytes(16);
  const tag = await derive("argon2id", { ...PARAMETERS, message: password, nonce });
  return `argon2id$${nonce.toString("base64")}$${tag.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, nonce, expected] = stored.split("$");
  if (!nonce || !expected) return false;
  const tag = await derive("argon2id", {
    ...PARAMETERS,
    message: password,
    nonce: Buffer.from(nonce, "base64"),
  });
  return timingSafeEqual(tag, Buffer.from(expected, "base64"));
}
