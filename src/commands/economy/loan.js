const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance, updateLoan } = require('../../utils/economyDB');
const { jobs } = require('../../data/jobs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Hệ thống vay vốn ngân hàng Gunter')
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('Xem thông tin khoản vay và hạn mức của bạn'))
        .addSubcommand(sub => sub
            .setName('borrow')
            .setDescription('Vay tiền từ ngân hàng (Lãi suất 10%)')
            .addStringOption(opt => opt
                .setName('amount')
                .setDescription('Số tiền muốn vay (hoặc "max")')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('repay')
            .setDescription('Trả nợ ngân hàng')
            .addStringOption(opt => opt
                .setName('amount')
                .setDescription('Số tiền muốn trả (hoặc "all")')
                .setRequired(true))),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const user = await getUser(userId);
        const currentLoan = user.loanAmount || 0;
        
        let maxLoanLimit = 0;
        let jobName = "Thất nghiệp";
        if (user.job && jobs[user.job]) {
            maxLoanLimit = jobs[user.job].maxSalary * 50;
            jobName = jobs[user.job].name;
        }

        if (subcommand === 'info') {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🏦 NGÂN HÀNG GUNTER')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2830/2830284.png')
                .addFields(
                    { name: 'Nghề nghiệp hiện tại', value: `**${jobName}**`, inline: true },
                    { name: 'Hạn mức tối đa', value: `**${maxLoanLimit.toLocaleString()} 🪙**`, inline: true },
                    { name: 'Dư nợ hiện tại', value: `**${currentLoan.toLocaleString()} 🪙**`, inline: false }
                )
                .setFooter({ text: 'Lãi suất vay cố định: 10% | Tự động trừ 30% lương khi /work' });
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'borrow') {
            if (maxLoanLimit === 0) {
                return interaction.editReply('❌ Bạn đang thất nghiệp nên ngân hàng không duyệt hồ sơ cho vay! Hãy dùng `/job spin` để kiếm việc làm.');
            }

            const amountStr = interaction.options.getString('amount');
            const availableToBorrow = maxLoanLimit - currentLoan;
            
            if (availableToBorrow <= 0) {
                return interaction.editReply('❌ Bạn đã chạm **Hạn mức tín dụng tối đa**! Hãy trả bớt nợ trước khi vay thêm.');
            }

            let borrowAmount = 0;
            if (amountStr.toLowerCase() === 'max') {
                borrowAmount = availableToBorrow;
            } else {
                borrowAmount = parseInt(amountStr);
                if (isNaN(borrowAmount) || borrowAmount <= 0) {
                    return interaction.editReply('❌ Số tiền vay không hợp lệ!');
                }
            }

            if (borrowAmount > availableToBorrow) {
                return interaction.editReply(`❌ Ngân hàng chỉ duyệt cho bạn vay thêm tối đa **${availableToBorrow.toLocaleString()} 🪙**!`);
            }

            // Tiền gốc + 10% lãi suất cố định
            const totalDebt = Math.floor(borrowAmount * 1.10);

            await updateBalance(userId, borrowAmount); // Nhận tiền mặt
            await updateLoan(userId, totalDebt); // Ghi nợ + lãi

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ VAY VỐN THÀNH CÔNG')
                .setDescription(`Bạn đã giải ngân thành công **${borrowAmount.toLocaleString()} 🪙** vào tài khoản!\n\n` +
                                `📈 **Lãi suất:** 10%\n` +
                                `💸 **Tiền nợ ghi nhận thêm:** ${totalDebt.toLocaleString()} 🪙\n\n` +
                                `*(Ngân hàng sẽ tự động trích 30% lương khi bạn /work để thu hồi nợ)*`);
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'repay') {
            if (currentLoan <= 0) {
                return interaction.editReply('✅ Bạn không có khoản nợ nào để trả. Tuyệt vời!');
            }

            const amountStr = interaction.options.getString('amount');
            let repayAmount = 0;

            if (amountStr.toLowerCase() === 'all') {
                repayAmount = currentLoan;
            } else {
                repayAmount = parseInt(amountStr);
                if (isNaN(repayAmount) || repayAmount <= 0) {
                    return interaction.editReply('❌ Số tiền trả không hợp lệ!');
                }
            }

            if (repayAmount > currentLoan) {
                repayAmount = currentLoan;
            }

            if (user.balance < repayAmount) {
                return interaction.editReply(`❌ Bạn không đủ tiền mặt để tất toán khoản này! Số dư hiện tại của bạn chỉ có: **${user.balance.toLocaleString()} 🪙**`);
            }

            await updateBalance(userId, -repayAmount); // Trừ tiền mặt
            await updateLoan(userId, -repayAmount);    // Trừ nợ

            const newLoan = currentLoan - repayAmount;

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💵 THANH TOÁN NỢ NGÂN HÀNG')
                .setDescription(`Bạn đã trả **${repayAmount.toLocaleString()} 🪙** cho ngân hàng.\n\n` +
                                `📉 Dư nợ còn lại: **${newLoan.toLocaleString()} 🪙**`);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        const subcommand = args[0] ? args[0].toLowerCase() : 'info';
        const amountStr = args[1] || '';

        if (!['info', 'borrow', 'repay'].includes(subcommand)) {
            return message.reply('❌ Lệnh không hợp lệ! Cách dùng:\n`g!loan info`\n`g!loan borrow <số tiền | max>`\n`g!loan repay <số tiền | all>`');
        }

        if ((subcommand === 'borrow' || subcommand === 'repay') && !amountStr) {
            return message.reply(`❌ Bạn chưa nhập số tiền! (VD: \`g!loan ${subcommand} 100000\`)`);
        }

        const replyMsg = await message.reply('🏦 Đang kết nối với ngân hàng...');

        const fakeInteraction = {
            user: message.author,
            options: {
                getSubcommand: () => subcommand,
                getString: (name) => {
                    if (name === 'amount') return amountStr;
                    return null;
                }
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
