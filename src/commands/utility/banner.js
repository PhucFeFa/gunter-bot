/**
 * commands/utility/banner.js
 * ============================================================
 * /banner [user]
 * Displays the target user's banner in a rich embed with a
 * high-resolution download button.
 * ============================================================
 */

const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Xem ảnh bìa (banner) của người dùng.')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('Người dùng bạn muốn xem banner (mặc định: chính bạn)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        
        // Lấy thông tin user từ option hoặc lấy chính người gọi lệnh
        const targetUser = interaction.options.getUser('user') ?? interaction.user;

        // Bắt buộc phải "fetch" user để Discord trả về dữ liệu Banner
        const fetchedUser = await targetUser.fetch({ force: true });
        
        const bannerURL = fetchedUser.bannerURL({ size: 4096, extension: 'png' });

        // Nếu người dùng không có banner (hoặc chỉ có màu nền trơn)
        if (!bannerURL) {
            // Kiểm tra xem họ có màu nền banner không
            if (fetchedUser.hexAccentColor) {
                const embed = new EmbedBuilder()
                    .setColor(fetchedUser.hexAccentColor)
                    .setDescription(`Người dùng **${fetchedUser.username}** không có ảnh banner, nhưng họ có màu nền là: **${fetchedUser.hexAccentColor}**`);
                return interaction.editReply({ embeds: [embed] });
            }
            
            return interaction.editReply({ content: `❌ **${fetchedUser.username}** không cài đặt ảnh bìa (banner)!` });
        }

        // Lấy URL dạng GIF nếu banner là ảnh động
        const isAnimated = fetchedUser.banner?.startsWith('a_');
        const gifURL = isAnimated ? fetchedUser.bannerURL({ size: 4096, extension: 'gif' }) : null;

        const embed = new EmbedBuilder()
            .setColor(fetchedUser.hexAccentColor || 0x5865F2)
            .setAuthor({ name: `Ảnh bìa của ${fetchedUser.tag}`, iconURL: fetchedUser.displayAvatarURL() })
            .setImage(gifURL ?? bannerURL)
            .setFooter({
                text: `Được yêu cầu bởi ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            })
            .setTimestamp();

        if (isAnimated) {
            embed.setDescription('🎞️ Ảnh bìa này là **GIF động**!');
        }

        // Tạo nút bấm tải ảnh
        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('📥 Tải PNG (4096px)')
                .setStyle(ButtonStyle.Link)
                .setURL(bannerURL),
        );

        if (gifURL) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setLabel('🎞️ Tải GIF')
                    .setStyle(ButtonStyle.Link)
                    .setURL(gifURL),
            );
        }

        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },
};
