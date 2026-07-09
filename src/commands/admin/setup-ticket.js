const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('Tạo bảng điều khiển Ticket (Chỉ Admin).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setTitle('🎫 Hỗ trợ thành viên (Ticket System)')
            .setDescription('Chào mừng bạn đến với kênh Hỗ trợ. Nếu bạn cần giúp đỡ từ Admin hoặc Gunter AI, hãy ấn vào nút **Tạo Ticket** bên dưới để mở một kênh riêng tư.\n\n*⚠️ Lưu ý: Mỗi người chỉ được tạo 1 ticket mở tại một thời điểm.*');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Tạo Ticket Mới')
                .setEmoji('🎫')
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.channel.send({ embeds: [embed], components: [row] });
        return interaction.reply({ content: '✅ Đã setup bảng Ticket thành công!', flags: 64 });
    }
};
