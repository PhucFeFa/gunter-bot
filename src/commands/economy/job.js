const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getJobData, getUser, updateBalance, setJob } = require('../../utils/economyDB');
const { jobs, spinJob } = require('../../data/jobs');

const SPIN_COST = 100000;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('Hệ thống nghề nghiệp')
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('Xem thông tin nghề nghiệp hiện tại của bạn')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Xem danh sách các nghề nghiệp')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('spin')
                .setDescription(`Quay nghề nghiệp mới (Phí: ${SPIN_COST.toLocaleString()} 🪙)`)
        ),
        
    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (subcommand === 'info') {
            const { job } = await getJobData(userId);
            
            if (!job || !jobs[job]) {
                const embed = new EmbedBuilder()
                    .setColor(0x95a5a6)
                    .setTitle('👔 Thông tin nghề nghiệp')
                    .setDescription('Bạn hiện tại đang **Thất nghiệp**.\nHãy dùng lệnh `/job spin` để tìm một công việc nhé!')
                    .setThumbnail(interaction.user.displayAvatarURL());
                return interaction.editReply({ embeds: [embed] });
            }

            const currentJob = jobs[job];
            const embed = new EmbedBuilder()
                .setColor(currentJob.color)
                .setTitle('👔 Thông tin nghề nghiệp')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'Nghề nghiệp', value: `**${currentJob.name}**`, inline: true },
                    { name: 'Độ hiếm', value: currentJob.rarity, inline: true },
                    { name: 'Mức lương', value: `${currentJob.minSalary.toLocaleString()} - ${currentJob.maxSalary.toLocaleString()} 🪙 / lần`, inline: false }
                );

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'list') {
            const { job: userJobId } = await getJobData(userId);
            const embed = new EmbedBuilder()
                .setColor(0x3498db)
                .setTitle('📋 Danh sách Nghề nghiệp');

            let description = 'Đây là danh sách các nghề bạn có thể quay ra được:\n\n';
            const totalWeight = Object.values(jobs).reduce((sum, j) => sum + j.weight, 0);
            
            for (const key in jobs) {
                const j = jobs[key];
                const percentage = ((j.weight / totalWeight) * 100).toFixed(2);
                
                if (j.hidden && j.id !== userJobId) {
                    description += `**???** (${j.rarity} - Tỷ lệ: ${percentage}%)\n`;
                    description += `💸 Lương: ??? - ??? 🪙\n\n`;
                } else {
                    description += `**${j.name}** (${j.rarity} - Tỷ lệ: ${percentage}%)\n`;
                    description += `💸 Lương: ${j.minSalary.toLocaleString()} - ${j.maxSalary.toLocaleString()} 🪙\n\n`;
                }
            }

            embed.setDescription(description)
                 .setFooter({ text: `Dùng /job spin để tìm việc (Phí: ${SPIN_COST.toLocaleString()} 🪙)` });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'spin') {
            const user = await getUser(userId);
            
            if (user.balance < SPIN_COST) {
                const embed = new EmbedBuilder()
                    .setColor(0xe74c3c)
                    .setTitle('❌ Không đủ tiền')
                    .setDescription(`Bạn cần **${SPIN_COST.toLocaleString()} 🪙** để xin việc/quay nghề.\nSố dư hiện tại: **${user.balance.toLocaleString()} 🪙**`);
                return interaction.editReply({ embeds: [embed] });
            }

            // Trừ tiền
            await updateBalance(userId, -SPIN_COST);
            
            // Quay nghề
            const newJob = spinJob();
            await setJob(userId, newJob.id);

            const embed = new EmbedBuilder()
                .setColor(newJob.color)
                .setTitle('🎉 Chúc mừng bạn đã có công việc mới!')
                .setDescription(`Bạn đã quay trúng nghề: **${newJob.name}**\n\n` +
                                `🌟 Độ hiếm: **${newJob.rarity}**\n` +
                                `💸 Mức lương: **${newJob.minSalary.toLocaleString()} - ${newJob.maxSalary.toLocaleString()} 🪙**\n\n` +
                                `Hãy dùng lệnh \`/work\` để bắt đầu kiếm tiền nhé!`)
                .setFooter({ text: `Đã trừ ${SPIN_COST.toLocaleString()} 🪙 phí xin việc` });

            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        const subcommand = args[0] || 'info';
        const fakeInteraction = {
            user: message.author,
            options: { getSubcommand: () => subcommand },
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
