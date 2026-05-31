import { Navbar } from '@/components/navbar';
import { SearchClient } from './search-client';

async function getSessionUser() {
  return {
    displayName: 'Anmol',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  };
}

export default async function SearchPage() {
  const user = await getSessionUser();

  return (
    <main className="page-shell">
      <Navbar
        displayName={user.displayName}
        avatarUrl={user.avatarUrl}
        createdAt={user.createdAt}
      />
      <SearchClient />
    </main>
  );
}