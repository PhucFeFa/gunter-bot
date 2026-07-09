const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { updateConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-games')
        .setDescription('Cấu hình kênh thông báo nhận Game Free (Epic Games, Steam...)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Kênh sẽ nhận thông báo')
                .setRequired(true)
        )
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Role sẽ được tag (Tùy chọn, để trống sẽ tag @everyone)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        const channel = interaction.options.getChannel('channel');
        const role = interaction.options.getRole('role');

        const updateData = {
            game_alert_channel_id: channel.id,
            game_alert_role_id: role ? role.id : null
        };

        await updateConfig(interaction.guildId, updateData);

        await interaction.editReply(`✅ Đã thiết lập thông báo Game Free vào kênh <#${channel.id}>. ${role ? `Sẽ tag <@&${role.id}>` : 'Sẽ tag @everyone'}.`);
    }
};
