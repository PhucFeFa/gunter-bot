const db = require('./sqliteDB');

// ─── User fish profile ────────────────────────────────────────
function getFishProfileSync(userId) {
    let row = db.prepare('SELECT * FROM fish_profiles WHERE userId = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO fish_profiles (userId) VALUES (?)').run(userId);
        row = db.prepare('SELECT * FROM fish_profiles WHERE userId = ?').get(userId);
    }
    return {
        rod: row.rod || 1,
        rodDurability: row.rodDurability,
        totalCaught: row.totalCaught || 0,
    };
}

function setUserRodSync(userId, rodId, maxDurability) {
    getFishProfileSync(userId); // ensure exists
    db.prepare('UPDATE fish_profiles SET rod = ?, rodDurability = ? WHERE userId = ?').run(rodId, maxDurability, userId);
}

function updateRodDurabilitySync(userId, newDurability) {
    getFishProfileSync(userId);
    db.prepare('UPDATE fish_profiles SET rodDurability = ? WHERE userId = ?').run(newDurability, userId);
}

function incrementCaughtSync(userId) {
    getFishProfileSync(userId);
    db.prepare('UPDATE fish_profiles SET totalCaught = totalCaught + 1 WHERE userId = ?').run(userId);
}

// ─── Inventory (subcollection) ────────────────────────────────
function getInventorySync(userId, page = 0, pageSize = 10) {
    const allRows = db.prepare('SELECT * FROM fish_inventory WHERE userId = ? ORDER BY caughtAt DESC').all(userId);
    const total = allRows.length;
    // Map id -> docId cho tương thích code cũ
    const mappedRows = allRows.map(r => ({ ...r, docId: r.id.toString() }));
    const items = mappedRows.slice(page * pageSize, (page + 1) * pageSize);
    return { items, total, totalPages: Math.ceil(total / pageSize) };
}

function addFishToInventorySync(userId, fishObj) {
    db.prepare(`
        INSERT INTO fish_inventory (userId, fishId, name, emoji, zone, tier, size, price, isShiny, caughtAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
        userId, fishObj.fishId, fishObj.name, fishObj.emoji, fishObj.zone, 
        fishObj.tier, fishObj.size, fishObj.price, fishObj.isShiny ? 1 : 0, Date.now()
    );
}

function removeFishFromInventorySync(userId, docId) {
    db.prepare('DELETE FROM fish_inventory WHERE userId = ? AND id = ?').run(userId, parseInt(docId));
}

function clearInventorySync(userId) {
    const info = db.prepare('DELETE FROM fish_inventory WHERE userId = ?').run(userId);
    return info.changes;
}

// ─── Guild zone setup ─────────────────────────────────────────
function getGuildConfigData(guildId) {
    let row = db.prepare('SELECT data FROM configs WHERE guildId = ?').get(guildId);
    if (!row) {
        db.prepare('INSERT INTO configs (guildId) VALUES (?)').run(guildId);
        row = { data: '{}' };
    }
    try { return JSON.parse(row.data); } catch(e) { return {}; }
}

function setGuildConfigData(guildId, newData) {
    const current = getGuildConfigData(guildId);
    const updated = { ...current, ...newData };
    db.prepare('UPDATE configs SET data = ? WHERE guildId = ?').run(JSON.stringify(updated), guildId);
}

function getZoneSetupSync(guildId) {
    const data = getGuildConfigData(guildId);
    return data.fishZones || {};
}

function setZoneSetupSync(guildId, zoneData) {
    const data = getGuildConfigData(guildId);
    data.fishZones = { ...(data.fishZones || {}), ...zoneData };
    setGuildConfigData(guildId, data);
}

function getChannelZoneSync(guildId, channelId) {
    const zones = getZoneSetupSync(guildId);
    if (zones.zone1Channel === channelId) return 1;
    if (zones.zone2Channel === channelId) return 2;
    if (zones.zone3Channel === channelId) return 3;
    return null;
}

// ─── Shop notify message tracking ────────────────────────────────
function getShopNotifyMsgSync(guildId) {
    const data = getGuildConfigData(guildId);
    return data.fishShopNotifyMsg || null;
}

function setShopNotifyMsgSync(guildId, msgData) {
    const data = getGuildConfigData(guildId);
    data.fishShopNotifyMsg = msgData;
    setGuildConfigData(guildId, data);
}

module.exports = {
    getFishProfile: async (id) => getFishProfileSync(id),
    setUserRod: async (id, r, d) => setUserRodSync(id, r, d),
    updateRodDurability: async (id, d) => updateRodDurabilitySync(id, d),
    incrementCaught: async (id) => incrementCaughtSync(id),
    getInventory: async (id, p, s) => getInventorySync(id, p, s),
    addFishToInventory: async (id, f) => addFishToInventorySync(id, f),
    removeFishFromInventory: async (id, dId) => removeFishFromInventorySync(id, dId),
    clearInventory: async (id) => clearInventorySync(id),
    getZoneSetup: async (gId) => getZoneSetupSync(gId),
    setZoneSetup: async (gId, z) => setZoneSetupSync(gId, z),
    getChannelZone: async (gId, cId) => getChannelZoneSync(gId, cId),
    getShopNotifyMsg: async (gId) => getShopNotifyMsgSync(gId),
    setShopNotifyMsg: async (gId, m) => setShopNotifyMsgSync(gId, m)
};
