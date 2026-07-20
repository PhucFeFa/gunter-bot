const { SlashCommandBuilder } = require('discord.js');
const { setTransferLimit, getTransferLimit } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('togglelimit')
        .setDescription('Tắt/Bật giới hạn chuyển tiền 100M/ngày (Chỉ dành cho Boss)')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Người dùng muốn tắt/bật giới hạn')
                .setRequired(true)),
    async execute(interaction) {
        if (interaction.user.id !== '586904255860965386') {
            return interaction.reply({ content: '❌ Lệnh này là Đặc Quyền Vương Miện, chỉ Sếp mới được dùng!', flags: 64 });
        }

        const targetUser = interaction.options.getUser('target');
        if (!targetUser) return interaction.reply({ content: '❌ Hãy tag người dùng!', flags: 64 });

        await interaction.deferReply({ ephemeral: true });

        try {
            const currentStatus = await getTransferLimit(targetUser.id);
            const newStatus = !currentStatus; // true = tắt giới hạn, false = bật giới hạn
            
            await setTransferLimit(targetUser.id, newStatus);
            
            if (newStatus) {
                return interaction.editReply(`✅ **ĐÃ TẮT** giới hạn chuyển tiền cho ${targetUser}! Người này bây giờ có thể chuyển tiền thả ga không giới hạn.`);
            } else {
                return interaction.editReply(`🚫 **ĐÃ BẬT LẠI** giới hạn chuyển tiền cho ${targetUser}! Tối đa chỉ được chuyển 100M 🪙/ngày.`);
            }
        } catch (error) {
            console.error('[ToggleLimit] Lỗi:', error);
            return interaction.editReply('❌ Đã xảy ra lỗi khi thay đổi trạng thái.');
        }
    }
};
