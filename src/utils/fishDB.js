/**
 * fishDB.js – Firestore helper cho hệ thống câu cá.
 * Collection: users (existing), subcollection fishInventory
 * guildConfig: fishZones { zone1Channel, zone2Channel, zone3Channel, zone1Role, zone2Role, zone3Role }
 */

const { db } = require('./firebase');

// ─── User fish profile ────────────────────────────────────────
async function getFishProfile(userId) {
    const doc = await db.collection('users').doc(userId).get();
    const data = doc.exists ? doc.data() : {};
    return {
        rod: data.fishRod || 1,
        rodDurability: data.fishRodDurability ?? null,
        totalCaught: data.fishTotalCaught || 0,
    };
}

async function setUserRod(userId, rodId, maxDurability) {
    await db.collection('users').doc(userId).set({ 
        fishRod: rodId,
        fishRodDurability: maxDurability
    }, { merge: true });
}

async function updateRodDurability(userId, newDurability) {
    await db.collection('users').doc(userId).set({ fishRodDurability: newDurability }, { merge: true });
}

async function incrementCaught(userId) {
    const ref = db.collection('users').doc(userId);
    const doc = await ref.get();
    const cur = doc.exists ? (doc.data().fishTotalCaught || 0) : 0;
    await ref.set({ fishTotalCaught: cur + 1 }, { merge: true });
}

// ─── Inventory (subcollection) ────────────────────────────────
async function getInventory(userId, page = 0, pageSize = 10) {
    const snap = await db.collection('users').doc(userId).collection('fishInventory')
        .orderBy('caughtAt', 'desc').get();
    const all = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
    const total = all.length;
    const items = all.slice(page * pageSize, (page + 1) * pageSize);
    return { items, total, totalPages: Math.ceil(total / pageSize) };
}

async function addFishToInventory(userId, fishObj) {
    await db.collection('users').doc(userId).collection('fishInventory').add({
        ...fishObj,
        caughtAt: Date.now()
    });
}

async function removeFishFromInventory(userId, docId) {
    await db.collection('users').doc(userId).collection('fishInventory').doc(docId).delete();
}

async function clearInventory(userId) {
    const snap = await db.collection('users').doc(userId).collection('fishInventory').get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return snap.docs.length;
}

// ─── Guild zone setup ─────────────────────────────────────────
async function getZoneSetup(guildId) {
    const doc = await db.collection('guildConfig').doc(guildId).get();
    const data = doc.exists ? doc.data() : {};
    return data.fishZones || {};
}

async function setZoneSetup(guildId, zoneData) {
    await db.collection('guildConfig').doc(guildId).set(
        { fishZones: zoneData },
        { merge: true }
    );
}

async function getChannelZone(guildId, channelId) {
    const zones = await getZoneSetup(guildId);
    if (zones.zone1Channel === channelId) return 1;
    if (zones.zone2Channel === channelId) return 2;
    if (zones.zone3Channel === channelId) return 3;
    return null;
}

// ─── Shop notify message tracking ────────────────────────────────
async function getShopNotifyMsg(guildId) {
    const doc = await db.collection('guildConfig').doc(guildId).get();
    const data = doc.exists ? doc.data() : {};
    return data.fishShopNotifyMsg || null; // { messageId, channelId }
}

async function setShopNotifyMsg(guildId, msgData) {
    await db.collection('guildConfig').doc(guildId).set(
        { fishShopNotifyMsg: msgData },
        { merge: true }
    );
}

module.exports = {
    getFishProfile, setUserRod, updateRodDurability, incrementCaught,
    getInventory, addFishToInventory, removeFishFromInventory, clearInventory,
    getZoneSetup, setZoneSetup, getChannelZone,
    getShopNotifyMsg, setShopNotifyMsg
};
