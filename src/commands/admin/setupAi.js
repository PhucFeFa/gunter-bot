const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const { updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ai')
        .setDescription('Cài đặt kênh để Gunter (Gemini AI) hoạt động và trả lời tự động.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Chọn kênh bạn muốn bot chat AI')
                .setRequired(true)
                .addChannelTypes(ChannelType.GuildText)
        ),

    async execute(interaction) {
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Chủ Tịch" mới được xài lệnh này.', flags: 64 });

        await interaction.deferReply();
        
        const channel = interaction.options.getChannel('channel');
        
        // Lưu ID của kênh vào Database
        await updateConfig(interaction.guildId, 'ai_channel_id', channel.id);
        
        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('✅ Cài đặt AI Chatbot thành công!')
            .setDescription(`Gunter (Gemini) từ nay sẽ tự động trả lời mọi tin nhắn trong kênh ${channel}`)
            .setTimestamp();
            
        await interaction.editReply({ embeds: [embed] });
    },
};
