/**
 * Script di chuyển toàn bộ dữ liệu từ Firebase sang SQLite.
 * CHỈ CHẠY SCRIPT NÀY KHI FIREBASE ĐÃ MỞ KHÓA (Hết Quota Exceeded).
 */
const { db: firebaseDb } = require('./firebase');
const sqliteDb = require('./sqliteDB');

async function migrateData() {
    console.log('🚀 Bắt đầu quá trình chuyển đổi dữ liệu từ Firebase sang SQLite...');
    
    try {
        // 1. Migrate Users & Fish Profiles
        console.log('⏳ Đang tải dữ liệu Users...');
        const usersSnap = await firebaseDb.collection('users').get();
        console.log(`Đã tải ${usersSnap.docs.length} users. Đang ghi vào SQLite...`);
        
        sqliteDb.transaction(() => {
            const insertUser = sqliteDb.prepare(`
                INSERT OR REPLACE INTO users 
                (userId, balance, lastDaily, msg_count, voice_time, given_today, last_give_date, tarot_count_today, last_tarot_date, job, lastWork, loanAmount, jobSpins, creditScore, loanRefs, seizedRod, seizedRequire) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);
            const insertProfile = sqliteDb.prepare(`
                INSERT OR REPLACE INTO fish_profiles 
                (userId, rod, rodDurability, totalCaught) 
                VALUES (?, ?, ?, ?)
            `);

            for (const doc of usersSnap.docs) {
                const data = doc.data();
                insertUser.run(
                    doc.id,
                    data.balance || 0,
                    data.lastDaily || null,
                    data.msg_count || 0,
                    data.voice_time || 0,
                    data.given_today || 0,
                    data.last_give_date || '',
                    data.tarot_count_today || 0,
                    data.last_tarot_date || '',
                    data.job || null,
                    data.lastWork || null,
                    data.loanAmount || 0,
                    data.jobSpins || 0,
                    data.creditScore || 0,
                    JSON.stringify(data.loanRefs || []),
                    data.seizedRod || null,
                    data.seizedRequire || 0
                );

                if (data.fishRod) {
                    insertProfile.run(
                        doc.id,
                        data.fishRod || 1,
                        data.fishRodDurability || null,
                        data.fishTotalCaught || 0
                    );
                }
            }
        })();
        console.log('✅ Chuyển đổi Users thành công!');

        // 2. Migrate Guild Configs
        console.log('⏳ Đang tải dữ liệu Configs...');
        const configSnap = await firebaseDb.collection('server_configs').get();
        const guildConfigSnap = await firebaseDb.collection('guildConfig').get(); // Cấu hình câu cá cũ
        
        sqliteDb.transaction(() => {
            const insertConfig = sqliteDb.prepare('INSERT OR REPLACE INTO configs (guildId, data) VALUES (?, ?)');
            
            // Map server_configs
            for (const doc of configSnap.docs) {
                insertConfig.run(doc.id, JSON.stringify(doc.data()));
            }

            // Gộp thêm guildConfig (fishZones, shop) vào configs
            for (const doc of guildConfigSnap.docs) {
                const guildId = doc.id;
                let existingRow = sqliteDb.prepare('SELECT data FROM configs WHERE guildId = ?').get(guildId);
                let currentData = existingRow ? JSON.parse(existingRow.data) : {};
                
                const newData = { ...currentData, ...doc.data() };
                insertConfig.run(guildId, JSON.stringify(newData));
            }
        })();
        console.log('✅ Chuyển đổi Configs thành công!');

        console.log('🎉 HOÀN TẤT CHUYỂN ĐỔI DATABASE! BẠN CÓ THỂ KHỞI ĐỘNG LẠI BOT.');
        process.exit(0);

    } catch (error) {
        console.error('❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH CHUYỂN ĐỔI:', error);
        if (error.details && error.details.includes('Quota exceeded')) {
            console.log('\n⚠️ LỖI QUOTA FIREBASE VẪN CÒN! HÃY ĐỢI THÊM VÀ CHẠY LẠI SCRIPT NÀY VÀO LÚC KHÁC.');
        }
        process.exit(1);
    }
}

migrateData();
