class FootballLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'bongda';
        this.running = false;
        this.cleanupInterval = null;
    }
    async start() {
        this.running = true;
        try {
            await this.channel.send("⚽ **SÒNG CÁ ĐỘ BÓNG ĐÁ ĐÃ MỞ CỬA!**\nDùng lệnh `/bongda list`, `/bongda bet` và `/bongda mybets` tại kênh này để xuống xác nhé!");
        } catch (e) {
            console.error('[FOOTBALL LIVE] Lỗi gửi tin nhắn khởi động:', e);
        }

        // Tự động dọn dẹp kênh mỗi 15 phút
        this.cleanupInterval = setInterval(() => this.cleanupChannel(), 15 * 60 * 1000);
    }

    stop() {
        this.running = false;
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        
        try {
            this.channel.send("🛑 **Sòng Cá Độ Bóng Đá đã đóng cửa!**");
        } catch (e) {}
    }

    async cleanupChannel() {
        if (!this.running) return;
        try {
            const msgs = await this.channel.messages.fetch({ limit: 100 });
            const now = Date.now();
            
            // Xoá các tin nhắn CŨ hơn 15 phút, NHƯNG giữ lại các tin nhắn List trận đấu của Bot
            const toDelete = msgs.filter(m => {
                // Giữ lại tin nhắn mới (chưa đủ 15 phút)
                if (now - m.createdTimestamp < 15 * 60 * 1000) return false;
                
                // Giữ lại bảng danh sách kèo của Bot
                if (m.author.id === this.client.user.id && m.embeds.length > 0) {
                    const title = m.embeds[0].title || '';
                    if (title.includes('HỆ THỐNG CÁ ĐỘ BÓNG ĐÁ LIVE')) return false;
                }
                
                // Tin nhắn chào mừng mở sòng
                if (m.content.includes('SÒNG CÁ ĐỘ BÓNG ĐÁ ĐÃ MỞ CỬA')) return false;

                // Tránh lỗi bulkDelete với tin nhắn quá 14 ngày
                if (now - m.createdTimestamp > 14 * 24 * 60 * 60 * 1000) return false;
                
                return true;
            });
            
            if (toDelete.size > 0) {
                await this.channel.bulkDelete(toDelete, true).catch(() => {});
            }
        } catch (e) {
            console.error('[FOOTBALL LIVE] Lỗi dọn dẹp tin nhắn:', e);
        }
    }
}

module.exports = { FootballLiveGame };
