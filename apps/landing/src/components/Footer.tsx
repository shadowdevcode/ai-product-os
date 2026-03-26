import { GitHubIcon } from './icons';

export function Footer() {
  return (
    <footer className="border-t border-neutral-800 px-6 py-10">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className="font-semibold text-neutral-400">AI Product OS</span>
          <span className="text-neutral-700">|</span>
          <span>Built with Claude Code</span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://github.com/shadowdevcode/ai-product-os"
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 transition-colors hover:text-neutral-300"
          >
            <GitHubIcon className="h-5 w-5" />
          </a>
        </div>
      </div>
    </footer>
  );
}
