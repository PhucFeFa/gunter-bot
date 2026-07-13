/**
 * Script đẩy toàn bộ dữ liệu từ SQLite sang Firebase để dự phòng.
 */
const { db: firebaseDb } = require('./firebase');
const sqliteDb = require('./sqliteDB');

async function exportData() {
    console.log('🚀 Bắt đầu quá trình BACKUP dữ liệu từ SQLite lên Firebase...');
    
    try {
        // 1. Export Users
        console.log('⏳ Đang đọc dữ liệu Users từ SQLite...');
        const users = sqliteDb.prepare('SELECT * FROM users').all();
        const profiles = sqliteDb.prepare('SELECT * FROM fish_profiles').all();
        console.log(`Đã đọc ${users.length} users. Đang ghi lên Firebase...`);
        
        let batch = firebaseDb.batch();
        let batchCount = 0;

        for (const user of users) {
            const userRef = firebaseDb.collection('users').doc(user.userId);
            const profile = profiles.find(p => p.userId === user.userId);
            
            const data = {
                balance: user.balance,
                lastDaily: user.lastDaily,
                msg_count: user.msg_count,
                voice_time: user.voice_time,
                given_today: user.given_today,
                last_give_date: user.last_give_date,
                tarot_count_today: user.tarot_count_today,
                last_tarot_date: user.last_tarot_date,
                job: user.job,
                lastWork: user.lastWork,
                loanAmount: user.loanAmount,
                jobSpins: user.jobSpins,
                creditScore: user.creditScore,
                loanRefs: user.loanRefs ? JSON.parse(user.loanRefs) : [],
                seizedRod: user.seizedRod,
                seizedRequire: user.seizedRequire
            };

            if (profile) {
                data.fishRod = profile.rod;
                data.fishRodDurability = profile.rodDurability;
                data.fishTotalCaught = profile.totalCaught;
            }

            batch.set(userRef, data, { merge: true });
            batchCount++;

            if (batchCount >= 400) { // Firebase batch limit is 500
                await batch.commit();
                batch = firebaseDb.batch();
                batchCount = 0;
            }
        }
        if (batchCount > 0) {
            await batch.commit();
        }
        console.log('✅ Backup Users thành công!');

        // 2. Export Configs
        console.log('⏳ Đang đọc dữ liệu Configs từ SQLite...');
        const configs = sqliteDb.prepare('SELECT * FROM configs').all();
        console.log(`Đã đọc ${configs.length} configs. Đang ghi lên Firebase...`);
        
        let configBatch = firebaseDb.batch();
        for (const config of configs) {
            const configRef = firebaseDb.collection('server_configs').doc(config.guildId);
            configBatch.set(configRef, JSON.parse(config.data), { merge: true });
        }
        await configBatch.commit();
        
        console.log('✅ Backup Configs thành công!');
        console.log('🎉 HOÀN TẤT BACKUP LÊN FIREBASE! Dữ liệu đã an toàn tuyệt đối trên mây.');
        process.exit(0);

    } catch (error) {
        console.error('❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH BACKUP:', error);
        process.exit(1);
    }
}

exportData();
