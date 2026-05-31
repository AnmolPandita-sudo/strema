'use client';

import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const AVATAR_BUCKET = 'avatars';
const MAX_FILE_SIZE_MB = 5;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getStoragePathFromPublicUrl(publicUrl: string, bucket: string) {
  try {
    const url = new URL(publicUrl);
    const marker = `/storage/v1/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
}: {
  userId: string;
  currentAvatarUrl?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setMessage('');

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setMessage('Please upload a JPG, PNG, WEBP, or GIF image.');
      e.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setMessage(`Image must be smaller than ${MAX_FILE_SIZE_MB}MB.`);
      e.target.value = '';
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    setUploading(true);

    try {
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        setMessage(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      const avatarUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (updateError) {
        setMessage(updateError.message);
        return;
      }

      setMessage('Avatar updated successfully.');

      if (inputRef.current) {
        inputRef.current.value = '';
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to upload avatar.');
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAvatar() {
    if (!currentAvatarUrl) return;

    setMessage('');
    setDeleting(true);

    try {
      const storagePath = getStoragePathFromPublicUrl(currentAvatarUrl, AVATAR_BUCKET);

      if (storagePath) {
        const { error: removeError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .remove([storagePath]);

        if (removeError) {
          setMessage(removeError.message);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', userId);

      if (updateError) {
        setMessage(updateError.message);
        return;
      }

      setMessage('Profile photo deleted successfully.');
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to delete avatar.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {currentAvatarUrl ? (
            <Image
              src={currentAvatarUrl}
              alt="Current profile photo"
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
              No photo
            </div>
          )}
        </div>

        <div className="space-y-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleUpload}
            disabled={uploading || deleting}
            className="block w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white file:mr-4 file:rounded-xl file:border-0 file:bg-red-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-red-400"
          />

          <div className="flex flex-wrap gap-3">
            {currentAvatarUrl ? (
              <button
                type="button"
                onClick={handleDeleteAvatar}
                disabled={uploading || deleting}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? 'Deleting...' : 'Delete profile photo'}
              </button>
            ) : null}
          </div>

          {uploading ? (
            <p className="text-sm text-gray-300">Uploading avatar...</p>
          ) : null}

          {message ? <p className="text-sm text-gray-300">{message}</p> : null}
        </div>
      </div>
    </div>
  );
}

export function ChangePassword() {
  const supabase = useMemo(() => createClient(), []);
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage('');

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Password updated successfully.');
        setPassword('');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="profile-action-card" onSubmit={handleSubmit}>
      <h3>Change password</h3>

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password"
        required
        minLength={6}
        disabled={saving}
      />

      <button type="submit" disabled={saving}>
        {saving ? 'Saving...' : 'Save password'}
      </button>

      {message ? <p>{message}</p> : null}
    </form>
  );
}

export function DeleteAccount() {
  const router = useRouter();
  const [confirmText, setConfirmText] = useState('');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setMessage('');

    if (confirmText !== 'DELETE') {
      setMessage('Type DELETE to confirm account removal.');
      return;
    }

    setDeleting(true);

    try {
      const response = await fetch('/api/account/delete', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || 'Failed to delete account.');
        return;
      }

      router.push('/auth/sign-in');
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Failed to delete account.'
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-bold text-white">Delete Account</h3>
        <p className="mt-1 text-sm text-gray-400">
          This will permanently remove your account, profile, watch history, watchlist,
          and stored avatar files. This action cannot be undone.
        </p>
      </div>

      <div className="space-y-3">
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="Type DELETE to confirm"
          disabled={deleting}
          className="w-full rounded-2xl border border-red-500/30 bg-black/40 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-500 focus:border-red-500/60"
        />

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-red-600/60 px-3 py-1.5 text-xs font-medium text-white shadow-lg shadow-black/40 backdrop-blur-xl transition  hover:border-red-500 hover:bg-white/10 hover:text-white hover:shadow-red-500/30 cursor-pointer"
        >
          {deleting ? 'Deleting account...' : 'DELETE MY ACCOUNT PERMANENTLY'}
        </button>

        {message ? <p className="text-sm text-red-300">{message}</p> : null}
      </div>
    </div>
  );
}