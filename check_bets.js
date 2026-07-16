const fs = require('fs');
const path = require('path');
const BETS_FILE = path.join(__dirname, 'src', 'data', 'footballBets.json');
let data;
try {
    data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf-8'));
    console.log("Bets data:", data);
} catch (e) {
    console.log("Error reading bets file:", e);
}
