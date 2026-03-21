"use client";

interface ErrorBannerProps {
  message: string;
}

export default function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-800 bg-red-950/40 p-4">
      <svg
        className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400"
        viewBox="0 0 20 20"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 7.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
          clipRule="evenodd"
        />
      </svg>
      <p className="text-sm text-red-300">
        {message} — please try again.
      </p>
    </div>
  );
}
