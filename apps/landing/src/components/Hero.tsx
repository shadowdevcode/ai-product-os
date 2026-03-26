import { GitHubIcon, TerminalIcon } from './icons';

const COMMANDS = [
  '/create-issue',
  '/explore',
  '/create-plan',
  '/execute-plan',
  '/deslop',
  '/review',
  '/peer-review',
  '/qa-test',
  '/metric-plan',
  '/deploy-check',
  '/postmortem',
  '/learning',
];

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pt-24 pb-16 sm:pt-32 sm:pb-24">
      {/* Background gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--color-primary)_0%,_transparent_50%)] opacity-[0.08]" />

      <div className="relative mx-auto max-w-5xl text-center">
        <div className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-4 py-1.5 text-sm text-neutral-400">
          <TerminalIcon className="h-4 w-4" />
          <span>Command-Driven Development Framework</span>
        </div>

        <h1 className="animate-fade-in-up text-5xl font-bold tracking-tight sm:text-7xl [animation-delay:100ms]">
          <span className="bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">
            AI Product OS
          </span>
        </h1>

        <p className="animate-fade-in-up mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-neutral-400 sm:text-xl [animation-delay:200ms]">
          Ship products faster with specialized AI agents that simulate a full product team. A
          12-step pipeline with quality gates takes you from raw idea to deployed, instrumented
          product.
        </p>

        <div className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row [animation-delay:300ms]">
          <a
            href="https://github.com/shadowdevcode/ai-product-os"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-dim animate-pulse-glow"
          >
            <GitHubIcon className="h-5 w-5" />
            View on GitHub
          </a>
          <a
            href="#pipeline"
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 px-6 py-3 text-sm font-semibold text-neutral-300 transition-colors hover:border-neutral-500 hover:text-white"
          >
            See the Pipeline
          </a>
        </div>

        {/* Terminal preview */}
        <div className="animate-fade-in-up mx-auto mt-16 max-w-2xl [animation-delay:400ms]">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/80">
            <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
              <div className="h-3 w-3 rounded-full bg-red-500/60" />
              <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
              <div className="h-3 w-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs text-neutral-500">ai-product-os</span>
            </div>
            <div className="p-5 font-mono text-sm">
              <div className="flex flex-wrap gap-x-3 gap-y-2">
                {COMMANDS.map((cmd, i) => (
                  <span key={cmd} className="flex items-center gap-1">
                    <span className="text-indigo-400">{cmd}</span>
                    {i < COMMANDS.length - 1 && <span className="text-neutral-600">{'>'}</span>}
                  </span>
                ))}
                <span className="animate-blink text-indigo-400">_</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
