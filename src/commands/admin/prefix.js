const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateConfig, getConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prefix')
        .setDescription('Thay đổi prefix của bot cho server này.')
        .addStringOption(option => 
            option.setName('new_prefix')
                .setDescription('Prefix mới (ví dụ: pl!)')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    // Hỗ trợ Slash Command
    async execute(interaction) {
        const newPrefix = interaction.options.getString('new_prefix');
        
        await updateConfig(interaction.guildId, 'prefix', newPrefix);
        
        return interaction.reply({ content: `✅ Đã đổi prefix của server thành: \`${newPrefix}\`` });
    },

    // Hỗ trợ Prefix Command
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ Bạn không có quyền đổi prefix (Cần quyền Administrator)!');
        }

        const newPrefix = args[0];
        if (!newPrefix) {
            const config = await getConfig(message.guild.id);
            return message.reply(`ℹ️ Prefix hiện tại của server là: \`${config.prefix || 'g!'}\`\nSử dụng: \`${config.prefix || 'g!'}prefix <prefix_mới>\``);
        }

        await updateConfig(message.guild.id, 'prefix', newPrefix);
        return message.reply(`✅ Đã đổi prefix của server thành: \`${newPrefix}\``);
    }
};
