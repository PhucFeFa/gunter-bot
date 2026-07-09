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
    mod_case_count: 0,
    ticket_count: 0,
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

async function updateConfig(guildId, key, value) {
    if (!guildId) return;
    
    const ref = db.collection(CONFIG_COLLECTION).doc(guildId);
    const snap = await ref.get();
    
    if (!snap.exists) {
        await ref.set({ ...DEFAULT_CONFIG, [key]: value });
    } else {
        await ref.update({ [key]: value });
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
    if (!guildId) return 1;
    
    const ref = db.collection(CONFIG_COLLECTION).doc(guildId);
    const snap = await ref.get();
    
    if (!snap.exists) {
        await ref.set({ ...DEFAULT_CONFIG, ticket_count: 1 });
        return 1;
    }
    
    const currentCount = snap.data().ticket_count || 0;
    const newCount = currentCount + 1;
    await ref.update({ ticket_count: newCount });
    
    return newCount;
}

module.exports = { getConfig, updateConfig, incrementCaseCount, incrementTicketCount };
