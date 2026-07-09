/**
 * utils/configDB.js
 * Lấy và cập nhật cấu hình bật/tắt tính năng của server
 */

const { db } = require('./firebase');

const CONFIG_COLLECTION = 'server_configs';

const DEFAULT_CONFIG = {
    prefix: 'g!',
    feature_tiktok: true,
    feature_role_list: true,
    feature_economy: true,
    feature_avatar: true,
    feature_welcome: true,
    feature_goodbye: true,
    feature_j2c: true,
    feature_stats: true,
    welcome_channel_id: null,
    goodbye_channel_id: null,
    j2c_channel_id: null,
    modlog_channel_id: null,
    game_alert_channel_id: null,
    game_alert_role_id: null,
    mod_case_count: 0,
    ticket_count: 0,
    notified_games: [],
    stats_data: {
        category_id: null,
        all_members_id: null,
        members_id: null,
        roles: {} // { channelId: roleId }
    }
};

async function getConfig(guildId) {
    if (!guildId) return DEFAULT_CONFIG;
    
    const ref = db.collection(CONFIG_COLLECTION).doc(guildId);
    const snap = await ref.get();

    if (!snap.exists) {
        await ref.set(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
    }
    return { ...DEFAULT_CONFIG, ...snap.data() };
}

async function updateConfig(guildId, keyOrData, value) {
    if (!guildId) return;
    
    const ref = db.collection(CONFIG_COLLECTION).doc(guildId);
    const snap = await ref.get();
    
    let updateData = {};
    if (typeof keyOrData === 'string') {
        updateData[keyOrData] = value;
    } else {
        updateData = keyOrData;
    }

    if (!snap.exists) {
        await ref.set({ ...DEFAULT_CONFIG, ...updateData });
    } else {
        await ref.update(updateData);
    }
}

async function incrementCaseCount(guildId) {
    if (!guildId) return 1;
    
    const ref = db.collection(CONFIG_COLLECTION).doc(guildId);
    const snap = await ref.get();
    
    if (!snap.exists) {
        await ref.set({ ...DEFAULT_CONFIG, mod_case_count: 1 });
        return 1;
    }
    
    const currentCount = snap.data().mod_case_count || 0;
    const newCount = currentCount + 1;
    await ref.update({ mod_case_count: newCount });
    
    return newCount;
}

async function incrementTicketCount(guildId) {
    const config = await getConfig(guildId);
    const newCount = (config.ticket_count || 0) + 1;
    await updateConfig(guildId, { ticket_count: newCount });
    return newCount;
}

/**
 * Thêm một ID game vào danh sách đã thông báo
 */
async function addNotifiedGame(guildId, gameId) {
    const config = await getConfig(guildId);
    const notified = config.notified_games || [];
    if (!notified.includes(gameId)) {
        notified.push(gameId);
        // Giữ tối đa 50 game gần nhất để tránh data quá to
        if (notified.length > 50) notified.shift();
        await updateConfig(guildId, { notified_games: notified });
    }
}

module.exports = { getConfig, updateConfig, incrementCaseCount, incrementTicketCount, addNotifiedGame, DEFAULT_CONFIG };
