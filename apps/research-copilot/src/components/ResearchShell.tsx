'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { captureClientEvent } from '@/lib/posthog-browser';
import { CenteredComposer } from '@/components/CenteredComposer';
import { ProjectRail, type SessionListItem } from '@/components/ProjectRail';
import { ResearchChat } from '@/components/ResearchChat';
import { SessionSurvey } from '@/components/SessionSurvey';

export function ResearchShell() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingFirst, setPendingFirst] = useState<string | undefined>();
  const [railOpen, setRailOpen] = useState(false);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [starting, setStarting] = useState(false);

  const loadSessions = useCallback(async () => {
    const r = await fetch('/api/research/sessions');
    if (!r.ok) {
      return;
    }
    const data = (await r.json()) as { sessions: { id: string; title: string }[] };
    setSessions(data.sessions.map((s) => ({ id: s.id, title: s.title })));
  }, []);

  useEffect(() => {
    const id = searchParams.get('session');
    if (id) {
      setSessionId(id);
      setRailOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions, sessionId]);

  const startSession = async (text: string) => {
    setStarting(true);
    try {
      const r = await fetch('/api/research/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: text.slice(0, 120) }),
      });
      if (!r.ok) {
        return;
      }
      const data = (await r.json()) as { session: { id: string } };
      const id = data.session.id;
      setSessionId(id);
      setPendingFirst(text);
      setRailOpen(true);
      void captureClientEvent('project_rail_revealed', { session_id: id });
      router.replace(`/?session=${id}`);
      await loadSessions();
    } finally {
      setStarting(false);
    }
  };

  const newSession = () => {
    setSessionId(null);
    setPendingFirst(undefined);
    router.replace('/');
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <ProjectRail
        open={railOpen}
        sessions={sessions}
        currentId={sessionId}
        onNewSession={newSession}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {!sessionId ? (
          <CenteredComposer onSubmit={(t) => void startSession(t)} disabled={starting} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col p-4">
            <ResearchChat
              sessionId={sessionId}
              initialFirstMessage={pendingFirst}
              onFirstMessageSent={() => setPendingFirst(undefined)}
            />
            <div className="mt-6">
              <SessionSurvey sessionId={sessionId} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
