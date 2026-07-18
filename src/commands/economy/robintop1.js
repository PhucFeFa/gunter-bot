const { SlashCommandBuilder } = require('discord.js');
const { triggerRobinHood } = require('../../tasks/randomEvents');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('robintop1')
        .setDescription('Kích hoạt sự kiện Robin Hood cướp tiền Top 1 (Chỉ dành cho Admin/Owner)'),
    async execute(interaction) {
        // Chỉ Sếp (ID 586904255860965386) hoặc Admin được dùng
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',');
        if (interaction.user.id !== '586904255860965386' && !ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ Bạn đéo đủ tư cách ra lệnh này! Chỉ Sếp mới được dùng.', flags: 64 });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            await triggerRobinHood(interaction.client);
            return interaction.editReply('✅ Đã kích hoạt sự kiện Robin Hood thành công, hãy ra kênh chat chính để xem kết quả!');
        } catch (error) {
            console.error('[RobinTop1] Lỗi kích hoạt:', error);
            return interaction.editReply('❌ Có lỗi xảy ra khi gọi sự kiện Robin Hood.');
        }
    }
};
