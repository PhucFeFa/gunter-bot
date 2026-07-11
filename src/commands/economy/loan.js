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
            .setDescription('Vay tiền từ ngân hàng (Lãi suất 35%)')
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
                .setTitle('🏦 NGÂN HÀNG HÚT MÁU GUNTER')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2830/2830284.png')
                .addFields(
                    { name: 'Nghề bá dơ hiện tại', value: `**${jobName}**`, inline: true },
                    { name: 'Tao cho mày mượn tối đa', value: `**${maxLoanLimit.toLocaleString()} 🪙**`, inline: true },
                    { name: 'Đang thiếu nợ tao', value: `**${currentLoan.toLocaleString()} 🪙**`, inline: false }
                )
                .setFooter({ text: 'Lãi cắt cổ: 35% | Cứ đi làm là tao siết 35% lương. Trốn đi đâu con trai?' });
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'borrow') {
            if (maxLoanLimit === 0) {
                return interaction.editReply('❌ Mày đang thất nghiệp cạp đất mà ăn chứ ở đó mà đòi vay tiền? Dùng `/job spin` kiếm việc làm đi thằng bá dơ!');
            }

            if (currentLoan > 0) {
                return interaction.editReply(`❌ Á chà thằng báo thủ! Mày vẫn còn đang khất tao **${currentLoan.toLocaleString()} 🪙**.\nCút về cày cuốc trả sạch nợ cũ đi rồi hẵng há mõm xin vay tiếp nhé con trai!`);
            }

            const amountStr = interaction.options.getString('amount');
            const availableToBorrow = maxLoanLimit;
            
            if (availableToBorrow <= 0) {
                return interaction.editReply('❌ Thẻ đen của mày bị khóa cmnr! Trả nợ đi thằng lìn.');
            }

            let borrowAmount = 0;
            if (amountStr.toLowerCase() === 'max') {
                borrowAmount = availableToBorrow;
            } else {
                borrowAmount = parseInt(amountStr);
                if (isNaN(borrowAmount) || borrowAmount <= 0) {
                    return interaction.editReply('❌ Gõ số ngu như bò! Cút về học lại toán lớp 1 đi.');
                }
            }

            if (borrowAmount > availableToBorrow) {
                return interaction.editReply(`❌ Mày tính lừa ngân hàng hả? Tao chỉ cho mày mượn tối đa **${availableToBorrow.toLocaleString()} 🪙** thôi con chó!`);
            }

            // Tiền gốc + 35% lãi suất cố định
            const totalDebt = Math.floor(borrowAmount * 1.35);

            await updateBalance(userId, borrowAmount); // Nhận tiền mặt
            await updateLoan(userId, totalDebt); // Ghi nợ + lãi

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ RẢI HỌ THÀNH CÔNG')
                .setDescription(`Đã quăng cho mày **${borrowAmount.toLocaleString()} 🪙** vào mõm!\n\n` +
                                `📈 **Lãi cắt cổ:** 35%\n` +
                                `💸 **Sổ ghi nợ:** ${totalDebt.toLocaleString()} 🪙\n\n` +
                                `*(Cứ đi làm \`/work\` là giang hồ tới siết 35% lương. Liệu hồn mà trả!)*`);
            
            // Thông báo lên kênh đòi nợ
            try {
                const alertChannel = interaction.client.channels.cache.get('1525454150803128371');
                if (alertChannel) {
                    await alertChannel.send(`⚠️ **CẢNH BÁO NỢ XẤU**\nThằng bá dơ <@${userId}> vừa bốc bát họ số tiền **${borrowAmount.toLocaleString()} 🪙**.\nTổng nợ phải trả: **${totalDebt.toLocaleString()} 🪙**.\nGiang hồ đã đưa mày vào tầm ngắm, liệu hồn mà cày cuốc trả nợ đi con trai!`);
                }
            } catch (err) {
                console.log("Không thể gửi thông báo vay nợ", err);
            }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'repay') {
            if (currentLoan <= 0) {
                return interaction.editReply('✅ Mày có nợ cắc bạc nào đâu mà đòi trả? Bị ảo tưởng à?');
            }

            const amountStr = interaction.options.getString('amount');
            let repayAmount = 0;

            if (amountStr.toLowerCase() === 'all') {
                repayAmount = currentLoan;
            } else {
                repayAmount = parseInt(amountStr);
                if (isNaN(repayAmount) || repayAmount <= 0) {
                    return interaction.editReply('❌ Trả số tiền đéo gì vớ vẩn vậy? Sủa số đàng hoàng xem nào.');
                }
            }

            if (repayAmount > currentLoan) {
                repayAmount = currentLoan;
            }

            if (user.balance < repayAmount) {
                return interaction.editReply(`❌ Mõm thì to mà trong túi có đúng **${user.balance.toLocaleString()} 🪙**? Mày tính lừa giang hồ à? Xì thêm tiền ra đây!`);
            }

            await updateBalance(userId, -repayAmount); // Trừ tiền mặt
            await updateLoan(userId, -repayAmount);    // Trừ nợ

            const newLoan = currentLoan - repayAmount;

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💵 TRẢ TIỀN RỒI ĐẤY Ạ')
                .setDescription(`Giỏi lắm con trai, tao đã thu **${repayAmount.toLocaleString()} 🪙**.\n\n` +
                                `📉 Dư nợ còn lại: **${newLoan.toLocaleString()} 🪙**. Chưa xong đâu!`);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        const subcommand = args[0] ? args[0].toLowerCase() : 'info';
        const amountStr = args[1] || '';

        if (!['info', 'borrow', 'repay'].includes(subcommand)) {
            return message.reply('❌ Bấm lệnh ngu như chó! Cú pháp đây:\n`g!loan info` (xem sổ nợ)\n`g!loan borrow <tiền | max>` (mượn tiền)\n`g!loan repay <tiền | all>` (trả nợ)');
        }

        if ((subcommand === 'borrow' || subcommand === 'repay') && !amountStr) {
            return message.reply(`❌ Đéo nhập số tiền thì tao biết mượn hay trả bao nhiêu? (VD: \`g!loan ${subcommand} 100000\`)`);
        }

        const replyMsg = await message.reply('🏦 Đang gọi đàn em ra đòi nợ...');

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
