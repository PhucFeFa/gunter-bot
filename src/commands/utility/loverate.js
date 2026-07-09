const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('love-rate')
        .setDescription('💖 Đo độ hợp nhau giữa 2 người')
        .addUserOption(option => 
            option.setName('user1')
                .setDescription('Người thứ nhất')
                .setRequired(true)
        )
        .addUserOption(option => 
            option.setName('user2')
                .setDescription('Người thứ hai (Nếu bỏ trống sẽ tự ghép với bạn)')
                .setRequired(false)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        
        let target1 = interaction.options.getUser('user1');
        let target2 = interaction.options.getUser('user2');

        // Nếu không có user2, lấy người dùng làm user1 và target1 làm user2
        if (!target2) {
            target2 = target1;
            target1 = interaction.user;
        }

        await this.handleLoveRate(interaction, target1, target2);
    },

    async executePrefix(message, args) {
        if (message.mentions.users.size === 0) {
            return message.reply('❌ Bạn phải tag ít nhất 1 người! Ví dụ: `g!love-rate @user1 @user2`');
        }

        const users = Array.from(message.mentions.users.values());
        let target1 = users[0];
        let target2 = users.length > 1 ? users[1] : message.author;
        
        // Đảo ngược vị trí nếu chỉ tag 1 người (người gọi lệnh bên trái)
        if (users.length === 1) {
            target2 = target1;
            target1 = message.author;
        }

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };

        await this.handleLoveRate(fakeInteraction, target1, target2);
    },

    async handleLoveRate(interaction, user1, user2) {
        try {
            // Random Rate dựa trên ID để không bị đổi mỗi lần bấm (Tâm linh)
            const combinedId = BigInt(user1.id) + BigInt(user2.id);
            const rate = Number(combinedId % 101n); // Tỷ lệ từ 0 đến 100

            // Chọn câu phán xét
            let judgment = '';
            if (rate <= 20) judgment = 'Ghét nhau như chó với mèo, né nhau ra cho đỡ mang họa! 💀';
            else if (rate <= 40) judgment = 'Cũng tạm, nhưng mà là tạm biệt! 🐧';
            else if (rate <= 60) judgment = 'Mức độ bình thường, giống bạn bè qua đường thôi.';
            else if (rate <= 80) judgment = 'Có vẻ hứa hẹn phết đấy, tiến tới đi xem nào! 😳';
            else if (rate < 100) judgment = 'Định mệnh an bài cmnr, cưới luôn đi chứ còn chờ gì nữa?! 💍';
            else judgment = 'Perfect Match! Bố mẹ 2 bên đã xem ngày chưa? 💒';

            // --- VẼ CANVAS ---
            const canvas = createCanvas(700, 300);
            const ctx = canvas.getContext('2d');

            ctx.fillStyle = '#2F3136'; // Nền tối chuẩn Discord
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Tải ảnh avatar
            const avt1Url = user1.displayAvatarURL({ extension: 'png', size: 256 });
            const avt2Url = user2.displayAvatarURL({ extension: 'png', size: 256 });
            
            const [avatar1, avatar2, heart] = await Promise.all([
                loadImage(avt1Url),
                loadImage(avt2Url),
                loadImage('https://i.imgur.com/gNiX25X.png') // Ảnh trái tim
            ]);

            // Vẽ avatar 1 (Bên trái, cắt thành hình tròn)
            ctx.save();
            ctx.beginPath();
            ctx.arc(175, 150, 125, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar1, 50, 25, 250, 250);
            ctx.restore();

            // Vẽ avatar 2 (Bên phải, cắt thành hình tròn)
            ctx.save();
            ctx.beginPath();
            ctx.arc(525, 150, 125, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar2, 400, 25, 250, 250);
            ctx.restore();

            // Vẽ trái tim ở giữa
            ctx.drawImage(heart, 275, 75, 150, 150);

            // Viết chữ Tỷ Lệ lên trên trái tim
            ctx.font = 'bold 40px Arial';
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${rate}%`, 350, 145);

            // Đóng gói và gửi
            const buffer = await canvas.encode('png');
            const attachment = new AttachmentBuilder(buffer, { name: 'loverate.png' });

            const embed = new EmbedBuilder()
                .setColor(0xFF69B4) // Màu hồng Love
                .setTitle(`💖 Đo Độ Hợp Nhau: ${user1.username} & ${user2.username}`)
                .setDescription(`**Tỷ lệ hợp nhau: ${rate}%**\n\n💬 Phán xét: ${judgment}`)
                .setImage('attachment://loverate.png')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed], files: [attachment] });

        } catch (error) {
            console.error('[LOVERATE] Lỗi:', error);
            await interaction.editReply('❌ Đã xảy ra lỗi khi tính toán độ hợp nhau! Vui lòng thử lại sau.');
        }
    }
};
