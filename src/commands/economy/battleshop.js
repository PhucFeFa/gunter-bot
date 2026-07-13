const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
            editReply: async (options) => await interaction.editReply(options)
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
        const items = isWeapon ? WEAPONS : ARMORS;
        const currentEq = await getUserEquipment(interaction.user.id);
        const currentId = isWeapon ? currentEq.weaponId : currentEq.armorId;

        const embed = new EmbedBuilder()
            .setTitle(isWeapon ? '🗡️ CỬA HÀNG VŨ KHÍ 🗡️' : '🛡️ CỬA HÀNG ÁO GIÁP 🛡️')
            .setColor(0x00BFFF)
            .setDescription(`Sử dụng \`/battleshop buy ${type} <ID>\` để mua và trang bị ngay lập tức.\n\n`);

        // Chia làm 2 field nếu text quá dài (Discord limit 1024 chars/field)
        let desc1 = '';
        let desc2 = '';

        items.forEach(item => {
            if (item.id === 1 && item.price === 0) return; // Bỏ qua trang bị mặc định
            
            const isEquipped = item.id === currentId ? ' *(Đang trang bị)*' : '';
            let stats = '';
            
            if (isWeapon) {
                stats = `Sát thương: **${item.damage[0].toLocaleString()}-${item.damage[1].toLocaleString()}** | Crit: **${item.critRate * 100}% (x${item.critMult})**`;
            } else {
                stats = `Thủ: **${item.defense}%** | HP: **+${item.hpBonus.toLocaleString()}**`;
            }

            const itemText = `**ID ${item.id}.** ${item.emoji} **${item.name}**${isEquipped}\n💰 Giá: **${item.price.toLocaleString()} 🪙**\n📊 ${stats}\n📝 *${item.desc}*\n\n`;
            
            if (item.id <= 8) desc1 += itemText;
            else desc2 += itemText;
        });

        embed.addFields({ name: '🔹 Hàng Tiêu Chuẩn', value: desc1 || 'Trống' });
        if (desc2) {
            embed.addFields({ name: '🔹 Hàng Cao Cấp & Thần Thoại', value: desc2 });
        }

        await interaction.editReply({ content: null, embeds: [embed] });
    },

    async handleBuy(interaction, type, id) {
        if (id === 1) {
            return interaction.editReply('❌ Đồ cùi bắp này mua làm gì, ai chả có sẵn!');
        }

        const isWeapon = type === 'weapon';
        const items = isWeapon ? WEAPONS : ARMORS;
        const item = items.find(i => i.id === id);

        if (!item) {
            return interaction.editReply(`❌ ID trang bị không tồn tại! Dùng \`/battleshop view ${type}\` để xem danh sách.`);
        }

        const currentEq = await getUserEquipment(interaction.user.id);
        const currentId = isWeapon ? currentEq.weaponId : currentEq.armorId;

        if (currentId === id) {
            return interaction.editReply(`❌ Bạn đang trang bị ${item.emoji} **${item.name}** rồi mà!`);
        }

        const user = await getUser(interaction.user.id);
        if (user.balance < item.price) {
            return interaction.editReply(`❌ Bạn không đủ tiền! Cần **${item.price.toLocaleString()} 🪙** để mua ${item.emoji} **${item.name}**.`);
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
            await interaction.editReply('❌ Giao dịch thất bại do lỗi hệ thống! Tiền của bạn không bị trừ.');
        }
    }
};
