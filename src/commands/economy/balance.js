/**
 * commands/economy/balance.js
 * ============================================================
 * /balance [user]
 * Check your current coin balance (or another user's).
 * ============================================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Xem số dư coin hiện tại của bạn.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người dùng bạn muốn kiểm tra (mặc định: chính bạn)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getUser('user') ?? interaction.user;
        const userData = await getUser(target.id);

        const lastDailyText = userData.lastDaily
            ? `<t:${Math.floor(userData.lastDaily / 1000)}:R>`
            : '`Chưa từng nhận`';

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle(`💼 Ví của ${target.username}`)
            .setThumbnail(target.displayAvatarURL())
            .addFields(
                { name: '💰 Số dư', value: `**${userData.balance.toLocaleString()} 🪙**`, inline: true },
                { name: '📅 Daily gần nhất', value: lastDailyText, inline: true },
            )
            .setFooter({
                text: `Dùng /daily để nhận thêm coin!`,
            })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};
