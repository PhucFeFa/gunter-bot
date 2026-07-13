const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { updateBalance, updateLoan } = require('./economyDB');
const { addFishToInventory } = require('./fishDB');
const { FISH_LIST, rollFishSize, calcFishPrice, applyShiny } = require('../data/fishData');

const BEGGAR_CHANNELS = process.env.BEGGAR_CHANNELS ? process.env.BEGGAR_CHANNELS.split(',') : [];
const CHANCE_TO_BEG = 0.02; // 2% chance per message
const BEG_COOLDOWN = 60 * 60 * 1000; // 1 hour cooldown per channel
const WAIT_TIME = 5 * 60 * 1000; // 5 minutes

const channelCooldowns = new Map();
const recentChatters = new Map(); // channelId -> Set of recent userIds

const INSULTS = [
    "Địt cụ kênh giàu vãi lồn mà đéo ai cho tao 1 đồng à? Thằng lồn <@{userId}> nôn tiền ra đây!",
    "Đợi nãy giờ đéo ai bố thí, tao đành tự lấy của thằng lồn <@{userId}> vậy, đéo nói nhiều!",
    "Mấy thằng lồn ki bo kẹt xỉ! Kêu gào rát cổ đéo cho, tao tự rút tiền của <@{userId}>!",
    "Khinh người nghèo à? Địt mẹ tao xiết nợ thằng <@{userId}> ngay lập tức cho chừa tội keo kiệt!",
    "Bố mày xin đàng hoàng đéo cho, phải để bố mày dùng biện pháp mạnh à thằng mặt lồn <@{userId}>?",
    "Địt mẹ nguyên cái group toàn các chủ tịch giả nghèo giả khổ, tao đã hạ mình xin xỏ đàng hoàng mà chúng mày vẫn ki bo kẹt xỉ à? Thôi đéo nói nhiều, thằng lồn <@{userId}> thay mặt cả group đứng ra trả nợ cho tao, nôn tiền ra đây nhanh!",
    "Bố mày nhịn nãy giờ là quá đủ rồi! 5 phút trôi qua mà đéo có 1 đồng nào rơi vào mồm, chúng mày coi thường người nghèo đúng không? Địt cụ thằng <@{userId}>, mày xui rồi con ạ, bố mày quyết định xiết nợ từ tài khoản của mày, cấm cãi!",
    "Alo alo công ty tài chính FE Credit xin thông báo! Do không ai tự nguyện quyên góp, hệ thống sẽ tự động gán nợ xấu cho một nạn nhân xấu số trong kênh. Chúc mừng con nợ <@{userId}> đã trúng giải đặc biệt, tiền của mày giờ là của tao, khóc lóc đéo giải quyết được gì đâu!",
    "Chúng mày nghĩ tao đùa à? Kêu gào rát cả họng mà cái group này vô cảm vãi lồn, toàn các thành phần ôm tiền đi bao gái mà đéo bố thí nổi cho anh em. Thằng <@{userId}>, mày đứng gần tao nhất, đưa ví đây tao tự lấy tiền, khôn hồn thì đứng im!",
    "Thôi được rồi, nếu chúng mày đã thích chơi hệ keo kiệt thì tao xin phép chơi hệ cướp bóc! Địt mẹ thằng <@{userId}>, nhìn mặt mày ghét vãi lồn, tao chính thức thông báo phong tỏa tài sản của mày, ngoan ngoãn giao nộp tiền ra đây cho anh!"
];

const THANKS = [
    "Ái chà chà đại gia <@{userId}>, cảm ơn sếp lớn nha! Tặng sếp con cá nhắm rượu nè!",
    "Địt mẹ uy tín luôn đại ca <@{userId}>! Thằng lồn nào ki bo chứ sếp tao thì đéo! Nhận cá nha sếp!",
    "Ối dồi ôi tuyệt vời <@{userId}> ơi! Cho tao xin cái info để tối tao bú liếm sếp nha! Tặng sếp con cá này!",
    "Cảm tạ ân công <@{userId}>! Đéo bù cho mấy thằng lồn khác trong kênh này, tặng ân công con cá ngon nhất hệ mặt trời!",
    "Sếp <@{userId}> đỉnh vãi lồn! Cảm ơn sếp đã từ thiện cho kẻ bần hàn này, ăn con cá cho bổ thận nha sếp!",
    "Ái chà chà! Cả thế giới quay lưng với tao nhưng đại gia <@{userId}> thì không! Cảm ơn sếp lớn đã dang rộng vòng tay cứu rỗi kẻ bần hàn này, uy tín luôn sếp ơi! Tặng sếp con cá cực phẩm này về hầm thuốc bắc tẩm bổ nhé!",
    "Địt mẹ 10 điểm cho chất lượng! Thằng lồn nào mỏ hỗn ki bo thì mặc kệ, chứ sếp <@{userId}> của tao là số một! Bố mày xin tuyên bố sếp là idol mới của lòng tao! Cầm lấy con cá ngon nhất Vịnh Bắc Bộ này đi sếp!",
    "Ối dồi ôi! Chân mệnh thiên tử xuất hiện rồi! Anh <@{userId}> đẹp trai vãi lồn, vừa giàu lại vừa phóng khoáng! Bọn khác nhìn sếp mà học tập kìa! Tối nay sếp cần gì cứ ới em một tiếng nha, tặng sếp con cá này bú rượu cho khỏe người!",
    "Nước mắt tao rơi rồi chúng mày ạ! Cảm tạ ân đức sâu dày của <@{userId}>! Giữa cái xã hội toàn bọn khốn nạn, anh hiện lên như một vị thần tài mang hy vọng. Quà báo đáp của em đây, cá tươi rói 100% không hàn the nha!",
    "Sếp <@{userId}> đỉnh của chóp! Tiền nong với sếp chỉ là phù du, quan trọng là cái tầm! Xin phép được bái sếp làm đại ca từ hôm nay. Ăn con cá này đi đại ca, cá lậu em vừa chôm được ở chợ đầu mối đấy, bổ thận tráng dương lắm!"
];

function getRandomTier3To7Fish() {
    const validFishes = FISH_LIST.filter(f => f.tier >= 3 && f.tier <= 7);
    const fish = validFishes[Math.floor(Math.random() * validFishes.length)];
    const size = rollFishSize(fish);
    let result = { ...fish, size, price: calcFishPrice(fish, size), isShiny: false };

    // Tỉ lệ nhỏ ra cá shiny
    if (Math.random() < 0.05) {
        result = applyShiny(result);
    }
    return result;
}

module.exports = {
    handleMessage: async (message) => {
        if (!BEGGAR_CHANNELS.includes(message.channel.id)) return;

        const channelId = message.channel.id;
        const userId = message.author.id;

        // Track recent chatters
        if (!recentChatters.has(channelId)) recentChatters.set(channelId, new Set());
        const chatters = recentChatters.get(channelId);
        chatters.add(userId);
        if (chatters.size > 20) {
            const firstId = chatters.values().next().value;
            chatters.delete(firstId);
        }

        // Check cooldown
        const now = Date.now();
        if (channelCooldowns.has(channelId)) {
            if (now - channelCooldowns.get(channelId) < BEG_COOLDOWN) return;
        }

        // Random chance
        if (Math.random() > CHANCE_TO_BEG) return;

        // Start Begging
        channelCooldowns.set(channelId, now);

        const begAmount = Math.floor(Math.random() * 1500000) + 500000; // 500k to 2tr

        const embed = new EmbedBuilder()
            .setColor(0x000000)
            .setTitle('🚨 CÚT RA CHO BỐ MÀY XIN TIỀN!')
            .setDescription(`Bố mày đang kẹt tiền vãi lồn, thằng nào trong kênh này giàu nôn ra cho bố **${begAmount.toLocaleString()} 🪙** nhanh lên!\n\n⏳ Cho chúng mày **5 phút**, đéo ai cho tao tự động rút tiền của 1 thằng bất kỳ trong kênh!`)
            .setImage('https://i.pinimg.com/736x/87/4f/b5/874fb5ba4927cb0449da6ab54ff5f4bb.jpg'); // Meme chửi thề hoặc giang hồ (placeholder)

        const btn = new ButtonBuilder()
            .setCustomId('beggar_give')
            .setLabel('Cho tiền 💸')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(btn);

        const replyMsg = await message.channel.send({ embeds: [embed], components: [row] });

        const filter = i => i.customId === 'beggar_give';
        const collector = replyMsg.createMessageComponentCollector({ filter, time: WAIT_TIME });

        collector.on('collect', async (i) => {
            const giverId = i.user.id;
            const giverData = await require('./economyDB').getUser(giverId);

            if (giverData.balance < begAmount) {
                return i.reply({ content: `Nghèo vãi lồn mà đòi làm từ thiện à? Mày chỉ có ${giverData.balance.toLocaleString()} 🪙 thôi, cút!`, flags: 64 });
            }

            // Giver has enough money
            await updateBalance(giverId, -begAmount);

            // Give reward
            const fishReward = getRandomTier3To7Fish();
            await addFishToInventory(giverId, fishReward);

            const thanksMsg = THANKS[Math.floor(Math.random() * THANKS.length)].replace('{userId}', giverId);

            const successEmbed = new EmbedBuilder()
                .setColor(0x2ecc71)
                .setTitle('💖 ĐẠI GIA ĐÃ LÊN TIẾNG!')
                .setDescription(thanksMsg + `\n\n🎁 **Phần thưởng:** ${fishReward.emoji} **${fishReward.name}** (Size: ${fishReward.size}cm - Trị giá: ${fishReward.price.toLocaleString()} 🪙)`);

            await i.update({ embeds: [successEmbed], components: [] });
            collector.stop('given');
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'given') return; // Đã có người cho

            // Hết 5 phút đéo ai cho
            const channelChatters = recentChatters.get(channelId);
            if (!channelChatters || channelChatters.size === 0) {
                return message.channel.send("Địt mẹ kênh vắng như chùa bà đanh, bố mày đi chỗ khác!");
            }

            // Chọn ngẫu nhiên 1 nạn nhân
            const arr = Array.from(channelChatters);
            const victimId = arr[Math.floor(Math.random() * arr.length)];

            const victimData = await require('./economyDB').getUser(victimId);
            let deducted = 0;
            let debtAdded = 0;

            if (victimData.balance >= begAmount) {
                await updateBalance(victimId, -begAmount);
                deducted = begAmount;
            } else {
                deducted = victimData.balance;
                debtAdded = begAmount - victimData.balance;
                await updateBalance(victimId, -deducted);
                await updateLoan(victimId, debtAdded);
            }

            const insultMsg = INSULTS[Math.floor(Math.random() * INSULTS.length)].replace('{userId}', victimId);

            const failEmbed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('🔥 HẾT GIỜ! BỐ MÀY ĐI CƯỚP ĐÂY!')
                .setDescription(`${insultMsg}\n\n💸 Đã tự động lột sạch **${deducted.toLocaleString()} 🪙** của <@${victimId}>!` + (debtAdded > 0 ? `\n📉 Địt mẹ tài khoản đéo đủ, ngân hàng tự ép mày vay thêm **${debtAdded.toLocaleString()} 🪙** trả cho tao!` : ''));

            await message.channel.send({ embeds: [failEmbed] });

            // Xóa nút bấm của tin nhắn cũ
            await replyMsg.edit({ components: [] }).catch(() => { });
        });
    }
};
