const cooldowns = new Map();

function checkCooldown(userId, cooldownMs = 3000) {
    if (cooldowns.has(userId)) {
        const lastTime = cooldowns.get(userId);
        if (Date.now() - lastTime < cooldownMs) {
            return false; // Spamming
        }
    }
    cooldowns.set(userId, Date.now());
    return true; // OK
}

module.exports = { checkCooldown };
