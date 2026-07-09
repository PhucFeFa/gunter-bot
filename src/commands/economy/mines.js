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
                .setDescription('Số lượng mìn (1-8, mặc định: 3)')
                .setMinValue(1)
                .setMaxValue(8)
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

        // Khởi tạo trò chơi 3x3 (9 ô)
        const grid = Array(9).fill('diamond');
        
        // Đặt mìn
        let placedMines = 0;
        while (placedMines < minesCount) {
            const randomIndex = Math.floor(Math.random() * 9);
            if (grid[randomIndex] !== 'bomb') {
                grid[randomIndex] = 'bomb';
                placedMines++;
            }
        }

        // State trò chơi
        let revealed = Array(9).fill(false);
        let diamondsFound = 0;
        const totalDiamonds = 9 - minesCount;
        let isGameOver = false;
        
        // Tính toán Multiplier theo công thức cơ bản: M = 1 + (diamondsFound * (minesCount / 10))
        // Hoặc công thức exponential
        function calculateMultiplier(diamonds, mines) {
            if (diamonds === 0) return 1.0;
            const base = 1 + (mines * 0.15);
            return Number(Math.pow(base, diamonds).toFixed(2));
        }

        function buildGrid(showAll = false) {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const index = i * 3 + j;
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
                }
                rows.push(row);
            }
            
            // Nút Cash Out
            const cashOutRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('mine_cashout')
                    .setLabel('Cash Out')
                    .setEmoji('💵')
                    .setStyle(ButtonStyle.Primary)
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

        // Chỉ tạo collector trên tin nhắn này trong 5 phút
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 5 * 60 * 1000,
            filter: (i) => i.user.id === user.id
        });

        collector.on('collect', async (i) => {
            if (isGameOver) return;

            if (i.customId === 'mine_cashout') {
                isGameOver = true;
                const multiplier = calculateMultiplier(diamondsFound, minesCount);
                const winnings = Math.floor(bet * multiplier);
                
                // Cộng tiền thắng
                await updateBalance(user.id, winnings);
                
                await i.update({
                    embeds: [generateEmbed('win')],
                    components: buildGrid(true) // Lật hết bài
                });
                collector.stop();
                return;
            }

            const index = parseInt(i.customId.split('_')[1]);
            if (revealed[index]) return;

            revealed[index] = true;

            if (grid[index] === 'bomb') {
                isGameOver = true;
                // Trượt, mất cược (đã trừ lúc đầu)
                await i.update({
                    embeds: [generateEmbed('lose')],
                    components: buildGrid(true)
                });
                collector.stop();
            } else {
                diamondsFound++;
                
                // Nếu mở hết kim cương
                if (diamondsFound === totalDiamonds) {
                    isGameOver = true;
                    const multiplier = calculateMultiplier(diamondsFound, minesCount);
                    const winnings = Math.floor(bet * multiplier);
                    await updateBalance(user.id, winnings);
                    
                    await i.update({
                        embeds: [generateEmbed('win')],
                        components: buildGrid(true)
                    });
                    collector.stop();
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
                isGameOver = true;
                const multiplier = calculateMultiplier(diamondsFound, minesCount);
                const winnings = Math.floor(bet * multiplier);
                if (diamondsFound > 0) {
                    await updateBalance(user.id, winnings);
                }
                
                try {
                    await msg.edit({
                        embeds: [generateEmbed('win').setFooter({ text: 'Tự động Cashout do hết thời gian.' })],
                        components: buildGrid(true)
                    });
                } catch(e) {}
            }
        });
    }
};
