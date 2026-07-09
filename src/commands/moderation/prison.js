const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prison')
        .setDescription('Tống một đứa vào tù (Gắn role Prison).')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Đứa nào lên thớt?')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Thời gian ở tù (phút). Bỏ trống = Vĩnh viễn.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Lý do tống giam')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        await interaction.deferReply();
        const target = interaction.options.getMember('target');
        const duration = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const roleId = '1524641571990142986';

        if (!target) {
            return interaction.editReply({ content: '❌ Không tìm thấy đứa này trong server!' });
        }

        try {
            await target.roles.add(roleId);
            
            // Log phạt
            const { getConfig, incrementCaseCount } = require('../../utils/configDB');
            const { EmbedBuilder } = require('discord.js');
            const config = await getConfig(interaction.guildId);
            const caseNumber = await incrementCaseCount(interaction.guildId);

            if (config.modlog_channel_id) {
                const modlogChannel = interaction.guild.channels.cache.get(config.modlog_channel_id);
                if (modlogChannel) {
                    const embed = new EmbedBuilder()
                        .setColor(0x8B0000) 
                        .setAuthor({
                            name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                            iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
                        })
                        .setDescription(`**Hành động:** Giam giữ (Prison${duration ? ` - ${duration} phút` : ''})\n**Lý do:** *${reason}*`)
                        .addFields(
                            { name: '👤 Nạn nhân', value: `${target.user} (\`${target.user.username}\`)`, inline: true },
                            { name: '🛡️ Người thi hành', value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
                        )
                        .setThumbnail(target.user.displayAvatarURL({ size: 256 }))
                        .setFooter({ text: `ID Nạn nhân: ${target.id}` })
                        .setTimestamp();

                    await modlogChannel.send({ embeds: [embed] }).catch(() => { });
                }
            }

            if (duration) {
                // Hẹn giờ thả tự do
                setTimeout(async () => {
                    try {
                        await target.roles.remove(roleId);
                    } catch (e) {}
                }, duration * 60 * 1000);
                
                return interaction.editReply(`🚔 Đã tống cổ **${target.user.username}** vào tù trong **${duration} phút**! Lý do: ${reason}`);
            }
            
            return interaction.editReply(`🚔 Đã tống cổ **${target.user.username}** vào tù (Vô thời hạn)! Lý do: ${reason}`);
        } catch (error) {
            console.error('[PRISON]', error);
            return interaction.editReply({ content: '❌ Chịu, tao không có quyền gắn role này hoặc role Prison đang xếp cao hơn tao.' });
        }
    }
};
