const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unprison')
        .setDescription('Ân xá, thả một đứa khỏi tù.')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Đứa nào được ân xá?')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lý do ân xá')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Đã hối cải hoặc được thương tình';
        const roleId = '1524641571990142986';

        if (!target) {
            return interaction.editReply({ content: '❌ Không tìm thấy đứa này trong server!' });
        }

        try {
            await target.roles.remove(roleId);
            
            // Log ân xá
            const { getConfig, incrementCaseCount } = require('../../utils/configDB');
            const { EmbedBuilder } = require('discord.js');
            const config = await getConfig(interaction.guildId);
            const caseNumber = await incrementCaseCount(interaction.guildId);

            if (config.modlog_channel_id) {
                const modlogChannel = interaction.guild.channels.cache.get(config.modlog_channel_id);
                if (modlogChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x00FF00) 
                        .setAuthor({
                            name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                            iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
                        })
                        .setDescription(`**Hành động:** Ân xá (Unprison)\n**Lý do:** *${reason}*`)
                        .addFields(
                            { name: '👤 Người được ân xá', value: `${target.user} (\`${target.user.username}\`)`, inline: true },
                            { name: '🛡️ Người thi hành', value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
                        )
                        .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
                        .setFooter({ text: `ID Người dùng: ${target.id}` })
                        .setTimestamp();

                    await modlogChannel.send({ embeds: [embed] }).catch(() => { });
                }
            }

            return interaction.editReply(`🕊️ Đã ân xá cho **${target.user.username}**. Chào mừng trở lại xã hội! Lý do: ${reason}`);
        } catch (error) {
            console.error('[UNPRISON]', error);
            return interaction.editReply({ content: '❌ Đã xảy ra lỗi khi tháo role, có thể do role đang xếp cao hơn tao.' });
        }
    }
};
