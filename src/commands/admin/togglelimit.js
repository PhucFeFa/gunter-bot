const { SlashCommandBuilder } = require('discord.js');
const { setTransferLimit, getTransferLimit } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglelimit')
        .setDescription('Tắt/Bật giới hạn chuyển tiền 100M/ngày (Chỉ dành cho Boss)'),
    async execute(interaction) {
        if (interaction.user.id !== '586904255860965386') {
            return interaction.reply({ content: '❌ Lệnh này là Đặc Quyền Vương Miện, chỉ Sếp mới được dùng!', flags: 64 });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const currentStatus = await getTransferLimit();
            const newStatus = !currentStatus;
            
            await setTransferLimit(newStatus);
            
            if (newStatus) {
                return interaction.editReply('✅ **ĐÃ TẮT** giới hạn chuyển tiền! Dân đen bây giờ có thể chuyển tiền thả ga không giới hạn.');
            } else {
                return interaction.editReply('🚫 **ĐÃ BẬT LẠI** giới hạn chuyển tiền! Tối đa chỉ được chuyển 100M 🪙/ngày.');
            }
        } catch (error) {
            console.error('[ToggleLimit] Lỗi:', error);
            return interaction.editReply('❌ Đã xảy ra lỗi khi thay đổi trạng thái.');
        }
    }
};
