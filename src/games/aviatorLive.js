/**
 * aviatorLive.js
 * Game Aviator Live – nhiều người chơi cùng lúc, chạy vòng lặp liên tục.
 * Fix: mainMsg reference an toàn, countdown tuần tự.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../utils/economyDB');

// ─── Crash point generator (house edge ~12%) ─────────────────
function generateCrashPoint() {
    if (Math.random() < 0.12) return 1.0;
    const p = Math.random();
    const cp = Math.max(1.01, 0.88 / (1 - p));
    return Math.min(cp, 200);
}

// ─── Space animation helpers ─────────────────────────────────
function generateEnvironment(mult, crashed) {
    let pool = ['☁️'];
    if (mult >= 2 && mult < 5) pool = ['☁️', '🌙'];
    else if (mult >= 5 && mult < 10) pool = ['⭐', '🌙', '✨'];
    else if (mult >= 10) pool = ['🪐', '⭐', '✨', '☄️'];

    const obj = (p) => Math.random() < p ? pool[Math.floor(Math.random() * pool.length)] : '\u2003\u2003';
    const ship = crashed ? '💥' : '🚀';

    return `\u2003${obj(0.4)}\u2003\u2003\u2003\u2003${obj(0.3)}\u2003\n${obj(0.3)}\u2003\u2003${ship}\u2003\u2003${obj(0.4)}\n\u2003\u2003\u2003${obj(0.3)}\u2003\u2003\u2003\u2003${obj(0.4)}`;
}

// ─── AviatorLiveGame class ────────────────────────────────────
class AviatorLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'aviator';
        this.running = false;
        this.round = 0;
        this.history = [];      // Crash points gần nhất (tối đa 15)
        this.bets = new Map();  // userId → amount
        this.cashedOut = new Map(); // userId → { amount, mult, winAmount }
        this.betMsgs = [];
        this.cashoutMsgs = [];
        this.mainMsg = null;
        this.currentMult = 1.0;
        this.crashPoint = 1.0;
        this.phase = 'idle';    // 'betting' | 'flying' | 'crashed'
        this.timeLeft = 30;
    }

    async start() { this.running = true; await this.loop(); }
    stop() { this.running = false; }

    async refundAll() {
        if (!this.bets || this.bets.size === 0) return;
        console.log(`[AVIATOR] Hoàn tiền cho người chơi do sập/lag.`);
        const tasks = [];
        for (const [uid, amount] of this.bets) {
            if (!this.cashedOut.has(uid)) {
                tasks.push(updateBalance(uid, amount).catch(() => {}));
            }
        }
        await Promise.allSettled(tasks);
        this.bets.clear();
    }

    /** Đặt cược – gọi từ messageCreate (g!bet <tiền>) hoặc modal */
    async placeBet(message, amount) {
        if (this.phase !== 'betting') return this._reply(message, '⛔ Ván đang bay! Chờ ván mới để đặt cược.');
        if (this.bets.has(message.author.id)) return this._reply(message, '⛔ Bạn đã đặt cược rồi!');

        const userData = await getUser(message.author.id);
        const usable = userData.balance;
        if (isNaN(amount) || amount <= 0) return this._reply(message, '❌ Số tiền không hợp lệ!');
        if (amount > usable) return this._reply(message, `❌ Bạn chỉ có **${usable.toLocaleString()} 🪙** có thể dùng!`);

        await updateBalance(message.author.id, -amount);
        this.bets.set(message.author.id, amount);

        const confirm = await message.reply(`✅ **${message.author.username}** đã bet **${amount.toLocaleString()} 🪙** — Nhớ bấm 💰 Rút trước khi nổ!`);
        this.betMsgs.push(message, confirm);

        await this._editMain(this._buildHistoryEmbed(), this._buildBettingEmbed(), this._betRow());
    }

    /** Cashout – gọi từ button interaction */
    async cashout(userId, username) {
        if (this.phase !== 'flying') return null;
        if (!this.bets.has(userId)) return null;
        if (this.cashedOut.has(userId)) return null;

        const amount = this.bets.get(userId);
        const mult = this.currentMult;
        const winAmount = Math.floor(amount * mult);
        await updateBalance(userId, winAmount).catch(() => { });
        this.cashedOut.set(userId, { amount, mult, winAmount });
        return { amount, mult, winAmount };
    }

    // ─── Game loop ────────────────────────────────────────────
    async loop() {
        this.mainMsg = await this.channel.send({
            embeds: [this._buildHistoryEmbed(), this._buildBettingEmbed()],
            components: [this._betRow()]
        });

        const collector = this.mainMsg.createMessageComponentCollector({ componentType: ComponentType.Button });
        collector.on('collect', async (i) => {
            if (i.customId === 'liveaviator_bet') {
                return i.reply({ content: 'Vui lòng gõ `g!bet <số tiền>` để đặt cược!', flags: 64 });
            }
            const result = await this.cashout(i.user.id, i.user.username);
            if (result) {
                await i.reply({ content: `💵 **${i.user.username}** đã rút tại **${result.mult.toFixed(2)}x** — nhận **${result.winAmount.toLocaleString()} 🪙**!`, ephemeral: false }).catch(() => null);
                this.cashoutMsgs.push(i);
            } else {
                await i.reply({ content: '❌ Không thể rút!', flags: 64 }).catch(() => {});
            }
        });

        while (this.running) {
            this.round++;
            this.bets.clear();
            this.cashedOut.clear();
            this.betMsgs = [];
            
            if (this.cashoutMsgs) {
                for (const inter of this.cashoutMsgs) {
                    if (inter && typeof inter.deleteReply === 'function') inter.deleteReply().catch(() => {});
                }
            }
            this.cashoutMsgs = [];

            this.currentMult = 1.0;
            this.crashPoint = generateCrashPoint();
            this.phase = 'betting';
            this.timeLeft = 30;

            // Phase 1: Betting countdown (30s)
            await this._editMain(this._buildHistoryEmbed(), this._buildBettingEmbed(), this._betRow());
            await this._countdown(30);
            if (!this.running) break;

            // Xóa tin nhắn bet cũ
            for (const inter of this.betMsgs) {
                if (inter && typeof inter.deleteReply === 'function') {
                    inter.deleteReply().catch(() => {});
                } else if (inter && typeof inter.delete === 'function') {
                    inter.delete().catch(() => {});
                }
            }
            this.betMsgs = [];
            // Xóa tất cả tin nhắn user trong kênh (bulk purge)
            await this._purgeUserMessages();

            // Phase 2: Flight
            this.phase = 'flying';
            await this._showFlyingPhase();

            // Phase 3: Crashed
            this.phase = 'crashed';
            await this._showCrashedPhase();

            await this.sleep(5000);
        }
    }

    // ─── Phase handlers ───────────────────────────────────────
    async _countdown(seconds) {
        this.timeLeft = seconds;
        const ticks = Math.floor(seconds / 5);
        for (let i = 0; i < ticks; i++) {
            await this.sleep(5000);
            if (!this.running) return;
            this.timeLeft = seconds - (i + 1) * 5;
            await this._editMain(this._buildHistoryEmbed(), this._buildBettingEmbed(), this._betRow());
        }
    }

    async _showFlyingPhase() {
        const cashoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('liveaviator_cashout').setLabel('💰 Rút tiền ngay!').setStyle(ButtonStyle.Success)
        );

        while (this.currentMult < this.crashPoint && this.running) {
            await this.sleep(1200);
            if (!this.running) break;

            this.currentMult += 0.08 * Math.sqrt(this.currentMult);
            if (this.currentMult >= this.crashPoint) { this.currentMult = this.crashPoint; break; }

            const env = generateEnvironment(this.currentMult, false);
            const profitLines = [...this.bets.entries()]
                .filter(([uid]) => !this.cashedOut.has(uid))
                .map(([uid, amt]) => `<@${uid}>: **${Math.floor(amt * this.currentMult).toLocaleString()} 🪙**`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`🚀 AVIATOR LIVE — ${this.currentMult.toFixed(2)}x`)
                .setDescription(`${env}`)
                .addFields({ name: '💰 Lãi dự kiến (chưa rút)', value: profitLines || '*Không có ai*', inline: false });

            await this._editMain(this._buildHistoryEmbed(), embed, cashoutRow);
        }
    }

    async _showCrashedPhase() {
        const loseList = [...this.bets.entries()]
            .filter(([uid]) => !this.cashedOut.has(uid))
            .map(([uid, amt]) => `<@${uid}> -${amt.toLocaleString()} 🪙`);

        const winList = [...this.cashedOut.entries()]
            .map(([uid, d]) => `<@${uid}> +${d.winAmount.toLocaleString()} 🪙 @ ${d.mult.toFixed(2)}x`);

        const env = generateEnvironment(this.currentMult, true);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`💥 AVIATOR LIVE — NỔ TẠI ${this.crashPoint.toFixed(2)}x!`)
            .setDescription(env)
            .addFields(
                { name: '📈 Crash tại', value: `**${this.crashPoint.toFixed(2)}x**`, inline: true }
            );

        if (winList.length) embed.addFields({ name: '🏆 Đã rút kịp', value: winList.join('\n'), inline: false });
        if (loseList.length) embed.addFields({ name: '💸 Bốc hơi', value: loseList.join('\n'), inline: false });
        embed.setFooter({ text: 'Ván tiếp theo bắt đầu sau 5 giây...' });

        this.history.push(this.crashPoint.toFixed(2) + 'x');
        if (this.history.length > 15) this.history.shift();

        await this._editMain(this._buildHistoryEmbed(), embed);
    }

    // ─── Embed builders ───────────────────────────────────────
    _buildHistoryEmbed() {
        const histStr = this.history.length
            ? this.history.map(h => {
                const v = parseFloat(h);
                return v < 1.5 ? `🔴\`${h}\`` : v < 3 ? `🟡\`${h}\`` : `🟢\`${h}\``;
            }).join(' ')
            : '*Chưa có ván nào*';
        return new EmbedBuilder()
            .setColor(0x1A1A2E)
            .setTitle(`📈 Lịch sử Aviator (${this.history.length} ván gần nhất)`)
            .setDescription(histStr);
    }

    _buildBettingEmbed() {
        const betLines = [...this.bets.entries()].map(([uid, amt]) => `<@${uid}> — **${amt.toLocaleString()} 🪙**`);
        return new EmbedBuilder()
            .setColor(0x1A1A2E)
            .setTitle('🚀 AVIATOR LIVE')
            .setDescription(
                this.timeLeft > 0
                    ? `⏳ **Còn ${this.timeLeft} giây để đặt cược!**\n\nGõ: \`g!bet <số tiền>\` để đặt cược\nNhớ bấm **💰 Rút** trước khi nổ!`
                    : `⌛ Hết giờ đặt cược!`
            )
            .addFields(
                { name: `👥 Người chơi (${this.bets.size})`, value: betLines.length ? betLines.join('\n') : '*Chưa có ai*', inline: false }
            )
            .setFooter({ text: 'Nhấn nút hoặc gõ lệnh để đặt cược' });
    }

    _betRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('liveaviator_bet').setLabel('🎰 Đặt cược (nhập số)').setStyle(ButtonStyle.Primary)
        );
    }

    // ─── Edit mainMsg an toàn ─────────────────────────────────
    async _editMain(embed1, embed2, row = null) {
        if (!this.mainMsg) return;
        const payload = { embeds: row ? [embed1, embed2] : [embed1, embed2], components: row ? [row] : [] };
        await this.mainMsg.edit(payload).catch(async (err) => {
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

    async _reply(message, content) {
        const m = await message.reply(content);
        setTimeout(() => { if (m && typeof m.delete === 'function') m.delete().catch(() => { }) }, 5000);
        return m;
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { AviatorLiveGame };
