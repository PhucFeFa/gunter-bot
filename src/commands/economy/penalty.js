const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { updateBalance, getUser } = require('../../utils/economyDB');
const liveGameManager = require('../../utils/liveGameManager');

const MULTIPLIERS = [1.35, 1.92, 2.74, 3.91, 5.58, 7.97, 11.38, 16.25, 23.21, 30.0];
const WIN_CHANCE = 0.7; // Tỉ lệ 70% mỗi lần sút (nhà cái có lợi thế nhẹ)

module.exports = {
    data: new SlashCommandBuilder()
        .setName('penalty')
        .setDescription('⚽ Sút luân lưu! Vượt qua 10 ải để nhân 30 lần tiền cược!')
        .addStringOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược (Tối đa 250,000,000)')
                .setRequired(true)
        ),
        
    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }
        const betRaw = interaction.options.getString('bet');
        await this.handlePenalty(interaction, betRaw);
    },
    
    async executePrefix(message, args) {
        const betRaw = args[0]?.replace(/,/g, '');
        if (!betRaw) {
            return message.reply('❌ Cú pháp sai! Ví dụ: `g!penalty 50000` hoặc `g!penalty all`');
        }

        const fakeInteraction = {
            user: message.author,
            deferReply: async () => {},
            editReply: async (options) => await message.reply(options)
        };
        await this.handlePenalty(fakeInteraction, betRaw);
    },

    async handlePenalty(interaction, betRaw) {
        const userId = interaction.user.id;
        const userDoc = await getUser(userId);
        
        let bet = 0;
        if (betRaw.toLowerCase() === 'all') {
            bet = userDoc.balance;
        } else {
            bet = parseInt(betRaw);
        }

        if (isNaN(bet) || bet <= 0) {
            return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }

        if (bet > 250000000) {
            bet = 250000000;
        }

        if (userDoc.balance < bet) {
            return interaction.editReply(`❌ Mõm à? Mày chỉ có **${userDoc.balance.toLocaleString()} 🪙**, lấy cứt ra ${bet.toLocaleString()} 🪙 để cược à!`);
        }

        // Trừ tiền cược
        await updateBalance(userId, -bet);
        liveGameManager.addActiveBet(userId, bet);

        let step = 0;
        let isEnded = false;
        let lastResultMsg = '';

        const generateEmbed = (status = 'playing') => {
            const currentMultiplier = step === 0 ? 0 : MULTIPLIERS[step - 1];
            const nextMultiplier = step < MULTIPLIERS.length ? MULTIPLIERS[step] : MULTIPLIERS[step - 1];
            const currentWin = Math.floor(bet * currentMultiplier);
            const nextWin = Math.floor(bet * nextMultiplier);

            let color = 0x3498DB;
            let title = '⚽ SÚT PENALTY (PENALTY SHOOT-OUT)';
            let desc = `**Người sút:** <@${userId}>\n**Số tiền cược:** ${bet.toLocaleString()} 🪙\n`;

            if (status === 'playing') {
                desc += `\n🎯 **Lượt sút thứ ${step + 1}/${MULTIPLIERS.length}**\n`;
                desc += `⚡ Hệ số ăn (nếu không ngu): **x${nextMultiplier}** (${nextWin.toLocaleString()} 🪙)\n`;
                
                if (step > 0) {
                    desc += `💰 Tiền đang ôm: **${currentWin.toLocaleString()} 🪙**\n`;
                    desc += `\n${lastResultMsg}`;
                    desc += `\n*Sút tiếp hay hèn nhát ôm tiền cút?*`;
                } else {
                    desc += `\n*Căng mắt ra mà sút!*`;
                }
            } else if (status === 'win') {
                color = 0x2ECC71;
                title = '🏆 HÚP TRỌN BÀN CỜ!';
                desc += `\n${lastResultMsg}\n`;
                desc += `🎉 Ghê đấy! Mày bú được **${currentWin.toLocaleString()} 🪙**! (x${currentMultiplier})`;
            } else if (status === 'cashout') {
                color = 0xF1C40F;
                title = '🛑 CHUỒN NHANH CÒN KỊP';
                desc += `\n${lastResultMsg}\n`;
                desc += `💸 Đồ nhát cáy! Mày ôm **${currentWin.toLocaleString()} 🪙** rồi chuồn! (x${currentMultiplier})`;
            } else if (status === 'lose') {
                color = 0xE74C3C;
                title = '❌ NGU DỐT!';
                desc += `\n${lastResultMsg}\n`;
                desc += `💀 Trắng tay rồi con trai! Mất cmn hết tiền cược rồi! =)))`;
            } else if (status === 'animating') {
                color = 0x95A5A6;
                title = '⚽ ĐANG SÚT...';
                desc += `\n🏃‍♂️ Lấy đà...\n`;
                desc += `⚡ Nhắm mắt đá bừa!!!\n`;
                desc += `\n*Liệu có tạch không???*`;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(desc)
                .setThumbnail(status === 'win' || status === 'cashout' ? 'https://media.giphy.com/media/l41YkxvU8c7J7Bba0/giphy.gif' : (status === 'lose' ? 'https://media.giphy.com/media/3o7TKrEzvLbgzGmMVy/giphy.gif' : 'https://media.giphy.com/media/3o7aD2saal6q1Im5IY/giphy.gif'));
        };

        const generateButtons = (disabled = false) => {
            const row1 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pen_tl').setEmoji('↖️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('pen_tc').setEmoji('⬆️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('pen_tr').setEmoji('↗️').setStyle(ButtonStyle.Primary).setDisabled(disabled)
            );
            const row2 = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('pen_bl').setEmoji('↙️').setStyle(ButtonStyle.Primary).setDisabled(disabled),
                new ButtonBuilder().setCustomId('pen_cashout').setLabel('Nhận Tiền').setStyle(ButtonStyle.Success).setDisabled(disabled || step === 0),
                new ButtonBuilder().setCustomId('pen_br').setEmoji('↘️').setStyle(ButtonStyle.Primary).setDisabled(disabled)
            );
            return [row1, row2];
        };

        let msg;
        try {
            msg = await interaction.editReply({
                embeds: [generateEmbed('playing')],
                components: generateButtons(),
                fetchReply: true
            });
        } catch (e) {
            liveGameManager.removeActiveBet(userId, bet);
            return;
        }

        if (!msg || !msg.createMessageComponentCollector) {
            liveGameManager.removeActiveBet(userId, bet);
            await updateBalance(userId, bet);
            return;
        }

        const collector = msg.createMessageComponentCollector({
            filter: i => i.user.id === userId && i.customId.startsWith('pen_'),
            time: 60000
        });

        let isProcessing = false;

        collector.on('collect', async i => {
            if (isEnded || isProcessing) {
                // Phản hồi để discord không báo lỗi
                if (!i.replied && !i.deferred) await i.deferUpdate().catch(() => {});
                return;
            }

            isProcessing = true;

            if (i.customId === 'pen_cashout') {
                isEnded = true;
                collector.stop('cashout');
                const winAmount = Math.floor(bet * MULTIPLIERS[step - 1]);
                await updateBalance(userId, winAmount);
                liveGameManager.removeActiveBet(userId, bet);
                lastResultMsg = '✅ Hảo hán! Thấy mùi là ôm tiền cút ngay!';
                await i.update({ embeds: [generateEmbed('cashout')], components: generateButtons(true) }).catch(() => {});
                return;
            }

            // --- ANIMATION DELAY ---
            // Trạng thái đang sút (tạm khóa nút)
            await i.update({ embeds: [generateEmbed('animating')], components: generateButtons(true) }).catch(() => {});
            
            // Đợi 1.5 giây tạo kịch tính
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Xử lý khi sút
            const isGoal = Math.random() < WIN_CHANCE;
            
            if (!isGoal) {
                isEnded = true;
                collector.stop('lose');
                liveGameManager.removeActiveBet(userId, bet);
                lastResultMsg = '🧤 Bắt bài cmnr! Thủ môn ỉa vào mặt mày!';
                await i.editReply({ embeds: [generateEmbed('lose')], components: generateButtons(true) }).catch(() => {});
            } else {
                step++;
                if (step >= MULTIPLIERS.length) {
                    isEnded = true;
                    collector.stop('win');
                    const winAmount = Math.floor(bet * MULTIPLIERS[MULTIPLIERS.length - 1]);
                    await updateBalance(userId, winAmount);
                    liveGameManager.removeActiveBet(userId, bet);
                    lastResultMsg = '🔥 GÓC CHẾT! Mày hack à?';
                    await i.editReply({ embeds: [generateEmbed('win')], components: generateButtons(true) }).catch(() => {});
                } else {
                    // Cập nhật lại timer
                    collector.resetTimer();
                    lastResultMsg = '⚽ VÀOOOO! Rùa vcl! Sút tiếp đi con trai!';
                    await i.editReply({ embeds: [generateEmbed('playing')], components: generateButtons() }).catch(() => {});
                    isProcessing = false;
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (!isEnded) {
                isEnded = true;
                if (step > 0) {
                    // Auto cashout on timeout
                    const winAmount = Math.floor(bet * MULTIPLIERS[step - 1]);
                    await updateBalance(userId, winAmount);
                    liveGameManager.removeActiveBet(userId, bet);
                    lastResultMsg = '⏳ Chậm chạp vcl! Trọng tài thổi còi đuổi mày ra, tự động chốt tiền cút!';
                    try {
                        await msg.edit({ embeds: [generateEmbed('cashout')], components: generateButtons(true) });
                    } catch(e) {}
                } else {
                    // Timeout before first shot => refund
                    await updateBalance(userId, bet);
                    liveGameManager.removeActiveBet(userId, bet);
                    try {
                        await msg.edit({ content: '❌ Lâu la vãi, biến mẹ đi tao trả lại tiền nè!', embeds: [], components: [] });
                    } catch(e) {}
                }
            }
        });
    }
};
