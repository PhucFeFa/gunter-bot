const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-welcome')
        .setDescription('Cài đặt kênh để gửi tin nhắn chào mừng thành viên mới.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Chọn kênh bạn muốn bot gửi tin nhắn vào')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        
        const channel = interaction.options.getChannel('channel');
        
        // Lưu ID của kênh vào Firebase
        await updateConfig(interaction.guildId, 'welcome_channel_id', channel.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Cài đặt thành công!')
            .setDescription(`Tin nhắn chào mừng từ nay sẽ được gửi vào kênh ${channel}`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    },
};
