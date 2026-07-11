/**
 * liveGameManager.js
 * Singleton quản lý tất cả các phiên game live (Baccarat, Aviator)
 */

class LiveGameManager {
    constructor() {
        this.games = new Map(); // key: `${guildId}:${gameType}`, value: gameInstance
    }

    /** Đăng ký 1 game đang chạy */
    register(guildId, gameType, instance) {
        const key = `${guildId}:${gameType}`;
        if (this.games.has(key)) return false;
        this.games.set(key, instance);
        return true;
    }

    /** Xóa game khỏi registry (khi stop) */
    unregister(guildId, gameType) {
        this.games.delete(`${guildId}:${gameType}`);
    }

    /** Lấy game instance theo guild + type */
    get(guildId, gameType) {
        return this.games.get(`${guildId}:${gameType}`) || null;
    }

    /** Lấy game instance theo channel ID */
    getByChannel(channelId) {
        for (const instance of this.games.values()) {
            if (instance.channelId === channelId) return instance;
        }
        return null;
    }

    /** Kiểm tra game đang chạy */
    isRunning(guildId, gameType) {
        const g = this.games.get(`${guildId}:${gameType}`);
        return g ? g.running : false;
    }
}

module.exports = new LiveGameManager();
