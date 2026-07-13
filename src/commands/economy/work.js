const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getJobData, updateBalance, updateLastWork } = require('../../utils/economyDB');
const { jobs } = require('../../data/jobs');

const WORK_COOLDOWN = 30 * 1000; // 30 seconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Làm việc kiếm tiền dựa trên nghề nghiệp hiện tại của bạn (Cooldown 30s)'),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        const { job, lastWork } = await getJobData(userId);

        // Kiểm tra xem đã có nghề chưa
        if (!job || !jobs[job]) {
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Đang ăn bám xã hội à?')
                .setDescription('Mày đang thất nghiệp cạp đất mà ăn chứ đi làm cái đéo gì?\nHãy dùng lệnh `/job spin` để kiếm việc đi thằng bá dơ!');
            return interaction.editReply({ embeds: [embed] });
        }

        // Kiểm tra cooldown 30s
        const now = Date.now();
        if (lastWork && (now - lastWork) < WORK_COOLDOWN) {
            const remaining = WORK_COOLDOWN - (now - lastWork);
            const seconds = Math.ceil(remaining / 1000);

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('⏳ Nghỉ tay đi thằng culi!')
                .setDescription(`Mày vừa mới cày xong, tính làm mệt chết bỏ mạng à?\nCút ra chỗ khác nghỉ ngơi **${seconds} giây** rồi quay lại đây!`);
            return interaction.editReply({ embeds: [embed] });
        }

        const currentJob = jobs[job];

        // Random câu thoại
        const randomDialogue = currentJob.dialogues[Math.floor(Math.random() * currentJob.dialogues.length)];

        // Random tiền lương
        const originalSalary = Math.floor(Math.random() * (currentJob.maxSalary - currentJob.minSalary + 1)) + currentJob.minSalary;

        const user = await require('../../utils/economyDB').getUser(userId);
        const { updateLoan } = require('../../utils/economyDB');

        let salary = originalSalary;
        let debtPaid = 0;
        let loanInfo = '';

        if (user.loanAmount && user.loanAmount > 0) {
            // Trừ 35% lương để trả nợ
            const maxDeduct = Math.floor(originalSalary * 0.35);
            debtPaid = Math.min(maxDeduct, user.loanAmount);
            salary = originalSalary - debtPaid;
            const debtMessages = [
                "Giang hồ tới siết cổ (35%)",
                "Chủ nợ cầm mã tấu đứng chờ sẵn (35%)",
                "Bọn tao bế mày lên đồn nếu đéo trả (35%)",
                "Tiền mồ hôi nước mắt á? Đưa đây tao giữ hộ (35%)",
                "Mày tính quỵt nợ của ngân hàng Gunter à con chó? (35%)",
                "Cắt tiết mày giờ, xì tiền ra đây (35%)",
                "Làm đéo đủ trả lãi mà bày đặt ra vẻ (35%)",
                "Alo giang hồ đòi nợ thuê tới thu họ (35%)",
                "Đừng tưởng trốn nợ được bọn tao, trừ thẳng lương (35%)",
                "Mày đéo trả thì bọn tao quậy nát công ty mày (35%)"
            ];
            const randomDebtMsg = debtMessages[Math.floor(Math.random() * debtMessages.length)];

            await updateLoan(userId, -debtPaid);
            loanInfo = `\n\n🏦 **${randomDebtMsg}:** -${debtPaid.toLocaleString()} 🪙\n📉 **Còn nợ tao:** ${(user.loanAmount - debtPaid).toLocaleString()} 🪙. Trốn đi đâu?`;
        }

        // Xử lý các event đặc biệt của nghề nghiệp (Tú Sena, Jack, Ộ i i)
        let specialInfo = '';
        let penaltyAmount = 0;
        let rewardAmount = 0;
        let addedDebt = 0;

        if (currentJob.id === 'tu_sena') {
            // 30% bị công an bắt
            if (Math.random() < 0.3) {
                penaltyAmount = Math.floor(Math.random() * 3000000) + 2000000; // Phạt 2-5 triệu
                if (user.balance < penaltyAmount) {
                    penaltyAmount = user.balance; // Trừ về 0
                }
                salary = 0; // Bị bắt thì mất cả chì lẫn chài (mất lương hôm đó)
                specialInfo = `\n\n🚨 **CẢNH SÁT ẬP VÀO!**\nBị bế lên đồn vì tội tổ chức đánh bạc, nộp phạt **${penaltyAmount.toLocaleString()} 🪙**!`;
            }
        } else if (currentJob.id === 'jack') {
            // 25% bị thu tiền nuôi con (cố định 5 củ)
            if (Math.random() < 0.25) {
                penaltyAmount = 5000000;
                specialInfo = `\n\n🍼 **TING TING!**\nĐến tháng chu cấp cho Thiên Ân, tự động trừ **5,000,000 🪙** tiền nuôi con! Trách nhiệm của 1 người cha!`;
            }
        } else if (currentJob.id === 'o_i_i') {
            const randOii = Math.random();
            if (randOii < 0.2) { // 20% nổ donate siêu lớn
                rewardAmount = Math.floor(Math.random() * 10000000) + 5000000; // 5-15 triệu
                salary += rewardAmount;
                specialInfo = `\n\n🤑 **DONATE KHỦNG!**\nCó đại gia Donate nổ sập kênh, nhận ngay **${rewardAmount.toLocaleString()} 🪙**! Chúc anh sức khỏe, công việc thuận lợi!`;
            } else if (randOii < 0.4) { // 20% bị vặt tiền xây trường/cầu (5-10 triệu)
                penaltyAmount = Math.floor(Math.random() * 5000000) + 5000000;
                specialInfo = `\n\n🧱 **TỪ THIỆN XÂY TRƯỜNG!**\nHô hào đóng góp xây trường/cầu, bạn bị trừ **${penaltyAmount.toLocaleString()} 🪙**.`;

                // Cơ chế thêm nợ nếu không đủ tiền
                if (user.balance + salary - debtPaid < penaltyAmount) {
                    const thieu = penaltyAmount - (user.balance + salary - debtPaid);
                    addedDebt = thieu;
                    specialInfo += `\nTiền trong người đéo đủ? Ngân hàng đã tự động ép bạn vay **${addedDebt.toLocaleString()} 🪙** để làm từ thiện! Uy tín làm đầu!`;
                }
            }
        }

        // Cập nhật Database
        let finalIncome = salary - penaltyAmount;
        let newBalance = await updateBalance(userId, finalIncome);
        if (addedDebt > 0) {
            await updateLoan(userId, addedDebt);
        }

        await updateLastWork(userId);

        const embed = new EmbedBuilder()
            .setColor(currentJob.color)
            .setTitle(`💼 Phát lương đây thằng culi! (${currentJob.name})`)
            .setDescription(`*${randomDialogue}*\n\n` +
                `💵 Lương cơ bản: **${originalSalary.toLocaleString()} 🪙**` +
                loanInfo +
                specialInfo +
                `\n\n💰 **Thực lãnh cuối cùng:** **${finalIncome.toLocaleString()} 🪙**\n` +
                `💳 Số dư hiện tại: **${newBalance.toLocaleString()} 🪙**`)
            .setThumbnail(interaction.user.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args, client) {
        const fakeInteraction = {
            user: message.author,
            deferred: true,
            replied: true,
            deferReply: async function () { },
            editReply: async function (options) {
                return await message.reply(options);
            }
        };
        await this.execute(fakeInteraction);
    }
};
