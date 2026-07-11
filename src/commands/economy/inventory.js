/**
 * inventory.js – Xem và bán cá trong kho
 */

const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getInventory, removeFishFromInventory, clearInventory } = require('../../utils/fishDB');
const { updateBalance } = require('../../utils/economyDB');

const PAGE_SIZE = 10;
const TIER_STARS = tier => '⭐'.repeat(tier);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('inventory')
        .setDescription('🎒 Xem kho cá của bạn')
        .addStringOption(o => o.setName('action').setDescription('Hành động').setRequired(false)
            .addChoices(
                { name: '📦 Xem kho', value: 'view' },
                { name: '💰 Bán tất cả cá', value: 'sellall' }
            )),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const action = interaction.options.getString('action') || 'view';

        if (action === 'sellall') {
            const { items } = await getInventory(userId, 0, 9999);
            if (!items.length) return interaction.editReply('❌ Kho trống rỗng, không có gì để bán!');
            const total = items.reduce((s, f) => s + (f.price || 0), 0);
            await clearInventory(userId);
            await updateBalance(userId, total);
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('💰 Đã bán toàn bộ cá!')
                    .setDescription(`Bán **${items.length} con cá** → +**${total.toLocaleString()} 🪙**`)]
            });
        }

        // View mode with pagination
        let page = 0;
        const fetchPage = async (p) => {
            const { items, total, totalPages } = await getInventory(userId, p, PAGE_SIZE);
            return { items, total, totalPages };
        };

        const buildEmbed = (items, total, totalPages, currentPage) => {
            const embed = new EmbedBuilder()
                .setColor(0x1E90FF)
                .setTitle(`🎒 Kho Cá — ${interaction.user.username}`)
                .setFooter({ text: `Tổng: ${total} con | Trang ${currentPage + 1}/${Math.max(totalPages, 1)}` });

            if (!items.length) {
                embed.setDescription('*Kho trống rỗng! Dùng `/fish` để câu cá.*');
            } else {
                const lines = items.map((f, i) =>
                    `**${currentPage * PAGE_SIZE + i + 1}.** ${f.emoji} **${f.name}** — ${f.size}cm — ${TIER_STARS(f.tier)} — **${f.price.toLocaleString()} 🪙**`
                );
                embed.setDescription(lines.join('\n'));
                const pageTotal = items.reduce((s, f) => s + (f.price || 0), 0);
                embed.addFields({ name: '💵 Giá trị trang này', value: `**${pageTotal.toLocaleString()} 🪙**`, inline: true });
            }
            return embed;
        };

        const buildRow = (currentPage, totalPages) => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('inv_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
            new ButtonBuilder().setCustomId('inv_sellall').setLabel('💰 Bán tất cả').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('inv_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= totalPages - 1)
        );

        let { items, total, totalPages } = await fetchPage(page);
        const msg = await interaction.editReply({
            embeds: [buildEmbed(items, total, totalPages, page)],
            components: [buildRow(page, totalPages)]
        });

        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120000,
            filter: i => i.user.id === userId
        });

        collector.on('collect', async i => {
            if (i.customId === 'inv_prev' && page > 0) page--;
            else if (i.customId === 'inv_next' && page < totalPages - 1) page++;
            else if (i.customId === 'inv_sellall') {
                const { items: allItems } = await getInventory(userId, 0, 9999);
                if (!allItems.length) return i.reply({ content: '❌ Kho trống rỗng!', ephemeral: true });
                const sellTotal = allItems.reduce((s, f) => s + (f.price || 0), 0);
                await clearInventory(userId);
                await updateBalance(userId, sellTotal);
                collector.stop();
                return i.update({
                    embeds: [new EmbedBuilder().setColor(0x2ECC71).setTitle('💰 Đã bán toàn bộ cá!')
                        .setDescription(`Bán **${allItems.length} con cá** → +**${sellTotal.toLocaleString()} 🪙**`)],
                    components: []
                });
            }
            const result = await fetchPage(page);
            items = result.items; total = result.total; totalPages = result.totalPages;
            await i.update({
                embeds: [buildEmbed(items, total, totalPages, page)],
                components: [buildRow(page, totalPages)]
            });
        });

        collector.on('end', () => {
            msg.edit({ components: [] }).catch(() => {});
        });
    }
};
