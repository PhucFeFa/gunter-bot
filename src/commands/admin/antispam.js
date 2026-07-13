const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antispam')
        .setDescription('⚙️ [ADMIN] Bật/tắt chế độ chống spam cho một kênh')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Kênh muốn bật/tắt (mặc định kênh hiện tại)')
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(false)
        ),
    async execute(interaction) {
        const channel = interaction.options.getChannel('channel') || interaction.channel;
        const guildId = interaction.guildId;
        const config = await getConfig(guildId);
        
        let antispamChannels = config.antispam_channels || [];
        
        if (antispamChannels.includes(channel.id)) {
            antispamChannels = antispamChannels.filter(id => id !== channel.id);
            await updateConfig(guildId, { antispam_channels: antispamChannels });
            return interaction.reply(`✅ Đã **TẮT** chế độ chống spam tại kênh <#${channel.id}>.`);
        } else {
            antispamChannels.push(channel.id);
            await updateConfig(guildId, { antispam_channels: antispamChannels });
            return interaction.reply(`🛡️ Đã **BẬT** chế độ chống spam tại kênh <#${channel.id}>. Đứa nào spam tao gõ đầu!`);
        }
    }
};
