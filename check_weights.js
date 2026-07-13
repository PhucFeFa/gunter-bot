const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/jobs.js');
let code = fs.readFileSync(filePath, 'utf8');

const matches = [...code.matchAll(/rarity:\s*['"](Divine)['"],[\s\S]*?weight:\s*(\d+)/g)];

console.log("Current Weights for Divine:");
matches.forEach(m => {
    console.log(m[1], m[2]);
});
