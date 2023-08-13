import crypto from 'node:crypto';
import { Request } from 'express';
import { URLSearchParams } from 'node:url';
import { PasswordHistory } from '@/db/schema.js';
import argon2 from 'argon2';

export function IsJsonString(str: string) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export function generateRandomUuid(length: number, encoding: 'hex' | 'base64') {
  const bytes = crypto.randomBytes(length);
  const uuid = bytes.toString(encoding);
  return uuid;
}

export function isExpired(d1: Date) {
  const d2 = new Date();
  const diff = (d2.getTime() - d1.getTime()) / (1000 * 60);
  return diff > 0;
}

export function getHostAddress(req: Request) {
  const host = req.hostname;
  const protocol = req.protocol;
  const baseUrl = req.baseUrl;
  const path = req.path;

  const queryParams = new URLSearchParams();

  Object.entries(req.query).forEach(([key, value]) => {
    if (value) {
      queryParams.append(key, value.toString());
    }
  });

  const backendUrl = `${protocol}://${host}${baseUrl}${path}${
    queryParams.size > 0 && '?'
  }${queryParams}`;
  return backendUrl;
}

export function isSameDay(d1: Date, d2: Date) {
  const d1Str = d1.toISOString().split('T')[0];
  const d2Str = d2.toISOString().split('T')[0];

  return d1Str === d2Str;
}

export function isMoreThan60DaysAfter(date: Date): boolean {
  const currentDate = new Date();
  const diffInTime = currentDate.getTime() - date.getTime();
  const diffInDays = diffInTime / (1000 * 3600 * 24);
  return diffInDays > 60;
}

export async function hasChangedBefore(
  pwdHistory: PasswordHistory[],
  password: string
) {
  let hasChangedBefore = false;
  const one2Five = pwdHistory.slice(0, 5);
  for (let index = 0; index < one2Five.length; index++) {
    const history = pwdHistory[index];
    const verified = await argon2.verify(history.password, password);
    if (verified) {
      hasChangedBefore = true;
      break;
    }
  }
  return hasChangedBefore;
}
