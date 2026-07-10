const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', '..', 'data', 'autoresponse.json');

// Đảm bảo thư mục data tồn tại
const dataDir = path.dirname(DB_FILE);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Format: 
// [
//   { 
//     id: 'unique_id', 
//     trigger: ['hello', 'hi'], 
//     response: 'Chào bạn!', 
//     match_type: 'contains', // 'exact', 'contains', 'regex'
//     cooldown: 5, // thời gian cooldown tính bằng giây (default 5s)
//     channels: [] // Nếu rỗng thì tất cả kênh, nếu có ID thì chỉ các kênh đó
//   }
// ]

function loadConfig() {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
        return [];
    }
    try {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (e) {
        console.error('[AUTORESPONSE] Lỗi đọc file JSON:', e);
        return [];
    }
}

function saveConfig(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[AUTORESPONSE] Lỗi ghi file JSON:', e);
    }
}

function addResponse(trigger, response, match_type = 'contains', cooldown = 5, channels = []) {
    const data = loadConfig();
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    data.push({ id, trigger, response, match_type, cooldown, channels });
    saveConfig(data);
    return id;
}

function removeResponse(id) {
    let data = loadConfig();
    const initialLength = data.length;
    data = data.filter(item => item.id !== id);
    if (data.length !== initialLength) {
        saveConfig(data);
        return true;
    }
    return false;
}

function getResponses() {
    return loadConfig();
}

module.exports = {
    loadConfig,
    addResponse,
    removeResponse,
    getResponses
};
