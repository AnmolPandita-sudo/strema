import { redirect } from 'next/navigation';
import Link from 'next/link';

import { createClient } from '@/lib/supabase/server';
import {
  AvatarUpload,
  ChangePassword,
  DeleteAccount,
} from '@/components/profile-actions';

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/sign-in');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('created_at, display_name, avatar_url')
    .eq('id', user.id)
    .single();

  const joinedDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—';

  return (
    <main className="min-h-screen overflow-hidden bg-[#0A0B0E] text-white">
      {/* Background Glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -right-32 top-[-180px] h-[420px] w-[420px] rounded-full bg-red-500/10 blur-3xl" />
        <div className="absolute bottom-[-180px] left-[-120px] h-[320px] w-[320px] rounded-full bg-white/[0.03] blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 pt-10 md:px-8">
        {/* Top Nav */}
          <header className="mb-6 flex items-center justify-between gap-3">
            <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg shadow-black/40 backdrop-blur-xl transition hover:border-red-400/60 hover:bg-white/10 hover:text-white hover:shadow-red-500/30"
            >
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />
                Back to Home
            </Link>
          </header>

        {/* Main Container */}
        <div
          className="
            relative flex-1 overflow-hidden rounded-[34px]
            border border-white/10 bg-white/[0.045]
            shadow-[0_25px_80px_rgba(0,0,0,0.55)]
            backdrop-blur-2xl
          "
        >
          {/* Header */}
          <div
            className="
              relative flex flex-col justify-between gap-6
              border-b border-white/10 px-6 py-6
              md:flex-row md:items-center md:px-8
            "
          >
            <div>
              <div className="flex items-center gap-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(239,68,68,0.9)]" />
                <span className="text-[11px] font-bold uppercase tracking-[0.32em] text-red-400">
                  Strema Profile
                </span>
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight text-white md:text-5xl">
                Your Account
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-400">
                Manage your profile, avatar, and security settings.
              </p>
            </div>

            <div
              className="
                rounded-3xl border border-white/10
                bg-black/25 px-6 py-5 backdrop-blur-xl
              "
            >
              <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">
                Joined
              </p>
              <p className="mt-2 text-lg font-bold text-white">{joinedDate}</p>
            </div>
          </div>

          {/* Main Grid */}
          <div className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            {/* Left Section */}
            <section
              className="
                rounded-[28px] border border-white/10
                bg-black/20 p-6 backdrop-blur-xl
              "
            >
              <div className="flex items-center gap-3">
                <div
                  className="
                    flex h-12 w-12 items-center justify-center
                    rounded-2xl bg-red-500/15 text-red-400
                  "
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.866 0-7 3.134-7 7h14c0-3.866-3.134-7-7-7z" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-white">
                    Profile Details
                  </h2>
                  <p className="mt-1 text-sm text-gray-400">
                    Personal information and avatar settings.
                  </p>
                </div>
              </div>

              {/* Info Cards */}
              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div
                  className="
                    rounded-2xl border border-white/10
                    bg-white/[0.035] p-5
                  "
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Email Address
                  </p>
                  <p className="mt-3 break-all text-sm font-semibold text-white md:text-base">
                    {user.email}
                  </p>
                </div>
                <div
                  className="
                    rounded-2xl border border-white/10
                    bg-white/[0.035] p-5
                  "
                >
                  <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                    Name
                  </p>
                  <p className="mt-3 break-all text-sm font-semibold text-white md:text-base">
                    {user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'User'}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
                <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                  User ID
                </p>
                <p className="mt-3 truncate text-sm font-semibold text-white md:text-base">
                  {user.id}
                </p>
              </div>

              {/* Avatar */}
              <div
                className="
                  mt-6 rounded-[26px] border border-white/10
                  bg-white/[0.035] p-6
                "
              >
                <div className="mb-5">
                  <h3 className="text-xl font-bold text-white">
                    Profile Photo
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Upload and manage your avatar.
                  </p>
                </div>

                <AvatarUpload
                  userId={user.id}
                  currentAvatarUrl={profile?.avatar_url ?? null}
                />
              </div>
            </section>

            {/* Right Section */}
            <aside className="space-y-6">
              {/* Security */}
              <section
                className="
                  rounded-[28px] border border-white/10
                  bg-black/20 p-6 backdrop-blur-xl h-full"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="
                      flex h-12 w-12 items-center justify-center
                      rounded-2xl bg-white/10 text-white
                    "
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17 8h-1V6a4 4 0 10-8 0v2H7a2 2 0 00-2 2v9a2 2 0 002 2h10a2 2 0 002-2v-9a2 2 0 00-2-2zm-6 8.73V18a1 1 0 002 0v-1.27a2 2 0 10-2 0zM10 8V6a2 2 0 114 0v2h-4z" />
                    </svg>
                  </div>

                  <div>
                    <h2 className="text-2xl font-black text-white">
                      Security
                    </h2>
                    <p className="mt-1 text-sm text-gray-400">
                      Keep your account protected.
                    </p>
                  </div>
                </div>

                <div
                  className="
                    mt-7 rounded-[26px] border border-white/10
                    bg-white/[0.035] p-6
                  "
                >
                  <div className="mb-5">
                    <h3 className="text-lg font-bold text-white">
                      Change Password
                    </h3>
                    <p className="mt-1 text-sm text-gray-400">
                      Use a strong password for better protection.
                    </p>
                  </div>

                  <ChangePassword />
                </div>
              </section>           
            </aside>
          </div>
            {/* Status Card */}
          <div className="p-5">
            <section className="rounded-[28px] border border-white/10 bg-gradient-to-br from-green-500/10 to-white/[0.03] p-6 flex justify-center items-center flex-col backdrop-blur-xl">
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-400">
                Account Status
              </p>
              <div className="mt-4 flex items-center justify-between text-center">
                <div>
                  <h3 className="text-2xl font-black text-green-400">
                    ACTIVE
                  </h3>
                  <p className="mt-1 text-sm text-gray-400">
                    Your account is secured and operational.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
        <div
          className="
            relative flex-1 overflow-hidden rounded-[34px] border border-white/10 bg-red-500/10 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl mt-5 flex items-center justify-center text-center">
          <div className='p-5 flex items-center justify-center text-center'>
            {/* Danger Zone */}
            <section className="rounded-[28px] border border-red-500/40 bg-red-500/10 p-6 backdrop-blur-xl ">
              <p className="text-[11px] uppercase tracking-[0.2em] text-red-300">
                Danger Zone
              </p>
              <div className="mt-4 mx-20">
                <DeleteAccount />
              </div>
            </section>
          </div>
        </div>      
      </div>
    </main>
  );
}