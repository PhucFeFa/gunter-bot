const { SlashCommandBuilder, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { getConfig, updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ignorechannel')
        .setDescription('Bật/Tắt việc sử dụng bot trong một kênh cụ thể (Chỉ dành cho Admin)')
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Kênh muốn chặn hoặc bỏ chặn bot')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

    async execute(interaction) {
        await interaction.deferReply();
        const channel = interaction.options.getChannel('channel');

        const config = await getConfig(interaction.guildId);
        let ignoredChannels = config.ignored_channels || [];

        const isIgnored = ignoredChannels.includes(channel.id);

        if (isIgnored) {
            ignoredChannels = ignoredChannels.filter(id => id !== channel.id);
            await updateConfig(interaction.guildId, { ignored_channels: ignoredChannels });
            
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setDescription(`✅ Đã **cho phép** sử dụng bot lại trong kênh <#${channel.id}>.`);
            return interaction.editReply({ embeds: [embed] });
        } else {
            ignoredChannels.push(channel.id);
            await updateConfig(interaction.guildId, { ignored_channels: ignoredChannels });

            const embed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setDescription(`🚫 Đã **chặn** người dùng sử dụng lệnh bot trong kênh <#${channel.id}>.\n*(Admin vẫn có thể dùng lệnh bình thường)*`);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('❌ Bạn cần quyền **Administrator** để dùng lệnh này!');
        }

        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]) || message.channel;

        const replyMsg = await message.reply('⏳ Đang xử lý...');
        
        const fakeInteraction = {
            guildId: message.guild.id,
            options: { getChannel: () => channel },
            deferReply: async function() {},
            editReply: async function(options) {
                return await replyMsg.edit(options);
            }
        };

        await this.execute(fakeInteraction);
    }
};
