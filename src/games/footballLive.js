class FootballLiveGame {
    constructor(channel, client, guildId) {
        this.channel = channel;
        this.channelId = channel.id;
        this.client = client;
        this.guildId = guildId;
        this.gameType = 'bongda';
        this.running = false;
    }
    async start() {
        this.running = true;
        try {
            await this.channel.send("⚽ **SÒNG CÁ ĐỘ BÓNG ĐÁ ĐÃ MỞ CỬA!**\nDùng lệnh `/bongda list`, `/bongda bet` và `/bongda mybets` tại kênh này để xuống xác nhé!");
        } catch (e) {
            console.error('[FOOTBALL LIVE] Lỗi gửi tin nhắn khởi động:', e);
        }
    }
    stop() {
        this.running = false;
        try {
            this.channel.send("🛑 **Sòng Cá Độ Bóng Đá đã đóng cửa!**");
        } catch (e) {}
    }
}

module.exports = { FootballLiveGame };
