"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { unlockAlbumAction } from "@/app/actions/album";
import styles from "./page.module.css";
import Image from "next/image";
import { getSafeUrl } from "@/lib/media";

export default function UnlockAlbumForm({ album }: { album: any }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await unlockAlbumAction(album.id, passcode);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || "Mật khẩu không chính xác");
      setLoading(false);
    }
  };

  return (
    <div className={styles.unlockContainer} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-glass)', padding: '3rem', borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--border-subtle)', textAlign: 'center', maxWidth: '400px', width: '100%', backdropFilter: 'blur(32px)' }}>
        <div style={{ width: '64px', height: '64px', background: 'var(--accent-subtle)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--accent-primary)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Album bị khóa</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '1rem' }}>
          Album <strong>{album.name}</strong> yêu cầu mật khẩu để xem.
        </p>

        <form onSubmit={handleUnlock} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input
            type="password"
            placeholder="Nhập mật khẩu..."
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            disabled={loading}
            autoFocus
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              border: '2px solid var(--border-medium)',
              background: 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '1.1rem',
              outline: 'none',
              textAlign: 'center'
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', margin: '0' }}>{error}</p>}
          <button
            type="submit"
            disabled={loading || !passcode}
            style={{
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--violet-gradient)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '1.1rem',
              cursor: loading || !passcode ? 'not-allowed' : 'pointer',
              opacity: loading || !passcode ? 0.7 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px var(--accent-glow)'
            }}
          >
            {loading ? "Đang mở..." : "Mở khóa"}
          </button>
        </form>
      </div>
    </div>
  );
}
