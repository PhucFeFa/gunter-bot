const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Bỏ qua bài hát hiện tại (Next / Skip).'),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Không có bài hát nào đang phát để chuyển!', flags: 64 });
        }

        queue.node.skip();
        return interaction.reply('⏭️ Đã chuyển (Next) sang bài tiếp theo!');
    }
};
