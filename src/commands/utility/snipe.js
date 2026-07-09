const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Lấy lại tin nhắn vừa bị xóa trong kênh.')
        .addIntegerOption(option => 
            option.setName('position')
                .setDescription('Vị trí tin nhắn muốn lấy (1-5, mặc định là 1 - tin nhắn xóa gần nhất)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5)
        ),
        
    async execute(interaction) {
        const snipes = interaction.client.snipes.get(interaction.channel.id);
        
        if (!snipes || snipes.length === 0) {
            return interaction.reply({ 
                content: '❌ Không có tin nhắn nào bị xóa gần đây trong kênh này!', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        let position = interaction.options.getInteger('position');
        
        if (position) {
            // Nếu người dùng chọn số lớn hơn số tin nhắn hiện có, đưa về tin nhắn xa nhất
            if (position > snipes.length) position = snipes.length;
            
            const msg = snipes[position - 1]; // mảng bắt đầu từ 0

            const embed = new EmbedBuilder()
                .setColor(0xE74C3C) // Màu đỏ cảnh báo
                .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
                .setDescription(msg.content || '*Tin nhắn không có nội dung chữ (Chỉ có hình ảnh)*')
                .setFooter({ text: `Tin nhắn bị xóa • Vị trí ${position}/${snipes.length} trong lịch sử` })
                .setTimestamp(msg.date);
                
            if (msg.image) {
                embed.setImage(msg.image);
            }

            return interaction.reply({ embeds: [embed] });
        } else {
            // Không truyền position, hiển thị tối đa 3 tin nhắn
            const limit = Math.min(3, snipes.length);
            const embeds = [];
            for (let i = 0; i < limit; i++) {
                const msg = snipes[i];
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
                    .setDescription(msg.content || '*Tin nhắn không có nội dung chữ (Chỉ có hình ảnh)*')
                    .setFooter({ text: `Tin nhắn bị xóa • Vị trí ${i + 1}/${snipes.length} trong lịch sử` })
                    .setTimestamp(msg.date);
                    
                if (msg.image) {
                    embed.setImage(msg.image);
                }
                embeds.push(embed);
            }
            
            return interaction.reply({ embeds });
        }
    }
};
