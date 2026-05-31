import { fetchMovieGenres, fetchTvGenres, fetchDiscoverMovies } from '@/lib/tmdb';
import { BrowseClient } from './browse-client';
import { Navbar } from '@/components/navbar';

async function getSessionUser() {
  return { displayName: 'Anmol', avatarUrl: null, createdAt: new Date().toISOString() };
}

export default async function BrowsePage() {
  const user = await getSessionUser();

  const [movieGenres, tvGenres, initial] = await Promise.all([
    fetchMovieGenres(),
    fetchTvGenres(),
    fetchDiscoverMovies(undefined, 1),
  ]);

  return (
    <main className="page-shell">
      <Navbar
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        createdAt={user.createdAt}
      />
      <BrowseClient
        movieGenres={movieGenres}
        tvGenres={tvGenres}
        initialItems={initial.results ?? []}
        initialTotalPages={initial.total_pages}
      />
    </main>
  );
}