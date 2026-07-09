const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Bật hoặc tắt các tính năng của bot (Chỉ dành cho Admin).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Chỉ admin mới dùng được
        .addStringOption(option =>
            option.setName('feature')
                .setDescription('Chọn tính năng muốn bật/tắt')
                .setRequired(true)
                .addChoices(
                    { name: '🎵 Tự động tải TikTok', value: 'feature_tiktok' },
                    { name: '👥 Liệt kê Role (Tag role)', value: 'feature_role_list' },
                    { name: '💰 Hệ thống Economy (Daily, Slots)', value: 'feature_economy' },
                    { name: '🖼️ Lệnh xem Avatar', value: 'feature_avatar' },
                    { name: '👋 Lời chào thành viên mới', value: 'feature_welcome' },
                    { name: '👋 Lời chào tạm biệt', value: 'feature_goodbye' },
                    { name: '🔊 Join-to-Create (Tạo phòng)', value: 'feature_j2c' },
                    { name: '📊 Thống kê Server (Stats)', value: 'feature_stats' }
                )),

    async execute(interaction) {
        // Kiểm tra nhiều Bot Owner
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', 
                flags: 64 
            });
        }

        await interaction.deferReply();
        
        const featureKey = interaction.options.getString('feature');
        const guildId = interaction.guildId;
        
        // Lấy cấu hình hiện tại
        const config = await getConfig(guildId);
        
        // Đảo ngược trạng thái hiện tại (Đang bật -> tắt, đang tắt -> bật)
        const currentState = config[featureKey];
        const newState = !currentState;
        
        // Cập nhật vào Firebase
        await updateConfig(guildId, featureKey, newState);
        
        // Tạo bảng thông báo
        const featureNames = {
            'feature_tiktok': 'Tự động tải TikTok',
            'feature_role_list': 'Liệt kê thành viên Role',
            'feature_economy': 'Hệ thống Economy (/daily, /slots)',
            'feature_avatar': 'Lệnh /avatar',
            'feature_welcome': 'Lời chào thành viên mới',
            'feature_goodbye': 'Lời chào tạm biệt',
            'feature_j2c': 'Tính năng Join-to-Create',
            'feature_stats': 'Hệ thống Thống kê Server (Stats)'
        };
        
        const embed = new EmbedBuilder()
            .setColor(newState ? 0x2ECC71 : 0xE74C3C)
            .setTitle('⚙️ Cập nhật cấu hình thành công')
            .setDescription(`Tính năng **${featureNames[featureKey]}** đã được chuyển sang trạng thái: ${newState ? '✅ **BẬT**' : '❌ **TẮT**'}.`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    },
};
