/**
 * Shared validation constants and helpers
 */

export const VALID_FREQUENCIES = ['2h', '3x_day', 'daily'] as const;
export type DigestFrequency = (typeof VALID_FREQUENCIES)[number];

export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Validate an E.164 phone number
 */
export function isValidPhone(phone: string): boolean {
    return E164_REGEX.test(phone);
}

/**
 * Validate a digest frequency value
 */
export function isValidFrequency(freq: string): freq is DigestFrequency {
    return (VALID_FREQUENCIES as readonly string[]).includes(freq);
}
