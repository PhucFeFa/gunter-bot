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
const STARTING_BALANCE = 500000; // Coins every new user starts with
const DAILY_AMOUNT = 500000;  // Coins per /daily claim
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours in ms

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
            voice_time: 0,
            given_today: 0,
            last_give_date: '',
            tarot_count_today: 0,
            last_tarot_date: '',
            job: null,
            lastWork: null,
            loanAmount: 0,
            jobSpins: 0,
            creditScore: 0,
            loanRefs: [],
            seizedRod: null,
            seizedRequire: 0
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
 * Cập nhật số tiền nợ của user
 */
async function updateLoan(userId, delta) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    const newLoan = Math.max(0, (user.loanAmount || 0) + delta);
    await ref.update({ loanAmount: newLoan });
    return newLoan;
}

/**
 * Cập nhật Điểm tín dụng
 */
async function updateCreditScore(userId, delta) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    // Max credit score = 100
    const newScore = Math.min(100, Math.max(0, (user.creditScore || 0) + delta));
    await ref.update({ creditScore: newScore });
    return newScore;
}

/**
 * Lưu người tham chiếu và thông tin siết nợ
 */
async function updateLoanDetails(userId, refs, seizedRod, seizedRequire) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const updateData = {};
    if (refs !== undefined) updateData.loanRefs = refs;
    if (seizedRod !== undefined) updateData.seizedRod = seizedRod;
    if (seizedRequire !== undefined) updateData.seizedRequire = seizedRequire;
    await ref.update(updateData);
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

/**
 * Chuyển tiền an toàn có giới hạn (Tối đa 3.000.000 mỗi ngày)
 */
async function transferMoney(fromUserId, toUserId, amount) {
    if (amount <= 0) return { success: false, reason: 'Số tiền không hợp lệ' };

    const sender = await getUser(fromUserId);
    if (sender.balance < amount) return { success: false, reason: 'Không đủ tiền' };

    const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',');
    const isAdmin = ownerIds.includes(fromUserId);

    const todayDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    let currentGiven = sender.given_today || 0;
    if (sender.last_give_date !== todayDate) {
        currentGiven = 0;
    }

    if (!isAdmin) {
        // Chặn chuyển tiền vay nợ đối với user thường
        const currentLoan = sender.loanAmount || 0;
        const ownMoney = Math.max(0, sender.balance - currentLoan);
        if (amount > ownMoney) {
            return { success: false, reason: `Bạn đang nợ giang hồ ${currentLoan.toLocaleString()} 🪙 nên phần tiền này bị phong tỏa! Số dư hợp pháp có thể chuyển: ${ownMoney.toLocaleString()} 🪙.` };
        }

        const MAX_GIVE = 100000000;
        if (currentGiven + amount > MAX_GIVE) {
            return { success: false, reason: `Bạn đã đạt giới hạn chuyển tiền hôm nay! (Tối đa 100.000.000 🪙/ngày). Còn lại có thể chuyển: ${MAX_GIVE - currentGiven} 🪙.` };
        }
    }

    // Thực hiện trừ tiền người gửi và cộng cho người nhận
    await db.collection(USERS_COLLECTION).doc(fromUserId).update({
        balance: sender.balance - amount,
        given_today: currentGiven + amount,
        last_give_date: todayDate
    });

    const receiver = await getUser(toUserId);
    await db.collection(USERS_COLLECTION).doc(toUserId).update({
        balance: receiver.balance + amount
    });

    return { success: true };
}

/**
 * Kiểm tra và tăng lượt chơi tarot hôm nay (Tối đa 5 lần/ngày)
 */
async function recordTarotPlay(userId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    const user = await getUser(userId);
    const todayDate = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"

    let currentTarotCount = user.tarot_count_today || 0;
    if (user.last_tarot_date !== todayDate) {
        currentTarotCount = 0;
    }

    if (currentTarotCount >= 5) {
        return { success: false };
    }

    await ref.update({
        tarot_count_today: currentTarotCount + 1,
        last_tarot_date: todayDate
    });

    return { success: true, remaining: 5 - (currentTarotCount + 1) };
}

/**
 * Lấy thông tin công việc và thời gian làm việc cuối
 */
async function getJobData(userId) {
    const user = await getUser(userId);
    return { job: user.job || null, lastWork: user.lastWork || null, jobSpins: user.jobSpins || 0 };
}

/**
 * Cập nhật công việc mới cho user
 */
async function setJob(userId, jobId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    // Reset điểm tín dụng về 0 khi đổi nghề
    await ref.update({ job: jobId, creditScore: 0 });
}

/**
 * Cập nhật số lần quay job (pity system)
 */
async function updateJobSpins(userId, spins) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    await ref.update({ jobSpins: spins });
}

/**
 * Cập nhật thời gian làm việc cuối
 */
async function updateLastWork(userId) {
    const ref = db.collection(USERS_COLLECTION).doc(userId);
    await ref.update({ lastWork: Date.now() });
}

/**
 * Lấy danh sách những người đang có nợ
 */
async function getAllDebtors() {
    const snapshot = await db.collection(USERS_COLLECTION)
        .where('loanAmount', '>', 0)
        .get();

    const debtors = [];
    snapshot.forEach(doc => debtors.push(doc.data()));
    return debtors;
}

module.exports = { getUser, updateBalance, claimDaily, incrementMsgCount, addVoiceTime, getTopUsers, transferMoney, recordTarotPlay, DAILY_AMOUNT, STARTING_BALANCE, getJobData, setJob, updateJobSpins, updateLastWork, updateLoan, updateCreditScore, updateLoanDetails, getAllDebtors };
