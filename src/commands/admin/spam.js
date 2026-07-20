const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { startSpam, forceStopSpam, isSpamming } = require('../../utils/spamHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spam')
        .setDescription('Bật hoặc tắt khủng bố DM mục tiêu (Chỉ dành cho Sếp)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Người muốn khủng bố hoặc tha thứ')
                .setRequired(true)),
                
    async execute(interaction) {
        // Kiểm tra Bot Owner
        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',').map(id => id.trim());
        if (!ownerIds.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ Cút Cút! Chỉ có "Sếp" mới được xài lệnh này.', flags: 64 });
        }

        const targetUser = interaction.options.getUser('user');
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        if (!targetMember) {
            return interaction.reply({ content: '❌ Không tìm thấy đứa này trong server!', flags: 64 });
        }

        if (isSpamming(targetUser.id)) {
            // Đang spam thì tắt
            forceStopSpam(targetUser.id);
            await interaction.reply(`✅ Đã tha mạng cho **${targetUser.username}**, dừng khủng bố DM!`);
        } else {
            // Chưa spam thì bật
            const started = await startSpam(targetMember);
            if (started) {
                await interaction.reply(`😈 Bắt đầu khủng bố DM **${targetUser.username}** liên tục không ngừng nghỉ!`);
            } else {
                await interaction.reply(`❌ Thằng hèn **${targetUser.username}** đã chặn tin nhắn người lạ hoặc có lỗi xảy ra!`);
            }
        }
    },
};
