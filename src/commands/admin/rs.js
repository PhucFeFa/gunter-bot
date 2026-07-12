/**
 * rs.js – Lệnh prefix ẩn: reset toàn bộ người dùng về trạng thái ban đầu
 * Chỉ BOT_OWNER_IDS trong .env mới được dùng.
 * Usage: g!rs confirm
 */

const { db } = require('../../utils/firebase');
const { clearInventory } = require('../../utils/fishDB');

// Đọc owner IDs từ .env (BOT_OWNER_IDS=id1,id2)
const OWNER_IDS = (process.env.BOT_OWNER_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

module.exports = {
    name: 'rs',
    hidden: true,

    async executePrefix(message, args, client) {
        // Chặn tất cả người không phải owner
        if (!OWNER_IDS.includes(message.author.id)) return;

        if (!args[0] || args[0].toLowerCase() !== 'confirm') {
            return message.reply(
                '⚠️ **[OWNER ONLY] CẢNH BÁO:**\n' +
                'Lệnh này sẽ reset **toàn bộ người dùng** về trạng thái ban đầu:\n' +
                '• 💰 Tiền → 500,000 🪙\n• 💼 Nghề → Null\n• 🎣 Cần → Cần Tre\n• 🐟 Kho cá → Xóa sạch\n• 💸 Nợ → 0\n\n' +
                'Gõ `g!rs confirm` để xác nhận thực hiện.'
            );
        }

        const statusMsg = await message.reply('⏳ Đang reset toàn bộ database... Vui lòng chờ.');

        try {
            const snapshot = await db.collection('users').get();
            if (snapshot.empty) {
                return statusMsg.edit('✅ Database trống, không có gì để reset!');
            }

            // Batch update (Firestore batch tối đa 500 ops)
            const batches = [];
            let currentBatch = db.batch();
            let count = 0;

            for (const doc of snapshot.docs) {
                currentBatch.update(doc.ref, {
                    balance: 500000,
                    job: null,
                    loanAmount: 0,
                    lastWork: null,
                    lastDaily: null,
                    given_today: 0,
                    tarot_count_today: 0,
                    fishRod: 1,
                    fishRodDurability: 30,
                    fishTotalCaught: 0,
                });
                count++;
                if (count % 499 === 0) {
                    batches.push(currentBatch.commit());
                    currentBatch = db.batch();
                }
            }
            if (count % 499 !== 0) batches.push(currentBatch.commit());
            await Promise.all(batches);

            // Xóa kho cá mỗi user
            let fishDeleted = 0;
            for (const doc of snapshot.docs) {
                fishDeleted += await clearInventory(doc.id);
            }

            await statusMsg.edit(
                `✅ **RESET HOÀN TẤT!**\n\n` +
                `👥 Tài khoản đã reset: **${count}**\n` +
                `🐟 Cá đã xóa: **${fishDeleted}**\n` +
                `💰 Tất cả về **500,000 🪙** | Cần: Cần Tre | Nợ: 0 | Nghề: Null`
            );

        } catch (err) {
            console.error('[RS] Lỗi reset:', err);
            await statusMsg.edit(`❌ Lỗi khi reset: \`${err.message}\``);
        }
    }
};
