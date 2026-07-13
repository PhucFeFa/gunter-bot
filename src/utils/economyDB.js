/**
 * utils/economyDB.js
 * ============================================================
 * Economy Database Helpers (SQLite)
 * ============================================================
 */
const db = require('./sqliteDB');

const STARTING_BALANCE = 500000;
const DAILY_AMOUNT = 500000;
const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

// Migration: thêm cột botDebt nếu chưa tồn tại
try { db.prepare('ALTER TABLE users ADD COLUMN botDebt INTEGER DEFAULT 0').run(); } catch (e) { /* Cột đã tồn tại */ }

function getUser(userId) {
    let row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    if (!row) {
        db.prepare('INSERT INTO users (userId, balance) VALUES (?, ?)').run(userId, STARTING_BALANCE);
        row = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId);
    }
    // Parse JSON arrays
    row.loanRefs = JSON.parse(row.loanRefs || '[]');
    return row;
}

function updateBalance(userId, delta) {
    const user = getUser(userId);
    const newBalance = Math.max(0, user.balance + delta);
    db.prepare('UPDATE users SET balance = ? WHERE userId = ?').run(newBalance, userId);
    return newBalance;
}

function updateLoan(userId, delta) {
    const user = getUser(userId);
    const newLoan = Math.max(0, (user.loanAmount || 0) + delta);
    db.prepare('UPDATE users SET loanAmount = ? WHERE userId = ?').run(newLoan, userId);
    return newLoan;
}

/**
 * setBotDebt: Ghi/thêm nợ do bot ép (tách khỏi nợ vay tay)
 * delta > 0: thêm nợ, delta < 0: trừ nợ
 */
function setBotDebt(userId, delta) {
    const user = getUser(userId);
    const newBotDebt = Math.max(0, (user.botDebt || 0) + delta);
    db.prepare('UPDATE users SET botDebt = ? WHERE userId = ?').run(newBotDebt, userId);
    // Đồng bộ loanAmount để các hàm khác (work, leaderboard...) nhìn thấy
    updateLoan(userId, delta);
    return newBotDebt;
}

function updateCreditScore(userId, delta) {
    const user = getUser(userId);
    const newScore = Math.min(100, Math.max(0, (user.creditScore || 0) + delta));
    db.prepare('UPDATE users SET creditScore = ? WHERE userId = ?').run(newScore, userId);
    return newScore;
}

function updateLoanDetails(userId, refs, seizedRod, seizedRequire) {
    let query = 'UPDATE users SET ';
    const updates = [];
    const params = [];

    if (refs !== undefined) {
        updates.push('loanRefs = ?');
        params.push(JSON.stringify(refs));
    }
    if (seizedRod !== undefined) {
        updates.push('seizedRod = ?');
        params.push(seizedRod);
    }
    if (seizedRequire !== undefined) {
        updates.push('seizedRequire = ?');
        params.push(seizedRequire);
    }

    if (updates.length === 0) return;

    query += updates.join(', ') + ' WHERE userId = ?';
    params.push(userId);
    db.prepare(query).run(...params);
}

function claimDaily(userId) {
    const user = getUser(userId);
    const now = Date.now();

    if (user.lastDaily && (now - user.lastDaily) < DAILY_COOLDOWN) {
        const remaining = DAILY_COOLDOWN - (now - user.lastDaily);
        return { success: false, newBalance: user.balance, remaining };
    }

    const newBalance = user.balance + DAILY_AMOUNT;
    db.prepare('UPDATE users SET balance = ?, lastDaily = ? WHERE userId = ?').run(newBalance, now, userId);
    return { success: true, newBalance, remaining: 0 };
}

function incrementMsgCount(userId) {
    db.prepare('UPDATE users SET msg_count = COALESCE(msg_count, 0) + 1 WHERE userId = ?').run(userId);
}

function addVoiceTime(userId, ms) {
    if (ms <= 0) return;
    db.prepare('UPDATE users SET voice_time = COALESCE(voice_time, 0) + ? WHERE userId = ?').run(ms, userId);
}

function getTopUsers(field, limitCount = 10) {
    const allowedFields = ['balance', 'msg_count', 'voice_time', 'loanAmount', 'botDebt'];
    if (!allowedFields.includes(field)) field = 'balance';
    return db.prepare(`SELECT * FROM users WHERE userId != '586904255860965386' AND ${field} > 0 ORDER BY ${field} DESC LIMIT ?`).all(limitCount);
}

function transferMoney(fromUserId, toUserId, amount) {
    if (amount <= 0) return { success: false, reason: 'Số tiền không hợp lệ' };
    
    const sender = getUser(fromUserId);
    if (sender.balance < amount) return { success: false, reason: 'Không đủ tiền' };

    const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',');
    const isAdmin = ownerIds.includes(fromUserId);
    const todayDate = new Date().toISOString().split('T')[0];

    let currentGiven = sender.given_today || 0;
    if (sender.last_give_date !== todayDate) {
        currentGiven = 0;
    }

    if (!isAdmin) {
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

    const transaction = db.transaction(() => {
        db.prepare('UPDATE users SET balance = balance - ?, given_today = ?, last_give_date = ? WHERE userId = ?')
          .run(amount, currentGiven + amount, todayDate, fromUserId);
        
        getUser(toUserId); // Ensure receiver exists
        db.prepare('UPDATE users SET balance = balance + ? WHERE userId = ?')
          .run(amount, toUserId);
    });

    transaction();
    return { success: true };
}

function recordTarotPlay(userId) {
    const user = getUser(userId);
    const todayDate = new Date().toISOString().split('T')[0];

    let currentTarotCount = user.tarot_count_today || 0;
    if (user.last_tarot_date !== todayDate) {
        currentTarotCount = 0;
    }

    if (currentTarotCount >= 5) return { success: false };

    db.prepare('UPDATE users SET tarot_count_today = ?, last_tarot_date = ? WHERE userId = ?')
      .run(currentTarotCount + 1, todayDate, userId);

    return { success: true, remaining: 5 - (currentTarotCount + 1) };
}

function getJobData(userId) {
    const user = getUser(userId);
    return { job: user.job || null, lastWork: user.lastWork || null, jobSpins: user.jobSpins || 0 };
}

function setJob(userId, jobId) {
    db.prepare('UPDATE users SET job = ?, creditScore = 0 WHERE userId = ?').run(jobId, userId);
}

function updateJobSpins(userId, spins) {
    db.prepare('UPDATE users SET jobSpins = ? WHERE userId = ?').run(spins, userId);
}

function updateLastWork(userId) {
    db.prepare('UPDATE users SET lastWork = ? WHERE userId = ?').run(Date.now(), userId);
}

function getAllDebtors() {
    return db.prepare('SELECT * FROM users WHERE loanAmount > 0').all().map(u => {
        u.loanRefs = JSON.parse(u.loanRefs || '[]');
        return u;
    });
}

// Chuyển toàn bộ async functions thành sync hoặc trả về Promise.resolve để tương thích ngược với code bot cũ đang dùng `await`
module.exports = {
    getUser: async (id) => getUser(id),
    updateBalance: async (id, d) => updateBalance(id, d),
    claimDaily: async (id) => claimDaily(id),
    incrementMsgCount: async (id) => incrementMsgCount(id),
    addVoiceTime: async (id, ms) => addVoiceTime(id, ms),
    getTopUsers: async (f, l) => getTopUsers(f, l),
    transferMoney: async (f, t, a) => transferMoney(f, t, a),
    recordTarotPlay: async (id) => recordTarotPlay(id),
    DAILY_AMOUNT,
    STARTING_BALANCE,
    getJobData: async (id) => getJobData(id),
    setJob: async (id, jId) => setJob(id, jId),
    updateJobSpins: async (id, s) => updateJobSpins(id, s),
    updateLastWork: async (id) => updateLastWork(id),
    updateLoan: async (id, d) => updateLoan(id, d),
    setBotDebt: async (id, d) => setBotDebt(id, d),
    updateCreditScore: async (id, d) => updateCreditScore(id, d),
    updateLoanDetails: async (id, refs, r, req) => updateLoanDetails(id, refs, r, req),
    getAllDebtors: async () => getAllDebtors()
};
