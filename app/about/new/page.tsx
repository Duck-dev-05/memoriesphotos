import { getPhotos } from "@/app/actions";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import NewStoryForm from "./NewStoryForm";

export const dynamic = "force-dynamic";

export default async function NewStoryPage() {
  const isAuth = await isAuthenticated();
  if (!isAuth) {
    redirect("/");
  }

  return (
    <main className="container" style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "2rem" }}>
        <a href="/about" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: "1.1rem" }}>&larr; Trở về Nhật Ký</a>
      </div>
      <h1 style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", fontSize: "2.5rem", marginBottom: "2rem", color: "var(--text-primary)" }}>
        Viết một câu chuyện mới
      </h1>
      
      <NewStoryForm />
    </main>
  );
}
