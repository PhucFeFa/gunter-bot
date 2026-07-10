const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getJobData, updateBalance, updateLastWork, getLoanData, updateLoan } = require('../../utils/economyDB');
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
                .setTitle('❌ Bạn đang thất nghiệp!')
                .setDescription('Bạn cần có một công việc để bắt đầu kiếm tiền.\nHãy dùng lệnh `/job spin` để tìm việc nhé!');
            return interaction.editReply({ embeds: [embed] });
        }

        // Kiểm tra cooldown 30s
        const now = Date.now();
        if (lastWork && (now - lastWork) < WORK_COOLDOWN) {
            const remaining = WORK_COOLDOWN - (now - lastWork);
            const seconds = Math.ceil(remaining / 1000);
            
            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('⏳ Chờ chút đã!')
                .setDescription(`Bạn vừa mới làm việc xong, nghỉ ngơi xíu đi.\nQuay lại sau **${seconds} giây** nữa nhé!`);
            return interaction.editReply({ embeds: [embed] });
        }

        const currentJob = jobs[job];
        
        // Random câu thoại
        const randomDialogue = currentJob.dialogues[Math.floor(Math.random() * currentJob.dialogues.length)];
        
        // Random tiền lương
        const salary = Math.floor(Math.random() * (currentJob.maxSalary - currentJob.minSalary + 1)) + currentJob.minSalary;

        const { loan } = await getLoanData(userId);
        let actualSalary = salary;
        let loanPayment = 0;
        let loanInterest = 0;
        let loanInfoText = '';

        if (loan > 0) {
            // Ngân hàng siết 30% lương
            const deducted = Math.floor(salary * 0.3);
            if (deducted > 0) {
                // 10% của số tiền bị trích là tiền lãi, 90% là trả nợ gốc
                loanInterest = Math.floor(deducted * 0.1);
                loanPayment = deducted - loanInterest;

                // Đảm bảo không thu lố dư nợ
                if (loanPayment > loan) {
                    loanPayment = loan;
                    const totalDeducted = loanPayment + Math.floor(loanPayment * 0.11); // Tính lại lãi tương ứng
                    loanInterest = totalDeducted - loanPayment;
                    actualSalary = salary - totalDeducted;
                } else {
                    actualSalary = salary - deducted;
                }

                await updateLoan(userId, -loanPayment);
                loanInfoText = `\n🏦 **Ngân hàng siết nợ:** -${(loanPayment + loanInterest).toLocaleString()} 🪙 (Lãi: ${loanInterest.toLocaleString()})\n📉 **Dư nợ còn lại:** ${(loan - loanPayment).toLocaleString()} 🪙\n`;
            }
        }

        // Cập nhật Database
        const newBalance = await updateBalance(userId, actualSalary);
        await updateLastWork(userId);

        const embed = new EmbedBuilder()
            .setColor(currentJob.color)
            .setTitle(`💼 Lương đến rồi! (${currentJob.name})`)
            .setDescription(`*${randomDialogue}*\n\n` +
                            `Bạn đã nhận được **${salary.toLocaleString()} 🪙** tiền công!\n` +
                            loanInfoText +
                            `💰 Số dư hiện tại: **${newBalance.toLocaleString()} 🪙**`)
            .setThumbnail(interaction.user.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args, client) {
        const fakeInteraction = {
            user: message.author,
            deferred: true,
            replied: true,
            deferReply: async function() {},
            editReply: async function(options) {
                return await message.reply(options);
            }
        };
        await this.execute(fakeInteraction);
    }
};
