import "server-only";
import { createHmac, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "marvel_admin";
const MAX_SESSION_AGE = 8 * 60 * 60;

function signingSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.MARVEL_LOCAL_DB === "true"
  )
    return "marvel-isolated-local-development-not-production";
  return null;
}

function signature(expires: string, secret: string) {
  return createHmac("sha256", secret)
    .update("marvel-admin|" + expires)
    .digest("hex");
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD_HASH && signingSecret());
}

export async function verifyAdminPassword(password: unknown) {
  const encoded = process.env.ADMIN_PASSWORD_HASH;
  if (typeof password !== "string" || password.length < 10 || !encoded)
    return false;
  const [algorithm, nText, rText, pText, saltText, hashText] =
    encoded.split(":");
  const N = Number(nText),
    r = Number(rText),
    p = Number(pText);
  if (
    algorithm !== "scrypt" ||
    !Number.isInteger(N) ||
    N < 16384 ||
    N > 65536 ||
    !Number.isInteger(r) ||
    r < 8 ||
    r > 16 ||
    !Number.isInteger(p) ||
    p < 1 ||
    p > 4
  )
    return false;
  try {
    const salt = Buffer.from(saltText, "base64url"),
      expected = Buffer.from(hashText, "base64url");
    if (salt.length < 16 || expected.length !== 64) return false;
    const actual = await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password,
        salt,
        expected.length,
        { N, r, p, maxmem: 128 * N * r + 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export async function hasAdminSession() {
  const secret = signingSecret();
  if (!secret) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  const [expires, sig] = value?.split(".") ?? [];
  if (!/^\d{10}$/.test(expires ?? "") || !/^[a-f0-9]{64}$/.test(sig ?? ""))
    return false;
  if (Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  return timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(signature(expires, secret)),
  );
}

export async function createAdminSession() {
  const secret = signingSecret();
  if (!secret) throw new Error("ADMIN_NOT_CONFIGURED");
  const expires = String(Math.floor(Date.now() / 1000) + MAX_SESSION_AGE);
  (await cookies()).set(COOKIE, expires + "." + signature(expires, secret), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_SESSION_AGE,
  });
}

export async function clearAdminSession() {
  (await cookies()).set(COOKIE, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
