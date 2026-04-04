/**
 * T6 — Transaction Categorization Engine
 *
 * Classifies a parsed transaction description into one of four buckets:
 *   - needs     → rent, utilities, groceries, transport, insurance
 *   - wants     → dining, entertainment, shopping, subscriptions
 *   - investment → SIP, mutual funds, stocks, gold
 *   - debt      → EMI, BNPL, credit card payment, loan
 *   - other     → catch-all (transfers, ATM withdrawals, etc.)
 *
 * Approach: rule-based keyword matching (fast, zero API calls).
 * The Gemini parser step handles the initial description cleanup,
 * so inputs here are normalized merchant names.
 */

export type TransactionCategory = 'needs' | 'wants' | 'investment' | 'debt' | 'other';

export interface CategorizedTransaction {
  description: string;
  amount_paisa: number;
  date: string;
  type: 'debit' | 'credit';
  category: TransactionCategory;
  is_recurring: boolean;
}

export type CreditCardEntryKind =
  | 'purchase'
  | 'payment'
  | 'refund'
  | 'reversal'
  | 'fee'
  | 'interest'
  | 'cash_advance'
  | 'other';

// ─── Keyword rule sets ─────────────────────────────────────────────────────

const RULES: Record<TransactionCategory, RegExp> = {
  needs:
    /\b(rent|electricity|water|gas|broadband|internet|grocery|grocer|zepto|blinkit|bigbasket|d-mart|dmart|reliance smart|metro|more supermarket|uber|ola|rapido|namma yatri|petrol|fuel|insurance|mediclaim|lic|health|pharmacy|chemist|doctor|hospital|clinic)\b/i,

  wants:
    /\b(swiggy|zomato|eatsure|dunzo|barbeque|starbucks|cafe|restaurant|hotel|bar|pub|food|pizza|burger|kfc|mcdonald|domino|netflix|hotstar|prime video|amazon prime|spotify|gaana|youtube premium|jiocinema|zee5|sonyliv|bookmyshow|pvr|inox|myntra|ajio|nykaa|meesho|flipkart|amazon|shopping|fashion|cosmetic|saloon|salon|parlour|gaming|ludo|steam|play store|app store|travel|makemytrip|goibibo|ixigo|cleartrip|irctc|redbus|yolo)\b/i,

  investment:
    /\b(sip|mutual fund|groww|zerodha|kuvera|paytm money|coin by zerodha|iifl|hdfc mutual|sbi mutual|axis mutual|icici pru|nippon|mirae|navi mutual|smallcase|stock|nse|bse|gold|sovereign gold|ppf|nps|elss|fd|fixed deposit|recurring deposit|rd)\b/i,

  debt: /\b(emi|equated monthly|loan|credit card|payment due|minimum due|bnpl|buy now pay later|bajaj finserv|zestmoney|zest money|lazypay|lazy pay|simpl|slice|uni card|onecard|stashfin|moneyview|creditmantri|freecharge credit|paytm postpaid|flipkart pay later|amazon pay later|hdfc card|sbi card|icici card|axis card|kotak card)\b/i,

  // "other" is the fallback — not matched by keyword
  other: /^$/,
};

const RECURRING_SIGNALS: RegExp =
  /\b(sip|subscription|emi|lic|insurance|broadband|internet|rent|netflix|hotstar|prime|spotify|mutual fund|monthly|auto.?debit)\b/i;

// ─── Categorization Function ───────────────────────────────────────────────

/**
 * Categorize a single transaction.
 *
 * @param description - Normalized merchant/narration string from Gemini
 * @param amount_paisa - Transaction amount in paisa (always positive)
 * @param date - ISO date string (YYYY-MM-DD)
 * @param type - "debit" or "credit"
 */
export function categorizeTransaction(
  description: string,
  amount_paisa: number,
  date: string,
  type: 'debit' | 'credit'
): CategorizedTransaction {
  const d = description.trim();
  let category: TransactionCategory = 'other';

  // Credits are always "other" (salary, transfers, refunds)
  if (type === 'credit') {
    return {
      description: d,
      amount_paisa,
      date,
      type,
      category: 'other',
      is_recurring: false,
    };
  }

  // Priority order: investment > debt > needs > wants > other
  for (const key of ['investment', 'debt', 'needs', 'wants'] as TransactionCategory[]) {
    if (RULES[key].test(d)) {
      category = key;
      break;
    }
  }

  const is_recurring = RECURRING_SIGNALS.test(d);

  return {
    description: d,
    amount_paisa,
    date,
    type,
    category,
    is_recurring,
  };
}

export function categorizeCreditCardTransaction(
  description: string,
  amount_paisa: number,
  date: string,
  entryKind: CreditCardEntryKind
): CategorizedTransaction {
  const normalizedEntryKind = entryKind;

  if (normalizedEntryKind === 'payment') {
    return {
      description: description.trim(),
      amount_paisa,
      date,
      type: 'credit',
      category: 'debt',
      is_recurring: false,
    };
  }

  if (normalizedEntryKind === 'refund' || normalizedEntryKind === 'reversal') {
    return {
      description: description.trim(),
      amount_paisa,
      date,
      type: 'credit',
      category: 'other',
      is_recurring: false,
    };
  }

  if (
    normalizedEntryKind === 'fee' ||
    normalizedEntryKind === 'interest' ||
    normalizedEntryKind === 'cash_advance'
  ) {
    return {
      description: description.trim(),
      amount_paisa,
      date,
      type: 'debit',
      category: 'debt',
      is_recurring: false,
    };
  }

  return categorizeTransaction(description, amount_paisa, date, 'debit');
}

/**
 * Summarize a list of categorized transactions into bucket totals.
 * Returns totals in paisa.
 */
export interface CategorySummary {
  needs: number;
  wants: number;
  investment: number;
  debt: number;
  other: number;
  total_debits: number;
  total_credits: number;
}

export function summarizeByCategory(transactions: CategorizedTransaction[]): CategorySummary {
  const summary: CategorySummary = {
    needs: 0,
    wants: 0,
    investment: 0,
    debt: 0,
    other: 0,
    total_debits: 0,
    total_credits: 0,
  };

  for (const tx of transactions) {
    if (tx.type === 'credit') {
      summary.total_credits += tx.amount_paisa;
    } else {
      summary.total_debits += tx.amount_paisa;
      summary[tx.category] += tx.amount_paisa;
    }
  }

  return summary;
}
