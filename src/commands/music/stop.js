const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Dừng phát nhạc và đuổi bot ra khỏi phòng.'),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Hiện tại tôi có đang hát bài nào đâu?', flags: 64 });
        }

        // Xóa hàng đợi và ngắt kết nối
        queue.delete();

        return interaction.reply('🛑 Đã ngắt nhạc và rời khỏi phòng thoại. Tạm biệt!');
    }
};
