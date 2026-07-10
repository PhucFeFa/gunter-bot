const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');

const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// Rút một lá bài
const drawCard = () => {
    const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return { rank, suit, display: `[ **${rank}** ${suit} ]` };
};

// Lấy giá trị bài theo luật Baccarat
const getBaccaratValue = (rank) => {
    if (rank === 'A') return 1;
    if (['10', 'J', 'Q', 'K'].includes(rank)) return 0;
    return parseInt(rank);
};

// Tính điểm tổng (lấy chữ số hàng đơn vị)
const getHandTotal = (cards) => {
    const sum = cards.reduce((acc, card) => acc + getBaccaratValue(card.rank), 0);
    return sum % 10;
};

// Format mảng lá bài thành chuỗi hiển thị
const formatCards = (cards) => cards.map(c => c.display).join('  ');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('baccarat')
        .setDescription('🃏 Chơi Baccarat (Bài Cào) - Thử vận may với Player, Banker hoặc Tie!')
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
        if (amountRaw.toLowerCase() === 'all') {
            amount = currentBalance;
            if (amount <= 0) return interaction.editReply('❌ Bạn không còn đồng xu nào để cược!');
        } else {
            amount = parseInt(amountRaw);
            if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }
        
        if (currentBalance < amount) {
            return interaction.editReply(`❌ Số dư của bạn không đủ! Hiện có: **${currentBalance.toLocaleString()} 🪙**`);
        }

        // Trừ tiền cược
        await updateBalance(user.id, -amount);

        const embed = new EmbedBuilder()
            .setColor(0xF1C40F)
            .setTitle('🃏 SÀN BACCARAT')
            .setDescription(`Bạn đã đặt cược **${amount.toLocaleString()} 🪙**.\n\nHãy chọn một cửa để vào tiền:`)
            .addFields(
                { name: '🔵 Player (Nhà Con)', value: 'Tỉ lệ 1 ăn 1', inline: true },
                { name: '🔴 Banker (Nhà Cái)', value: 'Tỉ lệ 1 ăn 0.95', inline: true },
                { name: '🟢 Tie (Hòa)', value: 'Tỉ lệ 1 ăn 8', inline: true }
            );

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('player').setLabel('🔵 Player (1:1)').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('banker').setLabel('🔴 Banker (1:0.95)').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('tie').setLabel('🟢 Tie (1:8)').setStyle(ButtonStyle.Success)
        );

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) {
                return i.reply({ content: 'Không phải bàn của bạn!', ephemeral: true });
            }

            const chosenSide = i.customId; // 'player', 'banker', 'tie'

            // --- BẮT ĐẦU CHIA BÀI THEO LUẬT BACCARAT ---
            let playerCards = [drawCard(), drawCard()];
            let bankerCards = [drawCard(), drawCard()];
            
            let playerTotal = getHandTotal(playerCards);
            let bankerTotal = getHandTotal(bankerCards);

            // Kiểm tra lá thứ 3
            // Nếu không ai có "Naturals" (8 hoặc 9) ngay từ 2 lá đầu
            if (playerTotal < 8 && bankerTotal < 8) {
                let playerStands = false;
                let playerThirdCard = null;

                // Luật cho Player: 0-5 rút, 6-7 dừng
                if (playerTotal <= 5) {
                    playerThirdCard = drawCard();
                    playerCards.push(playerThirdCard);
                    playerTotal = getHandTotal(playerCards);
                } else {
                    playerStands = true;
                }

                // Luật cho Banker
                if (playerStands) {
                    // Nếu Player dừng, Banker rút nếu 0-5
                    if (bankerTotal <= 5) {
                        bankerCards.push(drawCard());
                        bankerTotal = getHandTotal(bankerCards);
                    }
                } else {
                    // Nếu Player đã rút lá thứ 3, Banker rút theo luật phức tạp
                    const ptcValue = getBaccaratValue(playerThirdCard.rank);
                    let bankerDraws = false;

                    if (bankerTotal <= 2) bankerDraws = true;
                    else if (bankerTotal === 3 && ptcValue !== 8) bankerDraws = true;
                    else if (bankerTotal === 4 && ptcValue >= 2 && ptcValue <= 7) bankerDraws = true;
                    else if (bankerTotal === 5 && ptcValue >= 4 && ptcValue <= 7) bankerDraws = true;
                    else if (bankerTotal === 6 && (ptcValue === 6 || ptcValue === 7)) bankerDraws = true;
                    
                    if (bankerDraws) {
                        bankerCards.push(drawCard());
                        bankerTotal = getHandTotal(bankerCards);
                    }
                }
            }

            // Kết quả
            let winner = 'tie';
            if (playerTotal > bankerTotal) winner = 'player';
            else if (bankerTotal > playerTotal) winner = 'banker';

            // Xử lý tiền thưởng
            let winAmount = 0;
            let statusText = '';
            
            if (winner === 'tie') {
                if (chosenSide === 'tie') {
                    winAmount = amount * 9; // Tỉ lệ 1:8 nghĩa là ăn gấp 9 lần (vốn + 8 lãi)
                    statusText = '🎉 Bạn đã trúng cửa Tie! Lãi x8 cược!';
                } else {
                    winAmount = amount; // Hòa, trả lại tiền cược gốc
                    statusText = '🤝 Kết quả Hòa! Bạn được hoàn lại tiền cược.';
                }
            } else if (winner === 'player') {
                if (chosenSide === 'player') {
                    winAmount = amount * 2; // Tỉ lệ 1:1
                    statusText = '🎉 Bạn đoán đúng cửa Player! Lãi x1 cược!';
                } else {
                    statusText = '💀 Bạn đoán sai! Banker đã thắng.';
                }
            } else if (winner === 'banker') {
                if (chosenSide === 'banker') {
                    winAmount = amount + Math.floor(amount * 0.95); // Lãi 0.95
                    statusText = '🎉 Bạn đoán đúng cửa Banker! Lãi x0.95 cược!';
                } else {
                    statusText = '💀 Bạn đoán sai! Player đã thắng.';
                }
            }

            if (winAmount > 0) {
                await updateBalance(user.id, winAmount);
            }

            const sideNames = { 'player': '🔵 Player', 'banker': '🔴 Banker', 'tie': '🟢 Tie' };
            const winnerNames = { 'player': '🔵 PLAYER THẮNG', 'banker': '🔴 BANKER THẮNG', 'tie': '🟢 HÒA (TIE)' };

            const resultEmbed = new EmbedBuilder()
                .setColor(winAmount > amount ? 0x00FF00 : (winAmount === amount ? 0x95A5A6 : 0xFF0000))
                .setTitle(`BACCARAT - KẾT QUẢ: ${winnerNames[winner]}`)
                .setDescription(`Bạn đã cược vào cửa: **${sideNames[chosenSide]}**\n\n` +
                                `**🔵 Bài của Player [ ${playerTotal} điểm ]:**\n${formatCards(playerCards)}\n\n` +
                                `**🔴 Bài của Banker [ ${bankerTotal} điểm ]:**\n${formatCards(bankerCards)}\n\n` +
                                `**Kết luận:** ${statusText}\n` +
                                `💰 Trả thưởng: **${winAmount > 0 ? winAmount.toLocaleString() : 0} 🪙**`)
                .setThumbnail('https://i.imgur.com/8Qp4o2T.png');

            await i.update({ embeds: [resultEmbed], components: [] });
            collector.stop('finished');
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time') {
                await interaction.editReply({
                    content: '⏰ **Hết thời gian!** Bạn chưa chọn cửa nên đã bị mất tiền oan mạng =))).',
                    components: []
                });
            }
        });
    },

    async executePrefix(message, args, client) {
        const amountRaw = args[0];
        if (!amountRaw) return message.reply('Cách chơi: `g!baccarat <tiền_cược>` (VD: `g!baccarat 100` hoặc `g!baccarat all`)');
        
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
