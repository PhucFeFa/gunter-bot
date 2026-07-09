const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useMainPlayer, QueryType } = require('discord-player');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Phát một bài hát hoặc thêm vào hàng đợi.')
        .addStringOption(option => 
            option.setName('song')
                .setDescription('Tên bài hát hoặc đường link (YouTube, Spotify, SoundCloud...)')
                .setRequired(true)
        ),

    async execute(interaction) {
        const player = useMainPlayer();
        const query = interaction.options.getString('song');
        const channel = interaction.member.voice.channel;

        if (!channel) {
            return interaction.reply({ content: '❌ Bạn phải vào một kênh Voice trước mới nghe nhạc được chứ!', flags: 64 });
        }

        await interaction.deferReply();

        try {
            // player.play() tự động tìm kiếm, kết nối và phát nhạc
            const { track } = await player.play(channel, query, {
                searchEngine: QueryType.AUTO,
                nodeOptions: {
                    metadata: interaction
                }
            });

            const embed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setAuthor({ name: '🎵 Đã thêm vào hàng đợi' })
                .setDescription(`**[${track.title}](${track.url})**`)
                .setThumbnail(track.thumbnail)
                .addFields(
                    { name: 'Thời lượng', value: track.duration, inline: true },
                    { name: 'Tác giả', value: track.author, inline: true }
                )
                .setFooter({ text: `Yêu cầu bởi ${interaction.user.tag}` })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('[MUSIC] Lỗi lệnh play:', error.message);
            
            // Nếu lỗi là do không tìm thấy nhạc (ví dụ link bị chặn, link mix...)
            if (error.message.includes('No results found') || error.message.includes('ERR_NO_RESULT')) {
                return interaction.editReply({ 
                    content: '❌ **Không tìm thấy bài hát này!**\n*Mẹo: Nếu bạn dán link YouTube Mix (có chữ `list=RD`), hãy thử xóa phần đuôi đó đi, hoặc cứ gõ trực tiếp tên bài hát ra nhé!*' 
                });
            }

            return interaction.editReply({ content: '❌ Ôi hỏng! Đã xảy ra lỗi kỹ thuật khi cố gắng phát bài này.' });
        }
    }
};
