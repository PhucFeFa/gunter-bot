/**
 * fishShopReset.js – Tự động reset shop câu cá mỗi 12 tiếng.
 * - Xóa tin nhắn thông báo cũ
 * - Gửi thông báo mới kèm ping role (nếu đã setup zone1Role)
 * - Lưu messageId vào DB để lần sau xóa
 */

const { EmbedBuilder } = require('discord.js');
const db = require('./sqliteDB');
const { getZoneSetup, getShopNotifyMsg, setShopNotifyMsg } = require('./fishDB');
const { getConfig, updateConfig } = require('./configDB');
const { RODS } = require('../data/fishData');

const RESET_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 tiếng

// ─── Weighted daily rotation (giống fishshop.js) ──────────────
function getDailyLimitedRods() {
    const allLimited = RODS.filter(r => r.limited);
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    function seededRand(s) { let x = Math.sin(s) * 10000; return x - Math.floor(x); }
    const pool = [];
    for (const rod of allLimited) {
        const w = rod.shopWeight ?? 10;
        for (let i = 0; i < w; i++) pool.push(rod.id);
    }
    const picked = [];
    const used = new Set();
    for (let i = 0; i < pool.length && picked.length < 5; i++) {
        const idx = Math.floor(seededRand(seed + i * 37) * pool.length);
        const rodId = pool[idx];
        if (!used.has(rodId)) { used.add(rodId); picked.push(RODS.find(r => r.id === rodId)); }
    }
    return picked.length >= 1 ? picked : allLimited.slice(0, 5);
}

// ─── Tạo embed thông báo shop ─────────────────────────────────
function buildShopAnnounce(resetCount) {
    const normalRods = RODS.filter(r => !r.limited).slice(0, 8);
    const limitedRods = getDailyLimitedRods();

    const normalList = normalRods.map(r =>
        `${r.emoji} **${r.name}** — ${r.price === 0 ? 'Miễn phí' : r.price.toLocaleString() + ' 🪙'}`
    ).join('\n');

    const limitedList = limitedRods.map(r =>
        `${r.emoji} **${r.name}** — ${r.price.toLocaleString()} 🪙 | 🍀+${r.bonusLuck}% | 📏+${Math.round(r.bonusSize * 100)}%`
    ).join('\n');

    return new EmbedBuilder()
        .setColor(0x1E90FF)
        .setTitle('🏪 Shop Câu Cá Gunter — Đã Reset!')
        .setDescription(
            `🔄 Shop vừa được làm mới! Mua cần câu và role vùng câu cá tại đây.\n\n` +
            `⏱️ **Reset tiếp theo:** sau 12 tiếng\n` +
            `🔢 **Lần reset:** #${resetCount}`
        )
        .addFields(
            {
                name: '🎣 Cần Câu Thường',
                value: normalList || '*Không có*',
                inline: false
            },
            {
                name: '🌟 Cần Giới Hạn Hôm Nay (5 cần random theo tỉ lệ)',
                value: limitedList || '*Không có*',
                inline: false
            },
            {
                name: '📋 Hướng Dẫn Mua',
                value:
                    '`/fishshop normal` — Xem & mua cần thường\n' +
                    '`/fishshop limited` — Xem & mua cần giới hạn\n' +
                    '`/fishshop role` — Mua role đổi vùng câu\n' +
                    '`/fishshop myrod` — Xem cần hiện tại',
                inline: false
            }
        )
        .setFooter({ text: 'Gunter Fish Shop | Cần xịn càng hiếm xuất hiện hơn!' })
        .setTimestamp();
}

// ─── Hàm gửi thông báo shop cho 1 guild ──────────────────────
async function sendShopNotify(client, guildId) {
    try {
        const zones = await getZoneSetup(guildId);
        if (!zones.shopChannel) return; // Guild chưa setup shop channel

        const channel = await client.channels.fetch(zones.shopChannel).catch(() => null);
        if (!channel) return;

        // Xóa tin nhắn cũ
        const oldMsg = await getShopNotifyMsg(guildId);
        if (oldMsg?.messageId) {
            const oldChannel = await client.channels.fetch(oldMsg.channelId).catch(() => null);
            if (oldChannel) {
                await oldChannel.messages.fetch(oldMsg.messageId)
                    .then(m => m.delete())
                    .catch(() => { }); // Bỏ qua nếu đã bị xóa
            }
        }

        // Lấy reset count
        const configData = await getConfig(guildId);
        const resetCount = (configData.fishShopResetCount || 0) + 1;

        // Ping role (nếu có zone1Role)
        const pingContent = zones.zone1Role
            ? `<@&${zones.zone1Role}> <@&${zones.zone2Role}> <@&${zones.zone3Role}> 🎣 Shop câu cá đã reset!`
            : '🎣 Shop câu cá đã reset!';

        // Gửi tin nhắn mới
        const newMsg = await channel.send({
            content: pingContent,
            embeds: [buildShopAnnounce(resetCount)]
        });

        // Lưu ID tin nhắn mới và tăng reset count
        await setShopNotifyMsg(guildId, { messageId: newMsg.id, channelId: channel.id });
        await updateConfig(guildId, { fishShopResetCount: resetCount });

        console.log(`[FishShop] Reset shop guild ${guildId} — lần #${resetCount}`);
    } catch (err) {
        console.error(`[FishShop] Lỗi reset guild ${guildId}:`, err.message);
    }
}

// ─── Hàm lấy danh sách tất cả guild đã setup shopChannel ─────
async function getAllShopGuilds() {
    const rows = db.prepare('SELECT guildId, data FROM configs').all();
    const guilds = [];
    for (const row of rows) {
        try {
            const data = JSON.parse(row.data);
            if (data.fishZones && data.fishZones.shopChannel) {
                guilds.push(row.guildId);
            }
        } catch(e) {}
    }
    return guilds;
}

// ─── Hàm chạy reset cho toàn bộ guild ────────────────────────
async function runShopReset(client) {
    const guilds = await getAllShopGuilds();
    console.log(`[FishShop] Đang reset shop cho ${guilds.length} guild(s)...`);
    for (const guildId of guilds) {
        await sendShopNotify(client, guildId);
    }
}

// ─── Khởi động scheduler ─────────────────────────────────────
function startFishShopScheduler(client) {
    // Gửi ngay sau 5 giây khi bot khởi động (để test)
    setTimeout(() => runShopReset(client), 5000);

    // Lặp mỗi 12 tiếng
    setInterval(() => runShopReset(client), RESET_INTERVAL_MS);

    console.log(`[FishShop] Scheduler đã khởi động. Reset mỗi ${RESET_INTERVAL_MS / 3600000} tiếng.`);
}

module.exports = { startFishShopScheduler, sendShopNotify };
