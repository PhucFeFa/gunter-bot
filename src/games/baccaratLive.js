/**
 * baccaratLive.js
 * Game Baccarat Live – nhiều người chơi cùng lúc, chạy vòng lặp liên tục.
 * House edge: ~5% (Banker win rate cao hơn thực tế một chút).
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, updateBalance } = require('../utils/economyDB');

// ─── Card helpers ────────────────────────────────────────────
const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const drawCard = () => ({
    rank: RANKS[Math.floor(Math.random() * RANKS.length)],
    suit: SUITS[Math.floor(Math.random() * SUITS.length)],
});
const cardVal = r => (r === 'A' ? 1 : ['10','J','Q','K'].includes(r) ? 0 : parseInt(r));
const handTotal = cards => cards.reduce((s, c) => s + cardVal(c.rank), 0) % 10;
const fmt = c => `\`${c.rank}${c.suit}\``;

// ─── Baccarat logic (chuẩn casino, house tự thắng từ commission Banker 5%) ───
function dealBaccarat() {
    let pCards = [drawCard(), drawCard()];
    let bCards = [drawCard(), drawCard()];
    let pTotal = handTotal(pCards);
    let bTotal = handTotal(bCards);

    let pThird = null;
    if (pTotal < 8 && bTotal < 8) {
        if (pTotal <= 5) { pThird = drawCard(); pCards.push(pThird); pTotal = handTotal(pCards); }
        if (pThird === null) {
            if (bTotal <= 5) { bCards.push(drawCard()); bTotal = handTotal(bCards); }
        } else {
            const pv = cardVal(pThird.rank);
            const bankerDraws = bTotal <= 2
                || (bTotal === 3 && pv !== 8)
                || (bTotal === 4 && pv >= 2 && pv <= 7)
                || (bTotal === 5 && pv >= 4 && pv <= 7)
                || (bTotal === 6 && (pv === 6 || pv === 7));
            if (bankerDraws) { bCards.push(drawCard()); bTotal = handTotal(bCards); }
        }
    }

    const result = pTotal > bTotal ? 'player' : bTotal > pTotal ? 'banker' : 'tie';
    return { pCards, bCards, pTotal, bTotal, result };
}

// ─── Road display ────────────────────────────────────────────
const ROAD_ICON = { banker: '🔴', player: '🔵', tie: '🟢' };
const ROAD_LABEL = { banker: 'B', player: 'P', tie: 'T' };

// ─── BaccaratLiveGame class ───────────────────────────────────
class BaccaratLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'baccarat';
        this.running = false;
        this.round = 0;
        this.road = [];         // Tối đa 20 kết quả gần nhất
        this.bets = new Map();  // userId → { side, amount }
        this.betMsgs = [];      // Tin nhắn xác nhận cược để xóa sau
        this.mainMsg = null;    // Tin nhắn embed chính
    }

    // ─── Public API ───
    async start() {
        this.running = true;
        await this.loop();
    }

    stop() { this.running = false; }

    /** Đặt cược từ prefix command (g!bet banker 1000) */
    async placeBet(message, side, amount) {
        if (!['banker','player','tie'].includes(side)) {
            return message.reply('❌ Cửa không hợp lệ! Dùng: `banker`, `player` hoặc `tie`').then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        }

        const userData = await getUser(message.author.id);
        const usable = userData.balance;

        if (amount <= 0 || isNaN(amount)) return message.reply('❌ Số tiền không hợp lệ!').then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));
        if (amount > usable) return message.reply(`❌ Bạn chỉ có thể cược tối đa **${usable.toLocaleString()} 🪙** (đã trừ tiền đang nợ)!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 5000));

        await updateBalance(message.author.id, -amount);
        this.bets.set(message.author.id, { side, amount });

        const label = { banker: '🔴 Banker', player: '🔵 Player', tie: '🟢 Tie' }[side];
        const confirmMsg = await message.reply(`✅ **${message.author.username}** đặt **${amount.toLocaleString()} 🪙** vào ${label}!`);
        this.betMsgs.push(message, confirmMsg);

        await this.updateBettingEmbed();
    }

    // ─── Game loop ────────────────────────────────────────────
    async loop() {
        while (this.running) {
            this.round++;
            this.bets.clear();
            this.betMsgs = [];

            // Phase 1: Betting (30s)
            await this.showBettingPhase();
            await this.countdown(30);
            if (!this.running) break;

            // Xóa tin nhắn bet
            for (const m of this.betMsgs) m.delete().catch(() => {});
            this.betMsgs = [];

            if (this.bets.size === 0) {
                await this.mainMsg?.edit({ embeds: [this.makeEmbed(0x95A5A6, `🃏 Baccarat Live – Ván #${this.round}`, 'Không có người chơi nào đặt cược. Bắt đầu ván mới...', false)], components: [] }).catch(() => {});
                await this.sleep(3000);
                continue;
            }

            // Phase 2: Deal cards with animation
            const result = dealBaccarat();
            await this.animateDeal(result);

            // Phase 3: Payout
            await this.processPayouts(result);

            // Update road
            this.road.push(result.result);
            if (this.road.length > 20) this.road.shift();

            await this.sleep(6000);
        }
    }

    // ─── Betting Phase ────────────────────────────────────────
    async showBettingPhase() {
        const roadEmbed = this.buildRoadEmbed();
        const betEmbed = this.buildBettingEmbed(30);
        const row = this.betRow();
        if (this.mainMsg) {
            this.mainMsg = await this.mainMsg.edit({ embeds: [roadEmbed, betEmbed], components: [row] }).catch(() => null);
        }
        if (!this.mainMsg) {
            this.mainMsg = await this.channel.send({ embeds: [roadEmbed, betEmbed], components: [row] });
        }
    }

    async updateBettingEmbed() {
        if (!this.mainMsg) return;
        await this.mainMsg.edit({ embeds: [this.buildRoadEmbed(), this.buildBettingEmbed(null)], components: [this.betRow()] }).catch(() => {});
    }

    buildRoadEmbed() {
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle(`📊 Bảng Cầu Baccarat (${this.road.length} ván gần nhất)`)
            .setDescription(this.getRoad());
    }

    buildBettingEmbed(timeLeft) {
        const betterLines = [...this.bets.entries()].map(([uid, b]) =>
            `<@${uid}>: ${ROAD_ICON[b.side]} **${b.amount.toLocaleString()}**`
        );
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle(`🎴 BACCARAT LIVE — Ván #${this.round}`)
            .setDescription(
                timeLeft != null
                    ? `⏳ **Còn ${timeLeft} giây để đặt cược!**\n\nGõ: \`g!bet banker <tiền>\` | \`g!bet player <tiền>\` | \`g!bet tie <tiền>\``
                    : `⌛ Đang nhận cược... Còn ít giây!`
            )
            .addFields(
                { name: '💰 Tỉ lệ thưởng', value: '🔴 Banker: **0.95x** | 🔵 Player: **1x** | 🟢 Tie: **8x**', inline: false },
                { name: `👥 Người chơi (${this.bets.size})`, value: betterLines.length ? betterLines.join('\n') : '*Chưa có ai*', inline: false }
            )
            .setFooter({ text: 'Đặt cược qua lệnh g!bet hoặc nhấn nút bên dưới' });
    }

    betRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('livebacc_banker').setLabel('🔴 Banker').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('livebacc_player').setLabel('🔵 Player').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('livebacc_tie').setLabel('🟢 Tie').setStyle(ButtonStyle.Success)
        );
    }

    async countdown(seconds) {
        for (let s = seconds - 5; s > 0; s -= 5) {
            await this.sleep(5000);
            if (!this.running) return;
            await this.mainMsg?.edit({
                embeds: [this.buildRoadEmbed(), this.buildBettingEmbed(s)],
                components: [this.betRow()]
            }).catch(() => {});
        }
        await this.sleep(5000);
    }

    // ─── Card reveal animation ────────────────────────────────
    async animateDeal(r) {
        const step = async (pShown, bShown, title, color = 0xF39C12) => {
            const e = new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .addFields(
                    { name: `🔵 Player [${handTotal(pShown)}]`, value: pShown.map(fmt).join('  ') + (r.pCards.length > pShown.length ? '  🎴' : ''), inline: true },
                    { name: `🔴 Banker [${handTotal(bShown)}]`, value: bShown.map(fmt).join('  ') + (r.bCards.length > bShown.length ? '  🎴' : ''), inline: true }
                );
            await this.mainMsg?.edit({ embeds: [this.buildRoadEmbed(), e], components: [] }).catch(() => {});
        };

        await step([r.pCards[0]], [r.bCards[0]], '🎴 Đang chia bài...');
        await this.sleep(900);
        await step([r.pCards[0]], [r.bCards[0], r.bCards[1]], '🎴 Đang chia bài...');
        await this.sleep(900);
        await step([r.pCards[0], r.pCards[1]], [r.bCards[0], r.bCards[1]], '🎴 Đang chia bài...');
        await this.sleep(900);
        if (r.pCards[2]) {
            await step([r.pCards[0], r.pCards[1], r.pCards[2]], [r.bCards[0], r.bCards[1]], '🎴 Player rút thêm...');
            await this.sleep(900);
        }
        if (r.bCards[2]) {
            await step(r.pCards, [r.bCards[0], r.bCards[1], r.bCards[2]], '🎴 Banker rút thêm...');
            await this.sleep(900);
        }

        // Final result
        const RESULT_COLOR = { banker: 0xFF4444, player: 0x4488FF, tie: 0x44FF88 };
        const RESULT_LABEL = { banker: '🔴 BANKER THẮNG!', player: '🔵 PLAYER THẮNG!', tie: '🟢 HÒA!' };

        const winList = [], loseList = [];
        for (const [uid, b] of this.bets) {
            if (b.side === r.result) {
                let profit = b.side === 'banker' ? Math.floor(b.amount * 0.95) : b.side === 'tie' ? b.amount * 8 : b.amount;
                winList.push(`<@${uid}> +${profit.toLocaleString()} 🪙`);
            } else {
                loseList.push(`<@${uid}> -${b.amount.toLocaleString()} 🪙`);
            }
        }

        const newRoad = [...this.road, r.result];
        const roadStr = newRoad.slice(-20).map(x => ROAD_ICON[x]).join('');

        const finalEmbed = new EmbedBuilder()
            .setColor(RESULT_COLOR[r.result])
            .setTitle(`🎴 BACCARAT LIVE — Ván #${this.round} — ${RESULT_LABEL[r.result]}`)
            .addFields(
                { name: `🔵 Player [${r.pTotal}]`, value: r.pCards.map(fmt).join('  '), inline: true },
                { name: `🔴 Banker [${r.bTotal}]`, value: r.bCards.map(fmt).join('  '), inline: true }
            );
        if (winList.length) finalEmbed.addFields({ name: '🏆 Thắng', value: winList.join('\n'), inline: true });
        if (loseList.length) finalEmbed.addFields({ name: '💸 Thua', value: loseList.join('\n'), inline: true });
        finalEmbed.setFooter({ text: 'Ván tiếp theo bắt đầu sau 6 giây...' });

        // Update road immediately for the final embed
        await this.mainMsg?.edit({ embeds: [this.buildRoadEmbed(), finalEmbed], components: [] }).catch(() => {});
    }

    // ─── Payouts ─────────────────────────────────────────────
    async processPayouts(r) {
        for (const [uid, b] of this.bets) {
            if (b.side === r.result) {
                const profit = b.side === 'banker' ? Math.floor(b.amount * 0.95) : b.side === 'tie' ? b.amount * 8 : b.amount;
                await updateBalance(uid, b.amount + profit).catch(() => {});
            }
        }
    }

    // ─── Helpers ─────────────────────────────────────────────
    getRoad() {
        if (!this.road.length) return '*Chưa có kết quả*';
        return this.road.slice(-15).map(r => ROAD_ICON[r]).join('') + '\n' + this.road.slice(-15).map(r => ROAD_LABEL[r]).join(' ');
    }

    makeEmbed(color, title, desc, hasComponents) {
        return new EmbedBuilder().setColor(color).setTitle(title).setDescription(desc);
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { BaccaratLiveGame };
