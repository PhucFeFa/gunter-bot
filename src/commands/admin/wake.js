const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { startBegging, ALLOWED_CHANNELS } = require('../../utils/beggarManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wake')
        .setDescription('Gọi Gunter dậy đi ăn xin trong kênh hiện tại (Chỉ Admin)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Chỉ hiện kết quả cho người bấm lệnh
        await interaction.deferReply({ ephemeral: true });
        
        const channelId = interaction.channelId;
        
        // Kiểm tra xem kênh hiện tại có nằm trong danh sách cho phép không
        if (!ALLOWED_CHANNELS.includes(channelId)) {
            return interaction.editReply({ 
                content: `❌ Lệnh này không được phép chạy ở kênh này! Kênh được phép: ${ALLOWED_CHANNELS.map(id => `<#${id}>`).join(', ')}` 
            });
        }
        
        // Gọi hàm ăn xin và loại trừ ID của người gõ lệnh để không bị mất tiền oan
        await startBegging(interaction.channel, interaction.user.id);
        
        await interaction.editReply({ 
            content: '✅ Đã đánh thức con báo thủ dậy đi ăn xin thành công! Sếp cứ yên tâm, nó sẽ không cướp tiền của sếp đâu.' 
        });
    },
};
