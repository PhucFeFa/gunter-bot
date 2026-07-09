const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-j2c')
        .setDescription('Cài đặt kênh Voice làm kênh gốc để "Ấn vào là tạo phòng".')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Chọn kênh Voice gốc')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildVoice)
        ),

    async execute(interaction) {
        // Kiểm tra Bot Owner
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        
        const channel = interaction.options.getChannel('channel');
        
        // Lưu ID của kênh vào Firebase
        await updateConfig(interaction.guildId, 'j2c_channel_id', channel.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Cài đặt Join-to-Create thành công!')
            .setDescription(`Từ giờ, bất kỳ ai vào kênh thoại ${channel} sẽ tự động được tạo một phòng Voice riêng!`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    },
};
