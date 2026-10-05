import type { RegisterRequest } from "@mind-hub/shared";
import { prisma } from "../../lib/db.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateOtpCode, hashOtpCode } from "../../lib/otp.js";
import { generateRefreshToken, hashToken } from "../../lib/tokens.js";
import { signAccessToken } from "../../lib/jwt.js";
import { normalizePhone } from "../../lib/phone.js";
import { AuthError, ConflictError, NotFoundError } from "../../lib/errors.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { sendSms } from "../../lib/sms.js";

const OTP_PURPOSE_PHONE_VERIFICATION = "PHONE_VERIFICATION";

/** Age-in-years as of today, used to flag ClientProfile.isMinor at registration time. */
export function calculateIsMinor(dateOfBirth?: Date): boolean {
  if (!dateOfBirth) return false;
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age < 18;
}

async function issuePhoneVerificationOtp(userId: string): Promise<string> {
  const code = generateOtpCode();
  await prisma.otpCode.create({
    data: {
      userId,
      codeHash: hashOtpCode(code),
      purpose: OTP_PURPOSE_PHONE_VERIFICATION,
      expiresAt: new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000),
    },
  });
  return code;
}

export async function registerUser(input: RegisterRequest): Promise<{ userId: string }> {
  const phone = normalizePhone(input.phone);

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    throw new ConflictError("An account with this phone number already exists");
  }

  const passwordHash = await hashPassword(input.password);

  const user = await prisma.user.create({
    data: {
      phone,
      email: input.email,
      passwordHash,
      role: input.role,
      ...(input.role === "CLIENT"
        ? {
            clientProfile: {
              create: {
                fullName: input.fullName,
                dateOfBirth: input.dateOfBirth,
                isMinor: calculateIsMinor(input.dateOfBirth),
              },
            },
          }
        : {
            therapistProfile: {
              create: {
                fullName: input.fullName,
                feeKES: 0,
                specialties: [],
                languages: [],
              },
            },
          }),
    },
  });

  const otpCode = await issuePhoneVerificationOtp(user.id);
  // In SMS stub mode (no Africa's Talking credentials) sendSms logs the message, code
  // included — a development convenience that disappears once real credentials exist.
  // A failed send doesn't fail registration: the account already exists, and rolling it
  // back here would leave the phone number neither registered nor verifiable.
  try {
    await sendSms(phone, `Your Mind Hub verification code is ${otpCode}. It expires in ${env.OTP_TTL_MINUTES} minutes.`);
  } catch (err) {
    logger.error({ err, userId: user.id }, "Failed to send verification OTP by SMS");
  }

  return { userId: user.id };
}

export async function verifyOtp(rawPhone: string, code: string): Promise<{ userId: string }> {
  const phone = normalizePhone(rawPhone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    throw new AuthError("Invalid phone number or code");
  }

  const otp = await prisma.otpCode.findFirst({
    where: { userId: user.id, purpose: OTP_PURPOSE_PHONE_VERIFICATION, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt < new Date()) {
    throw new AuthError("OTP has expired or was not found; request a new one");
  }

  if (otp.attempts >= env.OTP_MAX_ATTEMPTS) {
    throw new AuthError("Too many incorrect attempts; request a new OTP");
  }

  if (otp.codeHash !== hashOtpCode(code)) {
    await prisma.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    throw new AuthError("Incorrect OTP code");
  }

  await prisma.$transaction([
    prisma.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } }),
    prisma.user.update({ where: { id: user.id }, data: { phoneVerified: true } }),
  ]);

  return { userId: user.id };
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

async function issueTokenPair(userId: string, role: string): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: userId, role });
  const rawRefreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000),
    },
  });
  return { accessToken, refreshToken: rawRefreshToken };
}

export interface LoginResult {
  user: {
    id: string;
    role: string;
    phone: string;
    email: string | null;
    status: string;
    phoneVerified: boolean;
  };
  tokens: TokenPair;
}

export async function login(rawPhone: string, password: string): Promise<LoginResult> {
  const phone = normalizePhone(rawPhone);
  const user = await prisma.user.findUnique({ where: { phone } });

  // Deliberately the same generic message whether the phone is unregistered or the
  // password is wrong — a distinct message for "no such user" would let an attacker
  // enumerate which phone numbers have accounts.
  if (!user) {
    throw new AuthError("Invalid phone number or password");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new AuthError("Invalid phone number or password");
  }

  if (user.status !== "ACTIVE") {
    throw new AuthError("This account is not active; contact support");
  }

  if (!user.phoneVerified) {
    throw new AuthError("Phone number not verified; verify your OTP before logging in");
  }

  const tokens = await issueTokenPair(user.id, user.role);
  return {
    user: {
      id: user.id,
      role: user.role,
      phone: user.phone,
      email: user.email,
      status: user.status,
      phoneVerified: user.phoneVerified,
    },
    tokens,
  };
}

export async function refreshTokens(rawRefreshToken: string): Promise<{ userId: string; tokens: TokenPair }> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing) {
    throw new AuthError("Invalid refresh token");
  }

  if (existing.revokedAt) {
    // Reuse of an already-revoked refresh token is a strong signal of token theft: a
    // legitimate client would only ever present the newest token from the last rotation.
    // Treat it as a security event and kill every session for this user.
    await prisma.refreshToken.updateMany({
      where: { userId: existing.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    logger.warn({ userId: existing.userId }, "Refresh token reuse detected; all sessions revoked");
    throw new AuthError("Refresh token has been revoked; please log in again");
  }

  if (existing.expiresAt < new Date()) {
    throw new AuthError("Refresh token has expired; please log in again");
  }

  const user = await prisma.user.findUnique({ where: { id: existing.userId } });
  if (!user || user.status !== "ACTIVE") {
    throw new AuthError("Account is not active");
  }

  const newAccessToken = signAccessToken({ sub: user.id, role: user.role });
  const rawNewRefreshToken = generateRefreshToken();

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: existing.id }, data: { revokedAt: new Date() } }),
    prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawNewRefreshToken),
        expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60_000),
      },
    }),
  ]);

  return { userId: user.id, tokens: { accessToken: newAccessToken, refreshToken: rawNewRefreshToken } };
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getPublicUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }
  return {
    id: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
    status: user.status,
    phoneVerified: user.phoneVerified,
  };
}
