import { NextRequest, NextResponse } from 'next/server';
import { searchMovies, searchTv } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const query = searchParams.get('q') ?? '';
  const type  = searchParams.get('type') ?? 'movie';
  const page  = Number(searchParams.get('page') ?? '1');

  if (!query.trim()) {
    return NextResponse.json({ results: [], total_pages: 0, total_results: 0, page: 1 });
  }

  try {
    const data = type === 'tv'
      ? await searchTv(query, page)
      : await searchMovies(query, page);
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}