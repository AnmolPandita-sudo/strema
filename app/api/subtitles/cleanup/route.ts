// app/api/subtitles/cleanup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { SubtitleCacheRow } from '@/lib/subtitles';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('x-cleanup-secret');

  if (!authHeader || authHeader !== process.env.SUBTITLE_CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const bucket = process.env.SUBTITLE_BUCKET || 'subtitles';
  const nowIso = new Date().toISOString();

  const { data: expiredRows, error } = await admin
    .from('subtitle_cache')
    .select('*')
    .lte('expires_at', nowIso)
    .returns<SubtitleCacheRow[]>();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  if (!expiredRows?.length) {
    return NextResponse.json({
      deletedFiles: 0,
      deletedRows: 0,
      message: 'No expired subtitles found',
    });
  }

  const paths = expiredRows
    .map((row) => row.vtt_path)
    .filter(Boolean);

  if (paths.length > 0) {
    const removeResult = await admin.storage.from(bucket).remove(paths);

    if (removeResult.error) {
      return NextResponse.json(
        { error: removeResult.error.message },
        { status: 500 }
      );
    }
  }

  const ids = expiredRows.map((row) => row.id);

  const { error: deleteRowsError } = await admin
    .from('subtitle_cache')
    .delete()
    .in('id', ids);

  if (deleteRowsError) {
    return NextResponse.json(
      { error: deleteRowsError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deletedFiles: paths.length,
    deletedRows: ids.length,
  });
}