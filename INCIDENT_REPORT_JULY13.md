# BÁO CÁO SỰ CỐ MẤT DỮ LIỆU NGÀY 13/07/2026

## NGUYÊN NHÂN CHÍNH:
1. File `database.sqlite` (vốn dĩ phải được bảo mật và không bao giờ đưa lên GitHub) đã bị vô tình đưa vào hệ thống theo dõi của Git (Tracked) ở một commit lúc 13:48 trưa nay, dưới hình hài là một file rỗng 4KB.
2. Lệnh `git reset --hard origin/main` có tác dụng ép máy chủ (VPS) lấy toàn bộ code trên GitHub đè thẳng vào các file đang có trên máy chủ.
3. Vì `database.sqlite` rỗng đã nằm trên GitHub, nên lệnh này đã vô tình lấy file 4KB đó, tải về và đè nát bét file dữ liệu đồ sộ hơn 150KB trên VPS.
4. Mọi thứ diễn ra quá nhanh, file cũ bị xóa ở cấp độ sector ổ cứng và không thể phục hồi do không có Snapshot (sao lưu) từ nhà cung cấp CloudFly.

## BÀI HỌC CỐT LÕI (CẢNH BÁO ĐỎ):
- **KHÔNG BAO GIỜ** được phép chạy lệnh `git reset --hard` trên máy chủ thực tế (Production) trừ khi bạn biết CHẮC CHẮN 100% rằng các thư mục chứa dữ liệu (`data/`, `*.sqlite`, `*.json`) đã hoàn toàn nằm ngoài tầm kiểm soát của Git.
- **LUÔN LUÔN** thực hiện sao lưu thủ công (chạy lệnh copy/zip file) hoặc kích hoạt tính năng Snapshot tự động của nhà mạng VPS trước khi động tay vào các thao tác cập nhật quy mô lớn.
- **TUYỆT ĐỐI** tuân thủ danh sách `.gitignore`. Nếu phát hiện có file dữ liệu rò rỉ lên repo, phải dùng lệnh `git rm --cached <tên_file>` để trục xuất nó ngay lập tức.

## HÀNH ĐỘNG KHẮC PHỤC ĐÃ THỰC HIỆN:
- Chạy kịch bản `migrateFirebase.js` thành công, lôi lại được sinh mệnh của 89 người chơi từ cõi chết (Firebase) trở về dương gian (SQLite).
- Gỡ bỏ vĩnh viễn quyền kiểm soát của Git đối với toàn bộ các file liên quan tới CSDL (`database.sqlite`, `database.sqlite-shm`, `database.sqlite-wal`). Lỗi đè file này sẽ **không bao giờ** có cơ hội tái diễn!
