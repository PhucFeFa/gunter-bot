const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const liveGameManager = require('../../utils/liveGameManager');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Đường dẫn lưu data cá cược
const BETS_FILE = path.join(__dirname, '..', '..', 'data', 'footballBets.json');
if (!fs.existsSync(BETS_FILE)) {
    fs.writeFileSync(BETS_FILE, JSON.stringify({ bets: [] }));
}

// Cấu hình API-Football
const API_KEY = 'WbHWnasCOMlZ57y2';
const API_URL = 'https://v3.football.api-sports.io';
const HEADERS = {
    'x-apisports-key': API_KEY,
    'x-rapidapi-host': 'v3.football.api-sports.io'
};

// Cache danh sách trận đấu để tối ưu RAM và Request
let cachedMatches = [];
let lastFetchTime = 0;

function getCachedMatches() {
    return cachedMatches;
}

module.exports = {
    getCachedMatches,
    data: new SlashCommandBuilder()
        .setName('bongda')
        .setDescription('Hệ thống cá độ bóng đá Live (Cập nhật liên tục)')
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Xem danh sách các trận đấu đang diễn ra hoặc sắp đá hôm nay'))
        .addSubcommand(sub => sub
            .setName('bet')
            .setDescription('Đặt cược vào một trận đấu')
            .addIntegerOption(opt => opt.setName('match_id').setDescription('Mã trận đấu (xem ở lệnh list)').setRequired(true))
            .addStringOption(opt => opt.setName('choice').setDescription('Chọn cửa').setRequired(true)
                .addChoices(
                    { name: 'Đội Nhà (Home)', value: 'home' },
                    { name: 'Đội Khách (Away)', value: 'away' },
                    { name: 'Hòa (Draw)', value: 'draw' }
                ))
            .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền cược').setRequired(true)))
        .addSubcommand(sub => sub
            .setName('mybets')
            .setDescription('Xem các vé cược đang chờ kết quả')),

    async execute(interaction) {
        const guildId = interaction.guildId;
        const liveChannelId = liveGameManager.getChannelByType(guildId, 'bongda');

        if (!liveChannelId) {
            return interaction.reply({ content: `❌ Trò chơi này hiện đang đóng cửa! Vui lòng chờ Admin mở Sòng **Bóng Đá Live** (lệnh \`/livegame\`).`, ephemeral: true });
        }
        if (interaction.channelId !== liveChannelId) {
            return interaction.reply({ content: `❌ Bắt quả tang đánh bạc trái phép! Hãy ra đúng sòng Bóng Đá tại <#${liveChannelId}> để chơi!`, ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        // Cho riêng lệnh list chạy ngầm (ephemeral) để không trôi tin nhắn
        await interaction.deferReply({ ephemeral: subcommand === 'list' });

        if (subcommand === 'list') {
            try {
                // Tối ưu: Nếu cache < 30 phút, dùng cache. Nếu không, gọi API (Tiết kiệm Request cực độ)
                const now = Date.now();
                if (now - lastFetchTime > 30 * 60 * 1000 || cachedMatches.length === 0) {
                    const today = new Date().toISOString().split('T')[0];
                    // Lấy các giải hot (Premier League 39, La Liga 140, Serie A 135, Bundesliga 78, Ligue 1 61, Champions League 2)
                    const res = await axios.get(`${API_URL}/fixtures?date=${today}`, { headers: HEADERS });
                    
                    if (res.data && res.data.response) {
                        const hotLeagues = [39, 140, 135, 78, 61, 2, 4];
                        cachedMatches = res.data.response.filter(match => hotLeagues.includes(match.league.id));
                        lastFetchTime = now;
                    }
                }

                if (cachedMatches.length === 0) {
                    return interaction.editReply('⚽ Hiện tại không có trận siêu kinh điển nào thuộc các giải đấu lớn diễn ra hôm nay. Sếp quay lại sau nhé!');
                }

                // Thiết kế UI Embed nhiều trận với cờ/logo
                const embeds = [];
                const components = [];

                // Lấy tối đa 5 trận để tránh bị dài quá
                const displayMatches = cachedMatches.slice(0, 5);

                // Thêm 1 Embed làm Tiêu đề Tổng
                const mainEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🏆 HỆ THỐNG CÁ ĐỘ BÓNG ĐÁ LIVE')
                    .setDescription('Dưới đây là các trận đấu HOT trong ngày. Dùng lệnh `/bongda bet` cùng **Mã Trận** để xuống xác!\n*(Tỷ lệ cược mặc định: x1.95)*')
                    .setThumbnail('https://cdn-icons-png.flaticon.com/512/5103/5103099.png');
                embeds.push(mainEmbed);

                displayMatches.forEach(m => {
                    const status = m.fixture.status.short;
                    const home = m.teams.home.name;
                    const homeLogo = m.teams.home.logo;
                    const away = m.teams.away.name;
                    const awayLogo = m.teams.away.logo;
                    const leagueFlag = m.league.flag || m.league.logo;
                    const time = new Date(m.fixture.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                    
                    let statusDisplay = `🕒 Sắp đá: ${time}`;
                    let color = 0x3498DB; // Xanh lam cho sắp đá

                    if (['1H', '2H', 'HT', 'LIVE'].includes(status)) {
                        statusDisplay = `🔴 LIVE: ${m.goals.home} - ${m.goals.away}`;
                        color = 0xE74C3C; // Đỏ cho Live
                    } else if (status === 'FT') {
                        statusDisplay = `✅ FT: ${m.goals.home} - ${m.goals.away}`;
                        color = 0x2ECC71; // Xanh lá cho FT
                    }

                    const matchEmbed = new EmbedBuilder()
                        .setColor(color)
                        .setAuthor({ name: `${away}`, iconURL: awayLogo })
                        .setTitle(`🔥 MÃ TRẬN: ${m.fixture.id} | 🏆 ${m.league.name}`)
                        .setThumbnail(homeLogo)
                        .setDescription(`**${home}** (Nhà) 🆚 **${away}** (Khách)\n\n📊 **Trạng thái:** ${statusDisplay}\n🏟️ **Sân:** ${m.fixture.venue.name || 'Đang cập nhật'}`)
                        .setFooter({ text: 'Home Logo (Phải) | Away Logo (Trái)', iconURL: leagueFlag });
                    
                    const actionRow = new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId(`bongdabet_${m.fixture.id}_home`)
                                .setLabel(home.length > 20 ? home.substring(0, 20) + '...' : home)
                                .setStyle(ButtonStyle.Primary),
                            new ButtonBuilder()
                                .setCustomId(`bongdabet_${m.fixture.id}_draw`)
                                .setLabel('Hòa (Draw)')
                                .setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder()
                                .setCustomId(`bongdabet_${m.fixture.id}_away`)
                                .setLabel(away.length > 20 ? away.substring(0, 20) + '...' : away)
                                .setStyle(ButtonStyle.Danger)
                        );

                    embeds.push(matchEmbed);
                    components.push(actionRow);
                });

                return interaction.editReply({ embeds: embeds, components: components });

            } catch (err) {
                console.error('[FOOTBALL] Lỗi tải list:', err);
                return interaction.editReply('❌ Hệ thống API bóng đá đang bảo trì hoặc hết lượt tải. Thử lại sau 30 phút nhé!');
            }
        }

        if (subcommand === 'bet') {
            const matchId = interaction.options.getInteger('match_id');
            const choice = interaction.options.getString('choice');
            const amount = interaction.options.getInteger('amount');

            if (amount <= 0) return interaction.editReply('❌ Cược clg mà âm tiền vậy thằng ngu?');

            const userData = await getUser(userId);
            if (userData.balance < amount) {
                return interaction.editReply(`❌ Trong túi còn có **${userData.balance.toLocaleString()} 🪙** mà đòi cược ${amount.toLocaleString()}? Chuyển sang cướp ngân hàng đi!`);
            }

            // Ghi nhận cược
            await updateBalance(userId, -amount);
            
            let data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf-8'));

            // Tìm tên đội từ cache nếu có
            const matchInfo = cachedMatches.find(m => m.fixture.id === matchId);
            const homeName = matchInfo ? matchInfo.teams.home.name : 'Đội Nhà';
            const awayName = matchInfo ? matchInfo.teams.away.name : 'Đội Khách';

            data.bets.push({
                userId,
                matchId,
                homeName,
                awayName,
                choice,
                amount,
                odds: 1.95, // Mặc định ăn 1.95
                timestamp: Date.now(),
                status: 'PENDING'
            });
            fs.writeFileSync(BETS_FILE, JSON.stringify(data, null, 4));

            let choiceDisplay = choice === 'home' ? `Đội Nhà (${homeName})` : (choice === 'away' ? `Đội Khách (${awayName})` : 'Hòa (Draw)');

            const embed = new EmbedBuilder()
                .setColor(0xF1C40F)
                .setTitle('🎰 XUỐNG XÁC THÀNH CÔNG!')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/3067/3067576.png')
                .setDescription(`Mày vừa vứt **${amount.toLocaleString()} 🪙** vào cửa **${choiceDisplay}** cho trận \`${homeName} vs ${awayName}\` (Mã \`${matchId}\`).\n\n` +
                                `💰 Nếu thắng mày húp: **${(amount * 1.95).toLocaleString()} 🪙**\n` +
                                `💀 Nếu thua: Ra đê ở!`)
                .setFooter({ text: 'Kết quả sẽ được tự động quyết toán khi trận đấu kết thúc (FT).' });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'mybets') {
            let data = JSON.parse(fs.readFileSync(BETS_FILE, 'utf-8'));
            const myBets = data.bets.filter(b => b.userId === userId && b.status === 'PENDING');

            if (myBets.length === 0) {
                return interaction.editReply('❌ Mày chưa có cái vé cược nào đang chờ kết quả cả!');
            }

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`🎫 VÉ CƯỢC CỦA TÀI LIỆT ${interaction.user.username}`)
                .setThumbnail(interaction.user.displayAvatarURL());

            myBets.forEach((b, index) => {
                const hName = b.homeName || 'Đội Nhà';
                const aName = b.awayName || 'Đội Khách';
                let choiceDisplay = b.choice === 'home' ? `[${hName}]` : (b.choice === 'away' ? `[${aName}]` : '[Hòa]');
                embed.addFields({
                    name: `#${index + 1} - Trận: ${b.matchId} (${hName} vs ${aName})`,
                    value: `Cửa cược: **${choiceDisplay}**\nTiền cược: **${b.amount.toLocaleString()} 🪙**\nTrạng thái: ⏳ Đang chờ...`,
                    inline: false
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }
    }
};
