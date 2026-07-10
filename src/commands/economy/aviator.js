const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('aviator')
        .setDescription('🚀 Chơi phi thuyền (Crash Game). Rút tiền trước khi nổ!')
        .addStringOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược (Hoặc gõ "all" để chơi tất tay)')
                .setRequired(true)),
                
    async execute(interaction) {
        // Có thể interaction đã defer nếu gọi từ prefix, nên cần check
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
            if (amount <= 0) return interaction.editReply('Mày làm đéo gì có tiền mà all in =)))');
        } else {
            amount = parseInt(amountRaw);
            if (isNaN(amount) || amount <= 0) return interaction.editReply('❌ Số tiền cược không hợp lệ!');
        }
        
        if (currentBalance < amount) {
            return interaction.editReply(`Mày định lấy gì cược hả con? Trong túi mày còn đúng ${currentBalance} xu thôi =)))`);
        }

        // Trừ tiền cược trước
        await updateBalance(user.id, -amount);

        // Khởi tạo thuật toán Crash
        // Tính Crash Point (có tỉ lệ house edge)
        // Crash point phổ biến: e / (1 - random) với hệ số ngẫu nhiên
        const rand = Math.random();
        let crashPoint = 1.0;
        
        // Cấu hình house edge 5% (5% khả năng nổ luôn ở 1.00x)
        if (rand < 0.05) {
            crashPoint = 1.0;
        } else {
            // Toán học: 99% payout, crash point trung bình là ~1.99
            // Thuật toán: max(1.01, 1 / (1 - rand_thực_sự)) nhưng limit lại
            const p = Math.random();
            crashPoint = Math.max(1.01, 0.95 / (1 - p));
            // Limit tối đa cho đỡ sạt nghiệp
            if (crashPoint > 100) crashPoint = 100;
        }

        let currentMultiplier = 1.0;
        let isCashedOut = false;
        let isCrashed = false;

        const cashoutButton = new ButtonBuilder()
            .setCustomId('cashout')
            .setLabel('💰 Rút tiền ngay!')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(cashoutButton);

        const generateEmbed = (mult, crashed, cashed) => {
            const embed = new EmbedBuilder();

            let objPool = ['☁️'];
            if (mult >= 2 && mult < 5) objPool = ['☁️', '🌙'];
            else if (mult >= 5 && mult < 10) objPool = ['⭐', '🌙', '✨'];
            else if (mult >= 10) objPool = ['🪐', '⭐', '✨', '☄️'];

            const getObj = (prob) => (Math.random() < prob ? objPool[Math.floor(Math.random() * objPool.length)] : '  ');
            
            const ship = crashed ? '💥' : '🚀';
            
            const line1 = `  ${getObj(0.4)}      ${getObj(0.3)}  `;
            const line2 = `${getObj(0.3)}    ${ship}    ${getObj(0.4)}`;
            const line3 = `    ${getObj(0.3)}      ${getObj(0.4)}`;
            
            const environment = `${line1}\n${line2}\n${line3}`;

            if (crashed) {
                embed.setColor(0xFF0000);
                embed.setTitle('💥 TÊN LỬA ĐÃ PHÁT NỔ!');
                embed.setDescription(`**Hệ số nổ:** ${mult.toFixed(2)}x\n\n${environment}`);
                if (!cashed) {
                    embed.addFields({ name: 'Kết quả', value: `Mày đã mất trắng **${amount} xu**! Trắng mắt ra chưa con =)))` });
                }
            } else if (cashed) {
                embed.setColor(0x00FF00);
                embed.setTitle('💵 ĐÃ CHỐT LỜI!');
                const winAmount = Math.floor(amount * mult);
                embed.setDescription(`**Hệ số chốt:** ${mult.toFixed(2)}x\n\n${environment}`);
                embed.addFields({ name: 'Kết quả', value: `Mày vừa bú được **${winAmount} xu**! Ngon lành cành đào.` });
            } else {
                embed.setColor(0x3498DB);
                embed.setTitle('🚀 TÊN LỬA ĐANG CẤT CÁNH...');
                const currentProfit = Math.floor(amount * mult);
                embed.setDescription(`**Hệ số hiện tại:** ${mult.toFixed(2)}x\n**Tiền lãi dự kiến:** ${currentProfit.toLocaleString()} $\n\n${environment}`);
            }

            return embed;
        };

        const msg = await interaction.editReply({ 
            embeds: [generateEmbed(currentMultiplier, false, false)], 
            components: [row] 
        });

        // Tạo Collector lắng nghe nút bấm trong suốt quá trình bay
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) {
                return i.reply({ content: 'Đừng có táy máy vào máy bay của người khác!', ephemeral: true });
            }
            if (i.customId === 'cashout' && !isCashedOut && !isCrashed) {
                isCashedOut = true;
                const winAmount = Math.floor(amount * currentMultiplier);
                await updateBalance(user.id, winAmount); // Cộng lại vốn + lãi

                row.components[0].setDisabled(true);
                await i.update({ embeds: [generateEmbed(currentMultiplier, false, true)], components: [row] });
                collector.stop('cashed_out');
            }
        });

        // Loop animation
        while (!isCashedOut && !isCrashed) {
            // Delay 1.5s mỗi frame để tránh rate limit
            await new Promise(r => setTimeout(r, 1500));
            
            // Nếu trong lúc chờ 1.5s mà user bấm nút thì ngắt loop
            if (isCashedOut) break;

            // Tăng hệ số theo hàm bậc 2 để bay càng lâu càng nhanh
            currentMultiplier += 0.1 * Math.sqrt(currentMultiplier);
            
            if (currentMultiplier >= crashPoint) {
                currentMultiplier = crashPoint; // Chốt lại hệ số nổ
                isCrashed = true;
            }

            if (isCrashed) {
                row.components[0].setDisabled(true);
                await interaction.editReply({ embeds: [generateEmbed(currentMultiplier, true, isCashedOut)], components: [row] });
                collector.stop('crashed');
            } else {
                // Update frame
                await interaction.editReply({ embeds: [generateEmbed(currentMultiplier, false, false)], components: [row] });
            }
        }
    },

    async executePrefix(message, args) {
        const amountRaw = args[0];
        if (!amountRaw) {
            return message.reply('Cách chơi: `g!aviator <tiền_cược>`\nVí dụ: `g!aviator 50` hoặc `g!aviator all`\nChú ý: Nhớ bấm nút Rút Tiền trước khi nổ nhé!');
        }

        const replyMsg = await message.reply('🚀 Đang nạp nhiên liệu tên lửa...');

        const fakeInteraction = {
            user: message.author,
            options: {
                getString: () => amountRaw
            },
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
