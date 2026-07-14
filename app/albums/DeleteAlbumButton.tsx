"use client";

import { useTransition } from "react";
import { deleteAlbum } from "@/app/actions";
import { useRouter } from "next/navigation";

export default function DeleteAlbumButton({ id, className }: { id: string, className?: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm("Bạn có chắc chắn muốn xóa album này? Mọi ảnh trong album (và album con) sẽ không thuộc album này nữa, nhưng sẽ không bị xóa khỏi hệ thống. Hành động này không thể hoàn tác.")) {
      startTransition(async () => {
        try {
          await deleteAlbum(id);
          router.refresh();
        } catch (error) {
          console.error("Failed to delete album:", error);
          alert("Có lỗi xảy ra khi xóa album.");
        }
      });
    }
  };

  return (
    <button 
      onClick={handleDelete} 
      disabled={isPending}
      className={className}
      style={{
        background: 'rgba(255, 0, 0, 0.7)',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isPending ? 'wait' : 'pointer',
        transition: 'all 0.2s',
        backdropFilter: 'blur(4px)',
      }}
      title="Xóa Album"
      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.9)'}
      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 0, 0, 0.7)'}
    >
      {isPending ? (
        <span style={{ fontSize: '0.7rem' }}>...</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      )}
    </button>
  );
}
