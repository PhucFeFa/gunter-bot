const { SlashCommandBuilder } = require('discord.js');
const { updateLoan, setBotDebt, getUser } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cleardebt')
        .setDescription('⚙️ [ADMIN TỐI CAO] Xóa toàn bộ nợ của một người dùng')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Người dùng muốn xóa nợ')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Chỉ ID đặc quyền mới được dùng
        const ALLOWED_ID = '586904255860965386';
        if (interaction.user.id !== ALLOWED_ID) {
            return interaction.reply({ content: '🚫 Cút! Chỉ có Chúa Tể Ooo mới có quyền xóa nợ!', flags: 64 });
        }

        const targetUser = interaction.options.getUser('target');
        if (!targetUser) {
            return interaction.reply({ content: '❌ Không tìm thấy người dùng này!', flags: 64 });
        }

        try {
            const userData = await getUser(targetUser.id);
            const currentLoan = userData.loanAmount || 0;
            const currentBotDebt = userData.botDebt || 0;

            if (currentLoan <= 0) {
                return interaction.reply({ content: `✅ Người dùng **${targetUser.username}** hiện không có nợ nần gì!`, flags: 64 });
            }

            // Xóa nợ vay tay
            await updateLoan(targetUser.id, -currentLoan);
            
            // Xóa nợ do Bot phạt (nếu có)
            if (currentBotDebt > 0) {
                await setBotDebt(targetUser.id, -currentBotDebt);
            }

            return interaction.reply(`🎉 <@${ALLOWED_ID}> đã thi triển ân huệ, **XÓA TOÀN BỘ NỢ NẦN (${currentLoan.toLocaleString()} 🪙)** cho <@${targetUser.id}>! Chúc mừng mày đã được tái sinh!`);
        } catch (error) {
            console.error('[CLEARDEBT] Lỗi khi xóa nợ:', error);
            return interaction.reply({ content: '❌ Lỗi hệ thống khi cố gắng xóa nợ!', flags: 64 });
        }
    }
};
