import { getPhoto, getPhotos, getPublicPhoto, getPublicAlbum } from "@/app/actions";
import { notFound } from "next/navigation";
import LightboxClient from "./LightboxClient";
import { isAuthenticated } from "@/lib/auth";

export default async function PhotoModal({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { id } = await params;
  const { shared: sharedToken } = await searchParams;
  
  let photo = null;
  let contextPhotos = [];
  
  const isAuth = await isAuthenticated();
  
  if (sharedToken && typeof sharedToken === 'string') {
    photo = await getPublicPhoto(id, sharedToken);
    if (photo && photo.albumId) {
       // Optional: try to get filmstrip for public users
       const pubAlbum = await getPublicAlbum(sharedToken);
       if (pubAlbum) contextPhotos = pubAlbum.photos;
    }
  } else {
    photo = await getPhoto(id);
    if (photo) {
      contextPhotos = await getPhotos(photo.albumId || undefined);
    }
  }

  if (!photo) {
    notFound();
  }

  return <LightboxClient photo={photo} contextPhotos={contextPhotos} isAuth={isAuth} />;
}
