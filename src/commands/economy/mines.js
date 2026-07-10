const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { getConfig } = require('../../utils/configDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mines')
        .setDescription('Chơi dò mìn ăn tiền (Minesweeper).')
        .addIntegerOption(option => 
            option.setName('bet')
                .setDescription('Số tiền cược')
                .setRequired(true))
        .addIntegerOption(option => 
            option.setName('mines')
                .setDescription('Số lượng mìn (1-20, mặc định: 3)')
                .setMinValue(1)
                .setMaxValue(20)
                .setRequired(false)),

    async execute(interaction) {
        // Hỗ trợ cả Slash Command và Fake Interaction (từ Prefix)
        const user = interaction.user;
        const guildId = interaction.guildId;
        
        const config = await getConfig(guildId);
        if (!config.feature_economy) {
            return interaction.reply({ content: '❌ Tính năng Economy đang bị tắt trên server này!', flags: 64 });
        }

        const bet = interaction.options.getInteger('bet') || (interaction.options.getNumber && interaction.options.getNumber('bet')) || parseInt(interaction.options.getString('bet'));
        
        let minesCount = interaction.options.getInteger('mines') || 3;
        
        if (!bet || isNaN(bet) || bet <= 0) {
            return interaction.reply({ content: '❌ Vui lòng nhập số tiền cược hợp lệ!', flags: 64 });
        }

        const userData = await getUser(user.id);
        const currentBalance = userData.balance;
        if (currentBalance < bet) {
            return interaction.reply({ content: `❌ Bạn không có đủ tiền! Số dư của bạn: **${currentBalance.toLocaleString()} $**`, flags: 64 });
        }

        // Trừ tiền cược
        await updateBalance(user.id, -bet);

        // Khởi tạo trò chơi 25 ô
        const grid = Array(25).fill('diamond');
        
        // Đặt mìn
        let placedMines = 0;
        while (placedMines < minesCount) {
            const randomIndex = Math.floor(Math.random() * 25);
            if (grid[randomIndex] !== 'bomb') {
                grid[randomIndex] = 'bomb';
                placedMines++;
            }
        }

        // State trò chơi
        let revealed = Array(25).fill(false);
        let diamondsFound = 0;
        const totalDiamonds = 25 - minesCount;
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
            // Xác suất chọn đúng D ô không có mìn
            const prob = combinations(25 - mines, diamonds) / combinations(25, diamonds);
            // Multiplier = (1 / Xác suất) * House Edge (0.99)
            const rawMultiplier = (1 / prob) * 0.99;
            return Number(rawMultiplier.toFixed(2));
        }

        function buildGrid(showAll = false) {
            const rows = [];
            let index = 0;
            
            for (let i = 0; i < 5; i++) {
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

        // Gửi nút Cash Out ở một tin nhắn riêng ngay bên dưới
        const cashOutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('mine_cashout')
                .setLabel('Cash Out (Rút Lãi)')
                .setEmoji('💵')
                .setStyle(ButtonStyle.Success)
                .setDisabled(diamondsFound === 0)
        );

        const cashOutMsg = await interaction.followUp({
            components: [cashOutRow],
            fetchReply: true
        });

        const filter = (i) => i.user.id === user.id;

        // Bắt sự kiện cho cả 2 tin nhắn (Lưới game và nút Cashout)
        const collectorGrid = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5 * 60 * 1000, filter });
        const collectorCashout = cashOutMsg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 5 * 60 * 1000, filter });

        async function endGame(status, inter = null) {
            if (isGameOver) return;
            isGameOver = true;
            collectorGrid.stop();
            collectorCashout.stop();

            const multiplier = calculateMultiplier(diamondsFound, minesCount);
            const winnings = Math.floor(bet * multiplier);
            
            if (status === 'win' || status === 'cashout' || status === 'timeout') {
                if (diamondsFound > 0) await updateBalance(user.id, winnings);
            }

            const finalEmbed = generateEmbed(status === 'lose' ? 'lose' : 'win');
            if (status === 'timeout') finalEmbed.setFooter({ text: 'Tự động Cashout do hết thời gian.' });

            // Vô hiệu hóa nút Cashout
            cashOutRow.components[0].setDisabled(true);
            try { await cashOutMsg.edit({ components: [cashOutRow] }); } catch(e) {}

            // Cập nhật lưới
            if (inter) {
                await inter.update({ embeds: [finalEmbed], components: buildGrid(true) });
            } else {
                try { await msg.edit({ embeds: [finalEmbed], components: buildGrid(true) }); } catch(e) {}
            }
        }

        collectorCashout.on('collect', async (i) => {
            if (isGameOver) return;
            if (i.customId === 'mine_cashout') {
                await endGame('cashout', i);
                // Phải sửa lại lưới qua msg.edit vì i.update chỉ update nút cashout
                try { await msg.edit({ embeds: [generateEmbed('win')], components: buildGrid(true) }); } catch(e) {}
            }
        });

        collectorGrid.on('collect', async (i) => {
            if (isGameOver) return;

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
                    // Bật nút cashout nếu mở ít nhất 1 ô
                    if (diamondsFound === 1) {
                        cashOutRow.components[0].setDisabled(false);
                        try { await cashOutMsg.edit({ components: [cashOutRow] }); } catch(e) {}
                    }
                }
            }
        });

        collectorGrid.on('end', async (collected, reason) => {
            if (reason === 'time' && !isGameOver) {
                await endGame('timeout');
            }
        });
    }
};
