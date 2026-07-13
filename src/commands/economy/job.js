const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const { getJobData, getUser, updateBalance, setJob, updateJobSpins } = require('../../utils/economyDB');
const { jobs, spinJob } = require('../../data/jobs');

const activeSpins = new Set();

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
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('spin5')
                .setDescription(`Quay 5 nghề nghiệp 1 lúc (Phí: ${(SPIN_COST * 5).toLocaleString()} 🪙)`)
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
            const jobEntries = Object.values(jobs).sort((a, b) => b.weight - a.weight);
            const totalWeight = jobEntries.reduce((sum, j) => sum + j.weight, 0);

            const formatJob = (j) => {
                const percentage = ((j.weight / totalWeight) * 100).toFixed(2);
                if (j.hidden && j.id !== userJobId) {
                    return `**???** (${j.rarity} - Tỷ lệ: ${percentage}%)\n💸 Lương: ??? - ??? 🪙\n`;
                } else {
                    return `**${j.name}** (${j.rarity} - Tỷ lệ: ${percentage}%)\n💸 Lương: ${j.minSalary.toLocaleString()} - ${j.maxSalary.toLocaleString()} 🪙\n`;
                }
            };

            const itemsPerPage = 6;
            const totalPages = Math.ceil(jobEntries.length / itemsPerPage);
            let currentPage = 0;

            const generateEmbed = (page) => {
                const start = page * itemsPerPage;
                const end = start + itemsPerPage;
                const currentJobs = jobEntries.slice(start, end);

                let description = 'Đây là danh sách các nghề bạn có thể quay ra được:\n\n';
                currentJobs.forEach(j => {
                    description += formatJob(j) + '\n';
                });

                return new EmbedBuilder()
                    .setColor(0x3498db)
                    .setTitle(`📋 Danh sách Nghề nghiệp (Trang ${page + 1}/${totalPages})`)
                    .setDescription(description)
                    .setFooter({ text: `Dùng lệnh spin để tìm việc (Phí: ${SPIN_COST.toLocaleString()} 🪙)` });
            };

            const getButtons = (page) => {
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('◀ Trang trước')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === 0),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('Trang sau ▶')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(page === totalPages - 1)
                );
                return [row];
            };

            const msg = await interaction.editReply({ 
                embeds: [generateEmbed(currentPage)], 
                components: totalPages > 1 ? getButtons(currentPage) : [] 
            });

            if (totalPages <= 1 || !msg || !msg.createMessageComponentCollector) return;

            const collector = msg.createMessageComponentCollector({ time: 120000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: 'Bạn không thể thao tác bảng này!', flags: 64 });
                }

                if (i.customId === 'prev_page') currentPage--;
                if (i.customId === 'next_page') currentPage++;

                await i.update({
                    embeds: [generateEmbed(currentPage)],
                    components: getButtons(currentPage)
                });
            });

            collector.on('end', () => {
                try {
                    msg.edit({ components: [] });
                } catch (e) {}
            });
            return;
        }

        if (subcommand === 'spin' || subcommand === 'spin5') {
            try {
                if (activeSpins.has(userId)) {
                    return await interaction.editReply({ content: '⏳ Bạn đang trong quá trình quay hoặc chọn nghề, không thể quay tiếp! Hãy hoàn thành thao tác trước.' }).catch(()=>{});
                }

                const numSpins = subcommand === 'spin5' ? 5 : 1;
                const totalCost = SPIN_COST * numSpins;
                const user = await getUser(userId);
                
                if (user.balance < totalCost) {
                    const embed = new EmbedBuilder()
                        .setColor(0xe74c3c)
                        .setTitle('❌ Không đủ tiền')
                        .setDescription(`Bạn cần **${totalCost.toLocaleString()} 🪙** để thực hiện lệnh này.\nSố dư hiện tại: **${user.balance.toLocaleString()} 🪙**`);
                    return await interaction.editReply({ embeds: [embed] }).catch(()=>{});
                }

                // Khóa người dùng
                activeSpins.add(userId);

                // Trừ tiền
                await updateBalance(userId, -totalCost);
                
                let currentSpins = user.jobSpins || 0;
                const rolledJobs = [];
                let pityTriggered = false;

                for (let i = 0; i < numSpins; i++) {
                    currentSpins += 1;
                    let isPity = false;
                    
                    if (currentSpins >= 90) {
                        isPity = true;
                        currentSpins = 0; 
                        pityTriggered = true;
                    }
                    
                    const newJob = spinJob(isPity);
                    rolledJobs.push(newJob);

                    if (!isPity && ['Legendary', 'Mythic', 'Divine', 'Secret', 'Special'].includes(newJob.rarity)) {
                        currentSpins = 0; // Reset nếu trúng hàng xịn (tự nhiên)
                    }
                }

                // Cập nhật lại số lượt spin
                await updateJobSpins(userId, currentSpins);

                if (numSpins === 1) {
                    const newJob = rolledJobs[0];
                    await setJob(userId, newJob.id);
                    activeSpins.delete(userId);

                    let pityText = pityTriggered ? '\n✨ **BẢO HIỂM (90 lần)**: Bạn chắc chắn nhận được nghề Legendary hoặc cao hơn!' : '';
                    const embed = new EmbedBuilder()
                        .setColor(newJob.color)
                        .setTitle('🎉 Chúc mừng bạn đã có công việc mới!')
                        .setDescription(`Bạn đã quay trúng nghề: **${newJob.name}**\n\n` +
                                        `🌟 Độ hiếm: **${newJob.rarity}**\n` +
                                        `💸 Mức lương: **${newJob.minSalary.toLocaleString()} - ${newJob.maxSalary.toLocaleString()} 🪙**\n\n` +
                                        `Hãy dùng lệnh \`/work\` để bắt đầu kiếm tiền nhé!` + pityText)
                        .setFooter({ text: `Đã trừ ${totalCost.toLocaleString()} 🪙 phí xin việc | Lượt quay: ${currentSpins}/90` });

                    return interaction.editReply({ embeds: [embed] });
                } else {
                    // Xử lý spin5
                    let description = '**Bạn đã quay được 5 nghề sau đây:**\n\n';
                    rolledJobs.forEach((job, index) => {
                        description += `${index + 1}. **${job.name}** (${job.rarity})\n`;
                    });
                    description += `\n⚠️ **Vui lòng chọn 1 nghề bên dưới để nhận.**\nBạn có **1 phút** để chọn, nếu không chọn nghề sẽ tự mất và không được hoàn tiền.`;
                    
                    if (pityTriggered) {
                        description += '\n✨ **BẢO HIỂM (90 lần)**: Bạn đã được đảm bảo rơi ra nghề xịn trong đợt quay này!';
                    }

                    const embed = new EmbedBuilder()
                        .setColor(0xf39c12)
                        .setTitle('🎰 Kết quả quay x5')
                        .setDescription(description)
                        .setFooter({ text: `Đã trừ ${totalCost.toLocaleString()} 🪙 | Lượt quay: ${currentSpins}/90` });

                    const selectMenu = new StringSelectMenuBuilder()
                        .setCustomId('select_job_spin5')
                        .setPlaceholder('Vui lòng chọn một nghề bạn muốn nhận...')
                        .addOptions(rolledJobs.map((job, index) => {
                            return {
                                label: `${index + 1}. ${job.name}`,
                                description: `Độ hiếm: ${job.rarity} - Lương: ${(job.minSalary/1000).toLocaleString()}k-${(job.maxSalary/1000).toLocaleString()}k`,
                                value: `${index}_${job.id}` // Gắn kèm index để xử lý trường hợp trùng nghề
                            };
                        }));

                    const row = new ActionRowBuilder().addComponents(selectMenu);

                    const msg = await interaction.editReply({ embeds: [embed], components: [row] });
                    
                    if (!msg || !msg.createMessageComponentCollector) {
                        activeSpins.delete(userId);
                        return;
                    }

                    const collector = msg.createMessageComponentCollector({ time: 60000 }); // 1 phút

                    collector.on('collect', async i => {
                        if (i.user.id !== userId) {
                            return i.reply({ content: 'Bạn không phải là người đang chọn nghề!', flags: 64 });
                        }

                        const selectedValue = i.values[0];
                        const selectedJobId = selectedValue.split('_').slice(1).join('_'); // Lấy jobId từ value
                        const selectedJob = jobs[selectedJobId];

                        await setJob(userId, selectedJobId);
                        activeSpins.delete(userId); // Mở khóa

                        const successEmbed = new EmbedBuilder()
                            .setColor(selectedJob.color)
                            .setTitle('🎉 Bạn đã chọn công việc mới!')
                            .setDescription(`Bạn đã lựa chọn trang bị nghề: **${selectedJob.name}**\n\n` +
                                            `🌟 Độ hiếm: **${selectedJob.rarity}**\n` +
                                            `💸 Mức lương: **${selectedJob.minSalary.toLocaleString()} - ${selectedJob.maxSalary.toLocaleString()} 🪙**\n\n` +
                                            `Hãy dùng lệnh \`/work\` để bắt đầu kiếm tiền nhé!`)
                            .setFooter({ text: 'Chúc bạn may mắn với công việc mới!' });

                        await i.update({ embeds: [successEmbed], components: [] });
                        collector.stop('selected');
                    });

                    collector.on('end', (collected, reason) => {
                        if (reason !== 'selected') {
                            activeSpins.delete(userId); // Mở khóa
                            const timeoutEmbed = new EmbedBuilder()
                                .setColor(0xe74c3c)
                                .setTitle('⏳ Hết giờ chọn nghề')
                                .setDescription('Bạn đã không chọn nghề trong thời gian 1 phút. Các nghề quay được đã bị hủy bỏ và bạn vẫn giữ nghề cũ (Không hoàn tiền).');
                            
                            // Sử dụng edit để tương thích tốt với prefix message
                            msg.edit({ embeds: [timeoutEmbed], components: [] }).catch(() => {});
                        }
                    });
                }
            } catch (error) {
                activeSpins.delete(userId);
                console.error('[JOB SPIN] Lỗi:', error);
                return interaction.editReply({ content: 'Có lỗi xảy ra trong quá trình xử lý. Hãy thử lại.' }).catch(()=>{});
            }
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
