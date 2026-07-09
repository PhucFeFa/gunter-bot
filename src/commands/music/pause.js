const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Tạm dừng (Pause) bài hát đang phát.'),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Hiện tại có bài nào đang phát đâu mà đòi dừng?', flags: 64 });
        }

        if (queue.node.isPaused()) {
            return interaction.reply({ content: '⚠️ Nhạc đã bị tạm dừng từ trước rồi! Gõ `/resume` để phát tiếp.', flags: 64 });
        }

        queue.node.setPaused(true);
        return interaction.reply('⏸️ Đã tạm dừng nhạc! Bạn có thể dùng lệnh `/resume` để phát tiếp bất cứ lúc nào.');
    }
};
