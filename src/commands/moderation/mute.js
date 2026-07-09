const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { getConfig, incrementCaseCount } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mute')
        .setDescription('Cấm ngôn (Timeout) một thành viên.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(option =>
            option.setName('target').setDescription('Người bạn muốn cấm ngôn').setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Thời lượng cấm ngôn')
                .setRequired(true)
                .addChoices(
                    { name: '1 Phút', value: 60000 },
                    { name: '5 Phút', value: 300000 },
                    { name: '10 Phút', value: 600000 },
                    { name: '1 Giờ', value: 3600000 },
                    { name: '1 Ngày', value: 86400000 },
                    { name: '1 Tuần', value: 604800000 }
                )
        )
        .addStringOption(option =>
            option.setName('reason').setDescription('Lý do xử phạt').setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: 64 });

        const targetUser = interaction.options.getUser('target');
        const durationMs = interaction.options.getInteger('duration');
        const reason = interaction.options.getString('reason') || 'Không có lý do.';
        
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.editReply({ content: '❌ Không tìm thấy người dùng này trong server.' });
        }

        if (!targetMember.moderatable) {
            return interaction.editReply({ content: '❌ Tôi không đủ quyền để cấm ngôn người này (có thể do role của họ cao hơn tôi).' });
        }

        try {
            await targetMember.timeout(durationMs, reason);
        } catch (error) {
            console.error('[MUTE]', error);
            return interaction.editReply({ content: '❌ Đã xảy ra lỗi khi cố gắng cấm ngôn.' });
        }

        // Tăng case count
        const caseNumber = await incrementCaseCount(interaction.guildId);

        // Đọc config để lấy modlog channel
        const config = await getConfig(interaction.guildId);
        if (config.modlog_channel_id) {
            const modlogChannel = interaction.guild.channels.cache.get(config.modlog_channel_id);
            if (modlogChannel) {
                const durationText = interaction.data?.options?.[1]?.choices?.find(c => c.value === durationMs)?.name || `${durationMs / 60000} phút`;
                
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F) // Màu vàng cho Mute
                    .setAuthor({
                        name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                        iconURL: interaction.guild.iconURL() || interaction.client.user.displayAvatarURL()
                    })
                    .setDescription(`**Hành động:** Cấm Ngôn (Timeout)\n**Thời lượng:** ${durationText}\n**Lý do:** *${reason}*`)
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

        await interaction.editReply({ content: `✅ Đã khóa mõm **${targetUser.tag}** thành công.` });
    },
    
    // Hỗ trợ lệnh prefix g!mute @user <phút> <lý do>
    async executePrefix(message, args) {
        if (message.mentions.users.size === 0) {
            return message.reply('❌ Bạn phải tag người muốn cấm ngôn. Ví dụ: `g!mute @user 10 spam`');
        }
        
        const targetUser = message.mentions.users.first();
        const targetMember = await message.guild.members.fetch(targetUser.id).catch(() => null);
        
        if (!targetMember) return message.reply('❌ Không tìm thấy người dùng này trong server.');
        if (!targetMember.moderatable) return message.reply('❌ Không đủ quyền để cấm ngôn người này.');
        
        // Parse time (args[1]) in minutes
        let durationMins = parseInt(args[1]);
        if (isNaN(durationMins) || durationMins <= 0) durationMins = 5; // Mặc định 5 phút
        
        const durationMs = durationMins * 60000;
        const reason = args.slice(2).join(' ') || 'Không có lý do.';
        
        try {
            await targetMember.timeout(durationMs, reason);
        } catch (error) {
            return message.reply('❌ Lỗi khi cấm ngôn.');
        }
        
        const caseNumber = await incrementCaseCount(message.guildId);
        const config = await getConfig(message.guildId);
        
        if (config.modlog_channel_id) {
            const modlogChannel = message.guild.channels.cache.get(config.modlog_channel_id);
            if (modlogChannel) {
                const embed = new EmbedBuilder()
                    .setColor(0xF1C40F)
                    .setAuthor({
                        name: `Hồ Sơ Xử Phạt | Case #${caseNumber}`,
                        iconURL: message.guild.iconURL() || message.client.user.displayAvatarURL()
                    })
                    .setDescription(`**Hành động:** Cấm Ngôn (Timeout)\n**Thời lượng:** ${durationMins} phút\n**Lý do:** *${reason}*`)
                    .addFields(
                        { name: '👤 Nạn nhân', value: `${targetUser} (\`${targetUser.username}\`)`, inline: true },
                        { name: '🛡️ Người thi hành', value: `${message.author} (\`${message.author.username}\`)`, inline: true }
                    )
                    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
                    .setFooter({ text: `ID Nạn nhân: ${targetUser.id}` })
                    .setTimestamp();
                    
                await modlogChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
        
        await message.reply(`✅ Đã khóa mõm **${targetUser.tag}** trong ${durationMins} phút.`);
    }
};
