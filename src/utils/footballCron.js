const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { updateBalance } = require('./economyDB');

const BETS_FILE = path.join(__dirname, '..', 'data', 'footballBets.json');
const API_KEY = 'WbHWnasCOMlZ57y2';
const API_URL = `http://api.isportsapi.com/sport/football/livescores?api_key=${API_KEY}`;

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
        let resolvedCount = 0;
        
        // Gọi API lấy toàn bộ trận đấu hôm nay
        const res = await axios.get(API_URL);
        
        if (res.data && res.data.data) {
            const allMatches = res.data.data;
            
            // Lọc ra các trận đấu đã kết thúc (status = -1)
            const finishedMatches = allMatches.filter(m => m.status === -1);
            
            for (const match of finishedMatches) {
                const matchId = match.matchId.toString();
                
                // Xem có vé cược nào cho trận này không
                const betsForMatch = pendingBets.filter(b => b.matchId.toString() === matchId);
                if (betsForMatch.length === 0) continue;
                
                const homeGoals = match.homeScore;
                const awayGoals = match.awayScore;
                
                let winningChoice = 'draw';
                if (homeGoals > awayGoals) winningChoice = 'home';
                else if (awayGoals > homeGoals) winningChoice = 'away';

                // Duyệt qua các vé cược của trận này
                for (let bet of data.bets) {
                    if (bet.matchId.toString() === matchId && bet.status === 'PENDING') {
                        const user = await client.users.fetch(bet.userId).catch(() => null);
                        if (bet.choice === winningChoice) {
                            bet.status = 'WON';
                            const winnings = Math.floor(bet.amount * bet.odds);
                            await updateBalance(bet.userId, winnings);
                            
                            if (user) {
                                user.send(`🎉 **CHÚC MỪNG MÀY!**\nMày đã trúng kèo trận \`${match.homeName} vs ${match.awayName}\`!\nTiền cược: ${bet.amount.toLocaleString()} 🪙\nThắng được: **${winnings.toLocaleString()} 🪙**!`).catch(() => {});
                            }
                        } else {
                            bet.status = 'LOST';
                            if (user) {
                                user.send(`💀 **RA ĐÊ Ở NHÉ CON!**\nMày đã thua kèo trận \`${match.homeName} vs ${match.awayName}\`!\nCửa mày cược là **${bet.choice}**, nhưng kết quả lại là **${winningChoice}**.\nMất trắng **${bet.amount.toLocaleString()} 🪙**!`).catch(() => {});
                            }
                        }
                        resolvedCount++;
                    }
                }
            }
        }

        // Dọn dẹp các vé cược đã xong (giữ lại trong 3 ngày để tra cứu nếu cần)
        const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        const initialLength = data.bets.length;
        data.bets = data.bets.filter(b => b.status === 'PENDING' || (now - b.timestamp) < THREE_DAYS);

        // Lưu lại kết quả nếu có vé được quyết toán HOẶC có vé cũ bị xóa
        if (resolvedCount > 0 || data.bets.length !== initialLength) {
            fs.writeFileSync(BETS_FILE, JSON.stringify(data, null, 4));
            if (resolvedCount > 0) {
                console.log(`[FOOTBALL] Đã quyết toán xong ${resolvedCount} vé cược!`);
            }
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
