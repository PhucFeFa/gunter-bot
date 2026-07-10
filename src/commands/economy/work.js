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

        // Cập nhật Database
        const newBalance = await updateBalance(userId, salary);
        await updateLastWork(userId);

        const embed = new EmbedBuilder()
            .setColor(currentJob.color)
            .setTitle(`💼 Lương đến rồi! (${currentJob.name})`)
            .setDescription(`*${randomDialogue}*\n\n` +
                            `Bạn đã nhận được **${salary.toLocaleString()} 🪙** tiền công!\n` +
                            `💰 Số dư hiện tại: **${newBalance.toLocaleString()} 🪙**`)
            .setThumbnail(interaction.user.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    }
};
