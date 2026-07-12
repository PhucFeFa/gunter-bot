/**
 * utils/configDB.js
 * Lấy và cập nhật cấu hình bật/tắt tính năng của server (SQLite Version)
 */
const db = require('./sqliteDB');

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
    ignored_channels: [],
    notified_games: [],
    stats_data: {
        category_id: null,
        all_members_id: null,
        members_id: null,
        roles: {} // { channelId: roleId }
    }
};

function getConfigSync(guildId) {
    if (!guildId) return DEFAULT_CONFIG;
    
    let row = db.prepare('SELECT data FROM configs WHERE guildId = ?').get(guildId);
    if (!row) {
        db.prepare('INSERT INTO configs (guildId, data) VALUES (?, ?)').run(guildId, JSON.stringify(DEFAULT_CONFIG));
        return DEFAULT_CONFIG;
    }
    try {
        const storedConfig = JSON.parse(row.data);
        return { ...DEFAULT_CONFIG, ...storedConfig };
    } catch (e) {
        return DEFAULT_CONFIG;
    }
}

function updateConfigSync(guildId, keyOrData, value) {
    if (!guildId) return;
    
    const currentConfig = getConfigSync(guildId);
    
    let updateData = {};
    if (typeof keyOrData === 'string') {
        updateData[keyOrData] = value;
    } else {
        updateData = keyOrData;
    }

    const newConfig = { ...currentConfig, ...updateData };
    db.prepare('UPDATE configs SET data = ? WHERE guildId = ?').run(JSON.stringify(newConfig), guildId);
}

function incrementCaseCountSync(guildId) {
    if (!guildId) return 1;
    const config = getConfigSync(guildId);
    const newCount = (config.mod_case_count || 0) + 1;
    updateConfigSync(guildId, { mod_case_count: newCount });
    return newCount;
}

function incrementTicketCountSync(guildId) {
    if (!guildId) return 1;
    const config = getConfigSync(guildId);
    const newCount = (config.ticket_count || 0) + 1;
    updateConfigSync(guildId, { ticket_count: newCount });
    return newCount;
}

function addNotifiedGameSync(guildId, gameId) {
    const config = getConfigSync(guildId);
    const notified = config.notified_games || [];
    if (!notified.includes(gameId)) {
        notified.push(gameId);
        if (notified.length > 50) notified.shift();
        updateConfigSync(guildId, { notified_games: notified });
    }
}

// Bọc Promise để duy trì tính tương thích với hệ thống cũ sử dụng async/await
module.exports = { 
    getConfig: async (id) => getConfigSync(id), 
    updateConfig: async (id, k, v) => updateConfigSync(id, k, v), 
    incrementCaseCount: async (id) => incrementCaseCountSync(id), 
    incrementTicketCount: async (id) => incrementTicketCountSync(id), 
    addNotifiedGame: async (id, gId) => addNotifiedGameSync(id, gId), 
    DEFAULT_CONFIG 
};
