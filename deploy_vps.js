const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();
const VPS_IP = '103.179.188.63';
const VPS_USER = 'root';
const VPS_PASS = '4OEHxDCt2zk32q0x';
const TARGET_DIR = '/root/gunter-bot';

conn.on('ready', () => {
    console.log('[SSH] Connected to VPS!');
    
    // SFTP to transfer local secret files (.env, serviceAccountKey.json)
    conn.sftp((err, sftp) => {
        if (err) throw err;
        console.log('[SFTP] Started file transfer...');
        
        // Make sure target dir exists first
        conn.exec(`mkdir -p ${TARGET_DIR}`, (err, stream) => {
            if (err) throw err;
            stream.on('close', () => {
                
                // Upload files
                const filesToUpload = ['.env', 'serviceAccountKey.json'];
                let uploadsCompleted = 0;
                
                filesToUpload.forEach(file => {
                    const localPath = path.join(__dirname, file);
                    const remotePath = `${TARGET_DIR}/${file}`;
                    
                    if (fs.existsSync(localPath)) {
                        sftp.fastPut(localPath, remotePath, (err) => {
                            if (err) console.error(`[SFTP] Failed to upload ${file}:`, err);
                            else console.log(`[SFTP] Uploaded ${file} successfully.`);
                            
                            uploadsCompleted++;
                            if (uploadsCompleted === filesToUpload.length) {
                                executeDeployment();
                            }
                        });
                    } else {
                        console.log(`[SFTP] File ${file} not found locally, skipping...`);
                        uploadsCompleted++;
                        if (uploadsCompleted === filesToUpload.length) {
                            executeDeployment();
                        }
                    }
                });
            });
        });
    });
}).on('error', (err) => {
    console.error('[SSH] Connection Error:', err);
}).connect({
    host: VPS_IP,
    port: 22,
    username: VPS_USER,
    password: VPS_PASS
});

function executeDeployment() {
    console.log('[SSH] Executing deployment commands...');
    const commands = `
        cd /root
        if [ ! -d "gunter-bot/.git" ]; then
            git clone https://github.com/PhucFeFa/gunter-bot.git gunter-bot
        fi
        cd gunter-bot
        pm2 stop gunter-bot || true
        
        # 1. BỌC THÉP DATABASE: Copy database ra chỗ an toàn trước khi git chạm vào
        cp data/database.sqlite /root/database_backup_safe.sqlite || true
        
        # 2. Cập nhật code
        git fetch --all
        git reset --hard origin/main
        
        # 3. TRẢ LẠI DATABASE VÀO CHỖ CŨ
        mkdir -p data
        cp /root/database_backup_safe.sqlite data/database.sqlite || true
        
        # 4. Chạy bot
        npm install
        pm2 delete gunter-bot || true
        pm2 start src/index.js --name "gunter-bot" --time
        pm2 save
        pm2 startup
    `;
    
    conn.exec(commands, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
            console.log(`[SSH] Deployment completed with code ${code}.`);
            conn.end();
        }).on('data', (data) => {
            process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
            process.stderr.write(data.toString());
        });
    });
}
