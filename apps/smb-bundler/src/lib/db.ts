import { neon } from "@neondatabase/serverless";

// Lazy-initialise so builds without DATABASE_URL don't fail at import time
let _sql: ReturnType<typeof neon> | null = null;

function getDb() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _sql = neon(url);
  }
  return _sql;
}

export interface BundleSessionRow {
  id: string;
  selected_features: string[];
  price_range_label: string;
  generated_price_inr: number;
  estimated_monthly_savings_inr: number;
  roi_points: string[];
  email_pitch: string;
  pitch_copied: boolean;
  created_at: string;
}

export async function insertBundleSession(params: {
  id: string;
  selectedFeatures: string[];
  priceRangeLabel: string;
  generatedPriceInr: number;
  estimatedMonthlySavingsInr: number;
  roiPoints: string[];
  emailPitch: string;
}): Promise<void> {
  const sql = getDb();
  await sql`
    INSERT INTO bundle_sessions (
      id,
      selected_features,
      price_range_label,
      generated_price_inr,
      estimated_monthly_savings_inr,
      roi_points,
      email_pitch
    ) VALUES (
      ${params.id},
      ${params.selectedFeatures},
      ${params.priceRangeLabel},
      ${params.generatedPriceInr},
      ${params.estimatedMonthlySavingsInr},
      ${params.roiPoints},
      ${params.emailPitch}
    )
  `;
}

export async function markPitchCopied(id: string): Promise<boolean> {
  const sql = getDb();
  const rows = (await sql`
    UPDATE bundle_sessions
    SET pitch_copied = TRUE
    WHERE id = ${id}
    RETURNING id
  `) as { id: string }[];
  return rows.length > 0;
}
