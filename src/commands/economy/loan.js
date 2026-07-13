const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance, updateLoan, updateCreditScore, updateLoanDetails } = require('../../utils/economyDB');
const { setUserRod } = require('../../utils/fishDB');
const { jobs } = require('../../data/jobs');
const { RODS } = require('../../data/fishData');
const { borrowerMsgs, referrerMsgs } = require('../../data/loanMessages');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Hệ thống vay vốn ngân hàng Gunter')
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('Xem thông tin khoản vay và hạn mức của mày'))
        .addSubcommand(sub => sub
            .setName('borrow')
            .setDescription('Vay tiền từ ngân hàng (Lãi suất 35%)')
            .addStringOption(opt => opt
                .setName('amount')
                .setDescription('Số tiền muốn vay (hoặc "max")')
                .setRequired(true))
            .addUserOption(opt => opt
                .setName('ref1')
                .setDescription('Người tham chiếu 1 (sẽ bị đòi nợ chung)')
                .setRequired(true))
            .addUserOption(opt => opt
                .setName('ref2')
                .setDescription('Người tham chiếu 2 (sẽ bị đòi nợ chung)')
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
        const creditScore = user.creditScore || 0;

        if (user.job && jobs[user.job]) {
            // Cơ bản = maxSalary * 20. Mỗi điểm tín dụng tăng maxSalary * 1. Tối đa 100 điểm.
            // Vậy vay tối đa = maxSalary * (20 + creditScore).
            maxLoanLimit = jobs[user.job].maxSalary * (20 + creditScore);
            jobName = jobs[user.job].name;

            // Tú Sena là chúa tể vay nợ, hạn mức vay gấp 5 lần người thường
            if (user.job === 'tu_sena') {
                maxLoanLimit *= 5;
            }
        }

        if (subcommand === 'info') {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🏦 NGÂN HÀNG HÚT MÁU GUNTER')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2830/2830284.png')
                .addFields(
                    { name: 'Nghề bá dơ hiện tại', value: `**${jobName}**`, inline: true },
                    { name: 'Điểm tín dụng', value: `**${creditScore}/100**`, inline: true },
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
                const botDebt = user.botDebt || 0;
                if (botDebt > 0) {
                    return interaction.editReply(`🔒 **ĐM mày bị GUNTER PHONG TỎA TÀI KHOẢN RỒI!**\nMày đang mang **${botDebt.toLocaleString()} 🪙** nợ do thằng Gunter tự ý ép mày. Tao (Ngân Hàng) đéo cho phép mày vay thêm khi mày còn nợ ông chủ đó.\n\n💡 Muốn vay tiếp? Cút đi làm trả nợ Gunter đi, hoặc cầu xin nó tha nợ cho mày bằng cách: **nịnh nó thật mùi** trong kênh chat!\n📉 Nợ Gunter hiện tại: **${currentLoan.toLocaleString()} 🪙**`);
                }
                return interaction.editReply(`❌ Á chà thằng báo thủ! Mày vẫn còn đang khất tao **${currentLoan.toLocaleString()} 🪙**.\nCút về cày cuốc trả sạch nợ cũ đi rồi hẵng há mõm xin vay tiếp nhé con trai!`);
            }

            const amountStr = interaction.options.getString('amount');
            const availableToBorrow = maxLoanLimit;

            if (availableToBorrow <= 0) {
                return interaction.editReply('❌ Thẻ đen của mày bị khóa cmnr! Trả nợ đi thằng lìn.');
            }

            let borrowAmount = 0;
            if (!amountStr) return interaction.editReply('❌ Chưa nhập số tiền!');
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

            const ref1 = interaction.options.getUser('ref1');
            const ref2 = interaction.options.getUser('ref2');

            if (!ref1 || !ref2) {
                return interaction.editReply('❌ Lệnh bị lỗi hoặc mày chưa tag đủ 2 người tham chiếu (bảo lãnh)! Thử dùng lệnh `g!loan borrow` thay vì dấu `/` nếu Discord bị lag.');
            }

            if (ref1.id === userId || ref2.id === userId || ref1.id === ref2.id || ref1.bot || ref2.bot) {
                return interaction.editReply('❌ Tag người tham chiếu đàng hoàng! Không tag chính mình, không tag 1 người 2 lần, đéo tag bot!');
            }

            // Tiền gốc + 35% lãi suất cố định
            const totalDebt = Math.floor(borrowAmount * 1.35);

            await updateBalance(userId, borrowAmount); // Nhận tiền mặt
            await updateLoan(userId, totalDebt); // Ghi nợ + lãi
            await updateLoanDetails(userId, [ref1.id, ref2.id], null, 0); // Lưu references

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
                    await alertChannel.send(`⚠️ **CẢNH BÁO NỢ XẤU**\nThằng bá dơ <@${userId}> vừa bốc bát họ số tiền **${borrowAmount.toLocaleString()} 🪙**.\nTổng nợ phải trả: **${totalDebt.toLocaleString()} 🪙**.\nGiang hồ đã đưa mày vào tầm ngắm, liệu hồn mà cày cuốc trả nợ đi con trai!\nNgười tham chiếu: <@${ref1.id}> <@${ref2.id}>`);
                }
            } catch (err) {
                console.log("Không thể gửi thông báo vay nợ", err);
            }

            // Gửi tin nhắn riêng bốc bát họ
            try {
                const randomDm = borrowerMsgs[Math.floor(Math.random() * borrowerMsgs.length)]
                    .replace(/{user}/g, interaction.user.username)
                    .replace(/{borrowed}/g, borrowAmount.toLocaleString())
                    .replace(/{debt}/g, totalDebt.toLocaleString());

                await interaction.user.send(randomDm);
            } catch (err) {
                console.log("Không thể gửi DM đòi nợ cho user", err);
            }

            // Gửi tin nhắn mỉa mai người tham chiếu ngay lập tức
            try {
                for (const r of [ref1, ref2]) {
                    if (r) {
                        try {
                            const rMsg = referrerMsgs[Math.floor(Math.random() * referrerMsgs.length)]
                                .replace(/{user}/g, interaction.user.username)
                                .replace(/{borrowed}/g, borrowAmount.toLocaleString())
                                .replace(/{debt}/g, totalDebt.toLocaleString());
                            await r.send(`🔪 **THÔNG BÁO LIÊN ĐỚI:**\n\n${rMsg}`);
                        } catch (e) { }
                    }
                }
            } catch (err) { }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'repay') {
            if (currentLoan <= 0) {
                return interaction.editReply('✅ Mày có nợ cắc bạc nào đâu mà đòi trả? Bị ảo tưởng à?');
            }

            const amountStr = interaction.options.getString('amount');
            let repayAmount = 0;

            if (!amountStr) return interaction.editReply('❌ Chưa nhập số tiền trả!');
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

            // Tăng điểm tín dụng nếu trả nợ
            let creditBonus = 0;
            if (repayAmount > 0) {
                const bonus = Math.max(1, Math.floor((repayAmount / maxLoanLimit) * 10));
                await updateCreditScore(userId, bonus);
                creditBonus = bonus;
            }

            const newLoan = currentLoan - repayAmount;

            // Xử lý trả lại cần câu bị siết (nếu có)
            let returnText = '';
            if (user.seizedRod && repayAmount >= (user.seizedRequire || 0)) {
                // Trả lại cần
                const rodId = user.seizedRod;
                const rodData = RODS.find(r => r.id === rodId);
                if (rodData) {
                    await setUserRod(userId, rodId, rodData.maxDurability); // Trả lại cần với độ bền full
                    await updateLoanDetails(userId, undefined, null, 0); // Xóa trạng thái siết
                    returnText = `\n\n🎣 **ĐÃ TRẢ LẠI CẦN CÂU**: Giang hồ đã trả lại **${rodData.name}** cho mày. Liệu hồn mà cày cuốc!`;
                }
            } else if (user.seizedRod) {
                returnText = `\n\n⚠️ **CHƯA ĐỦ TRẢ CẦN**: Mày phải trả tối thiểu **${(user.seizedRequire || 0).toLocaleString()} 🪙** để chuộc lại cần câu!`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💵 TRẢ TIỀN RỒI ĐẤY Ạ')
                .setDescription(`Giỏi lắm con trai, tao đã thu **${repayAmount.toLocaleString()} 🪙**.\n\n` +
                    `📈 Điểm tín dụng tăng: **+${creditBonus}**\n` +
                    `📉 Dư nợ còn lại: **${newLoan.toLocaleString()} 🪙**. Chưa xong đâu!` + returnText);
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

        let ref1User = null;
        let ref2User = null;
        if (subcommand === 'borrow') {
            const mentions = Array.from(message.mentions.users.values());
            if (mentions.length < 2) {
                return message.reply('❌ Khi mượn tiền mày phải tag 2 người để làm tham chiếu (người bảo lãnh). VD: `g!loan borrow 1000 @user1 @user2`');
            }
            ref1User = mentions[0];
            ref2User = mentions[1];
        }

        const replyMsg = await message.reply('🏦 Đang gọi đàn em ra đòi nợ...');

        const fakeInteraction = {
            user: message.author,
            client: client,
            options: {
                getSubcommand: () => subcommand,
                getString: (name) => {
                    if (name === 'amount') return amountStr;
                    return null;
                },
                getUser: (name) => {
                    if (name === 'ref1') return ref1User;
                    if (name === 'ref2') return ref2User;
                    return null;
                }
            },
            deferred: true,
            replied: true,
            deferReply: async function () { },
            editReply: async function (options) {
                return await replyMsg.edit(options);
            }
        };

        await this.execute(fakeInteraction);
    }
};
