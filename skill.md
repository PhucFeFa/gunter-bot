# Kỹ năng (Skill): Deploy Code An Toàn Lên VPS Gunter Bot

## Mục đích
Mỗi khi cần deploy (đưa) code mới lên VPS hoặc sử dụng lệnh pull code trên VPS, **BẮT BUỘC** phải thực hiện quy trình này để đảm bảo không bao giờ bị mất mát dữ liệu (file `database.sqlite`).

## Các bước thực hiện bắt buộc

1. **Bước 1: Backup Database từ VPS về máy Local (LUÔN LÀM ĐẦU TIÊN)**
   - Sử dụng SSH (thông qua `node-ssh` hoặc lệnh SCP/SFTP) để kết nối tới VPS: IP `103.179.188.63`, User `root`.
   - Tải file `/root/gunter-bot/data/database.sqlite` từ VPS về lưu trên máy tính của người dùng tại đường dẫn: `D:\PhucLHCE191132\db\database.sqlite` (hoặc tạo folder backup riêng `D:\PhucLHCE191132\gunter-bot\data\database_backup.sqlite`).
   - Đảm bảo tải thành công và kiểm tra dung lượng/thời gian file trước khi tiếp tục.

2. **Bước 2: Triển khai Code (Push/Pull)**
   - Thực hiện `git add .`, `git commit`, `git push` từ máy local lên Github.
   - Luôn đảm bảo `data/database.sqlite` (và các file `.sqlite-shm`, `.sqlite-wal`) đã được loại bỏ khỏi Git bằng `.gitignore`.
   - Chạy script deploy (`node deploy3.js`) hoặc dùng lệnh SSH để `git pull` code mới nhất trên VPS.
   - Chạy `npm install` và restart PM2 nếu cần.

3. **Bước 3: Khôi phục/Kiểm tra (Nếu có sự cố)**
   - Trong trường hợp cấu hình Git hoặc script deploy vô tình ghi đè hoặc làm hỏng file dữ liệu trên VPS, lập tức chạy script `node upload_db.js` để đẩy ngược file backup (`D:\PhucLHCE191132\db\database.sqlite`) lên lại VPS.

**QUAN TRỌNG:** Tuyệt đối không được bỏ qua Bước 1. Mọi sai sót gây mất Database sẽ làm mất toàn bộ tiền tệ và nghề nghiệp của người dùng. Không được chủ quan!
