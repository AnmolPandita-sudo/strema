// components/subtitle-converter-panel.tsx
'use client';

import { useCallback, useState } from 'react';

type Props = {
  title: string;
};

function srtToVtt(srt: string): string {
  const normalized = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const converted = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    '$1.$2'
  );

  if (converted.startsWith('WEBVTT')) {
    return converted;
  }

  return `WEBVTT\n\n${converted}`;
}

export function SubtitleConverterPanel({ title }: Props) {
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [vttText, setVttText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('subtitles.vtt');
  const [isConverting, setIsConverting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    setError('');
    setStatus('');
    setVttText('');
    setIsConverting(true);

    try {
      if (!file.name.toLowerCase().endsWith('.srt')) {
        setError('Please select a .srt subtitle file.');
        setIsConverting(false);
        return;
      }

      const text = await file.text();
      const vtt = srtToVtt(text);

      setVttText(vtt);

      const baseName = file.name.replace(/\.[^.]+$/, '');
      setFileName(`${baseName || 'subtitles'}.vtt`);
      setStatus('Converted successfully. You can now download and upload it to the player.');
    } catch (e) {
      console.error(e);
      setError('Failed to convert subtitle file.');
    } finally {
      setIsConverting(false);
    }
  }, []);

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDownload = useCallback(() => {
    if (!vttText) return;

    const blob = new Blob([vttText], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [vttText, fileName]);

  return (
    <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-gray-200 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Subtitle helper</h2>
          <p className="mt-1 text-xs text-gray-400">
            Drop an SRT file here and get a VTT file ready to upload into the player’s subtitle panel.
          </p>
        </div>
        <span className="rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">
          {title ? `For: ${title}` : 'SRT → VTT'}
        </span>
      </div>

      <div
        className="mt-4 flex flex-col gap-4 rounded-2xl border border-dashed border-white/15 bg-black/30 p-4 text-xs text-gray-300 transition hover:border-red-400/60 hover:bg-black/40"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <label className="flex flex-col items-center justify-center gap-2 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Upload SRT
          </span>
          <p className="max-w-sm text-[11px] text-gray-400">
            Click to choose a <span className="font-semibold text-gray-100">.srt</span> file
            or drop it here. The converted <span className="font-semibold text-gray-100">.vtt</span>{' '}
            will work with Vidking’s “Upload Custom Subtitle (.vtt)” option.
          </p>
          <input
            type="file"
            accept=".srt,text/plain"
            className="mt-2 hidden"
            onChange={handleInputChange}
          />
          <span className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-full bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-500/40 hover:bg-red-600">
            Browse .srt file
          </span>
        </label>

        {isConverting && (
          <p className="text-[11px] text-gray-400">
            Converting subtitles…
          </p>
        )}

        {status && (
          <p className="text-[11px] text-emerald-300">
            {status}
          </p>
        )}

        {error && (
          <p className="text-[11px] text-red-300">
            {error}
          </p>
        )}

        {vttText && (
          <div className="mt-2 space-y-3">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold text-white transition hover:bg-white/20"
            >
              Download {fileName}
            </button>

            <details className="group rounded-xl bg-black/40 p-3">
              <summary className="cursor-pointer text-[11px] text-gray-400 group-open:text-gray-200">
                Preview converted VTT
              </summary>
              <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-black/80 p-3 text-[10px] leading-relaxed text-gray-200">
                {vttText}
              </pre>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}