const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, incrementCaseCount } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Xóa hàng loạt tin nhắn trong kênh.')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('Số lượng tin nhắn muốn xóa (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');

        // Bỏ qua tin nhắn gọi lệnh nếu là từ prefix command (fake interaction)
        // Nhưng fetch messages sẽ bắt được tin nhắn đó và xóa luôn.
        try {
            // Delete messages
            const deleted = await interaction.channel.bulkDelete(amount, true); // true = bỏ qua tin nhắn cũ hơn 14 ngày
            
            // Gửi thông báo ẩn (chỉ người xóa thấy, không làm rác kênh)
            if (typeof interaction.isChatInputCommand === 'function') {
                await interaction.reply({ 
                    content: `🧹 Đã dọn dẹp sạch sẽ **${deleted.size}** tin nhắn!`, 
                    flags: 64 
                }).catch(() => {});
            } else {
                // Nếu là fake interaction (dùng g!purge), gửi tin nhắn rồi xoá sau 3s
                const replyMsg = await interaction.channel.send(`🧹 Đã dọn dẹp sạch sẽ **${deleted.size}** tin nhắn!`);
                setTimeout(() => replyMsg.delete().catch(() => {}), 3000);
            }

            // (Đã gỡ bỏ ghi Log purge vào kênh Modlog theo yêu cầu của Admin)

        } catch (error) {
            console.error('[PURGE]', error);
            if (error.code === 50034) {
                return interaction.reply({ content: '❌ Không thể xóa tin nhắn cũ hơn 14 ngày do giới hạn của Discord.', flags: 64 });
            }
            return interaction.reply({ content: '❌ Đã xảy ra lỗi khi cố gắng xóa tin nhắn.', flags: 64 });
        }
    }
};
