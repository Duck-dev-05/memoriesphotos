import { getPhotosWithLocation } from "@/app/actions";
import { Suspense } from "react";
import MapWrapper from "./MapWrapper";

export const metadata = {
  title: "Bản Đồ Kỷ Niệm | Memories Photos",
  description: "Bản đồ tương tác hiển thị vị trí các bức ảnh của bạn.",
};

export default async function MapPage() {
  const photos = await getPhotosWithLocation();

  return (
    <main>
      <Suspense fallback={<div>Đang tải dữ liệu...</div>}>
        <MapWrapper photos={photos} />
      </Suspense>
    </main>
  );
}
