/**
 * taixiuLive.js
 * Game Tài Xỉu Live – nhiều người chơi cùng lúc, chạy vòng lặp liên tục.
 * Lắc xúc xắc với spoiler để tăng kịch tính.
 */

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getUser, updateBalance } = require('../utils/economyDB');

// ─── Helpers ─────────────────────────────────────────────
const rollDice = () => Math.floor(Math.random() * 6) + 1;
const DICE_EMOJI = { 1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣', 6: '6️⃣' };

const ROAD_ICON = { tai: '⚫', xiu: '⚪' };
const ROAD_LABEL = { tai: 'T', xiu: 'X' };
const RESULT_COLOR = { tai: 0x000000, xiu: 0xFFFFFF };

// ─── TaixiuLiveGame ────────────────────────────────────────
class TaixiuLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'taixiu';
        this.running = false;
        this.round = 0;
        this.road = [];        // Tối đa 15 kết quả
        this.bets = new Map(); // userId → { side, amount }
        this.betMsgs = [];     // Tin nhắn cược để xóa sau
        this.mainMsg = null;   // Embed chính
        this.timeLeft = 30;    // Giây còn lại phase betting
    }

    async start() { this.running = true; await this.loop(); }
    stop() { this.running = false; }

    async refundAll() {
        if (!this.bets || this.bets.size === 0) return;
        console.log(`[TAIXIU] Hoàn tiền cho ${this.bets.size} người chơi do sập/lag.`);
        const tasks = [];
        for (const [uid, b] of this.bets) {
            tasks.push(updateBalance(uid, b.amount).catch(() => {}));
        }
        await Promise.allSettled(tasks);
        this.bets.clear();
    }

    // ─── Đặt cược (từ prefix) ─────────────────────
    async placeBet(message, side, amount) {
        if (this.timeLeft <= 0)
            return this._reply(message, '❌ Hết thời gian đặt cược rồi! Đợi ván sau nhé.');

        if (!['tai', 'xiu'].includes(side))
            return this._reply(message, '❌ Cửa không hợp lệ! Dùng: `tai` hoặc `xiu`');

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

        const label = { tai: '⚫ TÀI', xiu: '⚪ XỈU' }[side];
        const confirmMsg = await message.reply(`✅ **${message.author.username}** đặt **${amount.toLocaleString()} 🪙** vào ${label}!`);
        this.betMsgs.push(message, confirmMsg);

        // Update embed ngay
        this._editMain(this._buildRoadEmbed(), this._buildBettingEmbed(), this._betRow());
    }

    // ─── Game loop ────────────────────────────────────────────
    async loop() {
        this.mainMsg = await this.channel.send({
            embeds: [this._buildRoadEmbed(), this._buildBettingEmbed()],
            components: [this._betRow()]
        });

        while (this.running) {
            this.round++;
            // Xóa tin nhắn bet thừa từ ván trước
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

            // Phase 2: Lắc xí ngầu (Animation ngắn)
            await this._editMain(this._buildRoadEmbed(), new EmbedBuilder().setColor(0xF39C12).setTitle('🎲 Đang lắc xí ngầu...'));
            await this.sleep(2000); // Lắc trong 2 giây

            // Sinh kết quả
            const d1 = rollDice();
            const d2 = rollDice();
            const d3 = rollDice();
            const total = d1 + d2 + d3;
            const result = (total >= 11 && total <= 17) ? 'tai' : 'xiu';

            // Phase 3: Hiển thị Spoiler cho người chơi nặn trong 10 giây
            const revealEmbed = new EmbedBuilder()
                .setColor(0x9B59B6)
                .setTitle('🤫 Xí ngầu đã đổ!')
                .setDescription(`Nhấn vào để xem kết quả (Hồi hộp xíu nào):\n\n||${DICE_EMOJI[d1]}|| - ||${DICE_EMOJI[d2]}|| - ||${DICE_EMOJI[d3]}||`)
                .setFooter({ text: 'Sẽ công bố kết quả sau 10 giây...' });

            await this._editMain(this._buildRoadEmbed(), revealEmbed);
            await this.sleep(10000); // Chờ 10 giây nặn
            
            if (!this.running) break;

            // Xóa tất cả tin nhắn user trong kênh (bulk purge) trước khi ra kết quả chính thức
            for (const m of this.betMsgs) {
                if (m && typeof m.delete === 'function') m.delete().catch(() => { });
            }
            this.betMsgs = [];
            await this._purgeUserMessages();

            // Push road
            this.road.push(result);
            if (this.road.length > 15) this.road.shift();

            // Phase 4: Trả tiền & Show kết quả
            const winList = [], loseList = [];
            const tasks = [];
            for (const [uid, b] of this.bets) {
                if (b.side === result) {
                    const profit = b.amount; // Tỉ lệ 1:1
                    tasks.push(updateBalance(uid, b.amount + profit).catch(() => { }));
                    winList.push(`<@${uid}> +${profit.toLocaleString()} 🪙`);
                } else {
                    loseList.push(`<@${uid}> -${b.amount.toLocaleString()} 🪙`);
                }
            }
            await Promise.all(tasks);

            const resultLabel = result === 'tai' ? '⚫ TÀI' : '⚪ XỈU';
            const finalEmbed = new EmbedBuilder()
                .setColor(RESULT_COLOR[result])
                .setTitle(`🎲 KẾT QUẢ: ${DICE_EMOJI[d1]} ${DICE_EMOJI[d2]} ${DICE_EMOJI[d3]} => ${total} (${resultLabel})`);
                
            if (winList.length) finalEmbed.addFields({ name: '🏆 Thắng', value: winList.join('\n'), inline: false });
            if (loseList.length) finalEmbed.addFields({ name: '💸 Thua', value: loseList.join('\n'), inline: false });
            finalEmbed.setFooter({ text: 'Ván tiếp theo bắt đầu sau 6 giây...' });

            await this._editMain(this._buildRoadEmbed(), finalEmbed);
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
            await this._editMain(this._buildRoadEmbed(), this._buildBettingEmbed(), this._betRow());
        }
    }

    // ─── Embed builders ───────────────────────────────────────
    _buildRoadEmbed() {
        const roadStr = this.road.length
            ? this.road.slice(-15).map(r => ROAD_ICON[r]).join('')
            : '*Chưa có kết quả*';
        const num = Math.min(this.road.length, 15);
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle(`📊 Bảng Cầu Tài Xỉu (${num} ván gần nhất)`)
            .setDescription(roadStr);
    }

    _buildBettingEmbed() {
        const betterLines = [...this.bets.entries()].map(([uid, b]) =>
            `<@${uid}>: ${ROAD_ICON[b.side]} **${b.amount.toLocaleString()}**`
        );
        return new EmbedBuilder()
            .setColor(0x2C3E50)
            .setTitle('🎲 TÀI XỈU LIVE')
            .setDescription(
                this.timeLeft > 0
                    ? `⏳ **Còn ${this.timeLeft} giây để đặt cược!**\n\nGõ: \`g!bet tai <tiền>\` | \`g!bet xiu <tiền>\``
                    : `⌛ Hết giờ đặt cược!`
            )
            .addFields(
                { name: '💰 Tỉ lệ thưởng', value: '⚫ Tài (11-17): **1x** | ⚪ Xỉu (3-10): **1x**', inline: false },
                { name: `👥 Người chơi (${this.bets.size})`, value: betterLines.length ? betterLines.join('\n') : '*Chưa có ai*', inline: false }
            )
            .setFooter({ text: 'Đặt cược qua lệnh g!bet hoặc nhấn nút bên dưới' });
    }

    _betRow() {
        return new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('livetx_tai').setLabel('⚫ Tài').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('livetx_xiu').setLabel('⚪ Xỉu').setStyle(ButtonStyle.Secondary)
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

    // ─── Reply helper ────────────────────────────────────────
    async _reply(message, content) {
        const m = await message.reply(content);
        setTimeout(() => { if (m && typeof m.delete === 'function') m.delete().catch(() => { }) }, 5000);
        return m;
    }

    sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
}

module.exports = { TaixiuLiveGame };
