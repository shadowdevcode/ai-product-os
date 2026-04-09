import { getDb } from '@/lib/db';

export async function logSyncRun(
  userId: string,
  triggerMode: string,
  status: 'ok' | 'partial' | 'failed',
  emailsScanned: number,
  parsedCount: number,
  insertedCount: number,
  skippedCount: number,
  errorSummary: string | null
): Promise<void> {
  try {
    const sql = getDb();
    await sql`
      INSERT INTO gmail_sync_runs (
        user_id, trigger_mode, status,
        emails_scanned, parsed_count, inserted_count, skipped_count, error_summary
      ) VALUES (
        ${userId},
        ${triggerMode === 'command' ? 'command' : triggerMode === 'cron' ? 'cron' : 'manual_ui'},
        ${status},
        ${emailsScanned}, ${parsedCount}, ${insertedCount}, ${skippedCount},
        ${errorSummary}
      )
    `;
  } catch (e) {
    // Non-fatal — don't crash the sync if logging fails
    console.error('[gmail-sync] failed to log sync run:', e);
  }
}
