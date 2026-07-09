const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remove')
        .setDescription('Xóa một bài hát cụ thể khỏi hàng đợi (Delete).')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('Số thứ tự của bài muốn xóa (Gõ /queue để xem)')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({ content: '❌ Hàng đợi đang trống, không có gì để xóa!', flags: 64 });
        }

        const position = interaction.options.getInteger('position');
        const index = position - 1; // Trong code thì đếm từ 0
        
        if (index < 0 || index >= queue.tracks.size) {
            return interaction.reply({ content: `❌ Vị trí không hợp lệ! Hãy dùng lệnh \`/queue\` để xem chính xác số thứ tự từ 1 đến ${queue.tracks.size}.`, flags: 64 });
        }

        // Tìm bài hát ở vị trí đó
        const track = queue.tracks.toArray()[index];
        
        // Xóa nó khỏi hàng đợi
        queue.removeTrack(track);
        
        return interaction.reply(`🗑️ Đã xóa bài **${track.title}** khỏi hàng đợi!`);
    }
};
