const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { updateBalance } = require('./economyDB');

const BETS_FILE = path.join(__dirname, '..', 'data', 'footballBets.json');
const API_KEY = 'WbHWnasCOMlZ57y2';
const API_URL = 'https://v3.football.api-sports.io';
const HEADERS = {
    'x-apisports-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

async function checkAndResolveBets(client) {
    if (!fs.existsSync(BETS_FILE)) return;
    let data;
    try {
        data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf-8'));
    } catch (e) {
        return;
    }

    if (!data.bets || data.bets.length === 0) return;

    // Lọc ra các cược đang pending
    const pendingBets = data.bets.filter(b => b.status === 'PENDING');
    if (pendingBets.length === 0) return;

    // Gom các match_id duy nhất để gọi API 1 lần
    const uniqueMatchIds = [...new Set(pendingBets.map(b => b.matchId))];

    try {
        // Chỉ lấy thông tin của các trận đang có người cược
        // Giới hạn query param id theo API (tối đa 20 id 1 lần)
        let resolvedCount = 0;
        
        for (let i = 0; i < uniqueMatchIds.length; i += 20) {
            const batchIds = uniqueMatchIds.slice(i, i + 20).join('-');
            const res = await axios.get(`${API_URL}/fixtures?ids=${batchIds}`, { headers: HEADERS });
            
            if (res.data && res.data.response) {
                for (const match of res.data.response) {
                    const matchId = match.fixture.id;
                    const status = match.fixture.status.short;

                    // Nếu trận đấu đã kết thúc
                    if (['FT', 'AET', 'PEN'].includes(status)) {
                        const homeGoals = match.goals.home;
                        const awayGoals = match.goals.away;
                        
                        let winningChoice = 'draw';
                        if (homeGoals > awayGoals) winningChoice = 'home';
                        else if (awayGoals > homeGoals) winningChoice = 'away';

                        // Duyệt qua các vé cược của trận này
                        for (let bet of data.bets) {
                            if (bet.matchId === matchId && bet.status === 'PENDING') {
                                const user = await client.users.fetch(bet.userId).catch(() => null);
                                if (bet.choice === winningChoice) {
                                    bet.status = 'WON';
                                    const winnings = Math.floor(bet.amount * bet.odds);
                                    await updateBalance(bet.userId, winnings);
                                    
                                    if (user) {
                                        user.send(`🎉 **CHÚC MỪNG MÀY!**\nMày đã trúng kèo trận \`${match.teams.home.name} vs ${match.teams.away.name}\`!\nTiền cược: ${bet.amount.toLocaleString()} 🪙\nThắng được: **${winnings.toLocaleString()} 🪙**!`).catch(() => {});
                                    }
                                } else {
                                    bet.status = 'LOST';
                                    if (user) {
                                        user.send(`💀 **RA ĐÊ Ở NHÉ CON!**\nMày đã thua kèo trận \`${match.teams.home.name} vs ${match.teams.away.name}\`!\nCửa mày cược là **${bet.choice}**, nhưng kết quả lại là **${winningChoice}**.\nMất trắng **${bet.amount.toLocaleString()} 🪙**!`).catch(() => {});
                                    }
                                }
                                resolvedCount++;
                            }
                        }
                    }
                }
            }
        }

        // Lưu lại kết quả
        if (resolvedCount > 0) {
            fs.writeFileSync(BETS_FILE, JSON.stringify(data, null, 4));
            console.log(`[FOOTBALL] Đã quyết toán xong ${resolvedCount} vé cược!`);
        }

    } catch (err) {
        console.error('[FOOTBALL] Lỗi khi quyết toán cược:', err.message);
    }
}

function startFootballCron(client) {
    // Chạy kiểm tra mỗi 15 phút (900,000 ms)
    setInterval(() => {
        checkAndResolveBets(client);
    }, 15 * 60 * 1000);
    console.log('[FOOTBALL] Football Cron Job đã được khởi động (Chạy mỗi 15 phút)!');
}

module.exports = { startFootballCron };
