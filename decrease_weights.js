const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/jobs.js');
let code = fs.readFileSync(filePath, 'utf8');

// Thay đổi weight của Mythic từ 2 thành 1
let updatedCode = code.replace(/(rarity:\s*['"]Mythic['"],[\s\S]*?weight:\s*)2/g, '$11');

fs.writeFileSync(filePath, updatedCode, 'utf8');
console.log('✅ Đã giảm rate các nghề Mythic (weight từ 2 xuống 1). Special và Secret vốn dĩ đã là 0.');
