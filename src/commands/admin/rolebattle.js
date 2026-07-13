const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUserEquipment, updateBalance, getJobData } = require('../../utils/economyDB');
const { WEAPONS, ARMORS } = require('../../data/battleData');
const { jobs } = require('../../data/jobs');

const ADMIN_ID = '586904255860965386';
const activeBattles = new Set();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolebattle')
        .setDescription('[ADMIN] Mở màn Đại Chiến Gia Tộc')
        .addRoleOption(opt => opt.setName('role1').setDescription('Gia Tộc 1').setRequired(true))
        .addUserOption(opt => opt.setName('rep1').setDescription('Đại diện Gia Tộc 1').setRequired(true))
        .addRoleOption(opt => opt.setName('role2').setDescription('Gia Tộc 2').setRequired(true))
        .addUserOption(opt => opt.setName('rep2').setDescription('Đại diện Gia Tộc 2').setRequired(true))
        .addIntegerOption(opt => opt.setName('prize').setDescription('Tiền thưởng cho người thắng').setRequired(true)),

    async execute(interaction) {
        if (interaction.user.id !== ADMIN_ID) {
            return interaction.reply({ content: '❌ Chỉ Admin mới có quyền khởi tạo đại chiến!', flags: 64 });
        }
        await interaction.deferReply();
        
        const args = [
            interaction.options.getRole('role1'),
            interaction.options.getUser('rep1'),
            interaction.options.getRole('role2'),
            interaction.options.getUser('rep2'),
            interaction.options.getInteger('prize')
        ];
        
        await this.startBattle(interaction, args[0], args[1], args[2], args[3], args[4]);
    },

    async executePrefix(message, args) {
        if (message.author.id !== ADMIN_ID) {
            return message.reply('❌ Chỉ Admin mới có quyền khởi tạo đại chiến!');
        }
        if (args.length < 5) {
            return message.reply('❌ Cú pháp sai! Dùng: `g!rolebattle @Role1 @Rep1 @Role2 @Rep2 <Prize>`');
        }
        
        const role1 = message.mentions.roles.first();
        const rep1 = message.mentions.users.first();
        const roles = Array.from(message.mentions.roles.values());
        const users = Array.from(message.mentions.users.values());
        
        const role2 = roles[1];
        const rep2 = users[1];
        const prize = parseInt(args[4].replace(/,/g, ''));
        
        if (!role1 || !rep1 || !role2 || !rep2 || isNaN(prize)) {
            return message.reply('❌ Lỗi cú pháp hoặc thiếu tag Role/User!');
        }

        const fakeInteraction = {
            user: message.author,
            guild: message.guild,
            channel: message.channel,
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (options) => await message.reply(options)
        };
        
        await this.startBattle(fakeInteraction, role1, rep1, role2, rep2, prize);
    },

    async startBattle(interaction, role1, rep1, role2, rep2, prize) {
        if (activeBattles.has(interaction.channel.id)) {
            return interaction.editReply('❌ Đang có một trận đại chiến diễn ra tại kênh này!');
        }

        try {
            await interaction.guild.members.fetch();
        } catch (e) {
            console.error('Fetch members error', e);
        }

        // Kiểm tra xem đại diện có thuộc Role không
        const member1 = interaction.guild.members.cache.get(rep1.id);
        const member2 = interaction.guild.members.cache.get(rep2.id);

        if (!member1 || !member1.roles.cache.has(role1.id)) {
            return interaction.editReply(`❌ ${rep1.username} không thuộc gia tộc ${role1.name}!`);
        }
        if (!member2 || !member2.roles.cache.has(role2.id)) {
            return interaction.editReply(`❌ ${rep2.username} không thuộc gia tộc ${role2.name}!`);
        }

        activeBattles.add(interaction.channel.id);

        try {
            const jd1 = await getJobData(rep1.id);
            const jd2 = await getJobData(rep2.id);

            const job1 = jobs[jd1.job] || { name: 'Thất nghiệp', maxSalary: 0 };
            const job2 = jobs[jd2.job] || { name: 'Thất nghiệp', maxSalary: 0 };

            const eq1 = await getUserEquipment(rep1.id);
            const eq2 = await getUserEquipment(rep2.id);

            const w1 = WEAPONS.find(w => w.id === eq1.weaponId) || WEAPONS[0];
            const a1 = ARMORS.find(a => a.id === eq1.armorId) || ARMORS[0];
            
            const w2 = WEAPONS.find(w => w.id === eq2.weaponId) || WEAPONS[0];
            const a2 = ARMORS.find(a => a.id === eq2.armorId) || ARMORS[0];

            // HP = 1000 + ArmorHP + (JobMaxSalary / 2000)
            const maxHp1 = Math.floor(1000 + a1.hpBonus + (job1.maxSalary / 2000));
            const maxHp2 = Math.floor(1000 + a2.hpBonus + (job2.maxSalary / 2000));

            const player1 = {
                user: rep1, role: role1, job: job1, hp: maxHp1, maxHp: maxHp1, 
                weapon: w1, armor: a1, isDefending: false
            };
            
            const player2 = {
                user: rep2, role: role2, job: job2, hp: maxHp2, maxHp: maxHp2, 
                weapon: w2, armor: a2, isDefending: false
            };

            let currentTurn = 1; // 1 = player1, 2 = player2
            let battleLog = `⚔️ **ĐẠI CHIẾN BẮT ĐẦU** ⚔️\nCúp vô địch: **${prize.toLocaleString()} 🪙**\n\n`;

            const generateEmbed = () => {
                const embed = new EmbedBuilder()
                    .setTitle('⚔️ ĐẠI CHIẾN GIA TỘC ⚔️')
                    .setColor(currentTurn === 1 ? role1.color || 0xFF0000 : role2.color || 0x0000FF)
                    .setDescription(battleLog)
                    .addFields(
                        { name: `🛡️ ${role1.name} - ${rep1.username}`, value: `**Nghề:** ${player1.job.name}\n**HP:** ${player1.hp}/${player1.maxHp} ❤️\n**Vũ khí:** ${w1.emoji} ${w1.name}\n**Giáp:** ${a1.emoji} ${a1.name}`, inline: true },
                        { name: 'VS', value: '⚡', inline: true },
                        { name: `🛡️ ${role2.name} - ${rep2.username}`, value: `**Nghề:** ${player2.job.name}\n**HP:** ${player2.hp}/${player2.maxHp} ❤️\n**Vũ khí:** ${w2.emoji} ${w2.name}\n**Giáp:** ${a2.emoji} ${a2.name}`, inline: true }
                    )
                    .setFooter({ text: `Tới lượt của ${currentTurn === 1 ? rep1.username : rep2.username}` });
                return embed;
            };

            const getRow = () => {
                return new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('attack').setLabel('Tấn Công').setEmoji('⚔️').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('defend').setLabel('Đỡ Đòn & Hồi Máu').setEmoji('🛡️').setStyle(ButtonStyle.Success)
                );
            };

            let msg;
            if (interaction.channel) {
                msg = await interaction.editReply({ embeds: [generateEmbed()], components: [getRow()] });
            } else {
                msg = await interaction.editReply({ embeds: [generateEmbed()], components: [getRow()] });
            }

            const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 600000 }); // 10 mins max

            let timeoutTimer;
            const resetTimeout = () => {
                if (timeoutTimer) clearTimeout(timeoutTimer);
                timeoutTimer = setTimeout(async () => {
                    battleLog = `⏳ ${currentTurn === 1 ? rep1.username : rep2.username} đã bỏ cuộc do quá thời gian!\n\n🏆 **Người chiến thắng:** ${(currentTurn === 1 ? rep2 : rep1).username}!`;
                    collector.stop('timeout');
                    await msg.edit({ embeds: [generateEmbed()], components: [] }).catch(()=>{});
                    activeBattles.delete(interaction.channel.id);
                }, 30000); // 30s per turn
            };
            
            resetTimeout();

            collector.on('collect', async i => {
                const expectedUser = currentTurn === 1 ? player1.user : player2.user;
                if (i.user.id !== expectedUser.id) {
                    return i.reply({ content: '❌ Chưa tới lượt của bạn hoặc bạn không phải là người tham gia!', flags: 64 });
                }

                resetTimeout();
                
                const attacker = currentTurn === 1 ? player1 : player2;
                const defender = currentTurn === 1 ? player2 : player1;
                
                attacker.isDefending = false;

                if (i.customId === 'attack') {
                    // Calc damage
                    const baseDmg = Math.floor(Math.random() * (attacker.weapon.damage[1] - attacker.weapon.damage[0] + 1)) + attacker.weapon.damage[0];
                    let finalDmg = baseDmg;
                    
                    let isCrit = Math.random() < attacker.weapon.critRate;
                    if (isCrit) finalDmg = Math.floor(finalDmg * attacker.weapon.critMult);
                    
                    // Defense reduction
                    let defReduction = defender.armor.defense / 100;
                    if (defender.isDefending) {
                        if (defReduction < 0.85) {
                            defReduction = Math.min(0.85, defReduction + 0.2); // Add up to 20% defense, capped at 85% unless base is higher
                        }
                    }
                    
                    finalDmg = Math.floor(finalDmg * (1 - defReduction));
                    if (finalDmg < 1) finalDmg = 1;
                    
                    defender.hp -= finalDmg;
                    if (defender.hp < 0) defender.hp = 0;
                    
                    battleLog = `💥 **${attacker.user.username}** tấn công bằng ${attacker.weapon.emoji} ${attacker.weapon.name}!\n`;
                    if (isCrit) battleLog += `✨ **BẠO KÍCH!**\n`;
                    if (defender.isDefending) battleLog += `🛡️ **${defender.user.username}** đã đỡ đòn, giảm phần lớn sát thương!\n`;
                    battleLog += `🩸 Gây ra **${finalDmg.toLocaleString()}** sát thương!\n`;

                } else if (i.customId === 'defend') {
                    attacker.isDefending = true;
                    const heal = Math.floor(attacker.maxHp * 0.02); // Heal 2%
                    attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
                    battleLog = `🛡️ **${attacker.user.username}** chọn phòng thủ!\n💚 Hồi phục **${heal.toLocaleString()}** HP và giảm sát thương lượt tới!\n`;
                }

                if (player1.hp <= 0 || player2.hp <= 0) {
                    const winner = player1.hp > 0 ? player1 : player2;
                    const loser = player1.hp > 0 ? player2 : player1;
                    
                    await updateBalance(winner.user.id, prize);
                    
                    battleLog += `\n💀 **${loser.user.username}** đã gục ngã!\n🏆 **${winner.user.username}** giành chiến thắng và mang về vinh quang cho **${winner.role.name}**!\n💰 Nhận được **${prize.toLocaleString()} 🪙** tiền thưởng!`;
                    
                    if (timeoutTimer) clearTimeout(timeoutTimer);
                    collector.stop('win');
                    await i.update({ embeds: [generateEmbed()], components: [] });
                    activeBattles.delete(interaction.channel.id);
                } else {
                    currentTurn = currentTurn === 1 ? 2 : 1;
                    await i.update({ embeds: [generateEmbed()], components: [getRow()] });
                }
            });

            collector.on('end', () => {
                if (timeoutTimer) clearTimeout(timeoutTimer);
                activeBattles.delete(interaction.channel.id);
            });

        } catch (err) {
            console.error('[ROLEBATTLE ERROR]', err);
            activeBattles.delete(interaction.channel.id);
            if (interaction.channel) {
                interaction.editReply('❌ Có lỗi xảy ra trong quá trình khởi tạo trận đấu!').catch(()=>{});
            }
        }
    }
};
