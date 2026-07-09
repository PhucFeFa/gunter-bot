const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Lấy (ăn cắp) emoji từ server khác về server này.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Emoji bạn muốn lấy (có thể dán nhiều emoji)')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('name')
                .setDescription('Tên mới cho emoji (để trống nếu muốn giữ nguyên tên gốc)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        
        const emojiStr = interaction.options.getString('emoji');
        const customName = interaction.options.getString('name');
        
        // Regex để tìm các emoji custom của Discord: <:name:id> hoặc <a:name:id>
        const customEmojiRegex = /<(a?):([a-zA-Z0-9_]+):(\d+)>/g;
        const matches = [...emojiStr.matchAll(customEmojiRegex)];

        if (matches.length === 0) {
            return interaction.editReply({ 
                content: '❌ Không tìm thấy emoji hợp lệ nào! Đảm bảo rằng đó là emoji custom của Discord (không phải emoji có sẵn của điện thoại).' 
            });
        }

        const addedEmojis = [];
        const failedEmojis = [];

        for (let i = 0; i < matches.length; i++) {
            const match = matches[i];
            const isAnimated = match[1] === 'a'; // 'a' nếu là ảnh động GIF
            const originalName = match[2];
            const id = match[3];
            
            // Xử lý tên: nếu có customName thì dùng, nếu chôm nhiều cái 1 lúc thì thêm số vào đuôi
            let finalName = originalName;
            if (customName) {
                finalName = matches.length > 1 ? `${customName}_${i + 1}` : customName;
            }

            // Build URL tải ảnh của emoji đó từ máy chủ Discord
            const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;

            try {
                // Thêm emoji vào server hiện tại
                const newEmoji = await interaction.guild.emojis.create({
                    attachment: url,
                    name: finalName
                });
                addedEmojis.push(newEmoji);
            } catch (error) {
                console.error(`Lỗi khi tạo emoji ${finalName}:`, error);
                failedEmojis.push(finalName);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🎭 Báo cáo kết quả ăn cắp Emoji')
            .setTimestamp();

        if (addedEmojis.length > 0) {
            embed.addFields({
                name: `✅ Đã thêm thành công (${addedEmojis.length})`,
                value: addedEmojis.map(e => `${e} (\`${e.name}\`)`).join(' | ')
            });
        }

        if (failedEmojis.length > 0) {
            embed.addFields({
                name: `❌ Thất bại (${failedEmojis.length})`,
                value: failedEmojis.join(', ') + '\n*(Có thể do server đã đầy slot emoji hoặc dung lượng file quá lớn)*'
            });
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
