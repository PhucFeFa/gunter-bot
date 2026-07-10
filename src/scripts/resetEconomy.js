require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { db } = require('../utils/firebase');

async function resetDB() {
    console.log("CẢNH BÁO: Đang xóa TOÀN BỘ dữ liệu người dùng của server...");
    const snapshot = await db.collection('users').get();
    
    if (snapshot.empty) {
        console.log("Database trống, không có gì để xóa!");
        process.exit(0);
    }
    
    const batches = [];
    let currentBatch = db.batch();
    let count = 0;

    snapshot.docs.forEach(doc => {
        currentBatch.delete(doc.ref);
        count++;
        // Firestore cho phép tối đa 500 thao tác mỗi Batch
        if (count % 500 === 0) {
            batches.push(currentBatch.commit());
            currentBatch = db.batch();
        }
    });

    if (count % 500 !== 0) {
        batches.push(currentBatch.commit());
    }

    await Promise.all(batches);
    console.log(`✅ Đã xóa thành công ${count} tài khoản! Hệ thống Economy đã được reset về 0.`);
    process.exit(0);
}

resetDB().catch(e => {
    console.error("Lỗi xóa DB:", e);
    process.exit(1);
});
