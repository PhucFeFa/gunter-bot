const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getGeminiResponse } = require('../utils/geminiChat');
const { updateBalance } = require('../utils/economyDB');

const MAIN_CHAT_ID = process.env.MAIN_CHAT_ID;
const THREAD_CHANNEL_ID = process.env.THREAD_CHANNEL_ID;

function initRandomEvents(client) {
    // Chạy bộ đếm mỗi 1 tiếng một lần cho các event nhỏ
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

    // Chạy bộ đếm RobinHood cướp Top 1 mỗi 24 tiếng
    setInterval(async () => {
        await triggerRobinHood(client);
    }, 24 * 60 * 60 * 1000); // 24 tiếng
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

}

async function triggerRobinHood(client) {
    const channel = client.channels.cache.get(MAIN_CHAT_ID);
    if (!channel) return;

    const { getTop, updateBalance } = require('../utils/economyDB');
    // Lấy top 1 server (đã loại trừ Boss/Admin trong hàm getTop)
    const topUsers = getTop('balance', 1);
    
    if (topUsers.length === 0) return; // Không có ai có tiền
    
    const top1 = topUsers[0];
    if (top1.balance < 10000) return; // Nghèo quá tha không cướp
    
    const stolenAmount = Math.floor(top1.balance * 0.1); // Cướp 10%
    const splitAmount = Math.floor(stolenAmount / 5);    // Chia 5 phần
    
    if (splitAmount < 1) return;

    // Trừ tiền Top 1
    await updateBalance(top1.userId, -stolenAmount);

    let top1Name = 'ID ' + top1.userId;
    try {
        const topMember = await channel.guild.members.fetch(top1.userId);
        if (topMember) top1Name = `<@${top1.userId}>`;
    } catch(e){}

    const embed = new EmbedBuilder()
        .setColor(0x9B59B6)
        .setTitle('🦅 SỰ KIỆN ROBIN HOOD CƯỚP PHÚ TẾ BẦN 🦅')
        .setDescription(`Đại gia **${top1Name}** ngủ quên, Gunter đã trộm **10%** tổng tài sản (trị giá **${stolenAmount.toLocaleString()} 🪙**) của hắn!\n\nSố tiền này đã được chia đều thành **5 hộp quà**, mỗi hộp **${splitAmount.toLocaleString()} 🪙**!\n\n🏃‍♂️ Nhanh tay bấm vào nút bên dưới để hôi của! (Tối đa 5 người nhanh nhất, mỗi người 1 phát)`)
        .setImage('https://media.giphy.com/media/l41lFw057lAJQMwg0/giphy.gif')
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('claim_robinhood')
            .setLabel('Hôi của!')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('💰')
    );

    const msg = await channel.send({ embeds: [embed], components: [row] });

    // Thu thập tương tác cho 5 người
    const collector = msg.createMessageComponentCollector({ time: 60 * 60 * 1000 }); // Tồn tại 1 tiếng
    
    const claimers = new Set();
    const claimerNames = [];

    collector.on('collect', async (interaction) => {
        if (interaction.customId === 'claim_robinhood') {
            if (claimers.has(interaction.user.id)) {
                return interaction.reply({ content: '❌ Tham lam! Mày đã hôi của rồi, nhường người khác đi!', flags: 64 });
            }
            
            if (interaction.user.id === top1.userId) {
                return interaction.reply({ content: '❌ Tiền của mày mà còn đi hôi của à? Bấm ra chỗ khác!', flags: 64 });
            }

            claimers.add(interaction.user.id);
            claimerNames.push(`<@${interaction.user.id}>`);
            await updateBalance(interaction.user.id, splitAmount);
            
            await interaction.reply({ content: `🎉 Bú thành công **${splitAmount.toLocaleString()} 🪙** từ gia sản của đại gia!`, flags: 64 });

            // Cập nhật giao diện nếu đã đủ 5 người hôi của
            if (claimers.size >= 5) {
                collector.stop('full');
            } else {
                const currentEmbed = EmbedBuilder.from(msg.embeds[0]);
                currentEmbed.setFooter({ text: `Đã có ${claimers.size}/5 người hôi của thành công!` });
                await msg.edit({ embeds: [currentEmbed] }).catch(()=>{});
            }
        }
    });

    collector.on('end', (collected, reason) => {
        const resultEmbed = new EmbedBuilder()
            .setColor(0x34495E)
            .setTitle('🦅 SỰ KIỆN ROBIN HOOD ĐÃ KẾT THÚC 🦅')
            .setDescription(`Hộp quà đã trống rỗng!\n\nNhững người đã bú được tiền của đại gia:\n${claimerNames.length > 0 ? claimerNames.join('\n') : 'Không có ma nào nhặt.'}\n\nĐại gia **${top1Name}** có thể khóc được rồi đó! 🐧`);
        
        msg.edit({ embeds: [resultEmbed], components: [] }).catch(() => {});
    });
}

module.exports = { initRandomEvents, triggerRobinHood };
