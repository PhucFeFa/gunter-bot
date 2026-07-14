/**
 * baccaratLive.js
 * Game Baccarat Live – nhiều người chơi cùng lúc, chạy vòng lặp liên tục.
 * Fix: mainMsg không bị mất reference, countdown không race condition,
 *      road cập nhật đúng thứ tự, button không bị đơ.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, updateBalance } = require('../utils/economyDB');

// ─── Card helpers ─────────────────────────────────────────────
const SUITS = ['♠️', '♣️', '♥️', '♦️'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const drawCard = () => ({ rank: RANKS[Math.floor(Math.random() * RANKS.length)], suit: SUITS[Math.floor(Math.random() * SUITS.length)] });
const cardVal = r => (r === 'A' ? 1 : ['10', 'J', 'Q', 'K'].includes(r) ? 0 : parseInt(r));
const handTotal = cards => cards.reduce((s, c) => s + cardVal(c.rank), 0) % 10;
const fmt = c => `\`${c.rank}${c.suit}\``;

// ─── Baccarat standard deal ───────────────────────────────────
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

const ROAD_ICON = { banker: '🔴', player: '🔵', tie: '🟢' };
const ROAD_LABEL = { banker: 'B', player: 'P', tie: 'T' };
const RESULT_COLOR = { banker: 0xFF4444, player: 0x4488FF, tie: 0x44FF88 };
const RESULT_LABEL = { banker: '🔴 BANKER THẮNG!', player: '🔵 PLAYER THẮNG!', tie: '🟢 HÒA!' };

// ─── BaccaratLiveGame ────────────────────────────────────────
class BaccaratLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'baccarat';
        this.running = false;
        this.round = 0;
        this.road = [];        // Tối đa 15 kết quả
        this.bets = new Map(); // userId → { side, amount }
        this.betMsgs = [];        // Tin nhắn cược để xóa sau
        this.mainMsg = null;      // Embed chính (không đổi trong suốt game)
        this.timeLeft = 30;        // Giây còn lại phase betting
    }

    async start() { this.running = true; await this.loop(); }
    stop() { this.running = false; }

    async refundAll() {
        if (!this.bets || this.bets.size === 0) return;
        console.log(`[BACCARAT] Hoàn tiền cho ${this.bets.size} người chơi do sập/lag.`);
        const tasks = [];
        for (const [uid, b] of this.bets) {
            tasks.push(updateBalance(uid, b.amount).catch(() => {}));
        }
        await Promise.allSettled(tasks);
        this.bets.clear();
    }

    // ─── Đặt cược (từ prefix hoặc modal) ─────────────────────
    async placeBet(message, side, amount) {
        if (this.timeLeft <= 0)
            return this._reply(message, '❌ Hết thời gian đặt cược rồi! Đợi ván sau nhé.');

        if (!['banker', 'player'].includes(side))
            return this._reply(message, '❌ Cửa không hợp lệ! Dùng: `banker` hoặc `player`');

        const userData = await getUser(message.author.id);
        if (isNaN(amount) || amount <= 0)
            return this._reply(message, '❌ Số tiền không hợp lệ!');
        if (amount > userData.balance)
            return this._reply(message, `❌ Không đủ tiền! Bạn có **${userData.balance.toLocaleString()} 🪙**`);

        // Nếu đã cược ở round này → cập nhật
        if (this.bets.has(message.author.id)) {
            const old = this.bets.get(message.author.id);
            await updateBalance(message.author.id, old.amount); // hoàn tiền cũ
        }

        await updateBalance(message.author.id, -amount);
        this.bets.set(message.author.id, { side, amount });

        const label = { banker: '🔴 Banker', player: '🔵 Player' }[side];
        const confirmMsg = await message.reply(`✅ **${message.author.username}** đặt **${amount.toLocaleString()} 🪙** vào ${label}!`);
        this.betMsgs.push(message, confirmMsg);

        // Update embed ngay (không block game loop)
        this._editMain(this._buildRoadEmbed(), this._buildBettingEmbed(), this._betRow());
    }

    // ─── Game loop ────────────────────────────────────────────
    async loop() {
        // Gửi tin nhắn chính một lần duy nhất
        this.mainMsg = await this.channel.send({
            embeds: [this._buildRoadEmbed(), this._buildBettingEmbed()],
            components: [this._betRow()]
        });

        while (this.running) {
            this.round++;
            // Xóa tin nhắn bet thừa từ ván trước (nếu có)
            for (const m of this.betMsgs) {
                if (m && typeof m.delete === 'function') m.delete().catch(() => { });
            }
            this.bets.clear();
            this.betMsgs = [];
            this.timeLeft = 30;

            // Phase 1: Betting countdown (30s)
            await this._editMain(this._buildRoadEmbed(), this._buildBettingEmbed(), this._betRow());
            await this._countdown(30);
            if (!this.running) break;

            // Xóa tin nhắn bet cũ
            for (const m of this.betMsgs) {
                if (m && typeof m.delete === 'function') m.delete().catch(() => { });
            }
            this.betMsgs = [];
            // Xóa tất cả tin nhắn user trong kênh (bulk purge)
            await this._purgeUserMessages();

            // Phase 2: Chia bài + animation
            const result = dealBaccarat();
            await this._animateDeal(result);

            // Phase 3: Trả tiền
            await this._processPayouts(result);

            // Cập nhật road SAU khi đã trả tiền (đã push trong animateDeal)
            await this.sleep(6000);
        }
    }

    // ─── Countdown betting ────────────────────────────────────
    async _countdown(seconds) {
        this.timeLeft = seconds;
        const ticks = Math.floor(seconds / 5);
        for (let i = 0; i < ticks; i++) {
            await this.sleep(5000);
            if (!this.running) return;
            this.timeLeft = seconds - (i + 1) * 5;
            // Chỉ update embed nếu không bị occupied bởi animation
            await this._editMain(this._buildRoadEmbed(), this._buildBettingEmbed(), this._betRow());
        }
    }

    // ─── Animation chia bài ──────────────────────────────────
    async _animateDeal(r) {
        const step = async (pShown, bShown, title, color = 0xF39C12) => {
            const e = new EmbedBuilder().setColor(color).setTitle(title).addFields(
                { name: `🔵 Player [${handTotal(pShown)}]`, value: pShown.map(fmt).join('  ') + (r.pCards.length > pShown.length ? '  🎴' : ''), inline: true },
                { name: `🔴 Banker [${handTotal(bShown)}]`, value: bShown.map(fmt).join('  ') + (r.bCards.length > bShown.length ? '  🎴' : ''), inline: true }
            );
            await this._editMain(this._buildRoadEmbed(), e);
        };

        await step([r.pCards[0]], [r.bCards[0]], '🎴 Đang chia bài...');
        await this.sleep(850);
        await step([r.pCards[0]], [r.bCards[0], r.bCards[1]], '🎴 Đang chia bài...');
        await this.sleep(850);
        await step([r.pCards[0], r.pCards[1]], [r.bCards[0], r.bCards[1]], '🎴 Đang chia bài...');
        await this.sleep(850);
        if (r.pCards[2]) {
            await step(r.pCards, [r.bCards[0], r.bCards[1]], '🎴 Player rút thêm bài...');
            await this.sleep(850);
        }
        if (r.bCards[2]) {
            await step(r.pCards, r.bCards, '🎴 Banker rút thêm bài...');
            await this.sleep(850);
        }

        // Push road trước khi show kết quả
        this.road.push(r.result);
        if (this.road.length > 15) this.road.shift();

        // Win/lose list
        const winList = [], loseList = [], tieRefundList = [];
        for (const [uid, b] of this.bets) {
            if (r.result === 'tie') {
                tieRefundList.push(`<@${uid}> Hoàn về ${b.amount.toLocaleString()} 🪙`);
            } else if (b.side === r.result) {
                const profit = b.side === 'banker' ? Math.floor(b.amount * 0.95) : b.amount;
                winList.push(`<@${uid}> +${profit.toLocaleString()} 🪙`);
            } else {
                loseList.push(`<@${uid}> -${b.amount.toLocaleString()} 🪙`);
            }
        }

        const finalEmbed = new EmbedBuilder()
            .setColor(RESULT_COLOR[r.result])
            .setTitle(`🎴 BACCARAT LIVE — ${RESULT_LABEL[r.result]}`)
            .addFields(
                { name: `🔵 Player [${r.pTotal}]`, value: r.pCards.map(fmt).join('  '), inline: true },
                { name: `🔴 Banker [${r.bTotal}]`, value: r.bCards.map(fmt).join('  '), inline: true }
            );
        if (winList.length) finalEmbed.addFields({ name: '🏆 Thắng', value: winList.join('\n'), inline: false });
        if (loseList.length) finalEmbed.addFields({ name: '💸 Thua', value: loseList.join('\n'), inline: false });
        if (tieRefundList.length) finalEmbed.addFields({ name: '🔄 Hoàn Tiền (Hòa)', value: tieRefundList.join('\n'), inline: false });
        finalEmbed.setFooter({ text: 'Ván tiếp theo bắt đầu sau 6 giây...' });

        // Show kết quả với bảng cầu đã cập nhật
        await this._editMain(this._buildRoadEmbed(), finalEmbed);
    }

    // ─── Payouts ─────────────────────────────────────────────
    async _processPayouts(r) {
        const tasks = [];
        for (const [uid, b] of this.bets) {
            if (r.result === 'tie') {
                // Hòa thì hoàn lại tiền đã đặt
                tasks.push(updateBalance(uid, b.amount).catch(() => { }));
            } else if (b.side === r.result) {
                const profit = b.side === 'banker' ? Math.floor(b.amount * 0.95) : b.amount;
                tasks.push(updateBalance(uid, b.amount + profit).catch(() => { }));
            }
        }
        await Promise.all(tasks);
    }

    // ─── Embed builders ───────────────────────────────────────
    _buildRoadEmbed() {
        const roadStr = this.road.length
            ? this.road.slice(-15).map(r => ROAD_ICON[r]).join('')
            : '*Chưa có kết quả*';
        const num = Math.min(this.road.length, 15);
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle(`📊 Bảng Cầu Baccarat (${num} ván gần nhất)`)
            .setDescription(roadStr);
    }

    _buildBettingEmbed() {
        const betterLines = [...this.bets.entries()].map(([uid, b]) =>
            `<@${uid}>: ${ROAD_ICON[b.side]} **${b.amount.toLocaleString()}**`
        );
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle('🎴 BACCARAT LIVE')
            .setDescription(
                this.timeLeft > 0
                    ? `⏳ **Còn ${this.timeLeft} giây để đặt cược!**\n\nGõ: \`g!bet banker <tiền>\` | \`g!bet player <tiền>\`\n*(Nếu Hòa sẽ được hoàn trả tiền cược)*`
                    : `⌛ Hết giờ đặt cược!`
            )
            .addFields(
                { name: '💰 Tỉ lệ thưởng', value: '🔴 Banker: **0.95x** | 🔵 Player: **1x**', inline: false },
                { name: `👥 Người chơi (${this.bets.size})`, value: betterLines.length ? betterLines.join('\n') : '*Chưa có ai*', inline: false }
            )
            .setFooter({ text: 'Đặt cược qua lệnh g!bet hoặc nhấn nút bên dưới' });
    }

    _betRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('livebacc_banker').setLabel('🔴 Banker').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('livebacc_player').setLabel('🔵 Player').setStyle(ButtonStyle.Primary)
        );
    }

    // ─── Edit mainMsg an toàn ─────────────────────────────────
    async _editMain(embed1, embed2, row = null) {
        if (!this.mainMsg) return;
        const payload = { embeds: row ? [embed1, embed2] : [embed1, embed2], components: row ? [row] : [] };
        await this.mainMsg.edit(payload).catch(async (err) => {
            // Nếu tin nhắn bị xóa → gửi mới
            if (err.code === 10008) {
                this.mainMsg = await this.channel.send(payload).catch(() => null);
            }
        });
    }

    // ─── Purge user messages in channel ─────────────────────
    async _purgeUserMessages() {
        try {
            const msgs = await this.channel.messages.fetch({ limit: 50, cache: false });
            const toDelete = msgs.filter(m => !m.author.bot && Date.now() - m.createdTimestamp < 1296000000);
            if (toDelete.size > 0) {
                await this.channel.bulkDelete(toDelete, true).catch(() => {});
            }
        } catch (err) {
            // Ignore permission errors
        }
    }

    // ─── Reply helper (auto delete 5s) ────────────────────────
    async _reply(message, content) {
        const m = await message.reply(content);
        setTimeout(() => { if (m && typeof m.delete === 'function') m.delete().catch(() => { }) }, 5000);
        return m;
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { BaccaratLiveGame };
