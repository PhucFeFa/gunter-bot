const { SlashCommandBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('filter')
        .setDescription('Bật/tắt các bộ lọc âm thanh cực cháy (Bassboost, Nightcore...)')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('Chọn bộ lọc bạn muốn')
                .setRequired(true)
                .addChoices(
                    { name: 'Khôi phục (Tắt hết)', value: 'off' },
                    { name: '🔥 Bassboost (Tăng âm trầm)', value: 'bassboost' },
                    { name: '🌙 Nightcore (Tuổi thơ ảo ma)', value: 'nightcore' },
                    { name: '🎧 8D (Nhạc chạy quanh đầu)', value: '8D' },
                    { name: '📻 Lofi (Chill thư giãn)', value: 'lofi' }
                )
        ),

    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Đang không có bài nào phát thì chỉnh âm thế nào được?', flags: 64 });
        }

        await interaction.deferReply();
        const filterType = interaction.options.getString('type');

        // Bật/tắt các filter bằng FFmpeg tích hợp sẵn
        if (filterType === 'off') {
            await queue.filters.ffmpeg.setFilters([]);
            return interaction.editReply('✅ Đã tắt tất cả bộ lọc, trở về âm thanh gốc.');
        }

        try {
            // Danh sách các filter FFmpeg có sẵn trong thư viện
            await queue.filters.ffmpeg.toggle(filterType);
            
            return interaction.editReply(`✅ Đã áp dụng bộ lọc âm thanh: **${filterType.toUpperCase()}**. (Vui lòng đợi vài giây để hệ thống mix lại nhạc nhé!)`);
        } catch (e) {
            return interaction.editReply('❌ Đã xảy ra lỗi khi chỉnh âm thanh.');
        }
    }
};
