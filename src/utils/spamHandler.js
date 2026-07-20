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
            while (activeSpams.get(userId)) {
                // Lấy một câu ngẫu nhiên
                const randomLine = lines[Math.floor(Math.random() * lines.length)];
                
                try {
                    await targetMember.user.send(`${randomLine} <@${userId}>`);
                } catch (err) {
                    // Lỗi (VD block bot giữa chừng) -> hủy
                    activeSpams.delete(userId);
                    break;
                }

                // Chờ 1s theo yêu cầu
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        })();

        return true;

    } catch (e) {
        console.error('[SPAM_HANDLER] Lỗi khi spam DM:', e);
        activeSpams.delete(userId);
        return false;
    }
}

function forceStopSpam(userId) {
    if (activeSpams.get(userId) === true) {
        activeSpams.set(userId, false);
        return true;
    }
    return false;
}

function isSpamming(userId) {
    return activeSpams.get(userId) === true;
}

module.exports = {
    startSpam,
    forceStopSpam,
    isSpamming
};
