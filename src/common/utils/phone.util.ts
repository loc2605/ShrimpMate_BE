const VIETNAM_PHONE_PATTERN = /^0(3|5|7|8|9)\d{8}$/;

export function normalizePhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');

  if (digits.length === 11 && digits.startsWith('84')) {
    return `0${digits.slice(2)}`;
  }

  if (digits.length === 10 && digits.startsWith('0')) {
    return digits;
  }

  if (digits.length === 9 && /^(3|5|7|8|9)/.test(digits)) {
    return `0${digits}`;
  }

  return digits;
}

export function isValidVietnamPhoneNumber(phone: string): boolean {
  return VIETNAM_PHONE_PATTERN.test(normalizePhoneNumber(phone));
}

export function isEmailIdentifier(value: string): boolean {
  return value.includes('@');
}
