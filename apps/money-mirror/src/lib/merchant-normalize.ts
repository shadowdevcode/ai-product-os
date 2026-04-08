/**
 * Deterministic merchant_key for rollup v1 (no LLM).
 * Used on transaction insert and optional backfill.
 */

const KNOWN: { pattern: RegExp; key: string }[] = [
  { pattern: /\bzomato\b/i, key: 'zomato' },
  { pattern: /\bswiggy\b/i, key: 'swiggy' },
  { pattern: /\bblinkit\b/i, key: 'blinkit' },
  { pattern: /\binstamart\b/i, key: 'instamart' },
  { pattern: /\bamazon\b/i, key: 'amazon' },
  { pattern: /\bflipkart\b/i, key: 'flipkart' },
  { pattern: /\buber\b/i, key: 'uber' },
  { pattern: /\bola\b/i, key: 'ola' },
  { pattern: /\bnetflix\b/i, key: 'netflix' },
  { pattern: /\bspotify\b/i, key: 'spotify' },
  { pattern: /\byoutube\b/i, key: 'youtube' },
  { pattern: /\bphonepe\b/i, key: 'phonepe' },
  { pattern: /\bgpay\b/i, key: 'gpay' },
  { pattern: /\bpaytm\b/i, key: 'paytm' },
  { pattern: /\bhdfc\b/i, key: 'hdfc' },
  { pattern: /\bicici\b/i, key: 'icici' },
  { pattern: /\bsbi\b/i, key: 'sbi' },
  { pattern: /\baxis\b/i, key: 'axis' },
  { pattern: /\bkotak\b/i, key: 'kotak' },
];

const UPI_HANDLE = /([a-z0-9][a-z0-9._-]{1,48}@[a-z0-9._-]+)/i;

/**
 * Extracts a UPI VPA/handle from a transaction description when present (e.g. name@oksbi).
 */
/** Human-readable fallback when no user alias exists (underscores → spaces). */
export function formatMerchantKeyForDisplay(merchantKey: string): string {
  return merchantKey.replace(/_/g, ' ');
}

export function extractUpiHandle(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return null;
  }
  const m = trimmed.match(UPI_HANDLE);
  if (m?.[1]) {
    return m[1].toLowerCase();
  }
  return null;
}

function slugifyToken(raw: string): string | null {
  const s = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64);
  return s.length >= 2 ? s : null;
}

/**
 * Returns a stable key for grouping, or null when not confidently derivable.
 */
export function normalizeMerchantKey(description: string): string | null {
  const trimmed = description.trim();
  if (!trimmed) {
    return null;
  }

  const lower = trimmed.toLowerCase();

  for (const { pattern, key } of KNOWN) {
    if (pattern.test(lower)) {
      return key;
    }
  }

  const upi = extractUpiHandle(trimmed);
  if (upi) {
    const slug = slugifyToken(upi.split('@')[0] ?? '');
    if (slug) {
      return `upi_${slug}`;
    }
  }

  // First line / first segment before pipe or tab
  const firstSegment = trimmed.split(/[|\t]/)[0]?.trim() ?? trimmed;
  const words = firstSegment.split(/\s+/).filter((w) => w.length > 1);
  const skip = new Set(['dr', 'cr', 'debit', 'credit', 'upi', 'nfs', 'pos', 'atm', 'txn', 'ref']);
  const meaningful = words.filter((w) => !skip.has(w.toLowerCase().replace(/[^a-z]/gi, '')));
  const take = meaningful.slice(0, 3).join(' ');
  return slugifyToken(take || firstSegment);
}
