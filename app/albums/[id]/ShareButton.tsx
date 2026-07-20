"use client";
import React, { useState, useRef, useEffect, useTransition } from "react";
import styles from "./page.module.css";
import { generateShareLink, removeShareLink, toggleCollaborative, inviteUserToAlbum, getAlbumShares, updateAlbumShareRole, removeAlbumShare } from "@/app/actions";
import { Trash2 } from "lucide-react";

export default function ShareButton({ albumId, existingToken, isCollaborative = false }: { albumId: string, existingToken?: string | null, isCollaborative?: boolean }) {
  const [token, setToken] = useState(existingToken);
  const [collaborative, setCollaborative] = useState(isCollaborative);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Email Invite State
  const [shares, setShares] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("VIEWER");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen) fetchShares();
  }, [isOpen]);

  const fetchShares = () => {
    startTransition(async () => {
      try {
        const data = await getAlbumShares(albumId);
        setShares(data);
      } catch (err) {
        console.error(err);
      }
    });
  };

  const handleOpenModal = () => setIsOpen(true);

  const handleGenerateLink = async () => {
    try {
      if (!token) {
        const newToken = await generateShareLink(albumId);
        setToken(newToken);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo link chia sẻ.");
    }
  };

  const handleToggleCollaborativeDirect = async (newVal: boolean) => {
    try {
      await toggleCollaborative(albumId, newVal);
      setCollaborative(newVal);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật cài đặt chia sẻ.");
    }
  };

  const handleUnshare = async () => {
    try {
      await removeShareLink(albumId);
      setToken(null);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tắt chia sẻ.");
    }
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    startTransition(async () => {
      try {
        await inviteUserToAlbum(albumId, inviteEmail, inviteRole);
        setInviteEmail("");
        fetchShares();
      } catch (err: any) {
        alert(err.message || "Lỗi khi mời người dùng");
      }
    });
  };

  const handleRemoveShare = (shareId: string) => {
    startTransition(async () => {
      try {
        await removeAlbumShare(shareId);
        fetchShares();
      } catch (err) {
        alert("Xóa quyền truy cập thất bại");
      }
    });
  };

  const getUrl = () => {
    if (typeof window !== "undefined") {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
      return `${baseUrl}/shared/${token}`;
    }
    return "";
  };

  const url = getUrl();

  const handleCopy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      });
  };

  return (
    <>
      <button 
        className={`${styles.fabBtn} ${styles.fabShare}`}
        onClick={handleOpenModal}
        aria-label="Chia sẻ album"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
        </svg>
        Chia sẻ
      </button>

      {isOpen && (
        <div className={styles.shareOverlay} onClick={() => setIsOpen(false)}>
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.shareModalHeader}>
              <h3 className={styles.shareModalTitle}>Chia sẻ Album</h3>
              <button className={styles.shareModalClose} onClick={() => setIsOpen(false)}>✕</button>
            </div>
            
            {/* Link Sharing Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Liên kết công khai</h4>
              {!token ? (
                <button onClick={handleGenerateLink} className="btn btn-primary" style={{ width: "100%", padding: "0.8rem", fontWeight: "bold" }}>
                  Bật chia sẻ bằng liên kết
                </button>
              ) : (
                <>
                  <div className={styles.shareLinkBox}>
                    <div className={styles.shareLinkInputGroup}>
                      <input ref={inputRef} type="text" className={styles.shareLinkInput} value={url} readOnly onClick={(e) => e.currentTarget.select()} />
                      <button type="button" className={`${styles.shareLinkCopyBtn} ${copied ? styles.copied : ""}`} onClick={handleCopy}>
                        {copied ? "Đã copy" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className={styles.shareAccessBox} style={{ marginTop: '1rem' }}>
                    <div className={styles.shareAccessRow}>
                      <div className={styles.shareAccessInfo}>
                        <p style={{ margin: 0, fontWeight: 500 }}>Bất kỳ ai có đường liên kết</p>
                      </div>
                      <div className={styles.shareAccessDropdown}>
                        <select value={collaborative ? "editor" : "viewer"} onChange={(e) => handleToggleCollaborativeDirect(e.target.value === "editor")}>
                          <option value="viewer">Người xem</option>
                          <option value="editor">Người đóng góp</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleUnshare} className={styles.shareUnshareBtn} style={{ marginTop: '1rem' }}>
                    Tắt liên kết công khai
                  </button>
                </>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-subtle)', margin: '1.5rem 0' }} />

            {/* Email Invitation Section */}
            <div>
              <h4 style={{ fontSize: '1rem', marginBottom: '0.75rem', fontWeight: 600 }}>Mời người dùng</h4>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  type="email" 
                  placeholder="Nhập email..." 
                  value={inviteEmail} 
                  onChange={e => setInviteEmail(e.target.value)}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }} 
                />
                <select 
                  value={inviteRole} 
                  onChange={e => setInviteRole(e.target.value)}
                  style={{ padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}
                >
                  <option value="VIEWER">Chỉ xem</option>
                  <option value="EDITOR">Đóng góp</option>
                </select>
                <button onClick={handleInvite} disabled={isPending || !inviteEmail} className="btn btn-primary" style={{ padding: '0 1rem' }}>
                  {isPending ? "..." : "Mời"}
                </button>
              </div>

              <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Người có quyền truy cập</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {shares.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Chưa có ai được mời.</p>
                ) : (
                  shares.map(share => (
                    <div key={share.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{share.user.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{share.user.email}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                          {share.role === 'EDITOR' ? 'Đóng góp' : 'Chỉ xem'}
                        </span>
                        <button onClick={() => handleRemoveShare(share.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
