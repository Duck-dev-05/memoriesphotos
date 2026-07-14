import { getFavorites } from "@/app/actions";
import SmartFilterGrid from "@/app/albums/[id]/SmartFilterGrid";
import { isAuthenticated } from "@/lib/auth";

export default async function FavoritesPage() {
  const photos = await getFavorites();
  const isAuth = await isAuthenticated();

  return (
    <main className="container" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <section className="hero" style={{ padding: "6rem 1rem 3rem", textAlign: "center" }}>
        <h1 className="hero-title" style={{ fontFamily: "var(--font-heading)", fontSize: "3rem", fontStyle: "italic", marginBottom: "1rem" }}>Yêu thích</h1>
        <p className="hero-subtitle" style={{ color: "var(--text-secondary)", fontSize: "1.1rem" }}>Những khoảnh khắc trân quý nhất của bạn.</p>
      </section>

      <section className="container" style={{ padding: "0 2rem 4rem", flex: 1 }}>
        <SmartFilterGrid photos={photos} isAuth={isAuth} />
      </section>
    </main>
  );
}
