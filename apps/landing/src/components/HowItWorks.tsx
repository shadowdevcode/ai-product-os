import { BrainIcon, RocketIcon, ShieldIcon } from './icons';

const STEPS = [
  {
    icon: RocketIcon,
    title: 'Define',
    description:
      'Start with a raw idea. The Research Agent validates the problem, explores market feasibility, and converts it into a structured opportunity with clear hypotheses.',
    command: '/create-issue + /explore',
  },
  {
    icon: ShieldIcon,
    title: 'Build with Gates',
    description:
      'Sequential commands activate specialized agents. Quality gates between stages prevent skipping ahead. Code review, peer review, and QA must all pass before deployment.',
    command: '/create-plan through /deploy-check',
  },
  {
    icon: BrainIcon,
    title: 'Learn Systematically',
    description:
      'Every cycle ends with a postmortem that extracts engineering and product lessons into a knowledge base. Every future agent reads these rules before executing.',
    command: '/postmortem + /learning',
  },
];

export function HowItWorks() {
  return (
    <section className="px-6 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How It Works</h2>
          <p className="mx-auto mt-4 max-w-2xl text-neutral-400">
            Three phases. One feedback loop. The system gets smarter with every project cycle.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-xl border border-neutral-800 bg-neutral-900/40 p-6"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary-light" />
                </div>
                <span className="text-xs font-medium text-neutral-500">Phase {i + 1}</span>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="text-sm leading-relaxed text-neutral-400">{step.description}</p>
              <div className="mt-4">
                <code className="text-xs text-neutral-500">{step.command}</code>
              </div>
            </div>
          ))}
        </div>

        {/* Knowledge base callout */}
        <div className="mt-12 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-6 text-center">
          <p className="text-sm leading-relaxed text-neutral-300">
            <span className="font-semibold text-indigo-400">
              The knowledge base is the differentiator.
            </span>{' '}
            Past mistakes become future prevention rules. Every agent re-reads accumulated lessons
            before executing, so the same error never appears twice.
          </p>
        </div>
      </div>
    </section>
  );
}
