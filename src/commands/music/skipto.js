const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('skipto')
        .setDescription('Bỏ qua nhiều bài và nhảy đến bài hát cụ thể trong hàng đợi.')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('Vị trí bài hát muốn nhảy tới (Xem bằng /queue)')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || queue.tracks.size === 0) {
            return interaction.reply({ content: '❌ Hàng đợi đang trống, không có bài nào để nhảy tới!', flags: 64 });
        }

        const position = interaction.options.getInteger('position');
        const index = position - 1; // Index bắt đầu từ 0
        
        if (index < 0 || index >= queue.tracks.size) {
            return interaction.reply({ content: `❌ Vị trí không hợp lệ! Hãy dùng lệnh \`/queue\` để xem chính xác số thứ tự từ 1 đến ${queue.tracks.size}.`, flags: 64 });
        }

        queue.node.skipTo(index);
        return interaction.reply(`⏭️ Đã bỏ qua các bài trước đó và nhảy tới bài **số ${position}**!`);
    }
};
