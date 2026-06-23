import { fetchMovieGenres, fetchTvGenres, fetchDiscoverMovies } from '@/lib/tmdb';
import { BrowseClient } from './browse-client';
import { Navbar } from '@/components/navbar';

async function getSessionUser() {
  return { displayName: 'Anmol', avatarUrl: null, createdAt: new Date().toISOString() };
}

const COUNTRY_MAP: Record<string, string> = {
  IN: 'India',
  US: 'the United States',
  KR: 'South Korea',
  JP: 'Japan',
  GB: 'the United Kingdom',
  FR: 'France',
  ES: 'Spain',
};

// Next.js 15 expects searchParams to be a Promise
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// 1. Add the searchParams prop to the component
export default async function BrowsePage({ searchParams }: { searchParams: SearchParams }) {
  const user = await getSessionUser();

  // 2. Await the parameters and extract the country
  const resolvedParams = await searchParams;
  const countryCode = typeof resolvedParams.country === 'string' ? resolvedParams.country : undefined;

  // 3. Pass the countryCode directly into your fetcher
  const [movieGenres, tvGenres, initial] = await Promise.all([
    fetchMovieGenres(),
    fetchTvGenres(),
    fetchDiscoverMovies(undefined, 1, countryCode), // Added countryCode here!
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
        
        // 🚨 CRUCIAL: Pass the countryCode down to your client!
        // activeCountry={countryCode} 
      />
    </main>
  );
}