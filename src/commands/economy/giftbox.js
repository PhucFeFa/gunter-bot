const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { getConfig } = require('../../utils/configDB');

// Bộ nhớ đệm quản lý hộp quà theo channel
const activeBoxesPerChannel = new Map();
// Cooldown người tạo hộp
const creatorCooldown = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giftbox')
        .setDescription('Hệ thống hộp quà Lì Xì (Lucky Money)')
        .addSubcommand(subcommand =>
            subcommand.setName('create')
                .setDescription('Thả một hộp quà lì xì cho mọi người')
                .addStringOption(option => 
                    option.setName('amount')
                        .setDescription('Tổng tiền thả lì xì (Tối đa 100tr, hoặc gõ "all")')
                        .setRequired(true))
                .addIntegerOption(option => 
                    option.setName('slots')
                        .setDescription('Số lượng người được nhận (1-50)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(50))
                .addIntegerOption(option => 
                    option.setName('duration')
                        .setDescription('Thời gian tồn tại (phút) (1-60, mặc định: 5)')
                        .setRequired(false)
                        .setMinValue(1)
                        .setMaxValue(60))
                .addStringOption(option => 
                    option.setName('anti_clone')
                        .setDescription('Chặn nick mới dưới 3 ngày (Mặc định: On)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'On', value: 'on' },
                            { name: 'Off', value: 'off' }
                        ))),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const guildId = interaction.guildId;
        const config = await getConfig(guildId);
        if (!config.feature_economy) {
            return interaction.editReply('❌ Tính năng Economy đang bị tắt trên server này!');
        }

        const creator = interaction.user;
        const channelId = interaction.channel.id;
        
        const tongTienRaw = interaction.options.getString('amount');
        let soSuat = interaction.options.getInteger('slots') || 10;
        const thoiGian = interaction.options.getInteger('duration') || 5;
        const antiCloneSetting = interaction.options.getString('anti_clone') || 'on';
        const antiClone = (antiCloneSetting === 'on');

        if (soSuat < 1) soSuat = 1;
        if (soSuat > 50) soSuat = 50;

        const creatorData = await getUser(creator.id);
        const currentBalance = creatorData.balance;

        const { getTransferLimit } = require('../../utils/economyDB');
        const isLimitDisabled = await getTransferLimit(creator.id);

        const ownerIds = (process.env.BOT_OWNER_IDS || '').split(',');
        const isAdmin = ownerIds.includes(creator.id);
        const canExceedLimit = isAdmin || isLimitDisabled;
        const MAX_GIFT = canExceedLimit ? Infinity : 100000000;

        let tongTien = 0;
        if (tongTienRaw.toLowerCase() === 'all') {
            tongTien = currentBalance > MAX_GIFT ? MAX_GIFT : currentBalance;
            if (tongTien < 100) return interaction.editReply('❌ Bạn không đủ 100 $ tối thiểu để tạo hộp quà!');
        } else {
            tongTien = parseInt(tongTienRaw.replace(/,/g, ''));
            if (isNaN(tongTien) || tongTien < 100) return interaction.editReply('❌ Số tiền không hợp lệ! (Tối thiểu 100 $)');
            if (!canExceedLimit && tongTien > MAX_GIFT) return interaction.editReply('❌ Hộp quà chỉ giới hạn tối đa **100,000,000 $** (100 triệu) thôi đại gia ơi!');
        }

        if (currentBalance < tongTien) {
            return interaction.editReply(`❌ Bạn không đủ tiền! Số dư của bạn chỉ có **${currentBalance.toLocaleString()} $**.`);
        }

        if (tongTien < soSuat) {
            return interaction.editReply(`❌ Số tiền quá ít! Tổng tiền (${tongTien}) không đủ để chia cho ${soSuat} suất (mỗi suất ít nhất 1 $).`);
        }

        // Check cooldown người tạo (5 phút)
        const now = Date.now();
        const cdTime = 5 * 60 * 1000;
        if (creatorCooldown.has(creator.id)) {
            const expire = creatorCooldown.get(creator.id) + cdTime;
            if (now < expire) {
                const timeLeft = Math.ceil((expire - now) / 1000 / 60);
                return interaction.editReply(`⏳ Bạn thả lì xì nhiều quá! Vui lòng đợi **${timeLeft} phút** nữa để tạo hộp mới.`);
            }
        }

        // Check số hộp đang mở trong kênh (Tối đa 5 hộp)
        const boxesInChannel = activeBoxesPerChannel.get(channelId) || 0;
        if (boxesInChannel >= 5) {
            return interaction.editReply('❌ Kênh này đang có quá nhiều hộp quà chưa mở! Hãy để mọi người nhặt bớt đi đã.');
        }

        // ────────────────────────────────────────────────────────────────
        // KHỞI TẠO STATE HỘP QUÀ
        // ────────────────────────────────────────────────────────────────
        // Trừ tiền người tạo ngay lập tức
        await updateBalance(creator.id, -tongTien);
        
        // Đặt cooldown
        creatorCooldown.set(creator.id, now);
        // Tăng đếm box trong channel
        activeBoxesPerChannel.set(channelId, boxesInChannel + 1);

        const boxState = {
            totalAmount: tongTien,
            totalSlots: soSuat,
            remainingAmount: tongTien,
            remainingSlots: soSuat,
            claimedUsers: new Set(),
            history: [], // [{ userId, username, amount }]
            isClosed: false,
            isProcessing: false // Mutex lock đơn giản
        };

        const generateEmbed = () => {
            const embed = new EmbedBuilder()
                .setColor(0xF1C40F) // Vàng Gold
                .setTitle(`🎁 ${creator.username.toUpperCase()} VỪA THẢ LÌ XÌ!`)
                .setDescription(`Nhanh tay thì còn, chậm tay thì nịt!\n\n💰 **Tổng số tiền:** ${boxState.totalAmount.toLocaleString()} $\n👥 **Số suất:** ${boxState.totalSlots}\n⏰ **Thời gian:** ${thoiGian} phút`);
            
            if (boxState.history.length > 0) {
                const historyText = boxState.history.map(x => `> 👤 <@${x.userId}>: **${x.amount.toLocaleString()} $** 🎉`).join('\n');
                embed.addFields({ name: 'Danh sách đã nhận:', value: historyText });
            }

            if (boxState.isClosed) {
                embed.setColor(0x95A5A6); // Xám
                embed.setTitle('📦 LÌ XÌ ĐÃ ĐÓNG!');
                
                let refundText = '';
                if (boxState.remainingSlots > 0 && boxState.remainingAmount > 0) {
                    refundText = `\n🔙 **Hoàn trả cho chủ thớt:** ${boxState.remainingAmount.toLocaleString()} $`;
                }
                
                embed.setDescription(`Đã phát: **${boxState.totalSlots - boxState.remainingSlots}/${boxState.totalSlots}** suất.${refundText}`);
            } else {
                embed.setFooter({ text: `Còn lại: ${boxState.remainingSlots} suất` });
            }

            return embed;
        };

        const claimBtn = new ButtonBuilder()
            .setCustomId('hopqua_claim')
            .setLabel('🎁 Nhận Lì Xì')
            .setStyle(ButtonStyle.Success);
            
        const row = new ActionRowBuilder().addComponents(claimBtn);

        const msg = await interaction.editReply({ embeds: [generateEmbed()], components: [row] });

        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: thoiGian * 60 * 1000 });

        const closeBox = async (reason) => {
            if (boxState.isClosed) return;
            boxState.isClosed = true;
            collector.stop(reason);

            // Hoàn tiền nếu còn thừa
            if (boxState.remainingSlots > 0 && boxState.remainingAmount > 0) {
                await updateBalance(creator.id, boxState.remainingAmount);
            }

            // Giảm số hộp đếm trong channel
            const currentBoxes = activeBoxesPerChannel.get(channelId) || 1;
            activeBoxesPerChannel.set(channelId, currentBoxes - 1);

            claimBtn.setDisabled(true);
            claimBtn.setLabel('Hết Lì Xì');
            claimBtn.setStyle(ButtonStyle.Secondary);
            try {
                await msg.edit({ embeds: [generateEmbed()], components: [new ActionRowBuilder().addComponents(claimBtn)] });
            } catch(e) {}
        };

        collector.on('collect', async i => {
            if (boxState.isClosed) return;
            
            const claimer = i.user;

            // Chặn người tạo
            if (claimer.id === creator.id) {
                return i.reply({ content: '❌ Bạn là người thả lì xì mà! Tính tự biên tự diễn à?', flags: 64 });
            }

            // Chặn acc clone (tham gia server dưới 3 ngày)
            if (antiClone && i.member && i.member.joinedAt) {
                const joinedDays = (Date.now() - i.member.joinedAt.getTime()) / (1000 * 60 * 60 * 24);
                if (joinedDays < 3) {
                    return i.reply({ content: '❌ Nick mới vào server dưới 3 ngày không được nhận lì xì để chống clone!', flags: 64 });
                }
            }

            // Chặn nếu đang xử lý người khác (chống click đồng thời)
            if (boxState.isProcessing) {
                return i.reply({ content: '⏳ Đang có người bóc hộp, đợi tí...', flags: 64 });
            }
            
            // Lock
            boxState.isProcessing = true;

            try {
                // Kiểm tra lại sau khi lock
                if (boxState.claimedUsers.has(claimer.id)) {
                    boxState.isProcessing = false;
                    return i.reply({ content: '❌ Tham thì thâm! Bạn đã nhận phần của mình rồi.', flags: 64 });
                }

                if (boxState.remainingSlots <= 0) {
                    boxState.isProcessing = false;
                    return i.reply({ content: '😭 Chậm tay mất rồi, lì xì đã phát hết!', flags: 64 });
                }

                boxState.claimedUsers.add(claimer.id);

                // Thuật toán chia tiền Lucky Money
                let amount = 0;
                if (boxState.remainingSlots === 1) {
                    // Suất cuối lấy hết phần còn lại
                    amount = boxState.remainingAmount;
                } else {
                    // Tối đa mỗi người nhận không được làm người sau bị trắng tay (còn 0 đồng)
                    const maxPossible = boxState.remainingAmount - (boxState.remainingSlots - 1);
                    // Mức trung bình
                    const avg = Math.floor(boxState.remainingAmount / boxState.remainingSlots);
                    // Giới hạn max thường = trung bình x2 để tiền lệch nhau cho vui
                    let maxRandom = Math.floor(avg * 2);
                    if (maxRandom > maxPossible) maxRandom = maxPossible;
                    if (maxRandom < 1) maxRandom = 1;
                    
                    amount = Math.floor(Math.random() * maxRandom) + 1;
                }

                // Cập nhật State ĐỒNG BỘ
                boxState.remainingAmount -= amount;
                boxState.remainingSlots -= 1;
                boxState.history.push({ userId: claimer.id, username: claimer.username, amount: amount });

                // Unlock ngay sau khi tính toán xong bộ nhớ
                boxState.isProcessing = false;
                
                // Trả lời ephemeral
                await i.reply({ content: `🎉 TING TING! Bạn vừa bóc được **${amount.toLocaleString()} $** từ hộp quà của <@${creator.id}>.`, flags: 64 });

                // Cộng tiền BẤT ĐỒNG BỘ 
                await updateBalance(claimer.id, amount);

                // Cập nhật Embed
                if (boxState.remainingSlots === 0) {
                    await closeBox('empty');
                } else {
                    try { await msg.edit({ embeds: [generateEmbed()] }); } catch(e) {}
                }
            } catch (err) {
                boxState.isProcessing = false; // Phải nhả lock nếu có lỗi bất ngờ
                console.error('[Hộp Quà] Lỗi khi nhận:', err);
            }
        });

        collector.on('end', async (collected, reason) => {
            if (reason === 'time' && !boxState.isClosed) {
                await closeBox('timeout');
            }
        });
    }
};
