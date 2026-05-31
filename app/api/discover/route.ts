import { NextRequest, NextResponse } from 'next/server';
import { fetchDiscoverMovies, fetchDiscoverTv } from '@/lib/tmdb';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const type = searchParams.get('type') ?? 'movie';
  const genre = searchParams.get('genre');
  const page = Number(searchParams.get('page') ?? '1');

  const genreId = genre ? Number(genre) : undefined;

  try {
    const data =
      type === 'tv'
        ? await fetchDiscoverTv(genreId, page)
        : await fetchDiscoverMovies(genreId, page);

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}