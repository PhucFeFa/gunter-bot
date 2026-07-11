/**
 * aviatorLive.js
 * Game Aviator Live – nhiều người chơi cùng lúc, chạy vòng lặp liên tục.
 * House edge: ~12% (crash sớm hơn về mặt xác suất).
 * Animation giữ nguyên phong cách "không gian" từ phiên bản cũ.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getUser, updateBalance } = require('../utils/economyDB');

// ─── Crash point generator (house edge ~12%) ─────────────────
function generateCrashPoint() {
    if (Math.random() < 0.12) return 1.0; // 12% tức thì nổ
    const p = Math.random();
    const cp = Math.max(1.01, 0.88 / (1 - p));
    return Math.min(cp, 200); // Hard cap 200x
}

// ─── Space animation helpers (giữ nguyên từ aviator cũ) ──────
function generateEnvironment(mult, crashed) {
    let pool = ['☁️'];
    if (mult >= 2 && mult < 5)  pool = ['☁️', '🌙'];
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
        this.cashedOut = new Map(); // userId → { amount, mult }
        this.betMsgs = [];
        this.mainMsg = null;
        this.currentMult = 1.0;
        this.crashPoint = 1.0;
        this.phase = 'idle';    // 'betting' | 'flying' | 'crashed'
    }

    // ─── Public API ───
    async start() {
        this.running = true;
        await this.loop();
    }

    stop() { this.running = false; }

    /** Đặt cược – gọi từ messageCreate (g!bet <tiền>) */
    async placeBet(message, amount) {
        if (this.phase !== 'betting') return message.reply('⛔ Ván đang bay! Chờ ván mới để đặt cược.').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        if (this.bets.has(message.author.id)) return message.reply('⛔ Bạn đã đặt cược rồi!').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        const userData = await getUser(message.author.id);
        const usable = Math.max(0, userData.balance - (userData.loanAmount || 0));
        if (isNaN(amount) || amount <= 0) return message.reply('❌ Số tiền không hợp lệ!').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        if (amount > usable) return message.reply(`❌ Bạn chỉ có **${usable.toLocaleString()} 🪙** có thể dùng!`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));

        await updateBalance(message.author.id, -amount);
        this.bets.set(message.author.id, amount);

        const confirm = await message.reply(`✅ **${message.author.username}** đã bet **${amount.toLocaleString()} 🪙** — Nhớ bấm 💰 Rút trước khi nổ!`);
        this.betMsgs.push(message, confirm);
        await this.updateBettingEmbed();
    }

    /** Cashout – gọi từ button interaction */
    async cashout(userId, username) {
        if (this.phase !== 'flying') return null;
        if (!this.bets.has(userId)) return null;
        if (this.cashedOut.has(userId)) return null;

        const amount = this.bets.get(userId);
        const mult = this.currentMult;
        const winAmount = Math.floor(amount * mult);
        await updateBalance(userId, winAmount).catch(() => {});
        this.cashedOut.set(userId, { amount, mult, winAmount });
        return { amount, mult, winAmount };
    }

    // ─── Game loop ────────────────────────────────────────────
    async loop() {
        while (this.running) {
            this.round++;
            this.bets.clear();
            this.cashedOut.clear();
            this.betMsgs = [];
            this.currentMult = 1.0;
            this.crashPoint = generateCrashPoint();
            this.phase = 'betting';

            // Phase 1: Betting (30s)
            await this.showBettingPhase();
            await this.countdown(30);
            if (!this.running) break;

            // Xóa tin nhắn bet
            for (const m of this.betMsgs) m.delete().catch(() => {});
            this.betMsgs = [];

            // Phase 2: Flight
            this.phase = 'flying';
            await this.showFlyingPhase();

            // Phase 3: Crashed — xử lý người chưa rút
            this.phase = 'crashed';
            await this.showCrashedPhase();

            // Cập nhật history
            this.history.push(this.crashPoint.toFixed(2) + 'x');
            if (this.history.length > 15) this.history.shift();

            await this.sleep(5000);
        }
    }

    // ─── Betting Phase ────────────────────────────────────────
    async showBettingPhase() {
        const embed = this.buildBettingEmbed(30);
        const row = this.betRow();
        if (this.mainMsg) {
            this.mainMsg = await this.mainMsg.edit({ embeds: [embed], components: [row] }).catch(() => null);
        }
        if (!this.mainMsg) {
            this.mainMsg = await this.channel.send({ embeds: [embed], components: [row] });
        }
    }

    async countdown(seconds) {
        for (let s = seconds - 5; s > 0; s -= 5) {
            await this.sleep(5000);
            if (!this.running) return;
            await this.mainMsg?.edit({ embeds: [this.buildBettingEmbed(s)], components: [this.betRow()] }).catch(() => {});
        }
        await this.sleep(5000);
    }

    buildBettingEmbed(timeLeft) {
        const betLines = [...this.bets.entries()].map(([uid, amt]) => `<@${uid}> — **${amt.toLocaleString()} 🪙**`);
        return new EmbedBuilder()
            .setColor(0x1A1A2E)
            .setTitle(`🚀 AVIATOR LIVE — Ván #${this.round}`)
            .setDescription(`⏳ **Còn ${timeLeft} giây để đặt cược!**\n\nGõ: \`g!bet <số tiền>\` để đặt cược\nNhớ bấm **💰 Rút** trước khi nổ!`)
            .addFields(
                { name: '📈 Lịch sử các ván (gần nhất)', value: this.getHistory(), inline: false },
                { name: `👥 Người chơi (${this.bets.size})`, value: betLines.length ? betLines.join('\n') : '*Chưa có ai*', inline: false }
            )
            .setFooter({ text: 'Nhấn nút hoặc gõ lệnh để đặt cược' });
    }

    betRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('liveaviator_bet').setLabel('🎰 Đặt cược (nhập số)').setStyle(ButtonStyle.Primary)
        );
    }

    // ─── Flying Phase ─────────────────────────────────────────
    async showFlyingPhase() {
        // Build cashout row (collector trên mainMsg sẽ bắt interaction)
        const cashoutRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('liveaviator_cashout').setLabel('💰 Rút tiền ngay!').setStyle(ButtonStyle.Success)
        );

        // Gắn collector để bắt nút cashout trong ván này
        const collector = this.mainMsg?.createMessageComponentCollector({
            componentType: ComponentType.Button,
            time: 120_000,
            filter: i => i.customId === 'liveaviator_cashout' && this.bets.has(i.user.id) && !this.cashedOut.has(i.user.id)
        });

        collector?.on('collect', async (i) => {
            const result = await this.cashout(i.user.id, i.user.username);
            if (result) {
                await i.reply({ content: `💵 **${i.user.username}** đã rút tại **${result.mult.toFixed(2)}x** — nhận **${result.winAmount.toLocaleString()} 🪙**!`, ephemeral: false }).catch(() => {});
            } else {
                await i.reply({ content: '❌ Không thể rút!', ephemeral: true }).catch(() => {});
            }
        });

        // Animation loop
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
                .setTitle(`🚀 AVIATOR LIVE — Ván #${this.round} — ${this.currentMult.toFixed(2)}x`)
                .setDescription(`${env}`)
                .addFields({ name: '💰 Lãi dự kiến (chưa rút)', value: profitLines || '*Không có ai*', inline: false });

            await this.mainMsg?.edit({ embeds: [embed], components: [cashoutRow] }).catch(() => {});
        }

        collector?.stop();
    }

    // ─── Crashed Phase ────────────────────────────────────────
    async showCrashedPhase() {
        // Trả tiền cho người đã kịp rút
        // (đã xử lý trong cashout())

        // Những người không rút được → mất tiền (đã trừ lúc bet)
        const loseList = [...this.bets.entries()]
            .filter(([uid]) => !this.cashedOut.has(uid))
            .map(([uid, amt]) => `<@${uid}> -${amt.toLocaleString()} 🪙`);

        const winList = [...this.cashedOut.entries()]
            .map(([uid, d]) => `<@${uid}> +${d.winAmount.toLocaleString()} 🪙 @ ${d.mult.toFixed(2)}x`);

        const env = generateEnvironment(this.currentMult, true);

        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`💥 AVIATOR LIVE — Ván #${this.round} — NỔ TẠI ${this.crashPoint.toFixed(2)}x!`)
            .setDescription(env)
            .addFields(
                { name: '📈 Crash tại', value: `**${this.crashPoint.toFixed(2)}x**`, inline: true }
            );

        if (winList.length) embed.addFields({ name: '🏆 Đã rút kịp', value: winList.join('\n'), inline: false });
        if (loseList.length) embed.addFields({ name: '💸 Bốc hơi', value: loseList.join('\n'), inline: false });
        embed.setFooter({ text: 'Ván tiếp theo bắt đầu sau 5 giây...' });

        await this.mainMsg?.edit({ embeds: [embed], components: [] }).catch(() => {});
    }

    // ─── Helpers ─────────────────────────────────────────────
    getHistory() {
        if (!this.history.length) return '*Chưa có ván nào*';
        return this.history.map(h => {
            const v = parseFloat(h);
            return v < 1.5 ? `🔴\`${h}\`` : v < 3 ? `🟡\`${h}\`` : `🟢\`${h}\``;
        }).join(' ');
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { AviatorLiveGame };
