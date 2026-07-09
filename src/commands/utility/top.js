const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getTopUsers } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('top')
        .setDescription('🏆 Bảng xếp hạng Server')
        .addStringOption(option => 
            option.setName('category')
                .setDescription('Chọn bảng xếp hạng muốn xem')
                .setRequired(true)
                .addChoices(
                    { name: '💬 Top Nhắn Tin', value: 'msg_count' },
                    { name: '🎙️ Top Voice', value: 'voice_time' },
                    { name: '💰 Top Đại Gia', value: 'balance' }
                )
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        
        const category = interaction.options.getString('category');
        const topUsers = await getTopUsers(category, 10);
        
        if (!topUsers || topUsers.length === 0) {
            return interaction.editReply('❌ Chưa có dữ liệu bảng xếp hạng này!');
        }

        const embed = new EmbedBuilder()
            .setColor(0xFFD700)
            .setTimestamp();

        let description = '';
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        if (category === 'msg_count') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Thánh Mõm (Top Chat)');
            topUsers.forEach((u, i) => {
                description += `${medals[i]} <@${u.userId}>: **${(u.msg_count || 0).toLocaleString()}** tin nhắn\n`;
            });
        } 
        else if (category === 'voice_time') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Chúa Tể Phòng Kín (Top Voice)');
            topUsers.forEach((u, i) => {
                const totalMinutes = Math.floor((u.voice_time || 0) / 60000);
                const hours = Math.floor(totalMinutes / 60);
                const mins = totalMinutes % 60;
                let timeStr = '';
                if (hours > 0) timeStr += `${hours} giờ `;
                timeStr += `${mins} phút`;
                if (totalMinutes === 0) timeStr = 'Chưa đầy 1 phút';
                
                description += `${medals[i]} <@${u.userId}>: **${timeStr}**\n`;
            });
        } 
        else if (category === 'balance') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Giới Tinh Hoa (Top Đại Gia)');
            topUsers.forEach((u, i) => {
                description += `${medals[i]} <@${u.userId}>: **${(u.balance || 0).toLocaleString()}** 🪙\n`;
            });
        }

        embed.setDescription(description || 'Không có dữ liệu.');

        await interaction.editReply({ embeds: [embed] });
    },
    
    // Hỗ trợ dùng g!top
    async executePrefix(message, args, client) {
        // Ánh xạ tham số
        const catMap = {
            'chat': 'msg_count', 'msg': 'msg_count',
            'voice': 'voice_time', 'vc': 'voice_time',
            'money': 'balance', 'coin': 'balance', 'tien': 'balance'
        };
        
        const input = args[0] ? args[0].toLowerCase() : null;
        const category = catMap[input] || 'balance'; // Mặc định là đại gia
        
        const topUsers = await getTopUsers(category, 10);
        if (!topUsers || topUsers.length === 0) return message.reply('❌ Chưa có dữ liệu bảng xếp hạng này!');

        const embed = new EmbedBuilder().setColor(0xFFD700).setTimestamp();
        let description = '';
        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        if (category === 'msg_count') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Thánh Mõm (Top Chat)');
            topUsers.forEach((u, i) => { description += `${medals[i]} <@${u.userId}>: **${(u.msg_count || 0).toLocaleString()}** tin nhắn\n`; });
        } else if (category === 'voice_time') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Chúa Tể Phòng Kín (Top Voice)');
            topUsers.forEach((u, i) => {
                const totalMinutes = Math.floor((u.voice_time || 0) / 60000);
                const h = Math.floor(totalMinutes / 60);
                const m = totalMinutes % 60;
                description += `${medals[i]} <@${u.userId}>: **${h > 0 ? h + ' giờ ' : ''}${m} phút**\n`;
            });
        } else if (category === 'balance') {
            embed.setTitle('🏆 Bảng Xếp Hạng: Giới Tinh Hoa (Top Đại Gia)');
            topUsers.forEach((u, i) => { description += `${medals[i]} <@${u.userId}>: **${(u.balance || 0).toLocaleString()}** 🪙\n`; });
        }

        embed.setDescription(description);
        await message.reply({ embeds: [embed] });
    }
};
