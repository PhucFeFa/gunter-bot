/**
 * commands/economy/daily.js
 * ============================================================
 * /daily
 * Claim your daily coin reward (24-hour cooldown).
 * Cooldown state is stored in Firestore.
 * ============================================================
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { claimDaily, DAILY_AMOUNT } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Nhận phần thưởng hàng ngày của bạn! (24 giờ cooldown)'),

    async execute(interaction) {
        await interaction.deferReply();

        const result = await claimDaily(interaction.user.id);

        if (!result.success) {
            // Calculate remaining time
            const totalSec = Math.floor(result.remaining / 1000);
            const hours    = Math.floor(totalSec / 3600);
            const minutes  = Math.floor((totalSec % 3600) / 60);
            const seconds  = totalSec % 60;

            const embed = new EmbedBuilder()
                .setColor(0xFF6B6B)
                .setTitle('⏳ Chưa đến giờ!')
                .setDescription(
                    `Bạn đã nhận thưởng rồi!\n\n` +
                    `Quay lại sau: **${hours}h ${minutes}m ${seconds}s**`
                )
                .setFooter({ text: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('💰 Daily Reward!')
            .setDescription(
                `${interaction.user} đã nhận được **${DAILY_AMOUNT.toLocaleString()} 🪙 coins**!\n\n` +
                `💼 Số dư hiện tại: **${result.newBalance.toLocaleString()} 🪙**`
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Quay lại sau 24 giờ nhé!' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    },
};
