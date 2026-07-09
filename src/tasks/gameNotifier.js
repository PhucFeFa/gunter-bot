const cron = require('node-cron');
const axios = require('axios');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getConfig, addNotifiedGame } = require('../utils/configDB');

async function checkFreeGames(client) {
    try {
        const res = await axios.get('https://www.gamerpower.com/api/giveaways?type=game');
        if (!res.data || !Array.isArray(res.data)) return;
        
        // Lọc các game chuẩn (Active, có giá trị gốc)
        const validPlatforms = ['PC', 'Epic Games Store', 'Steam', 'GOG'];
        const games = res.data.filter(g => 
            g.status === 'Active' && 
            validPlatforms.some(p => g.platforms.includes(p)) &&
            g.worth !== 'N/A' 
        );

        if (games.length === 0) return;

        // Quét từng server bot đang tham gia
        for (const guild of client.guilds.cache.values()) {
            const config = await getConfig(guild.id);
            if (!config.game_alert_channel_id) continue;
            
            const channel = guild.channels.cache.get(config.game_alert_channel_id);
            if (!channel) continue;

            const notified = config.notified_games || [];
            let announcedCount = 0;
            
            // Xếp game mới nhất lên trước
            games.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());

            for (const game of games) {
                // Đã thông báo rồi thì bỏ qua
                if (notified.includes(game.id)) continue;
                
                // Chỉ lấy Epic hoặc Steam
                const isEpicOrSteam = game.platforms.toLowerCase().includes('epic') || game.platforms.toLowerCase().includes('steam') || game.title.toLowerCase().includes('epic') || game.title.toLowerCase().includes('steam');
                if (!isEpicOrSteam) {
                    await addNotifiedGame(guild.id, game.id); // Đánh dấu bỏ qua để lần sau đỡ phải check
                    continue;
                }

                // Chống spam: Nếu game đã đăng từ quá 3 ngày trước thì thôi không đào mộ
                const pubDate = new Date(game.published_date + ' UTC');
                if (Date.now() - pubDate.getTime() > 3 * 24 * 60 * 60 * 1000) {
                    await addNotifiedGame(guild.id, game.id);
                    continue;
                }

                // Gửi thông báo
                const embed = new EmbedBuilder()
                    .setColor(game.platforms.toLowerCase().includes('epic') ? 0x313131 : 0x1B2838) // Đen/Xám chuẩn màu 2 Launcher
                    .setTitle(`🎮 [FREE GAME] ${game.title}`)
                    .setURL(game.open_giveaway)
                    .setDescription(game.description.substring(0, 300) + '...')
                    .addFields(
                        { name: '💰 Giá gốc', value: `~~${game.worth}~~ ➡️ **MIỄN PHÍ**`, inline: true },
                        { name: '🖥️ Nền tảng', value: game.platforms, inline: true },
                        { name: '⏳ Hạn chót', value: game.end_date === 'N/A' ? 'Không rõ' : game.end_date, inline: true }
                    )
                    .setImage(game.image)
                    .setFooter({ text: 'Gunter Game Tracker 🐧' })
                    .setTimestamp();

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Húp ngay cho nóng')
                        .setStyle(ButtonStyle.Link)
                        .setURL(game.open_giveaway)
                );

                const ping = config.game_alert_role_id ? `<@&${config.game_alert_role_id}>` : '@everyone';

                await channel.send({ content: `🚨 **CÓ GAME FREE ANH EM ƠI!** ${ping}`, embeds: [embed], components: [row] });
                
                // Lưu vào DB để không lặp lại
                await addNotifiedGame(guild.id, game.id);
                announcedCount++;

                // Chống spam mỗi đợt check chỉ thông báo max 3 game một lúc
                if (announcedCount >= 3) break;
            }
        }
    } catch (error) {
        console.error('[GAME ALERT] Error fetching games:', error.message);
    }
}

function initGameNotifier(client) {
    // Chạy mỗi 30 phút một lần (ở phút thứ 0 và 30)
    cron.schedule('*/30 * * * *', () => {
        checkFreeGames(client);
    });
    
    // Khi khởi động bot, kiểm tra luôn 1 lần (sau 10 giây để đảm bảo bot sẵn sàng)
    setTimeout(() => {
        checkFreeGames(client);
    }, 10000);
}

module.exports = { initGameNotifier };
