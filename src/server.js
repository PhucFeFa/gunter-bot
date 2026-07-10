const express = require('express');
const cors = require('cors');
const { db } = require('./utils/firebase');

const app = express();
app.use(cors());
app.use(express.json());

function startServer(client) {
    const PORT = process.env.PORT || 3001;

    // Endpoint gốc để UptimeRobot ping giữ bot thức
    app.get('/', (req, res) => {
        res.send('Gunter Bot is running 24/7!');
    });

    // API: Lấy Bảng xếp hạng tiền tệ (Leaderboard)
    app.get('/api/leaderboard', async (req, res) => {
        try {
            // Lấy tất cả user từ collection 'users'
            const snapshot = await db.collection('users').get();
            let leaderboard = [];

            snapshot.forEach(doc => {
                leaderboard.push({
                    userId: doc.id,
                    balance: doc.data().balance || 0
                });
            });

            // Sắp xếp giảm dần theo balance
            leaderboard.sort((a, b) => b.balance - a.balance);

            // Giới hạn Top 100
            leaderboard = leaderboard.slice(0, 100);

            // Gắn thêm Avatar và Tên (Username) từ Discord Client
            for (let i = 0; i < leaderboard.length; i++) {
                try {
                    const user = await client.users.fetch(leaderboard[i].userId);
                    leaderboard[i].username = user.username;
                    leaderboard[i].avatar = user.displayAvatarURL({ extension: 'png', size: 128 });
                } catch (e) {
                    leaderboard[i].username = "Người dùng ẩn danh";
                    leaderboard[i].avatar = "https://cdn.discordapp.com/embed/avatars/0.png";
                }
            }

            res.json({ success: true, data: leaderboard });
        } catch (error) {
            console.error('[API] Lỗi lấy Leaderboard:', error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        }
    });

    // API: Lấy thông tin chung của Bot
    app.get('/api/bot-stats', (req, res) => {
        res.json({
            success: true,
            data: {
                guilds: client.guilds.cache.size,
                users: client.users.cache.size,
                botName: client.user.username,
                botAvatar: client.user.displayAvatarURL()
            }
        });
    });

    app.listen(PORT, () => {
        console.log(`[SERVER] API Backend đang chạy tại http://localhost:${PORT}`);
    });
}

module.exports = { startServer };
