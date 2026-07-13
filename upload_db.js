const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();

async function uploadDB() {
    try {
        console.log('1. Đang kết nối tới VPS...');
        await ssh.connect({ host: '103.179.188.63', username: 'root', password: '4OEHxDCt2zk32q0x' });
        
        console.log('2. Đang tắt Gunter Bot để bảo vệ dữ liệu...');
        await ssh.execCommand('pm2 stop gunter-bot', { cwd: '/root/gunter-bot' });
        
        console.log('3. Đang xóa các file tạm (WAL, SHM)...');
        await ssh.execCommand('rm -f data/database.sqlite-shm data/database.sqlite-wal', { cwd: '/root/gunter-bot' });
        
        console.log('4. Đang upload file database.sqlite đã sửa từ máy của bạn lên VPS...');
        await ssh.putFile('D:\\PhucLHCE191132\\db\\database.sqlite', '/root/gunter-bot/data/database.sqlite');
        
        console.log('5. Đang khởi động lại Gunter Bot...');
        await ssh.execCommand('pm2 start src/index.js --name gunter-bot', { cwd: '/root/gunter-bot' });
        
        console.log('✅ Hoàn tất! Bot đã hoạt động với dữ liệu mới.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Có lỗi xảy ra:', error);
        process.exit(1);
    }
}

uploadDB();
