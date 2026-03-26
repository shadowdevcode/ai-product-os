interface Agent {
  name: string;
  role: string;
  stages: string;
  borderColor: string;
}

const AGENTS: Agent[] = [
  {
    name: 'Research',
    role: 'Validates ideas, explores problems, assesses market feasibility',
    stages: 'create-issue, explore',
    borderColor: 'border-t-blue-500',
  },
  {
    name: 'Product',
    role: 'Writes product specs with acceptance criteria and success metrics',
    stages: 'create-plan',
    borderColor: 'border-t-purple-500',
  },
  {
    name: 'Design',
    role: 'Defines UX flows, wireframes, and interaction patterns',
    stages: 'create-plan',
    borderColor: 'border-t-purple-400',
  },
  {
    name: 'Backend Architect',
    role: 'Designs system architecture, API contracts, and database schemas',
    stages: 'create-plan',
    borderColor: 'border-t-violet-500',
  },
  {
    name: 'Frontend Engineer',
    role: 'Implements UI components, pages, and client-side logic',
    stages: 'execute-plan',
    borderColor: 'border-t-green-500',
  },
  {
    name: 'Backend Engineer',
    role: 'Implements API routes, database queries, and integrations',
    stages: 'execute-plan',
    borderColor: 'border-t-emerald-500',
  },
  {
    name: 'Code Review',
    role: 'Checks for violations against coding standards and anti-patterns',
    stages: 'review',
    borderColor: 'border-t-amber-500',
  },
  {
    name: 'Peer Review',
    role: 'Adversarial architecture review focused on security and scalability',
    stages: 'peer-review',
    borderColor: 'border-t-orange-500',
  },
  {
    name: 'QA',
    role: 'Tests reliability: happy paths, edge cases, network failures, races',
    stages: 'qa-test',
    borderColor: 'border-t-yellow-500',
  },
  {
    name: 'Analytics',
    role: 'Defines PostHog events, funnels, and success metrics',
    stages: 'metric-plan',
    borderColor: 'border-t-cyan-500',
  },
  {
    name: 'Deploy',
    role: 'Verifies production readiness: env vars, schemas, build, domains',
    stages: 'deploy-check',
    borderColor: 'border-t-teal-500',
  },
  {
    name: 'Learning',
    role: 'Extracts postmortem insights into durable knowledge base rules',
    stages: 'postmortem, learning',
    borderColor: 'border-t-pink-500',
  },
];

export function AgentGrid() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            12 Specialized AI Agents
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Each agent has one responsibility. No scope creep, no overlap. They read from a shared
            knowledge base that grows with every project cycle.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent) => (
            <div
              key={agent.name}
              className={`rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 transition-colors hover:bg-neutral-900/70 border-t-2 ${agent.borderColor}`}
            >
              <h3 className="text-sm font-semibold text-white">{agent.name} Agent</h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-400">{agent.role}</p>
              <div className="mt-3">
                <span className="inline-block rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-xs text-neutral-500">
                  {agent.stages}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
