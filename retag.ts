import { prisma } from "./lib/prisma";
import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;

const cocoToVi: Record<string, string> = {
  person: "Người", bicycle: "Xe đạp", car: "Ô tô", motorcycle: "Xe máy", airplane: "Máy bay",
  bus: "Xe buýt", train: "Tàu hỏa", truck: "Xe tải", boat: "Thuyền", "traffic light": "Đèn giao thông",
  "fire hydrant": "Trụ cứu hỏa", "stop sign": "Biển báo dừng", "parking meter": "Máy tính tiền đỗ xe", bench: "Ghế đá",
  bird: "Chim", cat: "Mèo", dog: "Chó", horse: "Ngựa", sheep: "Cừu", cow: "Bò", elephant: "Voi",
  bear: "Gấu", zebra: "Ngựa vằn", giraffe: "Hươu cao cổ", backpack: "Balo", umbrella: "Ô",
  handbag: "Túi xách", tie: "Cà vạt", suitcase: "Vali", frisbee: "Đĩa bay", skis: "Ván trượt",
  snowboard: "Ván trượt tuyết", "sports ball": "Bóng thể thao", kite: "Diều", "baseball bat": "Gậy bóng chày",
  "baseball glove": "Găng tay bóng chày", skateboard: "Ván trượt", surfboard: "Ván lướt sóng", "tennis racket": "Vợt tennis",
  bottle: "Chai", "wine glass": "Ly rượu", cup: "Cốc", fork: "Nĩa", knife: "Dao", spoon: "Thìa", bowl: "Bát",
  banana: "Chuối", apple: "Táo", sandwich: "Bánh mì kẹp", orange: "Cam", broccoli: "Súp lơ", carrot: "Cà rốt",
  "hot dog": "Xúc xích", pizza: "Pizza", donut: "Bánh donut", cake: "Bánh ngọt", chair: "Ghế", couch: "Ghế sofa",
  "potted plant": "Cây cảnh", bed: "Giường", "dining table": "Bàn ăn", toilet: "Nhà vệ sinh", tv: "Tivi",
  laptop: "Laptop", mouse: "Chuột máy tính", remote: "Điều khiển từ xa", keyboard: "Bàn phím", "cell phone": "Điện thoại",
  microwave: "Lò vi sóng", oven: "Lò nướng", toaster: "Máy nướng bánh mì", sink: "Bồn rửa", refrigerator: "Tủ lạnh",
  book: "Sách", clock: "Đồng hồ", vase: "Bình hoa", scissors: "Cái kéo", "teddy bear": "Gấu bông",
  "hair drier": "Máy sấy tóc", toothbrush: "Bàn chải đánh răng"
};

async function main() {
  console.log("Loading AI model...");
  const detector = await pipeline("object-detection", "Xenova/detr-resnet-50");
  
  const photos = await prisma.photo.findMany({ where: { deletedAt: null } });
  console.log(`Found ${photos.length} photos. Processing...`);

  for (const photo of photos) {
    if (!photo.url) continue;
    try {
      console.log(`Detecting tags for ${photo.id}...`);
      const output = await detector(photo.url);
      const labels = (output as any[])
        .filter((item: any) => item.score > 0.8)
        .map((item: any) => {
          const eng = item.label.toLowerCase();
          return cocoToVi[eng] || eng;
        });
      
      const aiTags = [...new Set(labels)] as string[];
      if (aiTags.length > 0) {
        const tagConnectOrCreate = aiTags.map((tag) => ({
          where: { name: tag },
          create: { name: tag },
        }));
        
        await prisma.photo.update({
          where: { id: photo.id },
          data: {
            tags: { connectOrCreate: tagConnectOrCreate }
          }
        });
        console.log(`Added tags: ${aiTags.join(", ")}`);
      }
    } catch (e) {
      console.error(`Failed to process ${photo.id}`, e);
    }
  }
  console.log("Done!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
