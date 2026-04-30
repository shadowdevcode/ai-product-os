'use client';

export type SessionListItem = { id: string; title: string };

export function ProjectRail(props: {
  open: boolean;
  sessions: SessionListItem[];
  currentId: string | null;
  onNewSession: () => void;
}) {
  if (!props.open) {
    return null;
  }
  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-[var(--bg-elevated)] p-3 transition-[width] duration-300">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
          Sessions
        </span>
        <button
          type="button"
          onClick={props.onNewSession}
          className="rounded-md bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/15"
        >
          New
        </button>
      </div>
      <ul className="mt-3 flex flex-1 flex-col gap-1 overflow-auto">
        {props.sessions.map((s) => (
          <li key={s.id}>
            <a
              href={`/?session=${s.id}`}
              className={`block truncate rounded-md px-2 py-2 text-sm ${
                s.id === props.currentId
                  ? 'bg-white/10 text-white'
                  : 'text-[var(--text-secondary)] hover:bg-white/5'
              }`}
            >
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
