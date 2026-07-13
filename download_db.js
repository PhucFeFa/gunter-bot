const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function downloadDB() {
    try {
        console.log('1. Đang kết nối tới VPS để backup...');
        await ssh.connect({ host: '103.179.188.63', username: 'root', password: '4OEHxDCt2zk32q0x' });
        
        console.log('2. Ép SQLite ghi toàn bộ dữ liệu từ WAL sang file chính (Checkpoint)...');
        await ssh.execCommand("node -e \"const db = require('better-sqlite3')('data/database.sqlite'); db.pragma('wal_checkpoint(TRUNCATE)'); db.close();\"", { cwd: '/root/gunter-bot' });
        
        console.log('3. Đang tải file database.sqlite về máy tính của sếp...');
        await ssh.getFile('D:\\PhucLHCE191132\\db\\database.sqlite', '/root/gunter-bot/data/database.sqlite');
        
        console.log('✅ Backup thành công! File đã an toàn ở máy Local và chứa đủ dữ liệu.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Lỗi khi tải Backup:', error);
        process.exit(1);
    }
}

downloadDB();
