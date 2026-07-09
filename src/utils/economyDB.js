/**
 * utils/economyDB.js
 * ============================================================
 * Economy Database Helpers (Firestore)
 * ============================================================
 * All read/write operations for the economy system go here.
 * Collection: "users"
 * Document ID: userId (Discord snowflake)
 * Fields: { userId, balance, lastDaily }
 * ============================================================
 */

const { db } = require('./firebase');

const USERS_COLLECTION = 'users';
const STARTING_BALANCE = 500; // Coins every new user starts with
const DAILY_AMOUNT    = 200;  // Coins per /daily claim
const DAILY_COOLDOWN  = 24 * 60 * 60 * 1000; // 24 hours in ms

/**
 * Fetch a user document, creating it with defaults if not found.
 * @param {string} userId
 * @returns {Promise<{userId:string, balance:number, lastDaily:number|null}>}
 */
async function getUser(userId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const snap = await ref.get();

    if (!snap.exists) {
        const defaultData = { 
            userId, 
            balance: STARTING_BALANCE, 
            lastDaily: null,
            msg_count: 0,
            voice_time: 0
        };
        await ref.set(defaultData);
        return defaultData;
    }
    return snap.data();
}

/**
 * Update the balance of a user by a delta (positive or negative).
 * @param {string} userId
 * @param {number} delta - Amount to add (negative to subtract)
 * @returns {Promise<number>} - The new balance
 */
async function updateBalance(userId, delta) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    const newBalance = Math.max(0, user.balance + delta); // Floor at 0
    await ref.update({ balance: newBalance });
    return newBalance;
}

/**
 * Attempt to claim the daily reward.
 * @param {string} userId
 * @returns {Promise<{success:boolean, newBalance:number, remaining:number}>}
 */
async function claimDaily(userId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    const now = Date.now();

    if (user.lastDaily && (now - user.lastDaily) < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - (now - user.lastDaily);
        return { success: false, newBalance: user.balance, remaining };
    }

    const newBalance = user.balance + DAILY_AMOUNT;
    await ref.update({ balance: newBalance, lastDaily: now });
    return { success: true, newBalance, remaining: 0 };
}

/**
 * Tăng số lượng tin nhắn của user
 */
async function incrementMsgCount(userId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    await ref.update({ msg_count: (user.msg_count || 0) + 1 });
}

/**
 * Cộng thêm thời gian Voice (tính bằng mili giây)
 */
async function addVoiceTime(userId, ms) {
    if (ms <= 0) return;
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    await ref.update({ voice_time: (user.voice_time || 0) + ms });
}

/**
 * Lấy danh sách Top theo trường dữ liệu
 * @param {string} field - 'balance', 'msg_count', hoặc 'voice_time'
 */
async function getTopUsers(field, limitCount = 10) {
    const snapshot = await db.collection(USERS_COLLECTION)
        .orderBy(field, 'desc')
        .limit(limitCount)
        .get();
        
    const top = [];
    snapshot.forEach(doc => top.push(doc.data()));
    return top;
}

module.exports = { getUser, updateBalance, claimDaily, incrementMsgCount, addVoiceTime, getTopUsers, DAILY_AMOUNT, STARTING_BALANCE };
