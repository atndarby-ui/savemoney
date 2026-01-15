# Kế hoạch triển khai Chỉnh sửa và Xóa giao dịch

Để cho phép chỉnh sửa và xóa các giao dịch, chúng ta cần thực hiện các thay đổi sau:

## 1. Cập nhật `App.tsx` (Logic trung tâm)
- Thêm hàm `handleUpdateTransaction(updatedTx: Transaction)` để cập nhật mảng `transactions` dựa trên `id`.
- Thêm hàm `handleDeleteTransaction(id: string)` để lọc bỏ giao dịch khỏi danh sách.

## 2. Cập nhật `CalendarScreen.tsx` và `StatisticsScreen.tsx` (Giao diện danh sách)
- Biến các mục giao dịch trong danh sách thành các nút có thể nhấn được (`TouchableOpacity`).
- Khi nhấn vào một giao dịch, điều hướng sang màn hình `AddTransaction` với dữ liệu của giao dịch đó.

## 3. Cập nhật `AddTransactionScreen.tsx` (Màn hình biểu mẫu)
- Nhận dữ liệu giao dịch cũ từ `route.params`.
- Thêm nút **"Xóa giao dịch"** ở cuối màn hình khi ở chế độ chỉnh sửa.
- Cập nhật logic `handleSave` để gọi `onUpdateTransaction` nếu đang sửa.

---
Bắt đầu thực hiện bước 1.
