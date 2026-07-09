const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, incrementCaseCount } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick một thành viên khỏi server.')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(option =>
            option.setName('target').setDescription('Người bạn muốn kích').setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Lý do xử phạt').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const targetUser = interaction.options.getUser('target');
        const reason = interaction.options.getString('reason') || 'No reason provided.';
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: '❌ Không tìm thấy người dùng này trong server.' });
        }

        if (!targetMember.kickable) {
            return interaction.editReply({ content: '❌ Tôi không đủ quyền để kích người này (có thể do role của họ cao hơn tôi).' });
        }

        try {
            await targetMember.kick(reason);
        } catch (error) {
            return interaction.editReply({ content: '❌ Đã xảy ra lỗi khi kích.' });
        }

        // Tăng case count
        const caseNumber = await incrementCaseCount(interaction.guildId);

        // Đọc config để lấy modlog channel
        const config = await getConfig(interaction.guildId);
        if (config.modlog_channel_id) {
            const modlogChannel = interaction.guild.channels.cache.get(config.modlog_channel_id);
            if (modlogChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xE67E22) // Màu cam cho Kick
                    .setAuthor({
                        name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                        iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
                    })
                    .setDescription(`**Hành động:** Kick\n**Lý do:** *${reason}*`)
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

        await interaction.editReply({ content: `✅ Rider Kick thành công **${targetUser.tag}**.` });
    }
};
