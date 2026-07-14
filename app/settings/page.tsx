import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { updateProfile, changePassword, getStorageUsage } from "@/app/actions";
import Image from "next/image";

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      _count: { select: { photos: true, albums: true } }
    }
  });

  if (!user) redirect("/login");

  const storageUsed = await getStorageUsage();

  return (
    <main className="container" style={{ padding: '2rem', minHeight: '100vh', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '2.5rem', margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
          Cài đặt
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Quản lý tài khoản và tùy chọn cá nhân.
        </p>
      </header>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem' }}>Hồ sơ cá nhân</h2>
        <form action={updateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: '#eee', position: 'relative' }}>
              {user.image ? (
                <Image src={user.image} alt={user.name} fill style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '2rem', color: '#aaa' }}>{user.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Ảnh đại diện</label>
              <input type="file" name="avatar" accept="image/*,.heic,.heif" />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Email</label>
            <input type="email" value={user.email} disabled className="form-input" style={{ width: '100%', background: '#f5f5f5', color: '#888' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Tên hiển thị</label>
            <input type="text" name="name" defaultValue={user.name} className="form-input custom-input" style={{ width: '100%' }} />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Lưu hồ sơ</button>
        </form>
      </section>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem' }}>Đổi mật khẩu</h2>
        <form action={changePassword as any} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Mật khẩu hiện tại</label>
            <input type="password" name="currentPassword" required className="form-input custom-input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Mật khẩu mới</label>
            <input type="password" name="newPassword" required minLength={6} className="form-input custom-input" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Xác nhận mật khẩu mới</label>
            <input type="password" name="confirmNewPassword" required minLength={6} className="form-input custom-input" style={{ width: '100%' }} />
          </div>
          <button type="submit" className="btn" style={{ alignSelf: 'flex-start', background: 'black', color: 'white' }}>Cập nhật mật khẩu</button>
        </form>
      </section>

      <section style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', borderBottom: '1px solid #eaeaea', paddingBottom: '0.5rem' }}>Lưu trữ</h2>
        <div style={{ display: 'flex', gap: '2rem' }}>
          <div style={{ flex: 1, padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-1)' }}>{formatBytes(storageUsed)}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Dung lượng đã dùng</div>
          </div>
          <div style={{ flex: 1, padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', fontFamily: 'var(--font-heading)', color: 'var(--accent-1)' }}>{user._count.albums}</div>
            <div style={{ color: 'var(--text-secondary)' }}>Album đã tạo</div>
          </div>
        </div>
      </section>
    </main>
  );
}
