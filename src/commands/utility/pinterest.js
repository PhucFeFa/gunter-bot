const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const google = require('googlethis');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pinterest')
        .setDescription('🔍 Tìm kiếm ảnh chất lượng cao trên Pinterest')
        .addStringOption(option => 
            option.setName('keyword')
                .setDescription('Từ khóa bạn muốn tìm (ví dụ: anime girl, setup gaming...)')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        const keyword = interaction.options.getString('keyword');
        await this.handleSearch(interaction, keyword);
    },
    
    async executePrefix(message, args) {
        if (!args.length) return message.reply('❌ Bạn phải nhập từ khóa! Ví dụ: `g!pinterest mèo cute`');
        const keyword = args.join(' ');
        
        // Tạo một fake interaction để dùng chung logic với Slash Command
        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options),
            fetchReply: async () => { /* Not strictly needed for prefix if we return the message */ }
        };
        
        // Vì prefix không trả về interaction message gốc dễ dàng để tạo collector, ta sẽ viết logic xử lý riêng hoặc custom.
        // Tốt nhất là gọi chung một hàm xử lý
        const msg = await message.reply(`⏳ Đang tìm kiếm ảnh cho từ khóa: **${keyword}**...`);
        fakeInteraction.editReply = async (opt) => await msg.edit(opt);
        fakeInteraction.fetchReply = async () => msg;
        
        await this.handleSearch(fakeInteraction, keyword);
    },
    
    async handleSearch(interaction, keyword) {
        try {
            // Sử dụng googlethis để lấy ảnh từ domain pinterest
            const images = await google.image(`${keyword} site:pinterest.com`, { safe: false });
            
            // Lọc ra các ảnh có chất lượng tốt và link hợp lệ
            const validImages = images
                .map(img => img.url)
                .filter(url => url.startsWith('http'))
                .slice(0, 20); // Lấy top 20 ảnh

            if (validImages.length === 0) {
                return interaction.editReply(`❌ Không tìm thấy ảnh nào cho từ khóa: **${keyword}**`);
            }

            let currentIndex = 0;

            const generateEmbed = (index) => {
                return new EmbedBuilder()
                    .setColor(0xE60023) // Màu đỏ đặc trưng của Pinterest
                    .setAuthor({ name: 'Pinterest Search', iconURL: 'https://i.imgur.com/K3C23D8.png' })
                    .setTitle(`Kết quả cho: ${keyword}`)
                    .setDescription(`Ảnh **${index + 1}** / ${validImages.length}`)
                    .setImage(validImages[index])
                    .setFooter({ text: `Yêu cầu bởi ${interaction.user.username}` })
                    .setTimestamp();
            };

            const generateRow = (index) => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('pin_prev')
                        .setEmoji('◀️')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(index === 0),
                    new ButtonBuilder()
                        .setCustomId('pin_next')
                        .setLabel('Đổi ảnh khác')
                        .setEmoji('▶️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(index === validImages.length - 1),
                    new ButtonBuilder()
                        .setLabel('Tải ảnh gốc')
                        .setStyle(ButtonStyle.Link)
                        .setURL(validImages[index])
                );
            };

            const replyMessage = await interaction.editReply({
                content: '',
                embeds: [generateEmbed(currentIndex)],
                components: [generateRow(currentIndex)]
            });

            // Lấy message object để gắn collector (Hỗ trợ cả Slash và Prefix qua fetchReply)
            const messageObj = interaction.fetchReply ? await interaction.fetchReply() : replyMessage;
            if (!messageObj) return;

            // Tạo bộ lắng nghe nút bấm trong 5 phút
            const collector = messageObj.createMessageComponentCollector({ 
                componentType: ComponentType.Button, 
                time: 5 * 60 * 1000 
            });

            collector.on('collect', async (i) => {
                // Chỉ người gọi lệnh mới được bấm nút
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ Bạn không phải người dùng lệnh này!', flags: 64 });
                }

                if (i.customId === 'pin_prev') {
                    currentIndex--;
                } else if (i.customId === 'pin_next') {
                    currentIndex++;
                }

                await i.update({
                    embeds: [generateEmbed(currentIndex)],
                    components: [generateRow(currentIndex)]
                });
            });

            collector.on('end', async () => {
                // Xóa nút khi hết hạn để tránh click lỗi
                try {
                    await messageObj.edit({ components: [] });
                } catch (e) {}
            });

        } catch (error) {
            console.error('[PINTEREST] Error:', error);
            await interaction.editReply('❌ Có lỗi xảy ra khi tải ảnh từ Pinterest. Thử lại sau nhé!');
        }
    }
};
