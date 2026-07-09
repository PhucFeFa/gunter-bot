const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-modlog')
        .setDescription('Cài đặt kênh để gửi nhật ký xử phạt (Mod Log).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Chọn kênh sẽ gửi báo cáo Kick/Ban')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {
        // Kiểm tra Bot Owner
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        const channel = interaction.options.getChannel('channel');
        
        // Lưu ID kênh vào DB
        await updateConfig(interaction.guildId, 'modlog_channel_id', channel.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Cài đặt Mod Log thành công!')
            .setDescription(`Nhật ký xử phạt (Kick/Ban) sẽ được tự động gửi vào kênh ${channel}`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    }
};
