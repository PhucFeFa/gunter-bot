const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGeminiResponse } = require('../utils/geminiChat');
const { updateBalance } = require('../utils/economyDB');

const MAIN_CHAT_ID = '1494709251187150860';
const THREAD_CHANNEL_ID = '1524752989091270768';

function initRandomEvents(client) {
    // Chạy bộ đếm mỗi 1 tiếng một lần
    setInterval(async () => {
        try {
            // Lắc xúc xắc (1-100) để quyết định event
            const dice = Math.floor(Math.random() * 100) + 1;

            if (dice <= 30) {
                // 30% Tỷ lệ: Gửi một câu trêu ghẹo vào Main Chat
                await triggerRandomJoke(client);
            } else if (dice > 30 && dice <= 60) {
                // 30% Tỷ lệ: Tạo một Thread thảo luận xàm xí
                await triggerRandomThread(client);
            } else if (dice > 60 && dice <= 90) {
                // 30% Tỷ lệ: Thả hộp quà (Airdrop tiền)
                await triggerAirdrop(client);
            }
            // 10% còn lại: Bot ngủ im không làm gì cả
        } catch (error) {
            console.error('[RandomEvents] Lỗi khi chạy random event:', error);
        }
    }, 1 * 60 * 60 * 1000); // 1 tiếng
}

async function triggerRandomJoke(client) {
    const channel = client.channels.cache.get(MAIN_CHAT_ID);
    if (!channel) return;

    const prompt = `Viết 1 câu trêu ghẹo, khịa hoặc thả thính cực kỳ lầy lội, mặn mòi, hài hước bằng tiếng Việt để thả vào group chat. 
Yêu cầu: Không quá dài (1-2 câu), giống phong cách gen Z, dùng teencode hoặc mỉa mai nhẹ nhàng. Bắt đầu ngay, không cần giải thích.`;
    
    try {
        const joke = await getGeminiResponse(prompt);
        await channel.send(joke);
    } catch (e) {
        console.error('Lỗi lấy Joke:', e);
    }
}

async function triggerRandomThread(client) {
    const channel = client.channels.cache.get(THREAD_CHANNEL_ID);
    if (!channel || channel.type !== 0) return; // Chỉ tạo thread trong Text Channel

    const prompt = `Tạo một chủ đề thảo luận (Thread) siêu vô tri, hài hước, mang tính chất gây lú hoặc gây tranh cãi vui vẻ để chém gió.
Ví dụ: "Tại sao con báo lại tên là con báo?", "Đội nước tương hay đội tương ớt".
Trả về định dạng:
Tiêu đề: <Một câu ngắn gọn>
Nội dung: <Đoạn văn ngắn châm ngòi thảo luận, lầy lội>`;

    try {
        const response = await getGeminiResponse(prompt);
        
        const titleMatch = response.match(/Tiêu đề:\s*(.*)/i);
        const contentMatch = response.match(/Nội dung:\s*([\s\S]*)/i);

        if (titleMatch && contentMatch) {
            let title = titleMatch[1].trim();
            if (title.length > 90) title = title.substring(0, 90) + '...';
            
            const msg = await channel.send(`🗣️ **Chuyên mục thảo luận xàm xí hôm nay:**\n${contentMatch[1].trim()}`);
            await msg.startThread({
                name: title,
                autoArchiveDuration: 1440,
                reason: 'Auto generated random thread'
            });
        }
    } catch (e) {
        console.error('Lỗi tạo Thread:', e);
    }
}

async function triggerAirdrop(client) {
    const channel = client.channels.cache.get(MAIN_CHAT_ID);
    if (!channel) return;

    const dropAmount = Math.floor(Math.random() * 450000) + 50000; // 50,000 - 500,000 coins

    const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎁 THÍNH TỪ TRÊN TRỜI RƠI XUỐNG 🎁')
        .setDescription(`Một hộp quà chứa **${dropAmount} 🪙** vừa xuất hiện!\nBấm vào nút bên dưới thật nhanh để nhặt, chỉ người đầu tiên mới được nhận!`)
        .setImage('https://media.giphy.com/media/26BRQTezAEqgZ92g0/giphy.gif')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('claim_airdrop')
            .setLabel('Nhặt Quà!')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🏃‍♂️')
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    // Thu thập tương tác (Chỉ 1 người đầu tiên bấm được)
    const collector = msg.createMessageComponentCollector({ time: 10 * 60 * 1000, max: 1 });

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'claim_airdrop') {
            await updateBalance(interaction.user.id, dropAmount);
            
            const claimedEmbed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('🎁 HỘP QUÀ ĐÃ BỊ MỞ 🎁')
                .setDescription(`🏆 Chúc mừng **${interaction.user}** đã tay nhanh hơn não nhặt được **${dropAmount} 🪙**!`);

            await msg.edit({ embeds: [claimedEmbed], components: [] });
            await interaction.reply({ content: `🎉 Bạn đã bú thành công **${dropAmount} 🪙**!`, flags: 64 });
        }
    });

    collector.on('end', collected => {
        if (collected.size === 0) {
            const expiredEmbed = new EmbedBuilder()
                .setColor(0x95A5A6)
                .setTitle('🎁 HỘP QUÀ ĐÃ BỊ THU HỒI 🎁')
                .setDescription(`⏳ 10 phút trôi qua mà không ai thèm nhặt **${dropAmount} 🪙**. Gunter đã cất hộp quà vào kho!`);
            msg.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
        }
    });
}

module.exports = { initRandomEvents };
