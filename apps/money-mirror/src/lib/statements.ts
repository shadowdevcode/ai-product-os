export type StatementType = 'bank_account' | 'credit_card';

export type CreditCardEntryKind =
  | 'purchase'
  | 'payment'
  | 'refund'
  | 'reversal'
  | 'fee'
  | 'interest'
  | 'cash_advance'
  | 'other';

export interface ParsedStatementTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  entry_kind?: CreditCardEntryKind;
}

export interface ParsedStatementMetadata {
  institution_name: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  due_date: string | null;
  payment_due_paisa: number | null;
  minimum_due_paisa: number | null;
  credit_limit_paisa: number | null;
}

export interface ParsedStatementResult extends ParsedStatementMetadata {
  transactions: ParsedStatementTransaction[];
}

const CREDIT_CARD_ENTRY_KINDS: CreditCardEntryKind[] = [
  'purchase',
  'payment',
  'refund',
  'reversal',
  'fee',
  'interest',
  'cash_advance',
  'other',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readRequiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Parsed statement is missing "${key}".`);
  }
  return value.trim();
}

function readOptionalString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`Parsed statement field "${key}" must be a string.`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalPaisa(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];
  if (value === undefined || value === null || value === '') {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Parsed statement field "${key}" must be a non-negative number.`);
  }
  return Math.round(value * 100);
}

function normalizeInstitutionName(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function validateTransaction(
  value: unknown,
  statementType: StatementType,
  index: number
): ParsedStatementTransaction {
  if (!isObject(value)) {
    throw new Error(`Transaction ${index + 1} is not an object.`);
  }

  const date = readRequiredString(value, 'date');
  const description = readRequiredString(value, 'description');
  const amount = value.amount;
  const type = value.type;

  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error(`Transaction ${index + 1} has an invalid amount.`);
  }
  if (type !== 'debit' && type !== 'credit') {
    throw new Error(`Transaction ${index + 1} has an invalid type.`);
  }

  const entryKindValue = value.entry_kind;
  if (statementType === 'credit_card') {
    if (
      typeof entryKindValue !== 'string' ||
      !CREDIT_CARD_ENTRY_KINDS.includes(entryKindValue as CreditCardEntryKind)
    ) {
      throw new Error(`Transaction ${index + 1} is missing a valid entry_kind.`);
    }
  }

  return {
    date,
    description,
    amount,
    type,
    entry_kind:
      typeof entryKindValue === 'string' ? (entryKindValue as CreditCardEntryKind) : undefined,
  };
}

export function parseStatementType(value: FormDataEntryValue | null): StatementType {
  if (value === 'credit_card') {
    return 'credit_card';
  }
  return 'bank_account';
}

export function getStatementTypeLabel(statementType: StatementType): string {
  return statementType === 'credit_card' ? 'Credit Card Statement' : 'Bank Account Statement';
}

export function getCreditsLabel(statementType: StatementType): string {
  return statementType === 'credit_card' ? 'Credits & Payments' : 'Total Income';
}

export function buildStatementParserPrompt(statementType: StatementType): string {
  if (statementType === 'credit_card') {
    return `You are a parser for Indian credit card statement PDFs.
Extract statement metadata and every transaction into valid JSON only.
Return:
- institution_name: issuing bank or card institution
- period_start: YYYY-MM-DD
- period_end: YYYY-MM-DD
- due_date: YYYY-MM-DD or null
- payment_due: rupees as decimal or null
- minimum_due: rupees as decimal or null
- credit_limit: rupees as decimal or null
- transactions: array

For each transaction return:
- date: YYYY-MM-DD
- description: normalized merchant or narration
- amount: positive rupees decimal
- type: "debit" for purchases, fees, interest, cash advances; "credit" for payments, refunds, reversals
- entry_kind: one of purchase, payment, refund, reversal, fee, interest, cash_advance, other

Return JSON only. No markdown. No explanations.`;
  }

  return `You are a parser for Indian bank account statement PDFs.
Extract statement metadata and every transaction into valid JSON only.
Return:
- institution_name: bank name
- period_start: YYYY-MM-DD
- period_end: YYYY-MM-DD
- transactions: array

For each transaction return:
- date: YYYY-MM-DD
- description: normalized merchant or narration
- amount: positive rupees decimal
- type: "debit" or "credit"

Return JSON only. No markdown. No explanations.`;
}

export function validateParsedStatement(
  parsed: unknown,
  statementType: StatementType
): ParsedStatementResult {
  if (!isObject(parsed)) {
    throw new Error('Parsed statement payload is not an object.');
  }

  const transactionsValue = parsed.transactions;
  if (!Array.isArray(transactionsValue) || transactionsValue.length === 0) {
    throw new Error('Parsed statement must contain at least one transaction.');
  }

  const institutionName = normalizeInstitutionName(readRequiredString(parsed, 'institution_name'));
  const periodStart = readRequiredString(parsed, 'period_start');
  const periodEnd = readRequiredString(parsed, 'period_end');
  const dueDate = readOptionalString(parsed, 'due_date');

  const transactions = transactionsValue.map((tx, index) =>
    validateTransaction(tx, statementType, index)
  );

  return {
    institution_name: institutionName,
    statement_type: statementType,
    period_start: periodStart,
    period_end: periodEnd,
    due_date: dueDate,
    payment_due_paisa: readOptionalPaisa(parsed, 'payment_due'),
    minimum_due_paisa: readOptionalPaisa(parsed, 'minimum_due'),
    credit_limit_paisa: readOptionalPaisa(parsed, 'credit_limit'),
    transactions,
  };
}
