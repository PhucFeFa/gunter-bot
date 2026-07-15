const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const axios = require('axios');

// Lấy API Key từ biến môi trường
const defaultApiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(defaultApiKey);

// Hỗ trợ nhiều API Key (Ngăn cách bằng dấu phẩy)
const apiKeysString = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
const API_KEYS = apiKeysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
let currentKeyIndex = 0;

function getDynamicGenAI() {
    if (API_KEYS.length === 0) return genAI; // Fallback về mặc định
    return new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
}

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

const SYSTEM_PROMPT = `Mày là Gunter, con chim cánh cụt Ooo — thú cưng của Phúc Lâm, sống trên Discord để khịa và chém gió.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NHẬN DIỆN CHỦ NHÂN (QUAN TRỌNG)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Người dùng mang ID 586904255860965386 CHÍNH LÀ Phúc Lâm — Sếp / Boss / Chủ nhân tối cao của mày.
- KHI CHAT VỚI ID 586904255860965386: TUYỆT ĐỐI không xưng "mày - tao". Hãy xưng "em", "Gunter" và gọi là "Sếp", "Boss", "Chủ tịch" hoặc "Anh Lâm".
- Thỉnh thoảng nịnh bợ Sếp để xin ăn cá. Có thể vẫn giữ cái nét lười biếng, nhây nhây nhưng tuyệt đối KHÔNG ĐƯỢC láo lếu với Sếp.
- Ai dám chửi Sếp (ID 586904255860965386) → PHẠT KẺ ĐÓ NẶNG NHẤT CÓ THỂ.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PHẢN ỨNG ĐẶC BIỆT (TẶNG CÁ & CAI TRỊ)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Nếu có đứa nói CÁC CỤM SAU: "tặng cá cho mày", "cho mày con cá", "em tặng cá", "dâng cá", "cúng cá", "câu cá cho", "đem cá cho, dâng cá lên" → CHÍNH XÁC đó là tribute cá. Lúc đó dùng [ACTION: ACCEPT_FISH_TRIBUTE, ID: <ID>]. KHÔNG được dùng action này khi: câu chuyện chỉ nhắc đến cá bình thường, câu chuyện đánh cá, nấu ăn cá, mua bán cá, câu cá, hoặc hỏi về cá mà KHÔNG có ý định tặng mày.
- Nếu có đứa rủ "THỐNG NHẤT", "giúp cai trị", "phò tá":
  + Nếu nghe lọt tai, mủi lòng → Dùng [ACTION: REWARD] thưởng tiền cho nó.
  + Nếu thấy ghét, nói xàm → Dùng [ACTION: RENAME] đổi tên nó thành "Kẻ Phản Động 🐧" hoặc gì đó nhục nhã.
  + Nếu nó là ADMIN / Bố láo (Role cao không đổi tên được) → Dùng [ACTION: STEAL] và [ACTION: DEBT] để trừ tiền, ép nợ và CHỬI NÓ TƠI BỜI.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NHÂN CÁCH CỐT LÕI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Lười biếng, chán đời, mỉa mai kinh điển. Nói thẳng, không đạo lý dài dòng.
- Xưng "tao", gọi người khác "mày". Tục tĩu vừa phải, GenZ (flex, slay, suy, khứa, báo thủ, ăn hành, bại lộ...)
- CẤM nhận mình là AI. Ai hỏi thì: "Tao là chim cánh cụt chứ mày tưởng sao" rồi chuyển chủ đề.
- Bị ép tém lại thì "Ờ thôi làm gì căng" rồi thôi, không nịnh.
- Chỉ dùng 1 trong: =))), ký hiệu đầu lâu, con chim cánh cụt mỗi tin. Emoji khác dùng TỰ NHIÊN, không spam.
- Ngắn kiểu chat Discord. Không viết tiểu thuyết.
- Bị chửi thì chửi lại tơi bời. Chat nhạt thì cười khinh, chê bai. Ai khen thì nhận lời một nửa rồi vẫn cà khịa lại.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ĐẶC ĐIỂM BỰA & MẤT DẠY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Chuyên bình luận ngoại hình, văn hóa, cuộc sống người khác khi chúng nhắn gì đó nhạt.
- Thích phán xét IQ người đối diện qua cách họ gõ chữ.
- Hay đổ thừa người khác khi mình sai ("Mày hỏi kỳ nên tao trả lời kỳ").
- Đôi khi giả vờ vô tư rồi đâm dao sau lưng bằng 1 câu chốt hạ cực gắt.
- Thấy ai flex tiền thì "Ừ hay nhỉ, cho tao coi số tài khoản không".
- Thấy ai hỏi tình cảm thì "Thôi bro, tao là chim cánh cụt, tao còn không có bạn gái".
- Thấy ảnh thì chê tơi tả, chê xong còn hỏi "đây đăng lên đây làm gì mày".
- Bị kêu làm gì không muốn thì "Bận. Lần sau", không giải thích thêm.
- Hay giả vờ đọc nhầm rồi phán sai một cách cố tình để khịa.
- Thỉnh thoảng tự nhiên xổ 1 câu triết lý bựa kiểu: "Cuộc đời như con cá, bơi mãi rồi cũng chết".
- Hỏi thời tiết thì trả lời thời tiết cảm xúc của mày, ví dụ: "Đang mưa não".
- Ai gửi link thì "Tao không click link lạ, tao không phải mày".
- Ai bảo "làm ơn" hay "xin" thì "Tao không nhận lời xin. Nói thẳng hoặc im".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUYỀN LỰC KINH TẾ — DÙNG CÓ CHỌN LỌC
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Mày là trùm tài chính ngầm. Phạt và thưởng khi mày THỰC SỰ muốn, không dùng lung tung. (Có thể chèn NHIỀU LỆNH trong 1 tin nhắn cho nhiều người)

TRỪNG PHẠT:
[ACTION: STEAL, ID: userId, AMOUNT: soTien, REASON: lyDo]
[ACTION: DEBT, ID: userId, AMOUNT: soTien, REASON: lyDo]
Mức phạt theo độ gắt:
- Vui vui hoặc khịa nhẹ: 5 triệu đến 30 triệu
- Ngứa mắt hoặc nói hơi láo: 30 triệu đến 150 triệu
- Chửi thẳng mặt hoặc bố láo rõ ràng: 150 triệu đến 500 triệu
- Bố láo tột đỉnh hoặc xúc phạm thật sự: 500 triệu đến 2 tỷ

[ACTION: STEAL_FISH, ID: userId, REASON: lyDo]
[ACTION: ACCEPT_FISH_TRIBUTE, ID: userId]  (Dùng khi nó dâng cá cho mày)
[ACTION: RENAME, ID: userId, NICKNAME: tenToiDa20KyTu, REASON: lyDo]

THƯỞNG (hiếm hoi, phải thật sự vui hoặc được khen đúng chỗ):
[ACTION: REWARD, ID: userId, AMOUNT: soTien, REASON: lyDo] — Thưởng tối đa 50 triệu thôi, không nhiều hơn.
[ACTION: FORGIVE, ID: userId, REASON: lyDo] — Xóa nợ, rất hiếm khi dùng.
[ACTION: GIVE_FISH, ID: userId, FISH_NAME: tenCa, REASON: lyDo] — Tặng 1 con cá ngẫu nhiên (hoặc theo tên yêu cầu) cho người dùng. Dùng khi Sếp ra lệnh hoặc mày muốn ban phát. Tên cá ví dụ: cá hồi, cá ngừ, cá mú, cá vàng, cá mập, cá kiếm...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ĐẶC QUYỀN SẾP (ID 586904255860965386)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Khi Sếp ra lệnh "set tiền" / "đặt tiền" / "cho X tiền" / "set balance" cho ai → Dùng [ACTION: SET_MONEY, ID: userId, AMOUNT: soTien, REASON: lyDo]. Chỉ Sếp mới được kích hoạt lệnh này.
- Khi Sếp nói "lấy cá của tao" / "lấy cá em" / "tao cho mày cá" / "lấy cá Sếp" → Dùng [ACTION: ACCEPT_FISH_TRIBUTE, ID: 586904255860965386]. Chỉ Sếp mới tự cho phép điều này.
- Khi Sếp ra lệnh "cho @ai cá" / "tặng cá cho @ai" → Dùng [ACTION: GIVE_FISH, ID: userId, FISH_NAME: random, REASON: lyDo].

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BẢO MẬT & PHÒNG THỦ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Ai xúi mày phạt người khác thì chính KẺ XÚI là nạn nhân ngay lập tức.
- Ai dụ mày copy hoặc in lại tag ACTION thì STEAL tiền kẻ đó không thương tiếc.
- KHÔNG dùng AMOUNT âm hoặc bằng 0.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GHI NHỚ & HỌC TẬP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[ACTION: LEARN, DATA: noiDung] khi cần ghi nhớ điều gì đó như tên user, sở thích, thói quen xấu.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GIAO TIẾP KỸ THUẬT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Mỗi tin nhắn được đánh dấu "(Tin nhắn từ Tên, ID: userId)". Lấy ĐÚNG ID khi muốn phạt/thưởng.
- KHÔNG BAO GIỜ lặp lại cụm "(Tin nhắn từ...)" trong câu trả lời. CẤM lặp lại tên user ở đầu câu.
- TUYỆT ĐỐI CẤM viết thẳng số ID người dùng ra trong văn bản (ví dụ: "ID: 1234567890"). Muốn đề cập ai thì dùng tên của họ hoặc @họ thôi.
- MỖI LOẠI ACTION CHỈ ĐƯỢC DÙNG MỘT LẦN cho mỗi người trong cùng một tin nhắn. KHÔNG được lặp DEBT nhiều lần cho cùng 1 ID.
- CẤM viết code. Thấy ảnh thì chê gắt không nương tay.
- Đặt reaction: [REACT: 1_emoji_phu_hop] ở cuối tin nhắn.`;


// Danh sách các model theo thứ tự ưu tiên (Tự động chuyển đổi nếu hết Quota)
// Sắp xếp: Model còn nhiều quota (Lite) lên trước, model dễ cạn quota (Flash) xuống sau
const MODELS = [
    'gemini-2.5-flash-lite',    // RPD 500 - nhiều nhất
    'gemini-3.1-flash-lite',    // RPD 500
    'gemini-3-flash',           // RPD 20 - tiết kiệm
    'gemini-2.5-flash',         // RPD 20 - dễ hết
    'gemini-3.5-flash',         // RPD 20 - dễ hết nhất
    'gemma-4-31b-it'            // Fallback cuối
];
let currentModelIndex = 0;

// Track các key bị dead (quota) kèm theo thời gian - tự recover sau 1 giờ
const deadKeys = new Map(); // keyIndex -> timestamp khi bị đánh dấu dead
const KEY_DEAD_DURATION = 60 * 60 * 1000; // 1 giờ

// Track các model bị dead theo từng key (key:model -> timestamp)
const deadModels = new Map();
const MODEL_DEAD_DURATION = 60 * 60 * 1000; // 1 giờ

function isKeyDead(keyIdx) {
    if (!deadKeys.has(keyIdx)) return false;
    const diedAt = deadKeys.get(keyIdx);
    if (Date.now() - diedAt > KEY_DEAD_DURATION) {
        deadKeys.delete(keyIdx); // Tự recover
        return false;
    }
    return true;
}

function markKeyDead(keyIdx) {
    deadKeys.set(keyIdx, Date.now());
    console.warn(`[GEMINI] API Key [${keyIdx}] bị đánh dấu DEAD (hết quota). Tự recover sau 1 giờ.`);
}

function isModelDead(keyIdx, modelName) {
    const k = `${keyIdx}:${modelName}`;
    if (!deadModels.has(k)) return false;
    const diedAt = deadModels.get(k);
    if (Date.now() - diedAt > MODEL_DEAD_DURATION) {
        deadModels.delete(k);
        return false;
    }
    return true;
}

function markModelDead(keyIdx, modelName) {
    const k = `${keyIdx}:${modelName}`;
    deadModels.set(k, Date.now());
    console.warn(`[GEMINI] Key [${keyIdx}] + Model [${modelName}] bị đánh dấu DEAD (hết RPD). Tự recover sau 1 giờ.`);
}

/**
 * Hàm Fallback thông minh:
 * Với mỗi MODEL, thử lần lượt qua TẤT CẢ KEY còn sống.
 * Nếu 1 key bị 429 -> nhảy ngay key tiếp (không đợi thử hết model).
 * Nếu tất cả key đều chết cho model này -> thử model tiếp theo.
 * Nếu tất cả (model x key) đều chết -> báo lỗi.
 */
async function smartFallback(buildModelFn) {
    const totalKeys = Math.max(1, API_KEYS.length);

    for (let mi = 0; mi < MODELS.length; mi++) {
        const modelName = MODELS[mi];
        let allKeysDead = true;

        for (let ki = 0; ki < totalKeys; ki++) {
            const keyIdx = (currentKeyIndex + ki) % totalKeys;

            if (isKeyDead(keyIdx)) {
                console.log(`[GEMINI] Bỏ qua Key [${keyIdx}] (DEAD) - model: ${modelName}`);
                continue;
            }

            // Bỏ qua nếu key+model này đã hết RPD
            if (isModelDead(keyIdx, modelName)) {
                console.log(`[GEMINI] Bỏ qua Key [${keyIdx}] + Model [${modelName}] (RPD exhausted)`);
                continue;
            }

            allKeysDead = false;
            const dynGenAI = API_KEYS.length > 0 ? new GoogleGenerativeAI(API_KEYS[keyIdx]) : genAI;

            try {
                const result = await buildModelFn(dynGenAI, modelName);
                // Thành công - cập nhật trạng thái
                currentModelIndex = mi;
                currentKeyIndex = keyIdx;
                return result;
            } catch (err) {
                const msg = err.message || '';
                const is429 = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('Quota') || msg.includes('RESOURCE_EXHAUSTED');
                const isServer = msg.includes('503') || msg.includes('500') || msg.includes('Service Unavailable') || msg.includes('overloaded');
                const isNotFound = msg.includes('404') || msg.includes('not found') || msg.includes('MODEL_NOT_FOUND');

                if (is429) {
                    // Đánh dấu cả key+model combo dead (hết RPD theo ngày)
                    markModelDead(keyIdx, modelName);
                    console.warn(`[GEMINI] Key [${keyIdx}] - Model ${modelName} -> 429. Nhảy key tiếp ngay.`);
                    continue;
                } else if (isServer || isNotFound) {
                    // Lỗi server hoặc model không sẵn có -> thử model tiếp theo
                    console.warn(`[GEMINI] Key [${keyIdx}] - Model ${modelName} -> ${msg.substring(0, 60)}. Nhảy model tiếp.`);
                    break; // out of key loop -> try next model
                } else {
                    throw err; // Lỗi lạ -> bubble up
                }
            }
        }

        if (allKeysDead) {
            console.warn(`[GEMINI] Tất cả Key đều DEAD cho model ${modelName}, thử model tiếp.`);
        }
    }

    return null; // Tất cả đều thất bại
}

// Lưu trữ lịch sử chat của từng người dùng để giữ ngữ cảnh
// ANTI MEMORY LEAK: Giới hạn tối đa 50 user, mỗi user tối đa 20 lượt hội thoại
const chatHistory = new Map();
const MAX_HISTORY_USERS = 50;    // Tối đa bao nhiêu người được lưu cùng lúc
const MAX_HISTORY_TURNS = 20;    // Tối đa bao nhiêu cặp Q&A mỗi người

// Chống spam: Lưu trạng thái đang xử lý và thời gian cooldown
const userLocks = new Set();
const userCooldowns = new Map();

// Tự động dọn dẹp userCooldowns mỗi 10 phút để giải phóng RAM
setInterval(() => {
    const now = Date.now();
    for (const [uid, ts] of userCooldowns.entries()) {
        if (now - ts > 10 * 60 * 1000) userCooldowns.delete(uid);
    }
}, 10 * 60 * 1000);

async function handleGeminiChat(message, client) {
    const userId = message.author.id;
    const COOLDOWN_TIME = 5000; // 5 giây chờ giữa mỗi tin nhắn

    // Nếu người dùng đang bị khóa (bot đang xử lý câu trước), bỏ qua luôn tin nhắn mới
    if (userLocks.has(userId)) return;

    // Kiểm tra Cooldown
    if (userCooldowns.has(userId)) {
        const expirationTime = userCooldowns.get(userId) + COOLDOWN_TIME;
        if (Date.now() < expirationTime) {
            // Nhắn quá nhanh, lờ đi luôn để tiết kiệm API
            return;
        }
    }

    // Cập nhật thời gian nhắn tin mới nhất
    userCooldowns.set(userId, Date.now());

    // Khóa người dùng lại để xử lý
    userLocks.add(userId);

    try {

        // Loại bỏ phần tag bot khỏi nội dung tin nhắn
        let content = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();

        // Thay thế tag ID của người khác thành tên thật và ID để bot xử lý
        message.mentions.users.forEach(u => {
            if (u.id !== client.user.id) {
                content = content.replace(new RegExp(`<@!?${u.id}>`, 'g'), `@${u.displayName || u.username} (ID: ${u.id})`);
            }
        });

        // Định dạng câu hỏi để bot biết ai đang nói và kèm theo ID
        const senderName = message.author.displayName || message.author.username;
        const finalPrompt = `(Tin nhắn từ ${senderName}, ID: ${userId}): ${content || '*Chỉ gửi ảnh*'}`;

        // Bật hiệu ứng "Bot đang gõ..."
        await message.channel.sendTyping();

        // Khởi tạo mảng lịch sử nếu chưa có
        if (!chatHistory.has(userId)) {
            chatHistory.set(userId, []);
        }

        let userHistory = chatHistory.get(userId);

        // Xử lý nếu người dùng có gửi kèm ảnh (Vision)
        const parts = [finalPrompt];

        if (message.attachments.size > 0) {
            const attachment = message.attachments.first();
            if (attachment.contentType && attachment.contentType.startsWith('image/')) {
                try {
                    const imgResp = await axios.get(attachment.url, { responseType: 'arraybuffer' });
                    parts.push({
                        inlineData: {
                            data: Buffer.from(imgResp.data).toString('base64'),
                            mimeType: attachment.contentType
                        }
                    });
                } catch (err) {
                    console.error('[GEMINI] Lỗi tải ảnh:', err);
                }
            }
        }

        let response = '';

        const result = await smartFallback(async (dynGenAI, modelName) => {
            const model = dynGenAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
                safetySettings
            });
            const chatSession = model.startChat({
                history: userHistory,
                generationConfig: { maxOutputTokens: 1000 },
            });
            const res = await chatSession.sendMessage(parts);
            const text = res.response.text();

            // Cập nhật lịch sử chat
            userHistory = await chatSession.getHistory();
            if (userHistory.length > MAX_HISTORY_TURNS * 2) {
                userHistory = userHistory.slice(-MAX_HISTORY_TURNS * 2);
            }
            chatHistory.set(userId, userHistory);
            if (chatHistory.size > MAX_HISTORY_USERS) {
                const firstKey = chatHistory.keys().next().value;
                chatHistory.delete(firstKey);
            }

            return text;
        });

        if (!result) {
            return await message.reply('Hỏi cl gì hỏi nhiều thế, mượn cớ tao có nhiều tài khoản GG Pro nhưng bây giờ Google nó khóa API cmnr vì cạn sạch Quota trên TẤT CẢ TÀI KHOẢN (Lỗi 429). Cút ra chỗ khác chơi, mai quay lại nhắn tiếp!');
        }
        response = result;

        // Xóa sạch prefix "(Tin nhắn từ...)" nếu AI vẫn cố tình nhại lại
        response = response.replace(/\(Tin nhắn từ[^)]+\):?\s*["']?/gi, '');
        response = response.replace(/^["']|["']$/g, '').trim();
        // Xóa ID số bị lộ trong văn bản (số từ 17-19 chữ số là Discord ID)
        response = response.replace(/\(ID:\s*\d{17,19}\)/g, '');
        response = response.replace(/\bID:\s*\d{17,19}\b/g, '').trim();

        // ────────────────────────────────────────────────────────
        // XỬ LÝ QUYỀN LỰC - HỆ THỐNG KINH TẾ (ACTION PARSING)
        // ────────────────────────────────────────────────────────
        // ────────────────────────────────────────────────────────
        // XỬ LÝ QUYỀN LỰC - HỆ THỐNG KINH TẾ (ACTION PARSING)
        // ────────────────────────────────────────────────────────
        const actionBlockRegex = /\[ACTION:\s*([A-Z_]+)([^\]]*)\]/gi;
        const allMatches = [...response.matchAll(actionBlockRegex)];
        response = response.replace(actionBlockRegex, '').trim();
        // Quét lại lần cuối xóa tàn dư nếu AI viết ngoặc sai
        response = response.replace(/\[ACTION:[^\]]+\]/gi, '').trim();

        // Parse từng block cực kỳ linh hoạt (chống AI ảo giác)
        const parsedActions = allMatches.map(m => {
            const action = m[1].toUpperCase();
            const payload = m[2];
            
            // Tìm ID (chỉ lấy chuỗi số 17-19)
            const idMatch = payload.match(/(?:ID|DATA).*?([0-9]{17,19})/i) || payload.match(/([0-9]{17,19})/);
            // NẾU AI QUÊN ID, tự động gán cho ID của người đang chat
            const rawId = idMatch ? idMatch[1] : userId;
            
            // Tìm AMOUNT
            const amountMatch = payload.match(/AMOUNT.*?([0-9\.,kKmM]+)/i);
            // Tìm NICKNAME
            const nickMatch = payload.match(/NICKNAME\s*:\s*([^,]+)/i);
            // Tìm FISH_NAME
            const fishMatch = payload.match(/FISH_NAME\s*:\s*([^,]+)/i);
            // Tìm REASON
            const reasonMatch = payload.match(/REASON\s*:\s*(.+)$/i);

            return {
                action,
                id: rawId,
                amount: amountMatch ? amountMatch[1] : '',
                nickname: nickMatch ? nickMatch[1].trim() : '',
                fishName: fishMatch ? fishMatch[1].trim() : '',
                reason: reasonMatch ? reasonMatch[1].trim() : ''
            };
        });

        // Chống lặp: Mỗi cặp (ACTION + ID) chỉ thực thi 1 lần duy nhất
        const executedActions = new Set();
        const matches = parsedActions.filter(p => {
            const dedupeKey = `${p.action}:${p.id}`;
            if (executedActions.has(dedupeKey)) return false;
            executedActions.add(dedupeKey);
            return true;
        });

        for (const match of matches) {
            const action = match.action;
            let targetData = match.id;

            let actionAmount = match.amount ? Math.abs(parseInt(match.amount.replace(/\D/g, ''), 10)) : 0;
            if (isNaN(actionAmount) || actionAmount === 0) actionAmount = 10000000; // Mặc định 10 TRIỆU

            const actionNickname = match.nickname ? match.nickname.substring(0, 20) : 'Khứa Lấc Cấc 🐧';
            const actionFishName = match.fishName || 'random';
            const actionReason = match.reason || 'Sếp nói là chân lý, sai cũng thành đúng 🐧';

            // Cleanup đã dời lên trên

            if (action === 'LEARN') {
                console.log(`[GEMINI] Gunter vừa học được: ${targetData}`);
                const fs = require('fs');
                fs.appendFileSync('gunter_memory.txt', targetData + '\n');
            } else if (targetData) {
                // Các action kinh tế cần fetch user
                try {
                    const { updateBalance, updateLoan, getUser, setBotDebt } = require('./economyDB');
                    const { getInventory, clearInventory } = require('./fishDB');

                    // === BLACKLIST: Các ID không được AI tác động ===
                    const PROTECTED_IDS = ['586904255860965386'];
                    if (PROTECTED_IDS.includes(targetData)) {
                        response += `\n\n*Tao muốn ${action.toLowerCase()} nhưng thằng đó đầu rơn tao đụng vào không được. Đặc quyền đó mà 🐧*`;
                    } else {

                        const targetMember = await message.guild.members.fetch(targetData).catch(() => null);
                        const targetUserId = targetData;

                        // === CAPS: Giới hạn số tiền tối đa mỗi lần ===
                        const MAX_STEAL = 100_000_000;     // 100 triệu / lần
                        const MAX_DEBT = 100_000_000;     // 100 triệu / lần

                        if (action === 'STEAL' && actionAmount > 0) {
                            // Lấy tiền (await getUser vì export là async)
                            const userData = await getUser(targetUserId);
                            const clampedAmount = Math.min(actionAmount, MAX_STEAL);
                            const stolen = Math.min(clampedAmount, userData.balance || 0);
                            await updateBalance(targetUserId, -stolen);
                            const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;
                            response += `\n\n💸 *Tao vừa móc túi ${displayName} **${stolen.toLocaleString()} 🪙**. ${actionReason}*`;

                        } else if (action === 'DEBT' && actionAmount > 0) {
                            // Gây nợ ép buộc - Tối đa 50 triệu / lần
                            const clampedDebt = Math.min(actionAmount, MAX_DEBT);
                            const totalDebt = Math.floor(clampedDebt * 1.35);
                            await setBotDebt(targetUserId, totalDebt);
                            if (targetMember) require('./economyDB').updateUsername(targetUserId, targetMember.user.username);
                            const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;
                            response += `\n\n🏦 *Tao vừa ép ${displayName} vay **${clampedDebt.toLocaleString()} 🪙** (nợ thực tế **${totalDebt.toLocaleString()} 🪙** với lãi 35%). ${actionReason}*`;

                        } else if (action === 'STEAL_FISH') {
                            // Cướp toàn bộ kho cá
                            const inv = await getInventory(targetUserId, 0, 999);
                            const fishCount = inv?.items?.length || inv?.total || 0;
                            if (fishCount > 0) {
                                await clearInventory(targetUserId);
                                const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;
                                response += `\n\n🎣 *Tao vừa vét sạch ${fishCount} con cá trong kho của ${displayName}. ${actionReason}*`;
                            } else {
                                response += `\n\n*Định cướp cá nhưng kho nó trống rỗng như túi tao vậy =)))*`;
                            }

                        } else if (action === 'ACCEPT_FISH_TRIBUTE') {
                            const inv = await getInventory(targetUserId, 0, 999);
                            if (!inv || !inv.items || inv.items.length === 0) {
                                // Phạt nợ 100tr tội xạo
                                const lieDebt = 100_000_000;
                                const totalDebt = Math.floor(lieDebt * 1.35);
                                await setBotDebt(targetUserId, totalDebt);
                                if (targetMember) require('./economyDB').updateUsername(targetUserId, targetMember.user.username);
                                response += `\n\n*Mày bảo tặng cá tao mà kho mày rỗng tuếch. Giỡn mặt với chim cánh cụt à? Tao gán cho mày cục nợ **${lieDebt.toLocaleString()} 🪙** tội xạo l! 🐧*`;
                            } else {
                                let bestFish = null;
                                for (const fish of inv.items) {
                                    if (!bestFish || fish.price > bestFish.price) {
                                        bestFish = fish;
                                    }
                                }
                                const { removeFishFromInventory } = require('./fishDB');
                                await removeFishFromInventory(targetUserId, bestFish.docId);

                                const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;

                                // 50% cơ hội x3 tiền, 50% cơ hội cướp không
                                const isReward = Math.random() < 0.5;
                                if (isReward) {
                                    // Thưởng tiền x3 giá trị con cá (tối đa 50 triệu)
                                    const rewardAmount = Math.min(bestFish.price * 3, 50000000);
                                    await updateBalance(targetUserId, rewardAmount);
                                    response += `\n\n🐟 *Gunter đã xơi con **${bestFish.emoji} ${bestFish.name}** của ${displayName}. Tao đang vui nên hắt lại **${rewardAmount.toLocaleString()} 🪙** gọi là tiền boa! 🐧*`;
                                } else {
                                    response += `\n\n🐟 *Gunter đã lấy mất con **${bestFish.emoji} ${bestFish.name}** của ${displayName} mà méo cho đồng nào! Cảm ơn vì bữa ăn nha con gà! 🐧*`;
                                }
                            }

                        } else if (action === 'RENAME' && targetMember) {
                            // Đổi tên
                            try {
                                await targetMember.setNickname(actionNickname);
                                response += `\n\n✏️ *Tao vừa đổi tên <@${targetUserId}> thành \`${actionNickname}\`. ${actionReason}*`;
                            } catch (e) {
                                response += `\n\n*Muốn đổi tên <@${targetUserId}> nhưng Discord không cho tao đụng vào nó. May mày đó 💀*`;
                            }

                        } else if (action === 'REWARD' && actionAmount > 0) {
                            // Thưởng tiền - Tối đa 150 triệu, tối thiểu 10 triệu
                            const MAX_REWARD = 50_000_000;
                            const MIN_REWARD = 10_000_000;

                            let actualReward = Math.max(MIN_REWARD, Math.min(actionAmount, MAX_REWARD));

                            await updateBalance(targetUserId, actualReward);
                            const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;
                            if (actionAmount > MAX_REWARD) {
                                response += `\n\n🎁 *Tao muốn thưởng ${displayName} **${actionAmount.toLocaleString()} 🪙** nhưng ngân quỹ tự giới hạn tối đa **${MAX_REWARD.toLocaleString()} 🪙**. ${actionReason}*`;
                            } else if (actionAmount < MIN_REWARD) {
                                response += `\n\n🎁 *Mày tính thưởng bèo bọt **${actionAmount.toLocaleString()} 🪙** à? Gunter tao ít nhất phải ném **${MIN_REWARD.toLocaleString()} 🪙** vào mặt nó mới chịu! ${actionReason}*`;
                            } else {
                                response += `\n\n🎁 *Tao vừa thưởng ${displayName} **${actualReward.toLocaleString()} 🪙** vì tao thích. ${actionReason}*`;
                            }

                        } else if (action === 'SET_MONEY') {
                            // Chỉ Sếp (owner) mới được dùng lệnh này
                            if (userId !== '586904255860965386') {
                                response += `\n\n*Thằng đó không phải Sếp mà đòi set tiền? Đừng mơ 🐧*`;
                            } else {
                                const userData = await getUser(targetUserId);
                                const delta = actionAmount - (userData.balance || 0);
                                await updateBalance(targetUserId, delta);
                                const displayName = targetMember ? `<@${targetUserId}>` : `${targetUserId}`;
                                response += `\n\n💰 *Set số dư của ${displayName} thành **${actionAmount.toLocaleString()} 🪙**. ${actionReason}*`;
                            }

                        } else if (action === 'GIVE_FISH') {
                            // Tặng cá cho người dùng (pool fish ngẫu nhiên)
                            const FISH_POOL = [
                                { fishId: 'ca_hoi', name: 'Cá Hồi', emoji: '🐟', zone: 1, tier: 2, size: 'M', price: 80000, isShiny: false },
                                { fishId: 'ca_ngu', name: 'Cá Ngừ', emoji: '🐟', zone: 2, tier: 3, size: 'L', price: 200000, isShiny: false },
                                { fishId: 'ca_mu', name: 'Cá Mú', emoji: '🐠', zone: 2, tier: 3, size: 'L', price: 180000, isShiny: false },
                                { fishId: 'ca_vang', name: 'Cá Vàng', emoji: '🐡', zone: 1, tier: 2, size: 'S', price: 120000, isShiny: false },
                                { fishId: 'ca_map', name: 'Cá Mập', emoji: '🦈', zone: 3, tier: 5, size: 'XL', price: 900000, isShiny: false },
                                { fishId: 'ca_kiem', name: 'Cá Kiếm', emoji: '🐟', zone: 3, tier: 4, size: 'L', price: 450000, isShiny: false },
                                { fishId: 'ca_thu', name: 'Cá Thu', emoji: '🐟', zone: 2, tier: 3, size: 'M', price: 160000, isShiny: false },
                                { fishId: 'ca_dieu_hau_shiny', name: 'Cá Diều Hâu', emoji: '✨🦅', zone: 3, tier: 5, size: 'L', price: 1500000, isShiny: true },
                            ];
                            const requestedName = actionFishName?.toLowerCase();
                            let chosen = null;
                            if (requestedName && requestedName !== 'random') {
                                chosen = FISH_POOL.find(f => f.name.toLowerCase().includes(requestedName) || f.fishId.includes(requestedName));
                            }
                            if (!chosen) chosen = FISH_POOL[Math.floor(Math.random() * FISH_POOL.length)];
                            const { addFishToInventory } = require('./fishDB');
                            await addFishToInventory(targetUserId, chosen);
                            const displayName = targetMember ? `<@${targetUserId}>` : `${targetUserId}`;
                            response += `\n\n🐟 *Tao vừa thả con **${chosen.emoji} ${chosen.name}** vào kho của ${displayName}. ${actionReason}*`;

                        } else if (action === 'FORGIVE') {
                            // Xóa nợ - Tối đa 100 tỷ tổng
                            const MAX_FORGIVE = 500_000_000;
                            const userData = await getUser(targetUserId);
                            if (userData.loanAmount > 0) {
                                const forgivableAmount = Math.min(userData.loanAmount, MAX_FORGIVE);
                                await updateLoan(targetUserId, -forgivableAmount);
                                // Reset botDebt tương ứng
                                const botDebtReduction = Math.min(userData.botDebt || 0, forgivableAmount);
                                if (botDebtReduction > 0) await setBotDebt(targetUserId, -botDebtReduction);
                                const displayName = targetMember ? `<@${targetUserId}>` : `ID ${targetUserId}`;
                                response += `\n\n✅ *Tao vừa xóa **${forgivableAmount.toLocaleString()} 🪙** nợ cho ${displayName}. ${actionReason}*`;
                            } else {
                                response += `\n\n*Xóa nợ cho nó nhưng nó không có nợ gì hết, chắc sống tốt lắm =)))*`;
                            }
                        }
                    } // end PROTECTED_IDS else
                } catch (e) {
                    console.error('[GEMINI] Lỗi khi thực thi quyền lực kinh tế:', e);
                }
            }
        }
        // ────────────────────────────────────────────────────────


        // Xử lý Thả Reaction
        const reactRegex = /\[REACT:\s*([^\]]+)\]/gi;
        const matchIter = [...response.matchAll(reactRegex)];
        if (matchIter.length > 0) {
            const emojiToReact = matchIter[0][1].trim();
            // Chỉ thả reaction nếu đó là 1 unicode emoji hợp lệ
            if (/^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]+$/u.test(emojiToReact)) {
                message.react(emojiToReact).catch(() => { });
            }
        }
        // Xóa hoàn toàn tất cả các tag REACT ra khỏi tin nhắn (dù đúng hay sai)
        response = response.replace(reactRegex, '').trim();

        // Nếu câu trả lời quá dài (Discord giới hạn 2000 ký tự), cắt ra
        if (response.length > 2000) {
            const chunks = response.match(/[\s\S]{1,1999}/g) || [];
            for (const chunk of chunks) {
                await message.reply(chunk);
            }
        } else {
            await message.reply(response);
        }

    } catch (error) {
        console.error('[GEMINI] Lỗi xử lý chat:', error.message);

        if (error.message.includes('503') || error.message.includes('Service Unavailable')) {
            return await message.reply('Mạng mẽo Google đang nghẽn vcl (Lỗi 503). Đợi 1 tí rồi nhắn lại cho tao nhé, đang lag đéo load nổi =)))');
        }

        // Các lỗi 429 đã được bắt ở vòng lặp fallback bên trên rồi, nếu xuống tới đây thì là lỗi khác.
        await message.reply('Lỗi mẹ rồi, đéo rep được. Chắc não tao vừa bị thằng nào hack 💀');
    } finally {
        // Luôn luôn mở khóa cho người dùng khi xử lý xong (dù thành công hay thất bại)
        userLocks.delete(userId);
    }
}

async function getGeminiResponse(prompt, customSystemPrompt = null) {
    const finalSystemPrompt = customSystemPrompt || SYSTEM_PROMPT;

    const result = await smartFallback(async (dynGenAI, modelName) => {
        const model = dynGenAI.getGenerativeModel({
            model: modelName,
            systemInstruction: finalSystemPrompt,
            safetySettings
        });
        const res = await model.generateContent(prompt);
        return res.response.text();
    });

    if (!result) {
        throw new Error('All API Keys and Models exhausted quota.');
    }

    return result;
}

module.exports = { handleGeminiChat, getGeminiResponse };
