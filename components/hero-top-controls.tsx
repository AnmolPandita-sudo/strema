'use client';

import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeroTopControls({
  muted,
  onToggleMute,
}: {
  muted: boolean;
  onToggleMute: () => void;
}) {
  const router = useRouter();

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-6 md:p-8">
      <button
        type="button"
        onClick={handleBack}
        className="pointer-events-auto cursor-pointer inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-black/45 active:scale-95 bg-white/10 backdrop-blur-md border border-white/15"
        aria-label="Go home"
      >
        <Home size={22} />
      </button>

      {/* <button
        type="button"
        onClick={onToggleMute}
        className="pointer-events-auto cursor-pointer inline-flex h-12 w-12 items-center justify-center rounded-full text-white transition hover:bg-black/45 active:scale-95 bg-white/10 backdrop-blur-md border border-white/15"
        aria-label={muted ? 'Unmute background' : 'Mute background'}
      >
        {muted ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M11 5L6 9H3V15H6L11 19V5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M19 9L15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M15 9L19 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M11 5L6 9H3V15H6L11 19V5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M15 9C16.333 10 17 11 17 12C17 13 16.333 14 15 15"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M17.5 6.5C19.5 8 21 9.8 21 12C21 14.2 19.5 16 17.5 17.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button> */}
    </div>
  );
}