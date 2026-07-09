/**
 * commands/utility/avatar.js
 * ============================================================
 * /avatar [user]
 * Displays the target user's avatar in a rich embed with a
 * high-resolution download button.
 * ============================================================
 */

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Xem avatar của người dùng.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người dùng bạn muốn xem avatar (mặc định: chính bạn)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // Use the mentioned user or fallback to the command invoker
        const target = interaction.options.getUser('user') ?? interaction.user;

        // Build URLs for different sizes
        const avatarURL = target.displayAvatarURL({ extension: 'png', forceStatic: false, size: 4096 });
        const avatarURLHD = target.displayAvatarURL({ extension: 'png', forceStatic: true, size: 4096 });

        // Detect whether it's an animated GIF
        const isAnimated = target.avatar?.startsWith('a_');
        const gifURL = isAnimated
            ? target.displayAvatarURL({ extension: 'gif', size: 4096 })
            : null;

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setAuthor({ name: `Avatar của ${target.tag}`, iconURL: avatarURL })
            .setImage(gifURL ?? avatarURL) // Show GIF if available
            .setFooter({
                text: `Được yêu cầu bởi ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (isAnimated) {
            embed.setDescription('🎞️ Avatar này là **GIF động**!');
        }

        // Build download buttons
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('📥 Tải PNG (4096px)')
                .setStyle(ButtonStyle.Link)
                .setURL(avatarURLHD),
        );

        if (gifURL) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('🎞️ Tải GIF')
                    .setStyle(ButtonStyle.Link)
                    .setURL(gifURL),
            );
        }

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
};
