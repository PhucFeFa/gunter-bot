const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, StringSelectMenuBuilder } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { getConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('Chơi Caro Vô Cực (Infinite Tic-Tac-Toe)')
        .addStringOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược (Hoặc gõ "all" để chơi tất tay)')
                .setRequired(true))
        .addUserOption(option => 
            option.setName('opponent')
                .setDescription('Đối thủ (để trống nếu muốn chơi với máy)')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const guildId = interaction.guildId;
        const config = await getConfig(guildId);
        if (!config.feature_economy) {
            return interaction.editReply('❌ Tính năng Economy đang bị tắt trên server này!');
        }

        const p1 = interaction.user;
        const p2 = interaction.options.getUser('opponent');
        const betRaw = interaction.options.getString('bet');

        // Check số dư P1
        const p1Data = await getUser(p1.id);
        const currentBalance = p1Data.balance;

        let bet = 0;
        if (betRaw.toLowerCase() === 'all') {
            bet = currentBalance;
            if (bet <= 0) return interaction.editReply('❌ Bạn làm gì có tiền mà đòi all in!');
        } else {
            bet = parseInt(betRaw);
            if (isNaN(bet) || bet <= 0) return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }
        if (currentBalance < bet) {
            return interaction.editReply(`❌ Bạn không có đủ tiền! Số dư của bạn: **${currentBalance.toLocaleString()} $**`);
        }

        if (p2) {
            if (p2.bot) return interaction.editReply('❌ Bạn không thể thách đấu Bot khác!');
            if (p2.id === p1.id) return interaction.editReply('❌ Tự kỷ à? Chơi với máy thì đừng tag ai!');

            // Check số dư P2 ngay từ đầu
            const p2Data = await getUser(p2.id);
            if (p2Data.balance < bet) {
                return interaction.editReply(`❌ <@${p2.id}> nghèo rớt mồng tơi, lấy đâu ra **${bet.toLocaleString()} $** mà gạ kèo?`);
            }

            // Khởi tạo PvP
            await this.startPvP(interaction, p1, p2, bet);
        } else {
            // Khởi tạo PvE
            await this.startPvE(interaction, p1, bet);
        }
    },

    // ────────────────────────────────────────────────────────────────
    // PVP MODE
    // ────────────────────────────────────────────────────────────────
    async startPvP(interaction, p1, p2, bet) {
        const acceptBtn = new ButtonBuilder().setCustomId('caro_accept').setLabel('Chấp nhận').setStyle(ButtonStyle.Success);
        const declineBtn = new ButtonBuilder().setCustomId('caro_decline').setLabel('Từ chối').setStyle(ButtonStyle.Danger);
        const row = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

        const inviteMsg = await interaction.editReply({
            content: `<@${p2.id}> ơi! <@${p1.id}> đang gạ kèo Caro Vô Cực với mức cược **${bet.toLocaleString()} $**.\nBạn có 60 giây để chấp nhận!`,
            components: [row]
        });

        const filter = i => i.user.id === p2.id || i.user.id === p1.id;
        const collector = inviteMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000, filter });

        collector.on('collect', async i => {
            if (i.customId === 'caro_decline' || (i.customId === 'caro_accept' && i.user.id === p1.id && false /* let them cancel? no */)) {
                if (i.user.id === p1.id) {
                    await i.update({ content: '❌ Bạn đã hủy lời mời.', components: [] });
                } else {
                    await i.update({ content: `❌ <@${p2.id}> đã từ chối kèo.`, components: [] });
                }
                collector.stop('declined');
                return;
            }

            if (i.customId === 'caro_accept' && i.user.id === p2.id) {
                const p2Data = await getUser(p2.id);
                if (p2Data.balance < bet) {
                    return i.reply({ content: '❌ Bạn không đủ tiền để chơi ván này!', ephemeral: true });
                }

                // Trừ tiền 2 bên
                await updateBalance(p1.id, -bet);
                await updateBalance(p2.id, -bet);
                
                await i.update({ content: `✅ Kèo đã được chốt! Trừ ${bet.toLocaleString()} $ của mỗi người. Bắt đầu ngay...`, components: [] });
                collector.stop('accepted');
                
                // Khởi động Game Loop
                this.runGame(interaction, p1, p2, bet, 'pvp', 1);
            }
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: '⏳ Hết giờ, kèo đã bị hủy.', components: [] }).catch(() => {});
            }
        });
    },

    // ────────────────────────────────────────────────────────────────
    // PVE MODE
    // ────────────────────────────────────────────────────────────────
    async startPvE(interaction, p1, bet) {
        const menu = new StringSelectMenuBuilder()
            .setCustomId('caro_difficulty')
            .setPlaceholder('Chọn độ khó')
            .addOptions([
                { label: 'Dễ (Easy)', description: 'Bot đánh ngẫu nhiên. Thưởng: 1.5x cược', value: 'easy' },
                { label: 'Trung Bình (Medium)', description: 'Bot biết chặn đường. Thưởng: 2.0x cược', value: 'medium' },
                { label: 'Khó (Hard)', description: 'Bot biết tính toán. Thưởng: 3.0x cược', value: 'hard' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const promptMsg = await interaction.editReply({
            content: `Bạn đang thách đấu Máy với cược **${bet.toLocaleString()} $**.\nHãy chọn độ khó để bắt đầu:`,
            components: [row]
        });

        const filter = i => i.user.id === p1.id;
        const collector = promptMsg.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 30000, filter });

        collector.on('collect', async i => {
            const difficulty = i.values[0];
            
            // Trừ tiền
            const p1Data = await getUser(p1.id);
            if (p1Data.balance < bet) {
                return i.reply({ content: '❌ Bạn không đủ tiền! Ảo thuật à?', ephemeral: true });
            }
            await updateBalance(p1.id, -bet);
            
            await i.update({ content: `✅ Đã chọn độ khó **${difficulty.toUpperCase()}**. Trừ ${bet.toLocaleString()} $. Bắt đầu...`, components: [] });
            collector.stop('started');

            let rewardMultiplier = 1.5;
            if (difficulty === 'medium') rewardMultiplier = 2.0;
            if (difficulty === 'hard') rewardMultiplier = 3.0;

            this.runGame(interaction, p1, { id: 'bot', username: 'Gunter Bot' }, bet, 'pve', rewardMultiplier, difficulty);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: '⏳ Hết giờ chọn độ khó, đã hủy.', components: [] }).catch(() => {});
            }
        });
    },

    // ────────────────────────────────────────────────────────────────
    // CORE GAME LOGIC
    // ────────────────────────────────────────────────────────────────
    async runGame(interaction, p1, p2, bet, mode, rewardMultiplier, difficulty = 'easy') {
        const board = Array(9).fill(null); 
        // Lịch sử nước đi (Queue): lưu index của các nước đi
        const history = { X: [], O: [] }; 
        let currentTurn = 'X'; // X luôn đi trước (P1)
        let isGameOver = false;

        const checkWin = (b, player) => {
            const lines = [
                [0,1,2], [3,4,5], [6,7,8], // Hàng ngang
                [0,3,6], [1,4,7], [2,5,8], // Hàng dọc
                [0,4,8], [2,4,6]           // Chéo
            ];
            for (let line of lines) {
                if (b[line[0]] === player && b[line[1]] === player && b[line[2]] === player) return true;
            }
            return false;
        };

        const renderBoard = (b, h, gameOverStatus = null) => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const idx = i * 3 + j;
                    const val = b[idx];
                    
                    const btn = new ButtonBuilder().setCustomId(`caro_${idx}`);
                    
                    if (val === 'X') {
                        btn.setEmoji('❌');
                        // Nếu là quân CŨ NHẤT và đủ 3 quân, nó sẽ nhạt đi (đổi Style)
                        if (h.X.length === 3 && h.X[0] === idx) btn.setStyle(ButtonStyle.Secondary);
                        else btn.setStyle(ButtonStyle.Primary);
                    } else if (val === 'O') {
                        btn.setEmoji('⭕');
                        if (h.O.length === 3 && h.O[0] === idx) btn.setStyle(ButtonStyle.Secondary);
                        else btn.setStyle(ButtonStyle.Danger);
                    } else {
                        btn.setEmoji('➖').setStyle(ButtonStyle.Secondary);
                    }

                    if (gameOverStatus || val !== null) {
                        btn.setDisabled(true); // Không bấm lại ô đã đánh
                    }
                    if (gameOverStatus) btn.setDisabled(true); // Kết thúc thì khóa hết

                    row.addComponents(btn);
                }
                rows.push(row);
            }

            // Thêm nút surrender nếu đang chơi
            if (!gameOverStatus) {
                rows.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('caro_surrender').setLabel('Đầu Hàng').setStyle(ButtonStyle.Secondary)
                ));
            }
            return rows;
        };

        const generateEmbed = (status = 'playing', winner = null, amountWon = 0) => {
            const embed = new EmbedBuilder().setTitle('Caro Vô Cực (Infinite Tic-Tac-Toe)');
            
            const currentPlayer = currentTurn === 'X' ? p1 : p2;
            const nextMark = currentTurn === 'X' ? '❌' : '⭕';

            if (status === 'playing') {
                embed.setColor(0x3498DB);
                embed.setDescription(`**Chế độ:** ${mode.toUpperCase()}\n**Mức cược:** ${bet.toLocaleString()} $\n\nLượt của: <@${currentPlayer.id}> (${nextMark})`);
                embed.setFooter({ text: 'Luật: Mỗi người tối đa 3 quân. Đánh quân thứ 4 thì quân đầu tiên sẽ biến mất!' });
            } else if (status === 'win') {
                embed.setColor(0x00FF00);
                if (winner === 'X') {
                    embed.setDescription(`🎉 **<@${p1.id}> (❌) ĐÃ THẮNG!**\nNhận được: **${amountWon.toLocaleString()} $**`);
                } else {
                    embed.setDescription(`🎉 **${p2.id === 'bot' ? p2.username : `<@${p2.id}>`} (⭕) ĐÃ THẮNG!**\nNhận được: **${amountWon.toLocaleString()} $**`);
                }
            } else if (status === 'timeout') {
                embed.setColor(0x95A5A6);
                embed.setDescription(`⏳ **Ván đấu bị hủy do AFK quá lâu!**\nĐã hoàn lại ${bet.toLocaleString()} $ cho mỗi người.`);
            } else if (status === 'surrender') {
                embed.setColor(0xFF0000);
                embed.setDescription(`🏳️ **<@${winner.id}> đã đầu hàng!**\nĐối phương nhận toàn bộ tiền cược.`);
            }

            return embed;
        };

        let msg = await interaction.editReply({
            embeds: [generateEmbed()],
            components: renderBoard(board, history)
        });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 3 * 60 * 1000 }); // 3 phút timeout

        const handleBotTurn = async () => {
            if (isGameOver) return;
            // Fake delay 1-2s
            await new Promise(r => setTimeout(r, 1000 + Math.random() * 1000));
            
            // Tìm nước đi
            let move = -1;
            const emptyIndices = board.map((v, i) => v === null ? i : -1).filter(i => i !== -1);

            if (difficulty === 'easy' || emptyIndices.length === 9) {
                move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
            } else {
                // Medium / Hard logic
                // Thử tìm nước thắng (nếu ta đánh vào ô này và xóa ô cũ đi, ta có thắng không?)
                let foundWin = -1;
                for (let idx of emptyIndices) {
                    let tempB = [...board];
                    let tempQ = [...history.O];
                    tempB[idx] = 'O';
                    tempQ.push(idx);
                    if (tempQ.length > 3) tempB[tempQ.shift()] = null;
                    if (checkWin(tempB, 'O')) { foundWin = idx; break; }
                }

                if (foundWin !== -1) {
                    move = foundWin;
                } else {
                    // Thử tìm nước chặn đối thủ thắng (P1 đánh vào sẽ thắng)
                    let blockMove = -1;
                    for (let idx of emptyIndices) {
                        let tempB = [...board];
                        let tempQ = [...history.X];
                        tempB[idx] = 'X';
                        tempQ.push(idx);
                        if (tempQ.length > 3) tempB[tempQ.shift()] = null;
                        if (checkWin(tempB, 'X')) { blockMove = idx; break; }
                    }

                    if (blockMove !== -1) {
                        move = blockMove;
                    } else {
                        // Khó (Ưu tiên giữa)
                        if (difficulty === 'hard' && board[4] === null) {
                            move = 4;
                        } else {
                            move = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
                        }
                    }
                }
            }

            // Thực hiện đi
            processMove(move);
        };

        const processMove = async (idx, inter = null) => {
            // Cập nhật State
            board[idx] = currentTurn;
            const queue = history[currentTurn];
            queue.push(idx);
            
            // Quy tắc vô cực: Xóa quân cũ nhất nếu > 3
            if (queue.length > 3) {
                const oldest = queue.shift();
                board[oldest] = null;
            }

            // Kiểm tra thắng
            if (checkWin(board, currentTurn)) {
                isGameOver = true;
                collector.stop('win');
                let amountWon = 0;
                
                if (currentTurn === 'X') {
                    // P1 thắng
                    if (mode === 'pvp') amountWon = bet * 2;
                    else amountWon = bet + Math.floor(bet * rewardMultiplier);
                    await updateBalance(p1.id, amountWon);
                } else {
                    // P2 thắng
                    if (mode === 'pvp') {
                        amountWon = bet * 2;
                        await updateBalance(p2.id, amountWon);
                    }
                }

                const finalEmbed = generateEmbed('win', currentTurn, amountWon);
                if (inter) await inter.update({ embeds: [finalEmbed], components: renderBoard(board, history, true) });
                else await msg.edit({ embeds: [finalEmbed], components: renderBoard(board, history, true) });
                return;
            }

            // Đổi lượt
            currentTurn = currentTurn === 'X' ? 'O' : 'X';
            const embed = generateEmbed();
            const components = renderBoard(board, history);

            if (inter) await inter.update({ embeds: [embed], components });
            else await msg.edit({ embeds: [embed], components });

            // Reset timeout timer
            collector.resetTimer();

            // Kích hoạt Bot
            if (mode === 'pve' && currentTurn === 'O') {
                handleBotTurn();
            }
        };

        collector.on('collect', async i => {
            if (isGameOver) return;
            
            if (i.customId === 'caro_surrender') {
                if (i.user.id !== p1.id && i.user.id !== p2.id) {
                    return i.reply({ content: 'Kèo của người ta mà bạn đòi đầu hàng?', ephemeral: true });
                }
                isGameOver = true;
                collector.stop('surrender');
                
                let surrenderer = i.user;
                let winner = surrenderer.id === p1.id ? p2 : p1;

                if (mode === 'pvp') {
                    await updateBalance(winner.id, bet * 2); // Winner takes all
                } // Nếu PVE, P1 đầu hàng thì mất cược (đã trừ)

                await i.update({ embeds: [generateEmbed('surrender', surrenderer)], components: renderBoard(board, history, true) });
                return;
            }

            // Kiểm tra đúng người đánh
            const expectedUser = currentTurn === 'X' ? p1 : p2;
            if (i.user.id !== expectedUser.id) {
                return i.reply({ content: `Chưa đến lượt của bạn hoặc bạn không phải là người chơi!`, ephemeral: true });
            }

            const idx = parseInt(i.customId.split('_')[1]);
            if (board[idx] !== null) return; // Không thể đánh vào ô có người

            await processMove(idx, i);
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && !isGameOver) {
                isGameOver = true;
                // Hoàn tiền
                await updateBalance(p1.id, bet);
                if (mode === 'pvp') await updateBalance(p2.id, bet);

                try {
                    await msg.edit({ embeds: [generateEmbed('timeout')], components: renderBoard(board, history, true) });
                } catch(e) {}
            }
        });
    }
};
