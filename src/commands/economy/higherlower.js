const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const liveGameManager = require('../../utils/liveGameManager');

const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Tính giá trị của bài (2 -> 14)
const getCardValue = (rank) => RANKS.indexOf(rank) + 2;

// Rút một lá bài
const drawCard = () => {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { rank, suit, value: getCardValue(rank), display: `[ **${rank}** ${suit} ]` };
};

// Hàm tính hệ số (Multiplier) dựa trên xác suất thực tế của bộ bài
const calculateMultipliers = (currentValue) => {
    const lowerCards = (currentValue - 2) * 4;
    const higherCards = (14 - currentValue) * 4;
    const equalCards = 3;
    const totalCards = 51;
    const RTP = 0.95; // Tỉ lệ trả thưởng 95%

    const calc = (count) => {
        if (count === 0) return 0;
        let mult = (totalCards / count) * RTP;
        return Math.max(1.01, mult).toFixed(2);
    };

    return {
        lower: parseFloat(calc(lowerCards)),
        higher: parseFloat(calc(higherCards)),
        equal: parseFloat(calc(equalCards))
    };
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('higherlower')
        .setDescription('🃏 Chơi HiLo - Đoán liên tục, dồn hệ số x!')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược (Gõ "all" để all in)')
                .setRequired(true)),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const amountRaw = interaction.options.getString('amount');
        const user = interaction.user;
        const userData = await getUser(user.id);
        const currentBalance = userData.balance;

        let amount = 0;
        if (!amountRaw) return interaction.editReply('❌ Chưa nhập số tiền! VD: `g!higherlower 1000`');
        if (amountRaw.toLowerCase() === 'all') {
            amount = currentBalance;
            if (amount <= 0) return interaction.editReply('❌ Bạn không còn đồng xu nào để cược!');
        } else {
            amount = parseInt(amountRaw);
            if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }

        if (amount > 250000000) amount = 250000000;

        if (currentBalance < amount) {
            return interaction.editReply(`❌ Số dư của bạn không đủ! Hiện có: **${currentBalance.toLocaleString()} 🪙**`);
        }

        // Trừ tiền cược ngay từ đầu
        await updateBalance(user.id, -amount);
        liveGameManager.addActiveBet(user.id, amount);

        let currentCard = drawCard();
        let currentWinnings = amount; // Tiền đang tích lũy
        let turn = 0; // Đếm số lượt đã đoán đúng
        let isGameOver = false;
        let isCashedOut = false;
        let lastActionText = 'Game bắt đầu! Chọn bước đi của bạn.';

        // Hàm tạo Embed hiển thị
        const generateEmbed = (card, nextCard = null) => {
            const embed = new EmbedBuilder();
            const mults = calculateMultipliers(card.value);

            let desc = `**Lá bài hiện tại:**\n# ${card.display}\n\n`;

            if (isGameOver) {
                desc += `**Lá bài bốc ra:**\n# ${nextCard ? nextCard.display : '❓'}\n\n`;
                embed.setColor(0xFF0000);
                embed.setTitle('💥 GAME OVER!');
                desc += `💥 **Tình trạng:** ${lastActionText}\n`;
                desc += `💀 Bạn đã đoán sai ở lượt thứ ${turn + 1} và mất trắng **${amount.toLocaleString()} 🪙**!`;
            } else if (isCashedOut) {
                embed.setColor(0x00FF00);
                embed.setTitle('💰 ĐÃ CHỐT LỜI!');
                desc += `🎉 **Tình trạng:** ${lastActionText}\n`;
                desc += `💵 Bạn đã Cashout ở lượt thứ ${turn} và mang về **${Math.floor(currentWinnings).toLocaleString()} 🪙**!`;
            } else {
                embed.setColor(0x3498DB);
                embed.setTitle('🃏 HILO - HIGHER OR LOWER');
                desc += `💬 *${lastActionText}*\n\n`;
                desc += `💵 **Tiền đang có trong ván:** ${Math.floor(currentWinnings).toLocaleString()} 🪙\n\n`;
                desc += `Hãy dự đoán cho lá tiếp theo:\n`;
                desc += `⬆️ **Cao hơn:** Nhận ${(Math.floor(currentWinnings * mults.higher)).toLocaleString()} 🪙 (x${mults.higher})\n`;
                desc += `⬇️ **Thấp hơn:** Nhận ${(Math.floor(currentWinnings * mults.lower)).toLocaleString()} 🪙 (x${mults.lower})\n`;
                desc += `= **Hòa:** Nhận ${(Math.floor(currentWinnings * mults.equal)).toLocaleString()} 🪙 (x${mults.equal})\n`;
            }

            embed.setDescription(desc);

            return { embed, mults };
        };

        // Hàm tạo Nút bấm
        const getComponents = (mults) => {
            const row = new ActionRowBuilder();

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId('higher')
                    .setLabel(`⬆️ Cao hơn`)
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(isGameOver || isCashedOut || mults.higher === 0),
                new ButtonBuilder()
                    .setCustomId('lower')
                    .setLabel(`⬇️ Thấp hơn`)
                    .setStyle(ButtonStyle.Danger)
                    .setDisabled(isGameOver || isCashedOut || mults.lower === 0),
                new ButtonBuilder()
                    .setCustomId('equal')
                    .setLabel(`= Hòa`)
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(isGameOver || isCashedOut || mults.equal === 0)
            );

            // Row thứ 2 cho Cashout (Chỉ hiện khi đã đoán trúng ít nhất 1 lần)
            if (turn > 0 && !isGameOver && !isCashedOut) {
                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('cashout')
                        .setLabel(`💰 RÚT TIỀN: ${Math.floor(currentWinnings).toLocaleString()} 🪙`)
                        .setStyle(ButtonStyle.Success)
                );
                return [row, row2];
            }

            return [row];
        };

        let currentView = generateEmbed(currentCard);

        const msg = await interaction.editReply({
            embeds: [currentView.embed],
            components: getComponents(currentView.mults)
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) {
                return i.reply({ content: 'Đừng bấm bài của người khác!', ephemeral: true });
            }

            collector.resetTimer();

            // Nếu rút tiền
            if (i.customId === 'cashout') {
                isCashedOut = true;
                lastActionText = 'Quyết định rút lui an toàn!';
                liveGameManager.removeActiveBet(user.id, amount);
                await updateBalance(user.id, Math.floor(currentWinnings)); // Trả tiền về ví

                currentView = generateEmbed(currentCard);
                await i.update({
                    embeds: [currentView.embed],
                    components: getComponents(currentView.mults)
                });
                return collector.stop('cashed_out');
            }

            // Nếu đoán
            const nextCard = drawCard();
            let won = false;
            let multUsed = 0;

            if (i.customId === 'higher') {
                if (nextCard.value > currentCard.value) { won = true; multUsed = currentView.mults.higher; }
            } else if (i.customId === 'lower') {
                if (nextCard.value < currentCard.value) { won = true; multUsed = currentView.mults.lower; }
            } else if (i.customId === 'equal') {
                if (nextCard.value === currentCard.value) { won = true; multUsed = currentView.mults.equal; }
            }

            if (won) {
                turn++;
                currentWinnings *= multUsed; // Cộng dồn tiền thắng
                currentCard = nextCard;      // Lá mới trở thành lá hiện tại
                lastActionText = `Lá bốc ra là ${nextCard.display}. Đoán chuẩn! Trúng hệ số x${multUsed}`;

                currentView = generateEmbed(currentCard);
                await i.update({
                    embeds: [currentView.embed],
                    components: getComponents(currentView.mults)
                });
            } else {
                isGameOver = true;
                lastActionText = `Lá bốc ra là ${nextCard.display}. Sai rồi con trai!`;
                liveGameManager.removeActiveBet(user.id, amount);

                currentView = generateEmbed(currentCard, nextCard); // Truyền nextCard vào để hiện lý do chết
                await i.update({
                    embeds: [currentView.embed],
                    components: [] // Thua thì ẩn hết nút
                });
                collector.stop('crashed');
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && !isGameOver && !isCashedOut) {
                isGameOver = true;
                liveGameManager.removeActiveBet(user.id, amount);
                lastActionText = 'Hết thời gian suy nghĩ!';
                currentView = generateEmbed(currentCard);
                await interaction.editReply({
                    embeds: [currentView.embed],
                    components: []
                });
            }
        });
    },

    async executePrefix(message, args, client) {
        const amountRaw = args[0];
        if (!amountRaw) return message.reply('Cách chơi: `g!higherlower <tiền_cược>` (VD: `g!higherlower 100` hoặc `g!higherlower all`)');
        
        const replyMsg = await message.reply('🃏 Đang chia bài...');
        const fakeInteraction = {
            user: message.author,
            options: { getString: () => amountRaw },
            deferred: true,
            replied: true,
            deferReply: async function() {},
            editReply: async function(options) {
                return await replyMsg.edit(options);
            }
        };
        await this.execute(fakeInteraction);
    }
};
