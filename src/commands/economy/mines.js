const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { getConfig } = require('../../utils/configDB');
const liveGameManager = require('../../utils/liveGameManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Chơi dò mìn ăn tiền (Minesweeper).')
        .addStringOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược (Hoặc gõ "all" để chơi tất tay)')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('mines')
                .setDescription('Số lượng mìn (1-15, mặc định: 3)')
                .setMinValue(1)
                .setMaxValue(15)
                .setRequired(false)),

    async execute(interaction) {
        // Hỗ trợ cả Slash Command và Fake Interaction (từ Prefix)
        const user = interaction.user;
        const guildId = interaction.guildId;
        
        const config = await getConfig(guildId);
        if (!config.feature_economy) {
            return interaction.reply({ content: '❌ Tính năng Economy đang bị tắt trên server này!', flags: 64 });
        }

        const betRaw = interaction.options.getString('bet');
        let minesCount = interaction.options.getInteger('mines') || 3;
        
        const userData = await getUser(user.id);
        const currentBalance = userData.balance;

        let bet = 0;
        if (betRaw.toLowerCase() === 'all') {
            bet = currentBalance;
            if (bet <= 0) return interaction.reply({ content: '❌ Bạn không có tiền để all in!', flags: 64 });
        } else {
            bet = parseInt(betRaw);
            if (isNaN(bet) || bet <= 0) return interaction.reply({ content: '❌ Vui lòng nhập số tiền cược hợp lệ!', flags: 64 });
        }

        if (bet > 250000000) bet = 250000000;

        if (currentBalance < bet) {
            return interaction.reply({ content: `❌ Bạn không có đủ tiền! Số dư của bạn: **${currentBalance.toLocaleString()} $**`, flags: 64 });
        }

        // Trừ tiền cược và ghi nhận cược đang chạy
        await updateBalance(user.id, -bet);
        liveGameManager.addActiveBet(user.id, bet);

        // Khởi tạo trò chơi 20 ô (5 cột x 4 hàng ngang)
        const grid = Array(20).fill('diamond');
        
        // Đặt mìn
        let placedMines = 0;
        while (placedMines < minesCount) {
            const randomIndex = Math.floor(Math.random() * 20);
            if (grid[randomIndex] !== 'bomb') {
                grid[randomIndex] = 'bomb';
                placedMines++;
            }
        }

        // State trò chơi
        let revealed = Array(20).fill(false);
        let diamondsFound = 0;
        const totalDiamonds = 20 - minesCount;
        let isGameOver = false;
        
        // Tính toán Multiplier theo xác suất tổ hợp (chuẩn casino)
        function combinations(n, k) {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;
            let kSmall = Math.min(k, n - k);
            let res = 1;
            for (let i = 1; i <= kSmall; i++) {
                res = res * (n - i + 1) / i;
            }
            return res;
        }

        function calculateMultiplier(diamonds, mines) {
            if (diamonds === 0) return 1.0;
            // Xác suất chọn đúng D ô không có mìn trong 20 ô
            const prob = combinations(20 - mines, diamonds) / combinations(20, diamonds);
            // Multiplier = (1 / Xác suất) * House Edge (0.99)
            const rawMultiplier = (1 / prob) * 0.99;
            return Number(rawMultiplier.toFixed(2));
        }

        function buildGrid(showAll = false) {
            const rows = [];
            let index = 0;
            
            // 4 hàng ngang x 5 cột = 20 ô
            for (let i = 0; i < 4; i++) {
                const row = new ActionRowBuilder();
                
                for (let j = 0; j < 5; j++) {
                    const isRevealed = revealed[index];
                    
                    const btn = new ButtonBuilder()
                        .setCustomId(`mine_${index}`)
                        .setStyle(isRevealed || showAll ? (grid[index] === 'bomb' ? ButtonStyle.Danger : ButtonStyle.Success) : ButtonStyle.Secondary)
                        .setDisabled(isRevealed || showAll);
                    
                    if (isRevealed || showAll) {
                        btn.setEmoji(grid[index] === 'bomb' ? '💣' : '💎');
                    } else {
                        btn.setEmoji('❓');
                    }
                    
                    row.addComponents(btn);
                    index++;
                }
                rows.push(row);
            }
            
            // Hàng thứ 5 dành riêng cho nút Cash Out
            const cashOutRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('mine_cashout')
                    .setLabel('Cash Out (Rút Lãi)')
                    .setEmoji('💵')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(isGameOver || diamondsFound === 0)
            );
            rows.push(cashOutRow);
            
            return rows;
        }

        function generateEmbed(status = 'playing') {
            const multiplier = calculateMultiplier(diamondsFound, minesCount);
            const winnings = Math.floor(bet * multiplier);
            const nextMultiplier = calculateMultiplier(diamondsFound + 1, minesCount);
            const nextWinnings = Math.floor(bet * nextMultiplier);

            let color = 0x2B2D31;
            let title = `Mines | ${user.username}`;
            
            if (status === 'win') {
                color = 0x00FF00;
                title = `Mines | ${user.username} đã CASH OUT!`;
            } else if (status === 'lose') {
                color = 0xFF0000;
                title = `Mines | BOOM! ${user.username} ĐÃ ĐẠP TRÚNG MÌN!`;
            }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(`**Tiền cược:** ${bet.toLocaleString()} $\n**Số mìn:** ${minesCount}\n\n**Tiền ăn (Cashout):** ${winnings.toLocaleString()} $ (${multiplier}x)\n**Nếu ấn tiếp:** ${nextWinnings.toLocaleString()} $ (${nextMultiplier}x)`)
                .setTimestamp();
                
            return embed;
        }

        const msg = await interaction.reply({
            embeds: [generateEmbed()],
            components: buildGrid(),
            fetchReply: true
        });

        const filter = (i) => i.user.id === user.id;

        // Bắt sự kiện
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5 * 60 * 1000, filter });

        async function endGame(status, inter = null) {
            if (isGameOver) return;
            isGameOver = true;
            collector.stop();
            
            // Xóa cược đang chạy vì ván đã xong
            liveGameManager.removeActiveBet(user.id, bet);

            const multiplier = calculateMultiplier(diamondsFound, minesCount);
            const winnings = Math.floor(bet * multiplier);
            
            if (status === 'win' || status === 'cashout' || status === 'timeout') {
                if (diamondsFound > 0) await updateBalance(user.id, winnings);
            }

            const finalEmbed = generateEmbed(status === 'lose' ? 'lose' : 'win');
            if (status === 'timeout') finalEmbed.setFooter({ text: 'Tự động Cashout do hết thời gian.' });

            if (inter) {
                await inter.update({ embeds: [finalEmbed], components: buildGrid(true) });
            } else {
                try { await msg.edit({ embeds: [finalEmbed], components: buildGrid(true) }); } catch(e) {}
            }
        }

        collector.on('collect', async (i) => {
            if (isGameOver) return;

            if (i.customId === 'mine_cashout') {
                await endGame('cashout', i);
                return;
            }

            const index = parseInt(i.customId.split('_')[1]);
            if (revealed[index]) return;

            revealed[index] = true;

            if (grid[index] === 'bomb') {
                await endGame('lose', i);
            } else {
                diamondsFound++;
                
                if (diamondsFound === totalDiamonds) {
                    await endGame('win', i);
                } else {
                    await i.update({
                        embeds: [generateEmbed()],
                        components: buildGrid()
                    });
                }
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && !isGameOver) {
                await endGame('timeout');
            }
        });
    }
};
