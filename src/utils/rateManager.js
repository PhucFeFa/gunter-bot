const { EmbedBuilder } = require('discord.js');

let currentRateUp = null; // 'fish', 'job', or null
let rateUpEndTime = 0;
const messageChannelIds = process.env.BEGGAR_CHANNELS ? process.env.BEGGAR_CHANNELS.split(',') : ['1494709251187150860', '1524753504017580162', '1524753555817500864']; // Các kênh thông báo

module.exports = {
    getCurrentRateUp: () => {
        if (Date.now() > rateUpEndTime) {
            currentRateUp = null;
        }
        return currentRateUp;
    },
    
    initRateUpManager: (client) => {
        // Cứ mỗi 1 giờ kiểm tra 1 lần
        setInterval(() => {
            if (Date.now() < rateUpEndTime) return; // Đang trong thời gian có event
            
            // 30% cơ hội nổ event mỗi giờ
            if (Math.random() < 0.3) {
                const types = ['fish', 'job'];
                const type = types[Math.floor(Math.random() * types.length)];
                currentRateUp = type;
                rateUpEndTime = Date.now() + 15 * 60 * 1000; // Event kéo dài 15 phút
                
                const embed = new EmbedBuilder()
                    .setTitle('🎉 SỰ KIỆN GIỜ VÀNG BẮT ĐẦU!')
                    .setColor(0xf1c40f);
                    
                if (type === 'fish') {
                    embed.setDescription('🎣 **TĂNG GẤP ĐÔI tỷ lệ câu ra cá cấp cao (Tier 5+) và tỷ lệ ra cá Shiny!**\nSự kiện kéo dài 15 phút, nhanh tay cầm cần ra khơi nào!');
                } else {
                    embed.setDescription('💼 **TĂNG MẠNH tỷ lệ quay ra nghề Hiếm (Rare, Epic, Legendary, Mythic, Divine và Secret)!**\nSự kiện kéo dài 15 phút, dùng lệnh `/job spin` hoặc `/job spin5` ngay!');
                }

                for (const channelId of messageChannelIds) {
                    const channel = client.channels.cache.get(channelId);
                    if (channel) {
                        channel.send({ embeds: [embed] }).catch(()=>{});
                    }
                }
            }
        }, 60 * 60 * 1000); // 1 giờ
    }
};
