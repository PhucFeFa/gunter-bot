const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Tiếp tục phát bài hát đang bị tạm dừng.'),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue) {
            return interaction.reply({ content: '❌ Hàng đợi trống trơn, lấy gì mà phát?', flags: 64 });
        }

        if (!queue.node.isPaused()) {
            return interaction.reply({ content: '⚠️ Nhạc vẫn đang phát bình thường mà!', flags: 64 });
        }

        queue.node.setPaused(false);
        return interaction.reply('▶️ Đã tiếp tục phát nhạc! Cùng quẩy nào!');
    }
};
