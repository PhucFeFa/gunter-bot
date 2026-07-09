const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Xáo trộn ngẫu nhiên danh sách phát (Shuffle).'),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || queue.tracks.size < 2) {
            return interaction.reply({ content: '❌ Cần ít nhất 2 bài hát trong hàng đợi thì mới xáo trộn được chứ!', flags: 64 });
        }

        queue.tracks.shuffle();
        return interaction.reply('🔀 Đã xáo trộn danh sách bài hát ngẫu nhiên!');
    }
};
