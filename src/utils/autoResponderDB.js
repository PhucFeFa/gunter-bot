const db = require('./sqliteDB');
const fs = require('fs');
const path = require('path');

// Tự động migrate data cũ nếu còn file JSON
const JSON_FILE = path.join(__dirname, '../../data/autoresponse.json');
if (fs.existsSync(JSON_FILE)) {
    try {
        const data = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
        const insert = db.prepare('INSERT OR IGNORE INTO auto_responses (id, data) VALUES (?, ?)');
        db.transaction(() => {
            for (const item of data) {
                insert.run(item.id, JSON.stringify(item));
            }
        })();
        // Đổi tên file để không migrate lại lần sau
        fs.renameSync(JSON_FILE, JSON_FILE + '.bak');
        console.log('[SQLite] Đã di chuyển dữ liệu AutoResponse từ JSON sang SQLite.');
    } catch(e) {}
}

function addResponse(trigger, response, match_type = 'contains', cooldown = 5, channels = []) {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const dataObj = { id, trigger, response, match_type, cooldown, channels };
    db.prepare('INSERT INTO auto_responses (id, data) VALUES (?, ?)').run(id, JSON.stringify(dataObj));
    return id;
}

function removeResponse(id) {
    const info = db.prepare('DELETE FROM auto_responses WHERE id = ?').run(id);
    return info.changes > 0;
}

function getResponses() {
    const rows = db.prepare('SELECT data FROM auto_responses').all();
    return rows.map(r => JSON.parse(r.data));
}

module.exports = {
    addResponse,
    removeResponse,
    getResponses
};
