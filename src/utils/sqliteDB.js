const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'database.sqlite'));
db.pragma('journal_mode = WAL');

function initDB() {
    // Bang users: Giu nguyen cac cot cu + them data de chua cac truong linh tinh
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            userId TEXT PRIMARY KEY,
            balance INTEGER DEFAULT 500000,
            lastDaily INTEGER,
            msg_count INTEGER DEFAULT 0,
            voice_time INTEGER DEFAULT 0,
            given_today INTEGER DEFAULT 0,
            last_give_date TEXT DEFAULT '',
            tarot_count_today INTEGER DEFAULT 0,
            last_tarot_date TEXT DEFAULT '',
            job TEXT,
            lastWork INTEGER,
            loanAmount INTEGER DEFAULT 0,
            jobSpins INTEGER DEFAULT 0,
            creditScore INTEGER DEFAULT 0,
            loanRefs TEXT DEFAULT '[]',
            seizedRod INTEGER,
            seizedRequire INTEGER DEFAULT 0,
            data TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS configs (
            guildId TEXT PRIMARY KEY,
            data TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS auto_responses (
            id TEXT PRIMARY KEY,
            data TEXT DEFAULT '{}'
        );

        CREATE TABLE IF NOT EXISTS fish_inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            fishId INTEGER,
            name TEXT,
            emoji TEXT,
            zone INTEGER,
            tier INTEGER,
            size INTEGER,
            price INTEGER,
            isShiny INTEGER,
            caughtAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS fish_profiles (
            userId TEXT PRIMARY KEY,
            rod INTEGER DEFAULT 1,
            rodDurability INTEGER,
            totalCaught INTEGER DEFAULT 0
        );
    `);
    
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_fish_inv_userid ON fish_inventory(userId);
        CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);
    `);
}

initDB();

module.exports = db;
