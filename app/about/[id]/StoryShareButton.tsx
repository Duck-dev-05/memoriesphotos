"use client";
import React, { useState, useRef } from "react";
import styles from "../../albums/[id]/page.module.css";
import { generateStoryShareLink, removeStoryShareLink, toggleStoryCollaborative } from "@/app/actions/story";

export default function StoryShareButton({ storyId, existingToken, isCollaborative = false }: { storyId: string, existingToken?: string | null, isCollaborative?: boolean }) {
  const [token, setToken] = useState(existingToken);
  const [collaborative, setCollaborative] = useState(isCollaborative);
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenModal = () => {
    setIsOpen(true);
  };

  const handleGenerateLink = async () => {
    try {
      if (!token) {
        const newToken = await generateStoryShareLink(storyId);
        setToken(newToken);
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tạo link chia sẻ.");
    }
  };

  const handleToggleCollaborativeDirect = async (newVal: boolean) => {
    try {
      await toggleStoryCollaborative(storyId, newVal);
      setCollaborative(newVal);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi cập nhật cài đặt chia sẻ.");
    }
  };

  const handleUnshare = async () => {
    try {
      await removeStoryShareLink(storyId);
      setToken(null);
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      alert("Lỗi khi tắt chia sẻ.");
    }
  };

  const getUrl = () => {
    if (typeof window !== "undefined") {
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, "");
      return `${baseUrl}/shared-story/${token}`;
    }
    return "";
  };

  const url = getUrl();

  const handleCopy = () => {
    if (!url) return;
    
    let success = false;
    
    if (inputRef.current) {
      inputRef.current.select();
      inputRef.current.setSelectionRange(0, 99999);
      try {
        success = document.execCommand('copy');
      } catch (err) {
        success = false;
      }
    }

    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        })
        .catch(() => {
          alert("Trình duyệt chặn copy tự động. Vui lòng copy thủ công!");
        });
    } else {
      alert("Trình duyệt chặn copy tự động. Vui lòng copy thủ công!");
    }
  };

  return (
    <>
      <button 
        className={`${styles.fabBtn} ${styles.fabShare}`}
        onClick={handleOpenModal}
        aria-label="Chia sẻ nhật ký"
        style={{ marginLeft: '1rem' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
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
          <div className={styles.shareModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.shareModalHeader}>
              <h3 className={styles.shareModalTitle}>Chia sẻ Nhật Ký</h3>
              <button 
                className={styles.shareModalClose}
                onClick={() => setIsOpen(false)}
              >
                ✕
              </button>
            </div>
            
            {!token ? (
              <div style={{ textAlign: "center", padding: "2rem 0" }}>
                <p style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>Nhật ký này hiện đang ở chế độ riêng tư. Bật chia sẻ để lấy link gửi cho bạn bè.</p>
                <button
                  type="button"
                  onClick={handleGenerateLink}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.8rem", fontWeight: "bold" }}
                >
                  Bật chia sẻ Nhật Ký
                </button>
              </div>
            ) : (
              <>
                <div className={styles.shareOptionsRow}>
                  <button 
                    type="button"
                    className={styles.shareOptionBtn}
                    onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')}
                  >
                    <div className={`${styles.shareOptionIcon} ${styles.shareIconFb}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"></path></svg>
                    </div>
                    <span>Facebook</span>
                  </button>
                  
                  <button 
                    type="button"
                    className={styles.shareOptionBtn}
                    onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=Đọc%20nhật%20ký%20này%20nhé!`, '_blank')}
                  >
                    <div className={`${styles.shareOptionIcon} ${styles.shareIconX}`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.004 3.985H5.078z"></path></svg>
                    </div>
                    <span>X (Twitter)</span>
                  </button>
                  
                  <button 
                    type="button"
                    className={styles.shareOptionBtn}
                    onClick={() => window.open(`https://api.whatsapp.com/send?text=Đọc%20nhật%20ký%20này%20nhé!%20${encodeURIComponent(url)}`, '_blank')}
                  >
                    <div className={`${styles.shareOptionIcon} ${styles.shareIconWa}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                    </div>
                    <span>WhatsApp</span>
                  </button>
                  
                  <button 
                    type="button"
                    className={styles.shareOptionBtn}
                    onClick={() => window.open(`https://mail.google.com/mail/?view=cm&fs=1&tf=1&to=&su=${encodeURIComponent("Đọc nhật ký này nhé!")}&body=${encodeURIComponent(url)}`, '_blank')}
                  >
                    <div className={`${styles.shareOptionIcon} ${styles.shareIconGmail}`}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    </div>
                    <span>Gmail</span>
                  </button>
                </div>
                
                <div className={styles.shareLinkBox}>
                  <p className={styles.shareLinkLabel}>Link chia sẻ:</p>
                  <div className={styles.shareLinkInputGroup}>
                    <input 
                      ref={inputRef}
                      type="text" 
                      className={styles.shareLinkInput}
                      value={url} 
                      readOnly 
                      onClick={(e) => e.currentTarget.select()}
                    />
                    <button 
                      type="button"
                      className={`${styles.shareLinkCopyBtn} ${copied ? styles.copied : ""}`}
                      onClick={handleCopy} 
                    >
                      {copied ? "Đã copy" : "Copy"}
                    </button>
                  </div>
                </div>

                <div className={styles.shareAccessBox}>
                  <p className={styles.shareLinkLabel}>Quyền truy cập chung:</p>
                  <div className={styles.shareAccessRow}>
                    <div className={styles.shareAccessIcon}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    </div>
                    <div className={styles.shareAccessInfo}>
                      <h4>Bất kỳ ai có đường liên kết</h4>
                      <p>Bất kỳ ai trên internet có liên kết đều có thể {collaborative ? "xem và đóng góp" : "xem"}</p>
                    </div>
                    <div className={styles.shareAccessDropdown}>
                      <select 
                        value={collaborative ? "editor" : "viewer"} 
                        onChange={(e) => {
                          const isCollab = e.target.value === "editor";
                          if (isCollab !== collaborative) {
                            handleToggleCollaborativeDirect(isCollab);
                          }
                        }}
                      >
                        <option value="viewer">Người xem</option>
                        <option value="editor">Người đóng góp ảnh</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    onClick={handleUnshare}
                    className={styles.shareUnshareBtn}
                  >
                    Tắt chia sẻ Nhật Ký
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
