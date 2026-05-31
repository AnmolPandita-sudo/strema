import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

type ProgressPayload = {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title?: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  providerKey?: string | null;
  serverKey?: string | null;
  progressSeconds?: number;
  durationSeconds?: number;
  progressPercent?: number;
  status?: 'playing' | 'paused' | 'completed';
};

async function getSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ProgressPayload;

    const tmdbId = Number(body.tmdbId);
    const mediaType = body.mediaType;
    const title = (body.title ?? 'Untitled').trim() || 'Untitled';
    const posterPath = body.posterPath ?? null;
    const backdropPath = body.backdropPath ?? null;
    const seasonNumber =
      mediaType === 'tv' ? Math.max(1, Number(body.seasonNumber ?? 1)) : 0;
    const episodeNumber =
      mediaType === 'tv' ? Math.max(1, Number(body.episodeNumber ?? 1)) : 0;
    const providerKey = body.providerKey ?? null;
    const serverKey = body.serverKey ?? null;
    const progressSeconds = Math.max(0, Math.floor(Number(body.progressSeconds ?? 0)));
    const durationSeconds = Math.max(0, Math.floor(Number(body.durationSeconds ?? 0)));
    // const fallbackProgressPercent = clampNumber(
    //   Number(body.progressPercent ?? 0),
    //   0,
    //   100
    // );
    // const progressPercent =
    //   durationSeconds > 0
    //     ? clampNumber((progressSeconds / durationSeconds) * 100, 0, 100)
    //     : fallbackProgressPercent;

    const fallbackProgressPercent = clampNumber(
      Number(body.progressPercent ?? 0),
      0,
      100
    );

    let progressPercent: number;

    if (durationSeconds > 0) {
      // Normal case: compute from seconds
      progressPercent = clampNumber(
        (progressSeconds / durationSeconds) * 100,
        0,
        100
      );
    } else if (fallbackProgressPercent > 0) {
      // Trust a non-zero client percent when duration is unknown
      progressPercent = fallbackProgressPercent;
    } else {
      // Last resort: treat "some progress" as a small non-zero percent
      progressPercent = progressSeconds > 0 ? 5 : 0;
    }

    progressPercent = Number(progressPercent.toFixed(2));

    const rawStatus = body.status ?? 'playing';

    if (!tmdbId || !['movie', 'tv'].includes(mediaType)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const status =
      rawStatus === 'completed' || progressPercent >= 95
        ? 'completed'
        : rawStatus === 'paused'
        ? 'paused'
        : 'playing';

    const now = new Date().toISOString();

    const baseRecord = {
      user_id: user.id,
      tmdb_id: tmdbId,
      media_type: mediaType,
      title,
      poster_path: posterPath,
      backdrop_path: backdropPath,
      season_number: seasonNumber,
      episode_number: episodeNumber,
      provider_key: providerKey,
      server_key: serverKey,
      progress_seconds: progressSeconds,
      duration_seconds: durationSeconds,
      // progress_percent: Number(progressPercent.toFixed(2)),
      progress_percent: progressPercent,
      status,
      last_watched_at: now,
      updated_at: now,
    };

    const { error: historyError } = await supabase
      .from('watch_history')
      .upsert(baseRecord, {
        onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number',
      });

    if (historyError) {
      return NextResponse.json(
        { error: historyError.message || 'Failed to save watch history' },
        { status: 500 }
      );
    }

    if (status === 'completed' || progressPercent >= 95) {
      const { error: continueDeleteError } = await supabase
        .from('continue_watching')
        .delete()
        .eq('user_id', user.id)
        .eq('tmdb_id', tmdbId)
        .eq('media_type', mediaType)
        .eq('season_number', seasonNumber)
        .eq('episode_number', episodeNumber);

      if (continueDeleteError) {
        return NextResponse.json(
          { error: continueDeleteError.message || 'Failed to clear continue watching' },
          { status: 500 }
        );
      }
    } else {
      const continueRecord = {
        user_id: user.id,
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        backdrop_path: backdropPath,
        season_number: seasonNumber,
        episode_number: episodeNumber,
        provider_key: providerKey,
        server_key: serverKey,
        progress_seconds: progressSeconds,
        duration_seconds: durationSeconds,
        progress_percent: Number(progressPercent.toFixed(2)),
        last_position_at: now,
        updated_at: now,
      };

      const { error: continueError } = await supabase
        .from('continue_watching')
        .upsert(continueRecord, {
          onConflict: 'user_id,tmdb_id,media_type,season_number,episode_number',
        });

      if (continueError) {
        return NextResponse.json(
          { error: continueError.message || 'Failed to save continue watching' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      progressPercent: Number(progressPercent.toFixed(2)),
      status,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected server error' },
      { status: 500 }
    );
  }
}