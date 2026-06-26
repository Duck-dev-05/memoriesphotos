import { getPhoto } from "@/app/actions";
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import EditPhotoClient from "./EditPhotoClient";

export default async function EditPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isAuth = await isAuthenticated();
  
  if (!isAuth) {
    redirect("/login");
  }

  const photo = await getPhoto(id);
  
  if (!photo) {
    notFound();
  }

  // Pass down the necessary data
  return <EditPhotoClient photo={photo} />;
}
