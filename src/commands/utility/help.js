const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { getConfig } = require('../../utils/configDB');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Xem danh sách các lệnh của bot.'),

    async execute(interaction) {
        const config = await getConfig(interaction.guildId);
        const prefix = config.prefix || 'g!';

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('📖 Gunter Bot - Trung tâm trợ giúp')
            .setDescription(`Prefix hiện tại của server: \`${prefix}\`\nBạn có thể sử dụng các lệnh bằng **Slash Command** (gõ \`/\`) hoặc **Prefix Command** (gõ \`${prefix}\` trước tên lệnh).\n*Ví dụ: \`/daily\` hoặc \`${prefix}daily\`*\n\nVui lòng chọn một danh mục bên dưới để xem chi tiết!`)
            .setThumbnail(interaction.client.user.displayAvatarURL());

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('help_category_select')
                .setPlaceholder('Chọn một danh mục...')
                .addOptions([
                    { label: 'Admin & Setup', description: 'Các lệnh quản trị và cài đặt bot', value: 'admin', emoji: '⚙️' },
                    { label: 'Moderation', description: 'Quản lý thành viên (Kick, Ban, Mute, Prison)', value: 'moderation', emoji: '🛡️' },
                    { label: 'Economy & Games', description: 'Kinh tế, cờ bạc, và trò chơi', value: 'economy', emoji: '💰' },
                    { label: 'Music', description: 'Phát nhạc', value: 'music', emoji: '🎵' },
                    { label: 'Utility', description: 'Tiện ích chung', value: 'utility', emoji: '🛠️' }
                ])
        );

        return interaction.reply({ embeds: [embed], components: [row], flags: 64 });
    }
};
