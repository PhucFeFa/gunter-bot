const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getTopUsers } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('🏆 Bảng xếp hạng Server')
        .addStringOption(option => 
            option.setName('category')
                .setDescription('Chọn bảng xếp hạng muốn xem')
                .setRequired(true)
                .addChoices(
                    { name: '💬 Top Nhắn Tin', value: 'msg_count' },
                    { name: '🎙️ Top Voice', value: 'voice_time' },
                    { name: '💰 Top Đại Gia', value: 'balance' }
                )
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        
        const category = interaction.options.getString('category');
        await this.handleTop(interaction, category);
    },
    
    // Hỗ trợ dùng g!top
    async executePrefix(message, args) {
        const catMap = {
            'chat': 'msg_count', 'msg': 'msg_count',
            'voice': 'voice_time', 'vc': 'voice_time',
            'money': 'balance', 'coin': 'balance', 'tien': 'balance'
        };
        
        const input = args[0] ? args[0].toLowerCase() : null;
        const category = catMap[input] || 'balance'; // Mặc định là đại gia

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options),
            fetchReply: async () => {} // Will be overridden
        };

        const msg = await message.reply('⏳ Đang lấy dữ liệu bảng xếp hạng...');
        fakeInteraction.editReply = async (opt) => await msg.edit(opt);
        fakeInteraction.fetchReply = async () => msg;

        await this.handleTop(fakeInteraction, category);
    },

    async handleTop(interaction, category) {
        // Lấy tối đa 50 người để phân trang (Mỗi trang 10 người)
        const topUsers = await getTopUsers(category, 50);
        
        if (!topUsers || topUsers.length === 0) {
            return interaction.editReply({ content: '❌ Chưa có dữ liệu bảng xếp hạng này!', embeds: [] });
        }

        const ITEMS_PER_PAGE = 10;
        const totalPages = Math.ceil(topUsers.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const generateEmbed = (page) => {
            const embed = new EmbedBuilder()
                .setColor(0xFFD700)
                .setTimestamp()
                .setFooter({ text: `Trang ${page + 1}/${totalPages}` });

            let description = '';
            const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

            const startIdx = page * ITEMS_PER_PAGE;
            const endIdx = startIdx + ITEMS_PER_PAGE;
            const pageUsers = topUsers.slice(startIdx, endIdx);

            if (category === 'msg_count') {
                embed.setTitle('🏆 Bảng Xếp Hạng: Thánh Mõm (Top Chat)');
                pageUsers.forEach((u, i) => {
                    const globalRank = startIdx + i;
                    const rankStr = globalRank < 10 ? medals[globalRank] : `**#${globalRank + 1}**`;
                    description += `${rankStr} <@${u.userId}>: **${(u.msg_count || 0).toLocaleString()}** tin nhắn\n`;
                });
            } 
            else if (category === 'voice_time') {
                embed.setTitle('🏆 Bảng Xếp Hạng: Chúa Tể Phòng Kín (Top Voice)');
                pageUsers.forEach((u, i) => {
                    const totalMinutes = Math.floor((u.voice_time || 0) / 60000);
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = totalMinutes % 60;
                    let timeStr = '';
                    if (hours > 0) timeStr += `${hours} giờ `;
                    timeStr += `${mins} phút`;
                    if (totalMinutes === 0) timeStr = 'Chưa đầy 1 phút';
                    
                    const globalRank = startIdx + i;
                    const rankStr = globalRank < 10 ? medals[globalRank] : `**#${globalRank + 1}**`;
                    description += `${rankStr} <@${u.userId}>: **${timeStr}**\n`;
                });
            } 
            else if (category === 'balance') {
                embed.setTitle('🏆 Bảng Xếp Hạng: Giới Tinh Hoa (Top Đại Gia)');
                pageUsers.forEach((u, i) => {
                    const globalRank = startIdx + i;
                    const rankStr = globalRank < 10 ? medals[globalRank] : `**#${globalRank + 1}**`;
                    description += `${rankStr} <@${u.userId}>: **${(u.balance || 0).toLocaleString()}** 🪙\n`;
                });
            }

            embed.setDescription(description || 'Không có dữ liệu.');
            return embed;
        };

        const generateRow = (page) => {
            if (totalPages <= 1) return null; // Không cần nút nếu chỉ có 1 trang

            return new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('top_prev')
                    .setLabel('Trang trước')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === 0),
                new ButtonBuilder()
                    .setCustomId('top_next')
                    .setLabel('Trang sau')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(page === totalPages - 1)
            );
        };

        const replyPayload = {
            content: '',
            embeds: [generateEmbed(currentPage)]
        };
        const row = generateRow(currentPage);
        if (row) replyPayload.components = [row];

        const replyMessage = await interaction.editReply(replyPayload);

        if (totalPages <= 1) return;

        // Xử lý nút bấm phân trang
        const messageObj = interaction.fetchReply ? await interaction.fetchReply() : replyMessage;
        if (!messageObj) return;

        const collector = messageObj.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 5 * 60 * 1000 
        });

        collector.on('collect', async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: '❌ Bạn không phải người xem bảng xếp hạng này!', flags: 64 });
            }

            if (i.customId === 'top_prev') currentPage--;
            else if (i.customId === 'top_next') currentPage++;

            await i.update({
                embeds: [generateEmbed(currentPage)],
                components: [generateRow(currentPage)]
            });
        });

        collector.on('end', async () => {
            try { await messageObj.edit({ components: [] }); } catch (e) {}
        });
    }
};
