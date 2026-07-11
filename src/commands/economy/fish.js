/**
 * fish.js – Lệnh /fish câu cá
 * Animation: thả mồi → chờ cá cắn → kéo lên → kết quả
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance } = require('../../utils/economyDB');
const { getFishProfile, getChannelZone, addFishToInventory, incrementCaught, getZoneSetup } = require('../../utils/fishDB');
const { RODS, getWeightedFish, rollFishSize, calcFishPrice, rollChest, rollShiny, applyShiny } = require('../../data/fishData');

// Cooldown per user (ms)
const COOLDOWN = new Map();
const COOLDOWN_MS = 30000; // 30 giây

// Fishing phase animations
const BAIT_FRAMES = ['🎣 Đang thả mồi...', '🎣 Mồi đang chìm xuống...', '🎣 Đang chờ cá cắn...'];
const PULL_FRAMES = ['🎣 Có gì đó cắn mồi! 💥', '💪 Đang kéo lên...', '🌊 Cá đang vùng vẫy!'];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getTierStars(tier) {
    return '⭐'.repeat(tier);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('🎣 Câu cá tại kênh câu cá (cần setup bởi admin)'),

    async execute(interaction) {
        await interaction.deferReply();

        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        // Cooldown
        const lastFish = COOLDOWN.get(userId) || 0;
        const remaining = COOLDOWN_MS - (Date.now() - lastFish);
        if (remaining > 0) {
            return interaction.editReply(`⏳ Bình tĩnh nào! Còn **${Math.ceil(remaining / 1000)}s** nữa mới được câu tiếp.`);
        }

        // Zone check
        const zoneId = await getChannelZone(guildId, interaction.channelId);
        if (!zoneId) {
            return interaction.editReply('❌ Kênh này không phải kênh câu cá! Nhờ admin dùng `/fishsetup` để thiết lập.');
        }

        // Role check cho Vùng 2 và 3
        if (zoneId > 1) {
            const zones = await getZoneSetup(guildId);
            const roleId = zones[`zone${zoneId}Role`];
            if (roleId && !interaction.member.roles.cache.has(roleId)) {
                return interaction.editReply(`❌ Bạn chưa có quyền câu ở vùng này! Hãy dùng lệnh \`/fishshop role\` để đổi vùng (mua bằng 🪙).`);
            }
        }

        // Rod check
        const profile = await getFishProfile(userId);
        const rod = RODS.find(r => r.id === profile.rod) || RODS[0];

        // Set cooldown
        COOLDOWN.set(userId, Date.now());

        // ─── Phase 1: Thả mồi animation ───
        const embed = new EmbedBuilder()
            .setColor(0x1E90FF)
            .setTitle('🎣 Đang câu cá...')
            .setDescription(BAIT_FRAMES[0])
            .setFooter({ text: `Cần: ${rod.emoji} ${rod.name} | Vùng ${zoneId}` });
        await interaction.editReply({ embeds: [embed] });

        // Thời gian chờ: 3-8 giây (cần tốt → ngắn hơn, cá to hơn)
        const baseWait = 3000 + Math.random() * 5000;
        const waitTime = Math.max(2000, baseWait - rod.bonusTime * 300);
        const steps = Math.floor(waitTime / 1500);

        for (let i = 1; i < Math.min(steps, 3); i++) {
            await sleep(1500);
            embed.setDescription(BAIT_FRAMES[Math.min(i, BAIT_FRAMES.length - 1)]);
            await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }
        await sleep(waitTime % 1500 || 1000);

        // ─── Miss chance ───
        const missChance = Math.max(5, 30 - rod.bonusLuck * 0.4);
        if (Math.random() * 100 < missChance) {
            embed.setColor(0x808080)
                .setTitle('💨 Hụt cá!')
                .setDescription('Con cá tinh ranh đã chạy mất... Thả lại mồi nhé!');
            return interaction.editReply({ embeds: [embed] });
        }

        // ─── Phase 2: Kéo cá ───
        for (let i = 0; i < PULL_FRAMES.length; i++) {
            await sleep(800);
            embed.setColor(0xFFD700).setDescription(PULL_FRAMES[i]);
            await interaction.editReply({ embeds: [embed] }).catch(() => {});
        }
        await sleep(600);

        // ─── Chest chance (5% + rod bonus) ───
        const chestChance = rod.id === 11 ? 12 : 5; // Cần Băng Giá bonus
        if (Math.random() * 100 < chestChance) {
            const chest = rollChest();
            if (chest.coins > 0) {
                await updateBalance(userId, chest.coins);
            }
            embed.setColor(0xFFD700)
                .setTitle('📦 Câu được Rương Báu!')
                .setDescription(`Mở rương ra thấy: **${chest.label}**${chest.coins > 0 ? `\n💰 +**${chest.coins.toLocaleString()} 🪙**` : ''}`);
            return interaction.editReply({ embeds: [embed] });
        }

        // ─── Get fish ───
        const fish = getWeightedFish(zoneId);

        // Size bonus from rod + wait time
        const timeBonus = Math.min(rod.bonusSize + (waitTime / 10000) * 0.3, 1.2);
        const rawSize = rollFishSize(fish);
        const size = Math.min(Math.floor(rawSize * (1 + timeBonus)), fish.maxSize);
        let price = calcFishPrice(fish, size);
        let fishName = fish.name;
        let isShiny = false;

        // ─── Shiny check ───
        if (rollShiny(fish, rod)) {
            const shinyResult = applyShiny({ name: fishName, price });
            fishName = shinyResult.name;
            price = shinyResult.price;
            isShiny = true;
        }

        // Save to inventory
        await addFishToInventory(userId, {
            fishId: fish.id,
            name: fishName,
            emoji: fish.emoji,
            zone: fish.zone,
            tier: fish.tier,
            size,
            price,
            isShiny,
        });
        await incrementCaught(userId);

        const resultColor = isShiny
            ? 0xFFD700
            : [0x808080, 0x4CAF50, 0x2196F3, 0x9C27B0, 0xFF9800, 0xF44336, 0xE91E63, 0xFFD700][fish.tier - 1] || 0x808080;

        embed.setColor(resultColor)
            .setTitle(`${fish.emoji} Câu được ${fishName}!`)
            .setDescription(
                `${isShiny ? '🌟 **SHINY! Giá x5!**\n' : ''}` +
                `**Tier:** ${getTierStars(fish.tier)}\n` +
                `**Kích thước:** ${size} cm\n` +
                `**Giá trị:** **${price.toLocaleString()} 🪙**\n\n` +
                `Dùng \`/inventory\` để xem và bán cá!`
            )
            .setFooter({ text: `Cần: ${rod.emoji} ${rod.name}` });

        await interaction.editReply({ embeds: [embed] });
    }
};
