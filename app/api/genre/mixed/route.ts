import { NextResponse } from 'next/server';
import { fetchDiscoverMovies, fetchDiscoverTv } from '@/lib/tmdb';

function withMediaType(items: any[], mediaType: 'movie' | 'tv') {
  return items.map((item) => ({
    ...item,
    media_type: mediaType,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const genreId = Number(searchParams.get('genreId'));

  if (!genreId || Number.isNaN(genreId)) {
    return NextResponse.json({ results: [] }, { status: 400 });
  }

  const [movies, tv] = await Promise.all([
    fetchDiscoverMovies(genreId, 1).catch(() => ({ results: [] })),
    fetchDiscoverTv(genreId, 1).catch(() => ({ results: [] })),
  ]);

  const mixed = [
    ...withMediaType(movies.results ?? [], 'movie'),
    ...withMediaType(tv.results ?? [], 'tv'),
  ]
    .sort(() => Math.random() - 0.5)
    .slice(0, 10);

  return NextResponse.json({ results: mixed });
}