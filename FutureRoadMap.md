# Memories Photos - Feature Roadmap

Dựa trên tiến độ hiện tại của dự án, ứng dụng đã có bộ khung rất tốt bao gồm Xác thực (Auth), Quản lý Album, Upload ảnh, và nhận diện đối tượng bằng AI (Smart Object). Dưới đây là danh sách các **Trang (Pages)** và **Chức năng (Functions)** cần được xây dựng thêm (và những thứ đã hoàn thành):

## 1. Tính năng cốt lõi

### Quản lý Khuôn mặt & Nhân vật (People & Faces) - [ĐÃ HỦY ❌]
- **Trang mới:** `/people` - Nơi hiển thị danh sách tất cả những người được nhận diện trong ảnh.
- **Function:** Tích hợp AI Face Detection (Bỏ qua vì quá phức tạp và nặng cho trình duyệt/server cá nhân).

### Vị trí & Bản đồ (Places & Maps) - [HOÀN THÀNH ✅]
- **Trang mới:** `/map` - Hiển thị bản đồ tương tác với các ghim (pins) đánh dấu vị trí chụp ảnh. *(Đã xong)*
- **Function:** Nhóm các điểm ảnh lại với nhau (Cluster) để chống giật lag. *(Đã xong)*
- **Function:** Trích xuất tọa độ GPS từ dữ liệu EXIF của ảnh khi tải lên. *(Đã xong)*
- **Function:** Tích hợp API để lấy tên địa danh từ tọa độ (Reverse Geocoding). *(Đã xong)*

### Tìm kiếm Nâng cao & Lọc theo EXIF (Advanced Search & EXIF Filters) - [HOÀN THÀNH ✅]
- **Trang mới:** `/search` - Trang tìm kiếm chuyên sâu với các bộ lọc. *(Đã xong)*
- **Function:** Cho phép người dùng tìm kiếm ảnh theo Camera (Thiết bị), Khẩu độ, Ngày chụp, hoặc ISO. *(Đã xong)*

## 2. Tính năng tương tác và Trải nghiệm người dùng (UX)

### Thao tác hàng loạt (Bulk Actions) - [HOÀN THÀNH ✅]
- **Function:** UI chọn (Select) nhiều ảnh cùng lúc trên toàn hệ thống (Global Selection). *(Đã xong)*
- **Function:** Xóa nhiều ảnh, thêm nhiều ảnh vào Album. *(Đã xong)*
- **Function:** Tải xuống (Download) hàng loạt và tự động nén thành file `.zip` trực tiếp trên trình duyệt. *(Đã xong)*

### Trình chỉnh sửa ảnh (Photo Editor) - [HOÀN THÀNH ✅]
- **Trang/Modal mới:** Tích hợp trực tiếp trình chỉnh sửa ảnh vào trang `/photo/[id]`. *(Đã xong)*
- **Function:** Cắt (Crop), Xoay (Rotate), Lọc màu (Filters), và điều chỉnh Độ sáng/Độ tương phản ngay trên web và lưu phiên bản mới. *(Đã xong)*

### PWA (Progressive Web App) & Mobile-First - [HOÀN THÀNH ✅]
- **Function:** Biến ứng dụng web thành PWA để có thể "Cài đặt" (Install) trực tiếp lên màn hình chính của điện thoại. *(Đã xong)*
- **Function:** Hỗ trợ tính năng vuốt (Swipe) để xem ảnh tiếp theo trên điện thoại. *(Đã xong)*

## 3. Tính năng Chia sẻ và Xã hội

### Chia sẻ Album (Shared Albums) - [HOÀN THÀNH ✅]
- **Trang mới:** `/shared-albums` - Nơi quản lý các Album được chia sẻ. *(Đã xong)*
- **Function:** Tạo link chia sẻ công khai (Public Link) cho Album và Ảnh. *(Đã xong)*
- **Function:** Cho phép người dùng khác tham gia và đóng góp ảnh vào chung một Album (Collaborative). *(Đã xong)*

## 4. Gợi nhớ & Kỷ niệm (Memories)
- **Thành phần mới:** Thanh "Cùng ngày này năm xưa" ở trang chủ. - [HOÀN THÀNH ✅]
- **Trang mới:** `/stats` - Trang thống kê cá nhân (Ví dụ: Biểu đồ số ảnh chụp bằng từng loại Máy ảnh, Ống kính, thông số ISO). - [HOÀN THÀNH ✅]

## 5. Cải thiện Hiệu năng và Hệ thống (Backend)

### Tối ưu hóa Hiệu suất Hình ảnh (Image Optimization) - [HOÀN THÀNH ✅]
- **Function:** Thêm thuộc tính `loading="eager"` cho các ảnh LCP (Largest Contentful Paint) ở đầu trang để tải nhanh hơn. *(Đã xong)*
- **Function:** Bổ sung thuộc tính `sizes` cho tất cả các ảnh sử dụng `fill` để tối ưu dung lượng và cảnh báo từ Next.js. *(Đã xong)*

### Hỗ trợ Video (Video Support) - [HOÀN THÀNH ✅]
- **Function:** Hỗ trợ Upload định dạng Video (mp4, mov). *(Đã xong)*
- **Function:** Tạo ảnh thumbnail động và tối ưu hóa URL Cloudinary cho Video. *(Đã xong)*

### Cấu trúc lại Dữ liệu EXIF tự động - [HOÀN THÀNH ✅]
- **Function:** Tạo một Background Job định kỳ tự động sửa chữa hoặc quét lại EXIF của các ảnh bị lỗi khi upload mà không cần người dùng thao tác. *(Đã xong)*

## 6. Triển khai & Vận hành (Deployment & Operations) - [HOÀN THÀNH ✅]

- **Tài liệu mới:** Đã bổ sung hướng dẫn chi tiết về cách triển khai ứng dụng lên môi trường Production thực tế (Self-hosting) tại file **[PRODUCTION.md](PRODUCTION.md)**.
- **Tính năng:** Cấu hình Docker cho Redis, hỗ trợ build Next.js độc lập và sẵn sàng để chạy bằng PM2/Nginx.

---

> [!IMPORTANT]
> **🎉 DỰ ÁN ĐÃ HOÀN THÀNH XUẤT SẮC TOÀN BỘ ROADMAP! 🎉**
> 
> Từ phiên bản khởi đầu tới hiện tại, chúng ta đã tích hợp thành công Bản đồ, Video, Tải xuống hàng loạt, Trình chỉnh sửa ảnh, Cài đặt PWA Mobile, Dọn dẹp ngầm bằng AI, Album Nhóm, và tối ưu siêu tốc toàn bộ ảnh. Ứng dụng "Kỷ Niệm" giờ đây đã trở thành một hệ thống lưu trữ ảnh riêng tư, chuyên nghiệp và cực kỳ mượt mà. Cảm ơn bạn đã đồng hành trong chuyến hành trình tuyệt vời này!
