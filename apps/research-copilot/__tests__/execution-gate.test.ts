import { describe, expect, it, vi } from 'vitest';
import { gateExecutionTool } from '@/lib/ai/execution-gate';

vi.mock('@/lib/db', () => ({
  getSessionById: vi.fn(),
}));

import { getSessionById } from '@/lib/db';

describe('gateExecutionTool', () => {
  it('rejects when plan not approved', async () => {
    vi.mocked(getSessionById).mockResolvedValue({
      id: 's1',
      project_id: 'p1',
      user_id: 'u1',
      title: 't',
      phase: 'planning',
      plan_approved_at: null,
      stopped_at: null,
      centered_entry: true,
      created_at: '',
      updated_at: '',
    });
    const r = await gateExecutionTool('s1', 'u1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.code).toBe('PLAN_NOT_APPROVED');
    }
  });

  it('allows when plan approved and not stopped', async () => {
    vi.mocked(getSessionById).mockResolvedValue({
      id: 's1',
      project_id: 'p1',
      user_id: 'u1',
      title: 't',
      phase: 'executing',
      plan_approved_at: new Date().toISOString(),
      stopped_at: null,
      centered_entry: true,
      created_at: '',
      updated_at: '',
    });
    const r = await gateExecutionTool('s1', 'u1');
    expect(r.ok).toBe(true);
  });
});
