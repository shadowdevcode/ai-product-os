import { LockIcon } from './icons';

interface PipelineStep {
  number: number;
  command: string;
  agent: string;
  description: string;
  color: string;
  hasGate: boolean;
}

const STEPS: PipelineStep[] = [
  {
    number: 1,
    command: '/create-issue',
    agent: 'Research Agent',
    description: 'Convert idea into structured opportunity',
    color: 'bg-accent-blue',
    hasGate: false,
  },
  {
    number: 2,
    command: '/explore',
    agent: 'Research Agent',
    description: 'Validate problem and market feasibility',
    color: 'bg-accent-blue',
    hasGate: false,
  },
  {
    number: 3,
    command: '/create-plan',
    agent: 'Product + Design + Architecture',
    description: 'Generate specs, UX, architecture, schema',
    color: 'bg-accent-purple',
    hasGate: false,
  },
  {
    number: 4,
    command: '/execute-plan',
    agent: 'Frontend + Backend Engineers',
    description: 'Implement frontend and backend',
    color: 'bg-accent-green',
    hasGate: true,
  },
  {
    number: 5,
    command: '/deslop',
    agent: 'Deslop Agent',
    description: 'Clean and polish AI-generated code',
    color: 'bg-accent-green',
    hasGate: false,
  },
  {
    number: 6,
    command: '/review',
    agent: 'Code Review Agent',
    description: 'Baseline implementation review',
    color: 'bg-accent-amber',
    hasGate: false,
  },
  {
    number: 7,
    command: '/peer-review',
    agent: 'Peer Review Agent',
    description: 'Adversarial architecture review',
    color: 'bg-accent-amber',
    hasGate: true,
  },
  {
    number: 8,
    command: '/qa-test',
    agent: 'QA Agent',
    description: 'Reliability and integration testing',
    color: 'bg-accent-amber',
    hasGate: true,
  },
  {
    number: 9,
    command: '/metric-plan',
    agent: 'Analytics Agent',
    description: 'Define tracking and success criteria',
    color: 'bg-accent-cyan',
    hasGate: true,
  },
  {
    number: 10,
    command: '/deploy-check',
    agent: 'Deploy Agent',
    description: 'Production readiness verification',
    color: 'bg-accent-cyan',
    hasGate: true,
  },
  {
    number: 11,
    command: '/postmortem',
    agent: 'Learning Agent',
    description: 'Analyze bottlenecks and failures',
    color: 'bg-accent-pink',
    hasGate: true,
  },
  {
    number: 12,
    command: '/learning',
    agent: 'Learning Agent',
    description: 'Extract insights into durable knowledge',
    color: 'bg-accent-pink',
    hasGate: false,
  },
];

export function PipelineSection() {
  return (
    <section id="pipeline" className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            12-Step Pipeline with Quality Gates
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Every stage has a clear owner. Quality gates prevent skipping ahead. No shortcuts, no
            regressions.
          </p>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-accent-blue via-accent-green to-accent-pink sm:left-8" />

          <div className="space-y-2">
            {STEPS.map((step) => (
              <div key={step.number}>
                {/* Quality gate indicator */}
                {step.hasGate && (
                  <div className="relative mb-2 flex items-center pl-[34px] sm:pl-[46px]">
                    <div className="absolute left-[18px] sm:left-[26px] flex h-5 w-5 items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10">
                      <LockIcon className="h-2.5 w-2.5 text-amber-400" />
                    </div>
                    <span className="ml-3 text-xs font-medium text-amber-400/70">Quality Gate</span>
                  </div>
                )}

                {/* Step card */}
                <div className="relative flex items-start gap-4 rounded-lg p-3 transition-colors hover:bg-neutral-900/50 sm:gap-6">
                  <div
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${step.color} sm:h-12 sm:w-12`}
                  >
                    <span className="text-sm font-bold text-white sm:text-base">{step.number}</span>
                  </div>

                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <code className="text-sm font-semibold text-white sm:text-base">
                        {step.command}
                      </code>
                      <span className="text-xs text-neutral-500">{step.agent}</span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-400">{step.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
