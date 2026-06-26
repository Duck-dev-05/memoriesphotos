import { getStoryById } from "@/app/actions/story";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getOptimizedMediaUrl } from "@/lib/media";
import styles from "../../albums/page.module.css";
import StoryContentEditor from "./StoryContentEditor";
import StoryPhotoPicker from "./StoryPhotoPicker";
import StoryShareButton from "./StoryShareButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StoryDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const story = await getStoryById(id);
  
  if (!story) {
    notFound();
  }

  const session = await getSession();
  const allPhotos = session ? await prisma.photo.findMany({
    where: { userId: session.userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: { id: true, url: true, altText: true }
  }) : [];

  const currentPhotoIds = story.photos.map(p => p.id);

  return (
    <main>
      <section className={styles.hero} style={{ minHeight: '40vh', position: 'relative' }}>
        {story.coverImage && (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, opacity: 0.3 }}>
            {story.coverImage.match(/\.(mp4|webm|ogg|mov)$/i) ? (
              <video src={getOptimizedMediaUrl(story.coverImage)} style={{ objectFit: 'cover', width: '100%', height: '100%' }} autoPlay muted loop playsInline />
            ) : (
              <Image src={story.coverImage} alt={story.title} fill style={{ objectFit: 'cover' }} />
            )}
          </div>
        )}
        <div className={styles.heroContent} style={{ position: 'relative', zIndex: 1 }}>
          <div className={styles.heroEyebrow}>
            <Link href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>&larr; Quay lại Nhật Ký</Link>
          </div>
          <h1 className={styles.heroTitle}>{story.title}</h1>
          <p className={styles.heroSubtitle}>
            {new Date(story.createdAt).toLocaleDateString("vi-VN", { dateStyle: "long" })}
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
            <StoryShareButton 
              storyId={story.id} 
              existingToken={story.shareToken} 
              isCollaborative={story.isCollaborative} 
            />
          </div>
        </div>
      </section>

      <div className={styles.container}>
        <StoryContentEditor storyId={story.id} initialContent={story.content || ""} />
        <StoryPhotoPicker storyId={story.id} allPhotos={allPhotos as any} currentPhotoIds={currentPhotoIds} />

        <div className={styles.grid}>
          {story.photos.map(photo => (
             <div key={photo.id} style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '12px' }}>
                <Link href={`/photo/${photo.id}`}>
                    {photo.url?.match(/\.(mp4|webm|ogg|mov)$/i) ? (
                      <video src={getOptimizedMediaUrl(photo.url)} style={{ objectFit: 'cover', width: '100%', height: '100%' }} muted />
                    ) : (
                      <Image src={photo.url || ''} alt={photo.altText || ''} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 50vw, 33vw" />
                    )}
                </Link>
             </div>
          ))}
        </div>
      </div>
    </main>
  );
}
