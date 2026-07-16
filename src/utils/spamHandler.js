const fs = require('fs');
const path = require('path');

// activeSpams: Map<userId, boolean>
const activeSpams = new Map();

/**
 * Bắt đầu quá trình khủng bố DM
 */
async function startSpam(targetMember) {
    if (!targetMember || !targetMember.user) return;
    const userId = targetMember.user.id;
    
    // Nếu đang spam rồi thì thôi
    if (activeSpams.get(userId)) return;

    try {
        const filePath = path.join(__dirname, '../../phang.txt');
        const content = fs.readFileSync(filePath, 'utf-8');
        // Tách dòng, loại bỏ các dòng trống
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        if (lines.length === 0) return;

        // Đánh dấu đang spam
        activeSpams.set(userId, true);

        let success = true;
        // Gửi dòng đầu tiên cảnh cáo
        await targetMember.user.send("Mày thích chửi tao không? Bố mày cho mày biết tay! 🐧").catch(() => {
            // Không gửi DM được (khóa DM) -> hủy
            activeSpams.delete(userId);
            success = false;
        });

        if (!success) return false;

        // Chạy vòng lặp spam ở background (không await vòng lặp)
        (async () => {
            for (const line of lines) {
            // Kiểm tra xem nạn nhân đã xin tha chưa
            if (!activeSpams.get(userId)) {
                break; // Thoát vòng lặp ngay lập tức
            }

            try {
                await targetMember.user.send(line);
            } catch (err) {
                // Lỗi (VD block bot giữa chừng) -> hủy
                break;
            }

            // Chờ 0.5s theo yêu cầu
            await new Promise(resolve => setTimeout(resolve, 500));
            }

            // Kết thúc thì xóa
            activeSpams.delete(userId);
        })();

        return true;

    } catch (e) {
        console.error('[SPAM_HANDLER] Lỗi khi spam DM:', e);
        activeSpams.delete(userId);
        return false;
    }
}

/**
 * Xử lý khi nạn nhân xin tha (áp dụng cả trong DM và Server)
 */
async function handleSpamStop(message) {
    const userId = message.author.id;
    
    // Chỉ check nếu người này đang bị spam
    if (activeSpams.get(userId) === true) {
        const text = message.content.toLowerCase();
        
        // Các từ khóa xin tha
        if (text.includes('xin tha') || text.includes('xin lỗi') || text.includes('tha cho') || text.includes('stop') || text.includes('đừng nhắn')) {
            // Đặt flag false để vòng lặp spam đang chạy bị break ngay lập tức
            activeSpams.set(userId, false);
            
            // Rep lại trong kênh mà họ xin tha (kênh server hoặc DM đều được)
            await message.reply('Tha cho mày lần này đấy con chó! 🐧').catch(() => {});
            return true;
        }
    }
    return false;
}

module.exports = {
    startSpam,
    handleSpamStop
};
