const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLoanData, updateLoan, updateBalance } = require('../../utils/economyDB');
const { jobs } = require('../../data/jobs');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Hệ thống vay nợ ngân hàng Gunter')
        .addSubcommand(subcmd => subcmd
            .setName('info')
            .setDescription('Xem thông tin dư nợ của bạn'))
        .addSubcommand(subcmd => subcmd
            .setName('borrow')
            .setDescription('Vay thêm tiền (dựa trên mức lương nghề nghiệp)')
            .addIntegerOption(opt => opt.setName('amount').setDescription('Số tiền muốn vay').setRequired(true)))
        .addSubcommand(subcmd => subcmd
            .setName('repay')
            .setDescription('Trả nợ (tất toán 1 lần hoặc một phần)')
            .addStringOption(opt => opt.setName('amount').setDescription('Số tiền trả (Nhập "all" để trả hết)').setRequired(true))),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const subcommand = interaction.options.getSubcommand();
        const user = interaction.user;
        const { loan, balance, job: jobId } = await getLoanData(user.id);
        
        const job = jobId && jobs[jobId] ? jobs[jobId] : null;
        
        // Hạn mức vay = Lương tối đa * 10
        const maxLoan = job ? job.maxSalary * 10 : 0;
        
        if (subcommand === 'info') {
            const embed = new EmbedBuilder()
                .setTitle('🏦 NGÂN HÀNG GUNTER - SAO KÊ')
                .setColor(0xF1C40F)
                .setDescription(
                    `👤 **Khách hàng:** <@${user.id}>\n` +
                    `💼 **Nghề nghiệp:** ${job ? job.name : 'Vô gia cư (Không thể vay)'}\n` +
                    `💳 **Hạn mức vay tối đa:** ${maxLoan.toLocaleString()} 🪙\n` +
                    `🚨 **Dư nợ hiện tại:** **${loan.toLocaleString()} 🪙**\n\n` +
                    `*💡 Lưu ý: Khi bạn làm việc (/work), ngân hàng sẽ tự động trích 30% lương để siết nợ (cộng thêm 10% lãi suất trên phần siết).*`
                );
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'borrow') {
            if (!job) return interaction.editReply('❌ Bạn hiện đang vô gia cư, ngân hàng không dám cho bạn vay! Hãy dùng `/job spin` để kiếm việc làm.');
            
            const amount = interaction.options.getInteger('amount');
            if (amount <= 0) return interaction.editReply('❌ Số tiền vay không hợp lệ.');
            
            if (loan + amount > maxLoan) {
                return interaction.editReply(`❌ Từ chối giải ngân! Hạn mức vay tối đa của bạn là **${maxLoan.toLocaleString()} 🪙**. Bạn đang nợ **${loan.toLocaleString()} 🪙** nên chỉ có thể vay thêm tối đa **${(maxLoan - loan).toLocaleString()} 🪙**.`);
            }

            await updateLoan(user.id, amount);
            await updateBalance(user.id, amount);
            
            const embed = new EmbedBuilder()
                .setTitle('✅ GIẢI NGÂN THÀNH CÔNG')
                .setColor(0x2ECC71)
                .setDescription(`Bạn đã vay thành công **${amount.toLocaleString()} 🪙**.\nTiền đã được chuyển vào tài khoản!\n🚨 Dư nợ mới: **${(loan + amount).toLocaleString()} 🪙**`);
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'repay') {
            if (loan <= 0) return interaction.editReply('✅ Bạn không có khoản nợ nào tại ngân hàng!');
            
            const amountRaw = interaction.options.getString('amount');
            let amountToPay = 0;
            
            if (amountRaw.toLowerCase() === 'all') {
                amountToPay = loan;
            } else {
                amountToPay = parseInt(amountRaw);
                if (isNaN(amountToPay) || amountToPay <= 0) return interaction.editReply('❌ Số tiền không hợp lệ.');
            }

            if (amountToPay > loan) amountToPay = loan; // Không trả dư

            if (balance < amountToPay) {
                return interaction.editReply(`❌ Bạn không đủ tiền! Số dư hiện tại: **${balance.toLocaleString()} 🪙**`);
            }

            await updateBalance(user.id, -amountToPay);
            await updateLoan(user.id, -amountToPay);

            const embed = new EmbedBuilder()
                .setTitle('💸 TẤT TOÁN THÀNH CÔNG')
                .setColor(0x00FF00)
                .setDescription(`Bạn đã thanh toán **${amountToPay.toLocaleString()} 🪙** cho ngân hàng.\n🚨 Dư nợ còn lại: **${(loan - amountToPay).toLocaleString()} 🪙**`);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        const subcommand = args[0] || 'info';
        const amountOpt = args[1] || '0';

        const replyMsg = await message.reply('🏦 Đang kết nối ngân hàng...');
        const fakeInteraction = {
            user: message.author,
            options: {
                getSubcommand: () => subcommand,
                getInteger: () => parseInt(amountOpt),
                getString: () => amountOpt
            },
            deferred: true,
            replied: true,
            deferReply: async function() {},
            editReply: async function(options) {
                return await replyMsg.edit(options);
            }
        };

        if (['info', 'borrow', 'repay'].includes(subcommand)) {
            await this.execute(fakeInteraction);
        } else {
            await replyMsg.edit('❌ Lệnh không hợp lệ. Hãy dùng `g!loan info`, `g!loan borrow <số tiền>` hoặc `g!loan repay <số tiền>`.');
        }
    }
};
