const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('taixiu')
        .setDescription('🎲 Chơi tài xỉu, thử vận may (3-10: Xỉu, 11-18: Tài)')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Chọn Tài hoặc Xỉu')
                .setRequired(true)
                .addChoices(
                    { name: 'Tài (11 - 18)', value: 'tai' },
                    { name: 'Xỉu (3 - 10)', value: 'xiu' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược')
                .setRequired(true)
                .setMinValue(1)),
                
    async execute(interaction) {
        await interaction.deferReply();
        const choice = interaction.options.getString('choice');
        const amount = interaction.options.getInteger('amount');
        const user = interaction.user;

        const userData = await getUser(user.id);
        const currentBalance = userData.balance;
        if (currentBalance < amount) {
            return interaction.editReply(`Mày nghèo rớt mồng tơi mà đòi cược ${amount} xu à? Trong túi mày còn đúng ${currentBalance} xu thôi con ạ =)))`);
        }

        // Đổ 3 viên xúc xắc
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        const d3 = Math.floor(Math.random() * 6) + 1;
        const sum = d1 + d2 + d3;
        
        // Hiệu ứng xóc
        await interaction.editReply(`🎲 Đang xóc xúc xắc...\n[❔] [❔] [❔]`);
        await new Promise(r => setTimeout(r, 1000));
        
        await interaction.editReply(`🎲 Đang xóc xúc xắc...\n[ ${d1} ] [❔] [❔]`);
        await new Promise(r => setTimeout(r, 1000));
        
        await interaction.editReply(`🎲 Đang xóc xúc xắc...\n[ ${d1} ] [ ${d2} ] [❔]`);
        await new Promise(r => setTimeout(r, 1000));

        let result = '';
        if (sum >= 3 && sum <= 10) result = 'xiu';
        else result = 'tai';

        let win = false;
        let profit = 0;
        
        // Bão (3 con giống nhau) nhà cái ăn hết trừ khi có rule khác, nhưng ở đây cứ theo sum thôi cho dễ
        if (choice === result) {
            win = true;
            profit = amount;
            await updateBalance(user.id, profit);
        } else {
            win = false;
            profit = -amount;
            await updateBalance(user.id, profit);
        }

        const embed = new EmbedBuilder()
            .setTitle(win ? '🎉 MÀY HÊN ĐẤY!' : '💀 ĐI VÀO LÒNG ĐẤT!')
            .setColor(win ? 0x00FF00 : 0xFF0000)
            .setDescription(`**Lựa chọn của mày:** ${choice === 'tai' ? 'Tài' : 'Xỉu'}
**Cược:** ${amount} xu

🎲 **Kết quả đổ:** [ ${d1} | ${d2} | ${d3} ]
Tổng: **${sum}** ➡️ **${result === 'tai' ? 'TÀI' : 'XỈU'}**

${win ? `Thắng được **+${profit} xu**! Trả tiền ăn sáng cho tao đi!` : `Thua mất xác **${profit} xu**! Khóc đi con lợn =)))`}
`)
            .setFooter({ text: `Tài khoản hiện tại: ${currentBalance + profit} xu` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },
    
    async executePrefix(message, args) {
        if (args.length < 2) {
            return message.reply('Cách chơi: `g!taixiu <tai/xiu> <tiền_cược>`\nVí dụ: `g!taixiu tai 50`');
        }
        const choiceRaw = args[0].toLowerCase();
        const choice = (choiceRaw === 't' || choiceRaw === 'tai') ? 'tai' : (choiceRaw === 'x' || choiceRaw === 'xiu' ? 'xiu' : null);
        const amount = parseInt(args[1]);
        
        if (!choice) return message.reply('Chọn ngu thế? Gõ `tai` hoặc `xiu` thôi.');
        if (isNaN(amount) || amount <= 0) return message.reply('Mày định cược bằng nước bọt à? Nhập số tiền đàng hoàng xem nào.');
        
        // Phản hồi placeholder để tí nữa có cái mà editReply
        const replyMsg = await message.reply('🎲 Đang chuẩn bị bàn...');

        const fakeInteraction = {
            user: message.author,
            options: {
                getString: () => choice,
                getInteger: () => amount
            },
            deferred: true,
            deferReply: async function() {},
            editReply: async function(options) {
                if (typeof options === 'string') {
                    return await replyMsg.edit(options);
                }
                return await replyMsg.edit(options);
            }
        };
        await this.execute(fakeInteraction);
    }
};
