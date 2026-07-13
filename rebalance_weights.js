const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/data/jobs.js');
let code = fs.readFileSync(filePath, 'utf8');

const targetWeights = {
    'Common': 200,
    'Uncommon': 70,
    'Rare': 35,
    'Epic': 12,
    'Legendary': 5,
    'Mythic': 1,
    'Divine': 0.2,
    'Special': 0.05,
    'Secret': 0.01
};

for (const [rarity, w] of Object.entries(targetWeights)) {
    const regex = new RegExp(`(rarity:\\s*['"]${rarity}['"],[^]*?weight:\\s*)[\\d.]+`, 'g');
    code = code.replace(regex, `$1${w}`);
}

// Remove the hardcoded probabilities in spinJob
// They look like:
/*
        // Tỷ lệ bí mật 0.01% ra Khô Gà Mixi, 0.01% ra Ộ Shisa (Secret)
        if (rand < 0.0001 * rateMultiplier) {
...
        if (rand >= 0.0010 * rateMultiplier && rand < 0.0012 * rateMultiplier) return module.exports.jobs['thay_ong_noi'];
*/
const spinJobRegex = /(\/\/\s*Tỷ lệ bí mật.*?)(?=\s*const jobList)/s;
code = code.replace(spinJobRegex, '');

// Also, the condition validJobs = jobList.filter(j => ['Legendary', 'Mythic', 'Divine'].includes(j.rarity)); 
// Pity should now maybe include Secret/Special too? We'll leave pity to Legendary/Mythic/Divine/Secret/Special
code = code.replace(
    /validJobs = jobList\.filter\(j => \['Legendary', 'Mythic', 'Divine'\]\.includes\(j\.rarity\)\);/g,
    `validJobs = jobList.filter(j => ['Legendary', 'Mythic', 'Divine', 'Special', 'Secret'].includes(j.rarity));`
);

fs.writeFileSync(filePath, code, 'utf8');
console.log('✅ Rebalanced all weights and removed hardcoded drops!');
