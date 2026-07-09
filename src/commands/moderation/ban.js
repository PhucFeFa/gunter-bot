const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, incrementCaseCount } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Cấm (Ban) vĩnh viễn một thành viên khỏi server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(option =>
            option.setName('target').setDescription('Người bạn muốn cấm').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Lý do xử phạt').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (targetMember && !targetMember.bannable) {
            return interaction.editReply({ content: '❌ Tôi không đủ quyền để cấm người này (có thể do role của họ cao hơn tôi).' });
        }

        try {
            await interaction.guild.members.ban(targetUser.id, { reason });
        } catch (error) {
            return interaction.editReply({ content: '❌ Đã xảy ra lỗi khi cấm người dùng này.' });
        }

        // Tăng case count
        const caseNumber = await incrementCaseCount(interaction.guildId);

        // Đọc config để lấy modlog channel
        const config = await getConfig(interaction.guildId);
        if (config.modlog_channel_id) {
            const modlogChannel = interaction.guild.channels.cache.get(config.modlog_channel_id);
            if (modlogChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C) // Màu đỏ đậm cho Ban
                    .setAuthor({
                        name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                        iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
                    })
                    .setDescription(`**Hành động:** Ban\n**Lý do:** *${reason}*`)
                    .addFields(
                        { name: '👤 Nạn nhân', value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
                        { name: '🛡️ Người thi hành', value: `${interaction.user} (\`${interaction.user.username}\`)`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                    .setFooter({ text: `ID Nạn nhân: ${targetUser.id}` })
                    .setTimestamp();

                await modlogChannel.send({ embeds: [embed] }).catch(() => { });
            }
        }

        await interaction.editReply({ content: `✅ Đã cấm thành công **${targetUser.tag}**.` });
    }
};
