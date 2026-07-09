const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Xem danh sách các bài hát đang chờ phát.'),
        
    async execute(interaction) {
        const queue = useQueue(interaction.guildId);

        if (!queue || !queue.isPlaying()) {
            return interaction.reply({ content: '❌ Hàng đợi đang trống / Không có bài nào đang phát!', flags: 64 });
        }

        const currentTrack = queue.currentTrack;
        const tracks = queue.tracks.toArray().slice(0, 10); // Lấy 10 bài tiếp theo để tránh tin nhắn quá dài

        let description = `**▶ Đang phát:** [${currentTrack.title}](${currentTrack.url}) \`${currentTrack.duration}\`\n\n**Sắp phát (Tiếp theo):**\n`;
        
        if (tracks.length === 0) {
            description += '*Không có bài nào tiếp theo.*';
        } else {
            tracks.forEach((track, index) => {
                description += `**${index + 1}.** [${track.title}](${track.url}) - \`${track.duration}\`\n`;
            });
        }

        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle(`🎶 Hàng đợi của ${interaction.guild.name}`)
            .setDescription(description)
            .setFooter({ text: `Tổng cộng: ${queue.tracks.size} bài hát đang chờ` });
            
        return interaction.reply({ embeds: [embed] });
    }
};
