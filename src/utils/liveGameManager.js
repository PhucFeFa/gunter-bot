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

    /** Lấy channelId của game đang chạy theo guild + type */
    getChannelByType(guildId, gameType) {
        const g = this.games.get(`${guildId}:${gameType}`);
        return g ? g.channelId : null;
    }

    /** Hoàn tiền khi sập/lag/đóng bot */
    async shutdown() {
        console.log('[LIVE_GAME] Đang tiến hành hoàn tiền cho người chơi do hệ thống restart/shutdown...');
        const tasks = [];
        for (const instance of this.games.values()) {
            if (typeof instance.refundAll === 'function') {
                tasks.push(instance.refundAll());
            }
        }
        await Promise.allSettled(tasks);
        console.log('[LIVE_GAME] Đã hoàn tất hoàn tiền!');
    }
}

module.exports = new LiveGameManager();
