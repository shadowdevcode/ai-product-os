'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { captureClientEvent } from '@/lib/posthog-browser';
import { ArtifactCanvas } from '@/components/ArtifactCanvas';
import { ResearchPlanCard } from '@/components/ResearchPlanCard';
import { ResearchPlanOptions, type PlanOptionsState } from '@/components/ResearchPlanOptions';
import { ToolStepRow } from '@/components/ToolStepRow';
import { cn } from '@/lib/cn';

export function ResearchChat(props: {
  sessionId: string;
  initialFirstMessage?: string;
  onFirstMessageSent?: () => void;
}) {
  const { sessionId, initialFirstMessage, onFirstMessageSent } = props;
  const [plan, setPlan] = useState<PlanOptionsState>({
    sources: ['web', 'reddit'],
    depth: 'standard',
  });
  const [phase, setPhase] = useState<string>('planning');
  const [planApproved, setPlanApproved] = useState(false);
  const [brief, setBrief] = useState('');
  const [findings, setFindings] = useState('');
  const bootstrapSent = useRef(false);

  useEffect(() => {
    bootstrapSent.current = false;
  }, [sessionId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/research/sessions/${sessionId}/chat`,
      }),
    [sessionId]
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: sessionId,
    transport,
  });

  const refreshSession = useCallback(async () => {
    const r = await fetch(`/api/research/sessions/${sessionId}`);
    if (!r.ok) {
      return;
    }
    const data = (await r.json()) as {
      session: { phase: string; plan_approved_at: string | null };
    };
    setPhase(data.session.phase);
    setPlanApproved(Boolean(data.session.plan_approved_at));
  }, [sessionId]);

  const refreshArtifact = useCallback(async () => {
    const r = await fetch(`/api/research/sessions/${sessionId}/artifact`);
    if (!r.ok) {
      return;
    }
    const data = (await r.json()) as { brief_markdown?: string; findings_markdown?: string };
    if (data.brief_markdown) {
      setBrief(data.brief_markdown);
    }
    if (data.findings_markdown) {
      setFindings(data.findings_markdown);
    }
  }, [sessionId]);

  useEffect(() => {
    const initial = setTimeout(() => {
      void refreshSession();
      void refreshArtifact();
    }, 0);
    const t = setInterval(() => {
      void refreshSession();
      void refreshArtifact();
    }, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(t);
    };
  }, [refreshSession, refreshArtifact]);

  useEffect(() => {
    if (bootstrapSent.current || !initialFirstMessage?.trim()) {
      return;
    }
    bootstrapSent.current = true;
    void (async () => {
      await captureClientEvent('center_composer_first_message_sent', {
        session_id: sessionId,
        first_message_from_center_composer: true,
      });
      onFirstMessageSent?.();
      void sendMessage({ text: initialFirstMessage });
    })();
  }, [initialFirstMessage, onFirstMessageSent, sessionId, sendMessage]);

  const busy = status === 'streaming' || status === 'submitted';

  const approve = async () => {
    const r = await fetch(`/api/research/sessions/${sessionId}/plan/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan_json: { ...plan, title: 'Approved plan' },
      }),
    });
    if (r.ok) {
      setPlanApproved(true);
      await refreshSession();
    }
  };

  const stopRun = async () => {
    await fetch(`/api/research/sessions/${sessionId}/stop`, { method: 'POST' });
    stop();
    await refreshSession();
  };

  const skipSource = async () => {
    await fetch(`/api/research/sessions/${sessionId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: 'current' }),
    });
  };

  const onSend = async (text: string) => {
    if (phase === 'executing' && planApproved) {
      void captureClientEvent('research_steer_issued', { session_id: sessionId, text });
    }
    await sendMessage({ text });
  };

  const emphasize = findings.length > 80;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/30"
            onClick={() => void stopRun()}
          >
            Stop run
          </button>
          <button
            type="button"
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
            onClick={() => void skipSource()}
          >
            Skip source
          </button>
        </div>
        <ResearchPlanOptions value={plan} onChange={setPlan} disabled={planApproved} />
        <div className="mt-3">
          <ResearchPlanCard
            onApprove={() => void approve()}
            disabled={busy}
            approved={planApproved}
          />
        </div>
        {phase === 'executing' && (
          <div className="mt-3 space-y-1" aria-live="polite">
            <p className="text-xs text-white/50">Sub-agents (stub)</p>
            <ToolStepRow name="web_serp" status={busy ? 'running' : 'queued'} />
            <ToolStepRow name="nlp_synthesize" status="queued" />
          </div>
        )}
        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-[var(--bg-card)]">
          <div className="max-h-[min(480px,50vh)] space-y-3 overflow-auto p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('text-sm', m.role === 'user' ? 'text-white' : 'text-indigo-100')}
              >
                <span className="text-[10px] uppercase text-white/40">{m.role}</span>
                <div className="mt-1 whitespace-pre-wrap">
                  {m.parts?.map((p, i) =>
                    p.type === 'text' ? <span key={i}>{p.text}</span> : null
                  )}
                </div>
              </div>
            ))}
          </div>
          <form
            className="border-t border-white/10 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const text = String(fd.get('msg') ?? '').trim();
              if (!text) {
                return;
              }
              void onSend(text);
              e.currentTarget.reset();
            }}
          >
            <div className="flex gap-2">
              <input
                name="msg"
                disabled={busy}
                placeholder="Message the research agent…"
                className="flex-1 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      </div>
      <div
        className={cn(
          'w-full shrink-0 transition-[flex-basis] duration-300 lg:w-[min(420px,40vw)]',
          emphasize && 'lg:max-w-xl'
        )}
      >
        <div className="mb-2 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15"
            onClick={() => void refreshArtifact()}
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-md bg-indigo-500/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-400"
            onClick={async () => {
              const r = await fetch(`/api/research/sessions/${props.sessionId}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ which: 'both' }),
              });
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `research-${props.sessionId.slice(0, 8)}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export Markdown
          </button>
        </div>
        <ArtifactCanvas brief={brief} findings={findings} emphasize={emphasize} />
      </div>
    </div>
  );
}
