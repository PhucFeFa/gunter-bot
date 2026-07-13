const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, updateBalance, getUserEquipment, setUserEquipment } = require('../../utils/economyDB');
const { WEAPONS, ARMORS } = require('../../data/battleData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('battleshop')
        .setDescription('Cửa hàng Vũ Khí và Áo Giáp Đại Chiến')
        .addSubcommand(sub => sub
            .setName('view')
            .setDescription('Xem danh sách trang bị')
            .addStringOption(opt => opt
                .setName('type')
                .setDescription('Loại trang bị')
                .setRequired(true)
                .addChoices(
                    { name: '🗡️ Vũ Khí', value: 'weapon' },
                    { name: '🛡️ Áo Giáp', value: 'armor' }
                )
            )
        )
        .addSubcommand(sub => sub
            .setName('buy')
            .setDescription('Mua trang bị')
            .addStringOption(opt => opt
                .setName('type')
                .setDescription('Loại trang bị')
                .setRequired(true)
                .addChoices(
                    { name: '🗡️ Vũ Khí', value: 'weapon' },
                    { name: '🛡️ Áo Giáp', value: 'armor' }
                )
            )
            .addIntegerOption(opt => opt
                .setName('id')
                .setDescription('ID của trang bị muốn mua')
                .setRequired(true)
            )
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const type = interaction.options.getString('type');
        const id = interaction.options.getInteger('id');

        const fakeInteraction = {
            user: interaction.user,
            editReply: async (options) => {
                await interaction.editReply(options);
                return await interaction.fetchReply();
            }
        };

        if (subcommand === 'view') {
            await this.handleView(fakeInteraction, type);
        } else if (subcommand === 'buy') {
            await this.handleBuy(fakeInteraction, type, id);
        }
    },

    async executePrefix(message, args) {
        // g!battleshop view weapon
        // g!battleshop buy weapon 5
        const action = args[0] ? args[0].toLowerCase() : null;
        let type = args[1] ? args[1].toLowerCase() : null;
        const id = args[2] ? parseInt(args[2]) : null;

        if (!action || !['view', 'buy'].includes(action)) {
            return message.reply('❌ Cú pháp sai! Dùng: `g!battleshop view <weapon/armor>` hoặc `g!battleshop buy <weapon/armor> <ID>`');
        }
        
        if (type === 'vukhi') type = 'weapon';
        if (type === 'giap') type = 'armor';

        if (!type || !['weapon', 'armor'].includes(type)) {
            return message.reply('❌ Loại trang bị không hợp lệ! Vui lòng chọn `weapon` hoặc `armor`.');
        }

        if (action === 'buy' && (isNaN(id) || id === null)) {
            return message.reply('❌ Bạn chưa nhập ID trang bị muốn mua!');
        }

        const msg = await message.reply('⏳ Đang xử lý yêu cầu...');
        const fakeInteraction = {
            user: message.author,
            editReply: async (options) => await msg.edit(options)
        };

        if (action === 'view') {
            await this.handleView(fakeInteraction, type);
        } else if (action === 'buy') {
            await this.handleBuy(fakeInteraction, type, id);
        }
    },

    async handleView(interaction, type) {
        const isWeapon = type === 'weapon';
        const items = (isWeapon ? WEAPONS : ARMORS).filter(i => i.id > 1 || i.price > 0);
        
        const PAGE_SIZE = 5;
        let page = 0;
        const totalPages = Math.ceil(items.length / PAGE_SIZE);

        const currentEq = await getUserEquipment(interaction.user.id);
        let currentId = isWeapon ? currentEq.weaponId : currentEq.armorId;

        const buildEmbed = (p) => {
            const slice = items.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const embed = new EmbedBuilder()
                .setTitle(isWeapon ? '🗡️ CỬA HÀNG VŨ KHÍ 🗡️' : '🛡️ CỬA HÀNG ÁO GIÁP 🛡️')
                .setColor(isWeapon ? 0xE74C3C : 0xF1C40F)
                .setFooter({ text: `Trang ${p + 1}/${totalPages} | Dùng nút Mua ở dưới để sở hữu trang bị` });

            for (const item of slice) {
                const isEquipped = item.id === currentId ? ' ✅ *(Đang trang bị)*' : '';
                let stats = '';
                if (isWeapon) {
                    stats = `Sát thương: **${item.damage[0].toLocaleString()}-${item.damage[1].toLocaleString()}** | Crit: **${item.critRate * 100}% (x${item.critMult})**`;
                } else {
                    stats = `Thủ: **${item.defense}%** | HP: **+${item.hpBonus.toLocaleString()}**`;
                }
                embed.addFields({
                    name: `ID ${item.id}. ${item.emoji} ${item.name}${isEquipped}`,
                    value: `💰 Giá: **${item.price.toLocaleString()} 🪙**\n📊 ${stats}\n📝 *${item.desc}*`,
                    inline: false
                });
            }
            return embed;
        };

        const buildRows = (p) => {
            const slice = items.slice(p * PAGE_SIZE, (p + 1) * PAGE_SIZE);
            const navRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('bs_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(p === 0),
                new ButtonBuilder().setCustomId('bs_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(p >= totalPages - 1)
            );
            const buyRow = new ActionRowBuilder().addComponents(
                ...slice.map(item =>
                    new ButtonBuilder()
                        .setCustomId(`bsbuy_${type}_${item.id}`)
                        .setLabel(`Mua #${item.id}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(item.id === currentId)
                )
            );
            return [buyRow, navRow];
        };

        const msg = await interaction.editReply({ content: null, embeds: [buildEmbed(page)], components: buildRows(page) });
        
        // Collector cho các nút
        const { ComponentType } = require('discord.js');
        const collector = msg.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000, filter: i => i.user.id === interaction.user.id });

        collector.on('collect', async i => {
            if (i.customId === 'bs_prev' && page > 0) {
                page--;
                return i.update({ embeds: [buildEmbed(page)], components: buildRows(page) });
            }
            if (i.customId === 'bs_next' && page < totalPages - 1) {
                page++;
                return i.update({ embeds: [buildEmbed(page)], components: buildRows(page) });
            }

            if (i.customId.startsWith('bsbuy_')) {
                const parts = i.customId.split('_');
                const pType = parts[1];
                const pId = parseInt(parts[2]);
                
                const pItems = pType === 'weapon' ? WEAPONS : ARMORS;
                const pItem = pItems.find(x => x.id === pId);
                
                if (!pItem) return i.reply({ content: '❌ Trang bị không tồn tại!', flags: 64 });
                
                const userData = await getUser(interaction.user.id);
                if (userData.balance < pItem.price) {
                    return i.reply({ content: `❌ Không đủ tiền! Bạn cần **${pItem.price.toLocaleString()} 🪙** để mua ${pItem.emoji} **${pItem.name}**.`, flags: 64 });
                }

                await updateBalance(interaction.user.id, -pItem.price);
                await setUserEquipment(interaction.user.id, pType, pId);
                
                await i.reply({ content: `🎉 Đã mua và trang bị thành công **${pItem.emoji} ${pItem.name}**! (-${pItem.price.toLocaleString()} 🪙)`, flags: 64 });
                
                // Cập nhật lại giao diện sau khi mua
                const updatedEq = await getUserEquipment(interaction.user.id);
                currentId = pType === 'weapon' ? updatedEq.weaponId : updatedEq.armorId;
                await msg.edit({ embeds: [buildEmbed(page)], components: buildRows(page) }).catch(()=>{});
            }
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(()=>{});
        });
    },

    async handleBuy(interaction, type, id) {
        // Fallback for slash command direct /battleshop buy
        const isWeapon = type === 'weapon';
        const items = isWeapon ? WEAPONS : ARMORS;
        const item = items.find(i => i.id === id);

        if (!item || item.id === 1) {
            return interaction.editReply(`❌ ID trang bị không hợp lệ! Dùng \`/battleshop view ${type}\` để xem danh sách.`);
        }

        const currentEq = await getUserEquipment(interaction.user.id);
        const currentId = isWeapon ? currentEq.weaponId : currentEq.armorId;

        if (currentId === id) {
            return interaction.editReply(`❌ Bạn đang trang bị ${item.emoji} **${item.name}** rồi mà!`);
        }

        const user = await getUser(interaction.user.id);
        if (user.balance < item.price) {
            return interaction.editReply(`❌ Bạn không đủ tiền! Cần **${item.price.toLocaleString()} 🪙**.`);
        }

        try {
            await updateBalance(interaction.user.id, -item.price);
            await setUserEquipment(interaction.user.id, type, id);

            const embed = new EmbedBuilder()
                .setTitle('🛒 MUA SẮM THÀNH CÔNG')
                .setColor(0x00FF00)
                .setDescription(`Bạn đã thanh toán **${item.price.toLocaleString()} 🪙** để sở hữu trang bị mới!`)
                .addFields({
                    name: 'Trang bị hiện tại',
                    value: `${item.emoji} **${item.name}**\n*Sức mạnh của bạn vừa được nâng tầm!*`
                })
                .setThumbnail(interaction.user.displayAvatarURL());

            await interaction.editReply({ content: null, embeds: [embed] });
        } catch (err) {
            console.error('[BATTLESHOP ERROR]', err);
            await interaction.editReply('❌ Giao dịch thất bại do lỗi hệ thống!');
        }
    }
};
