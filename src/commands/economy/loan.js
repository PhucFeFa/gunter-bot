const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUser, updateBalance, updateLoan, updateCreditScore, updateLoanDetails } = require('../../utils/economyDB');
const { setUserRod } = require('../../utils/fishDB');
const { jobs } = require('../../data/jobs');
const { RODS } = require('../../data/fishData');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loan')
        .setDescription('Hệ thống vay vốn ngân hàng Gunter')
        .addSubcommand(sub => sub
            .setName('info')
            .setDescription('Xem thông tin khoản vay và hạn mức của mày'))
        .addSubcommand(sub => sub
            .setName('borrow')
            .setDescription('Vay tiền từ ngân hàng (Lãi suất 35%)')
            .addStringOption(opt => opt
                .setName('amount')
                .setDescription('Số tiền muốn vay (hoặc "max")')
                .setRequired(true))
            .addUserOption(opt => opt
                .setName('ref1')
                .setDescription('Người tham chiếu 1 (sẽ bị đòi nợ chung)')
                .setRequired(true))
            .addUserOption(opt => opt
                .setName('ref2')
                .setDescription('Người tham chiếu 2 (sẽ bị đòi nợ chung)')
                .setRequired(true)))
        .addSubcommand(sub => sub
            .setName('repay')
            .setDescription('Trả nợ ngân hàng')
            .addStringOption(opt => opt
                .setName('amount')
                .setDescription('Số tiền muốn trả (hoặc "all")')
                .setRequired(true))),

    async execute(interaction) {
        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply();
        }

        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const user = await getUser(userId);
        const currentLoan = user.loanAmount || 0;

        let maxLoanLimit = 0;
        let jobName = "Thất nghiệp";
        const creditScore = user.creditScore || 0;

        if (user.job && jobs[user.job]) {
            // Cơ bản = maxSalary * 20. Mỗi điểm tín dụng tăng maxSalary * 1. Tối đa 100 điểm.
            // Vậy vay tối đa = maxSalary * (20 + creditScore).
            maxLoanLimit = jobs[user.job].maxSalary * (20 + creditScore);
            jobName = jobs[user.job].name;
        }

        if (subcommand === 'info') {
            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🏦 NGÂN HÀNG HÚT MÁU GUNTER')
                .setThumbnail('https://cdn-icons-png.flaticon.com/512/2830/2830284.png')
                .addFields(
                    { name: 'Nghề bá dơ hiện tại', value: `**${jobName}**`, inline: true },
                    { name: 'Điểm tín dụng', value: `**${creditScore}/100**`, inline: true },
                    { name: 'Tao cho mày mượn tối đa', value: `**${maxLoanLimit.toLocaleString()} 🪙**`, inline: true },
                    { name: 'Đang thiếu nợ tao', value: `**${currentLoan.toLocaleString()} 🪙**`, inline: false }
                )
                .setFooter({ text: 'Lãi cắt cổ: 35% | Cứ đi làm là tao siết 35% lương. Trốn đi đâu con trai?' });
            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'borrow') {
            if (maxLoanLimit === 0) {
                return interaction.editReply('❌ Mày đang thất nghiệp cạp đất mà ăn chứ ở đó mà đòi vay tiền? Dùng `/job spin` kiếm việc làm đi thằng bá dơ!');
            }

            if (currentLoan > 0) {
                return interaction.editReply(`❌ Á chà thằng báo thủ! Mày vẫn còn đang khất tao **${currentLoan.toLocaleString()} 🪙**.\nCút về cày cuốc trả sạch nợ cũ đi rồi hẵng há mõm xin vay tiếp nhé con trai!`);
            }

            const amountStr = interaction.options.getString('amount');
            const availableToBorrow = maxLoanLimit;

            if (availableToBorrow <= 0) {
                return interaction.editReply('❌ Thẻ đen của mày bị khóa cmnr! Trả nợ đi thằng lìn.');
            }

            let borrowAmount = 0;
            if (!amountStr) return interaction.editReply('❌ Chưa nhập số tiền!');
            if (amountStr.toLowerCase() === 'max') {
                borrowAmount = availableToBorrow;
            } else {
                borrowAmount = parseInt(amountStr);
                if (isNaN(borrowAmount) || borrowAmount <= 0) {
                    return interaction.editReply('❌ Gõ số ngu như bò! Cút về học lại toán lớp 1 đi.');
                }
            }

            if (borrowAmount > availableToBorrow) {
                return interaction.editReply(`❌ Mày tính lừa ngân hàng hả? Tao chỉ cho mày mượn tối đa **${availableToBorrow.toLocaleString()} 🪙** thôi con chó!`);
            }

            const ref1 = interaction.options.getUser('ref1');
            const ref2 = interaction.options.getUser('ref2');

            if (!ref1 || !ref2) {
                return interaction.editReply('❌ Lệnh bị lỗi hoặc mày chưa tag đủ 2 người tham chiếu (bảo lãnh)! Thử dùng lệnh `g!loan borrow` thay vì dấu `/` nếu Discord bị lag.');
            }

            if (ref1.id === userId || ref2.id === userId || ref1.id === ref2.id || ref1.bot || ref2.bot) {
                return interaction.editReply('❌ Tag người tham chiếu đàng hoàng! Không tag chính mình, không tag 1 người 2 lần, đéo tag bot!');
            }

            // Tiền gốc + 35% lãi suất cố định
            const totalDebt = Math.floor(borrowAmount * 1.35);

            await updateBalance(userId, borrowAmount); // Nhận tiền mặt
            await updateLoan(userId, totalDebt); // Ghi nợ + lãi
            await updateLoanDetails(userId, [ref1.id, ref2.id], null, 0); // Lưu references

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('✅ RẢI HỌ THÀNH CÔNG')
                .setDescription(`Đã quăng cho mày **${borrowAmount.toLocaleString()} 🪙** vào mõm!\n\n` +
                    `📈 **Lãi cắt cổ:** 35%\n` +
                    `💸 **Sổ ghi nợ:** ${totalDebt.toLocaleString()} 🪙\n\n` +
                    `*(Cứ đi làm \`/work\` là giang hồ tới siết 35% lương. Liệu hồn mà trả!)*`);

            // Thông báo lên kênh đòi nợ
            try {
                const alertChannel = interaction.client.channels.cache.get('1525454150803128371');
                if (alertChannel) {
                    await alertChannel.send(`⚠️ **CẢNH BÁO NỢ XẤU**\nThằng bá dơ <@${userId}> vừa bốc bát họ số tiền **${borrowAmount.toLocaleString()} 🪙**.\nTổng nợ phải trả: **${totalDebt.toLocaleString()} 🪙**.\nGiang hồ đã đưa mày vào tầm ngắm, liệu hồn mà cày cuốc trả nợ đi con trai!\nNgười tham chiếu: <@${ref1.id}> <@${ref2.id}>`);
                }
            } catch (err) {
                console.log("Không thể gửi thông báo vay nợ", err);
            }

            // Gửi tin nhắn riêng bốc bát họ
            try {
                const dmTemplates = [
                    "CẢNH BÁO ĐỐI TƯỢNG {user} đang có hành vi bốc bát họ của NHÀ CÁI GUNTER. Bọn tao đã nắm danh bạ, địa chỉ IP của mày. Khôn hồn thì cày cuốc mà trả nợ {debt} 🪙. Đừng để bọn tao lôi đầu giám đốc, người yêu cũ mày ra đòi nợ thay nhé thằng lỏi!",
                    "Mặt cặc quái thái {user}! Đừng bao giờ nghĩ quỵt được nợ của anh em Gunter. Nợ {debt} 🪙 không tự mất đi, nó chỉ chuyển từ ví mày sang máu của mày. Bỏ ngay tư tưởng trốn nợ đi con trai, cày /work đi đéo nói nhiều!",
                    "Giờ sao? Cầm {borrowed} 🪙 của bọn tao về xài cho sướng rồi định trốn à {user}? Đang có công ăn việc làm /work tử tế. Trả {debt} 🪙 nhanh, đừng để tao quậy nát cái server này tìm mày!",
                    "Tử tế với mày mày đéo muốn đúng không {user}? Cơ hội cuối cùng trước khi cái bản mặt avatar của mày bị đăng lên mạng xã hội là thằng bốc bát họ đéo chịu trả. Nợ {debt} 🪙, lo mà cày trả đi con chó!",
                    "{user}, mày đéo trả nợ {debt} 🪙 cho app Gunter Tín Dụng thì để bọn tao lôi đầu từng thằng đệ mày ra trả thay. Đăng tải mặt mày lên cờ bạc mạng. Có mấy đồng bạc lẻ mà trốn chui trốn nhủi như con chó rách!",
                    "THÔNG BÁO TÌM CHÓ LẠC: Tên {user}, vừa cạp {borrowed} 🪙 của ngân hàng Gunter. Nợ tổng {debt} 🪙. Ai thấy thằng này ở đâu xin báo ngay cho giang hồ Gunter để tới cắt gân nó. Cảm ơn hậu tạ!",
                    "Mày tưởng mày vay xong là ấm à {user}? Hệ thống đã kích hoạt chế độ dí nợ tự động. Mỗi lần mày đi làm là tao siết cổ 35% lương. Nợ {debt} 🪙, trốn đi đâu cho thoát, hả con?",
                    "Hồ sơ bốc bát họ của mày đã được chuyển qua bộ phận Xử Lý Nợ Xấu Cấp Độ Đỏ. Mày nợ {debt} 🪙. Bọn tao đã gửi giang hồ xăm trổ đứng rình sẵn ngoài cửa mỗi khi mày gõ /work. Liệu hồn!",
                    "Alo {user}? Anh em tao ở Gunter Finance đã duyệt giải ngân {borrowed} 🪙 cho mày. Lãi cắt cổ, nợ tổng {debt} 🪙. Nhớ làm lụng chăm chỉ, không trả nợ là tao bắt mày đi nhặt rác cả đời đấy con ạ!",
                    "Đừng như con nít lên ba {user}! Lớn rồi, có vay có trả. Gói họ {debt} 🪙 của mày đã chính thức có hiệu lực. Nửa đêm ngủ cẩn thận, tao tới đòi nợ lúc nào đéo biết đâu.",
                    "[THÔNG BÁO TỪ CÔNG TY TÀI CHÍNH GUNTER] 📢\nCẢNH BÁO ĐỐI TƯỢNG {user} đang có hành vi bốc bát họ của hệ thống tín dụng đen Gunter. Bọn tao đã trích xuất danh bạ, địa chỉ IP và lịch sử duyệt web của mày! Khôn hồn thì cày cuốc mà trả nợ {debt} 🪙 ngay hôm nay. Đừng để bọn tao lôi đầu giám đốc, đồng nghiệp và người yêu cũ mày ra đòi nợ thay nhé thằng lỏi! Đã vay là phải trả!",
                    "VÔ LÊ {user}! Đừng bao giờ nghĩ quỵt được nợ của anh em Gunter. Nợ {debt} 🪙 không tự mất đi, nó chỉ chuyển từ ví mày sang máu của mày. Bỏ ngay tư tưởng trốn nợ đi con trai, tao đã phái 5 anh em xăm trổ đứng chờ ở server rồi, cày /work đi đéo nói nhiều! Mỗi giây mày thở là tiền lãi đang tăng lên đấy!",
                    "Giờ sao? Cầm {borrowed} 🪙 của bọn tao về xài cho sướng, bú rượu ôm gái rồi định trốn à {user}? Hệ thống ghi nhận mày đang có công ăn việc làm tử tế. Lệnh siết nợ tự động đã kích hoạt! Trả ngay {debt} 🪙 nhanh gọn lẹ, đừng để tao quậy nát cái server này tìm mày! Đến lúc đó thì đừng trách tại sao nước biển lại mặn!",
                    "Tử tế với mày mày đéo muốn đúng không {user}? Đây là CƠ HỘI CUỐI CÙNG trước khi cái bản mặt avatar của mày bị in lên tờ rơi dán khắp các cột điện và đăng lên các hội nhóm cờ bạc mạng. Tội danh: Bùng họ, lừa đảo chiếm đoạt {debt} 🪙. Lo mà gõ lệnh đi cày trả đi con chó, đừng để giọt nước tràn ly!",
                    "THÔNG BÁO KHẨN CẤP ĐẾN KẺ LỪA ĐẢO {user}: Mày đéo trả nợ {debt} 🪙 cho app Gunter Tín Dụng thì để bọn tao lôi đầu từng thằng đệ, từng người tham chiếu của mày ra chửi rủa cho chúng nó trả thay. Có mấy đồng bạc lẻ {borrowed} 🪙 mà trốn chui trốn nhủi như con gián! Hèn vãi lồn!",
                    "THÔNG BÁO TÌM TRẺ LẠC (KÈM LỆNH TRUY NÃ): Tên tội phạm {user}, vừa cạp {borrowed} 🪙 của ngân hàng Gunter. Nợ tổng cộng lên tới {debt} 🪙. Ai thấy thằng bá dơ này ở đâu xin báo ngay cho đường dây nóng của giang hồ Gunter để tới tận nơi cắt gân nó. Phần thưởng hậu hĩnh cho ai giao nộp thằng trốn nợ này!",
                    "Mày tưởng mày vay xong là ấm êm ngủ ngon à {user}? Hệ thống đã kích hoạt chế độ dí nợ tự động chạy bằng AI. Mỗi lần mày đi làm là tao siết cổ 35% lương, đéo trượt phát nào. Số nợ {debt} 🪙 của mày đã được ghi vào sổ Nam Tào, trốn đi đâu cho thoát hả con? Xuống âm phủ tao cũng theo đòi!",
                    "HỒ SƠ BỐC BÁT HỌ của mày đã được chuyển qua bộ phận Xử Lý Nợ Xấu Cấp Độ Đỏ (FE Gunter). Tổng dư nợ: {debt} 🪙. Bọn tao đã gửi 2 thằng giang hồ cầm mã tấu đứng rình sẵn ngoài cửa mỗi khi mày gõ lệnh /work. Liệu hồn mà cư xử cho giống một con người có trách nhiệm đi!",
                    "Alo {user}? Giọng mày nghe quen lắm! Phải {user} không em? Em đừng có chối, bọn anh đã duyệt giải ngân thành công {borrowed} 🪙 cho mày gỡ gạc. Nhắc nhẹ: Lãi suất của tao là lãi cắt cổ, nợ tổng {debt} 🪙. Nhớ làm lụng chăm chỉ, không trả nợ là tao bắt mày đi nhặt rác cả đời đấy con ạ! Có vay có trả, không trả tao đánh cho má nhận không ra!",
                    "Đừng hành xử như con nít lên ba nữa {user}! Lớn rồi, có chơi có chịu, có vay có trả. Gói họ {debt} 🪙 của mày đã chính thức có hiệu lực trên toàn cõi server. Nửa đêm đi ngủ cẩn thận đóng chặt cửa sổ vào, tao tới đòi nợ lúc nào đéo biết đâu. Nhớ đấy!"
                ];

                const randomDm = dmTemplates[Math.floor(Math.random() * dmTemplates.length)]
                    .replace(/{user}/g, interaction.user.username)
                    .replace(/{borrowed}/g, borrowAmount.toLocaleString())
                    .replace(/{debt}/g, totalDebt.toLocaleString());

                await interaction.user.send(randomDm);
            } catch (err) {
                console.log("Không thể gửi DM đòi nợ cho user", err);
            }

            // Gửi tin nhắn mỉa mai người tham chiếu ngay lập tức
            try {
                const initialRefMsgs = [
                    "Ê thằng đầu nợn, thằng {user} bạn chí cốt của mày đi vay tiền ngân hàng Gunter {borrowed} 🪙 mà nó dám ghi tên mày làm người bảo lãnh kìa! Ráng mà giữ liên lạc với nó, nó mà trốn nợ {debt} 🪙 thì mày cũng đéo yên đâu nhé!",
                    "Chúc mừng! Mày vừa được bổ nhiệm làm 'Người Bảo Lãnh Bất Đắc Dĩ' cho khoản nợ {debt} 🪙 của thằng {user}. Khuyên nó lo cày `/work` trả nợ đi trước khi giang hồ tìm đến nhà mày!",
                    "Thằng {user} óc cứt vừa bốc bát họ {borrowed} 🪙 và lấy mày ra làm bia đỡ đạn. Nếu nó không trả nợ {debt} 🪙, mày chuẩn bị tinh thần bị spam tin nhắn mỗi ngày đi nhé!",
                    "Alo cu em ơi ơi, có thằng bá dơ tên {user} vừa ghi cu em vào danh sách liên đới nợ nần rồi. Nó đang nợ {debt} 🪙. Đi hối nó trả nợ ngay đi kẻo mang họa vào thân!",
                    "Ê thằng lồn, nãy thằng bạn đầu cặc súc sinh {user} của mày đi vay tiền ngân hàng Gunter {borrowed} 🪙 mà nó dám ghi tên mày làm người bảo lãnh kìa! Ráng mà giữ liên lạc với nó, nó mà bùng họ {debt} 🪙 thì mày cũng đéo yên đâu nhé! Bọn tao tìm không được nó thì tao lôi đầu mày ra trả thay!",
                    "Chúc mừng! Mày vừa được bổ nhiệm làm 'Người Bảo Lãnh Bất Đắc Dĩ' cho khoản nợ xấu {debt} 🪙 của thằng {user}. Khuyên nó lo cày `/work` trả nợ đi trước khi giang hồ tìm đến nhà mày! Nó mà chặn số thì bọn tao tự động trừ tiền của mày đấy!",
                    "CẢNH BÁO: Thằng bá dơ {user} vừa bốc bát họ {borrowed} 🪙 và lấy mày ra làm bia đỡ đạn. Nếu nó không trả số nợ {debt} 🪙, mày chuẩn bị tinh thần bị spam tin nhắn mỗi ngày đi nhé! Khôn hồn thì hối thúc nó cày tiền đi!",
                    "Alo thằng lồn ơi, có thằng cờ bạc tên {user} vừa ghi mày vào danh sách liên đới nợ nần rồi. Nó đang ôm khoản nợ {debt} 🪙. Đi hối nó trả nợ ngay lập tức kẻo mang họa vào thân! Đừng để bọn tao phải mang mắm tôm tới server của mày!",
                    "THÔNG BÁO TỪ ĐỘI ĐÒI NỢ GUNTER: Xin chào người tham chiếu, chúng tôi nhận thấy hồ sơ bốc họ của {user} có tên mày. Số nợ hiện tại: {debt} 🪙. Yêu cầu mày hợp tác nhắc nhở người thân trả nợ đúng hạn. Đừng để tình anh em sứt mẻ chỉ vì mấy đồng bạc lẻ này!"
                ];

                for (const r of [ref1, ref2]) {
                    if (r) {
                        try {
                            const rMsg = initialRefMsgs[Math.floor(Math.random() * initialRefMsgs.length)]
                                .replace(/{user}/g, interaction.user.username)
                                .replace(/{borrowed}/g, borrowAmount.toLocaleString())
                                .replace(/{debt}/g, totalDebt.toLocaleString());
                            await r.send(`🔪 **THÔNG BÁO LIÊN ĐỚI:**\n\n${rMsg}`);
                        } catch (e) { }
                    }
                }
            } catch (err) { }

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'repay') {
            if (currentLoan <= 0) {
                return interaction.editReply('✅ Mày có nợ cắc bạc nào đâu mà đòi trả? Bị ảo tưởng à?');
            }

            const amountStr = interaction.options.getString('amount');
            let repayAmount = 0;

            if (!amountStr) return interaction.editReply('❌ Chưa nhập số tiền trả!');
            if (amountStr.toLowerCase() === 'all') {
                repayAmount = currentLoan;
            } else {
                repayAmount = parseInt(amountStr);
                if (isNaN(repayAmount) || repayAmount <= 0) {
                    return interaction.editReply('❌ Trả số tiền đéo gì vớ vẩn vậy? Sủa số đàng hoàng xem nào.');
                }
            }

            if (repayAmount > currentLoan) {
                repayAmount = currentLoan;
            }

            if (user.balance < repayAmount) {
                return interaction.editReply(`❌ Mõm thì to mà trong túi có đúng **${user.balance.toLocaleString()} 🪙**? Mày tính lừa giang hồ à? Xì thêm tiền ra đây!`);
            }

            await updateBalance(userId, -repayAmount); // Trừ tiền mặt
            await updateLoan(userId, -repayAmount);    // Trừ nợ

            // Tăng điểm tín dụng nếu trả nợ
            let creditBonus = 0;
            if (repayAmount > 0) {
                const bonus = Math.max(1, Math.floor((repayAmount / maxLoanLimit) * 10));
                await updateCreditScore(userId, bonus);
                creditBonus = bonus;
            }

            const newLoan = currentLoan - repayAmount;

            // Xử lý trả lại cần câu bị siết (nếu có)
            let returnText = '';
            if (user.seizedRod && repayAmount >= (user.seizedRequire || 0)) {
                // Trả lại cần
                const rodId = user.seizedRod;
                const rodData = RODS.find(r => r.id === rodId);
                if (rodData) {
                    await setUserRod(userId, rodId, rodData.maxDurability); // Trả lại cần với độ bền full
                    await updateLoanDetails(userId, undefined, null, 0); // Xóa trạng thái siết
                    returnText = `\n\n🎣 **ĐÃ TRẢ LẠI CẦN CÂU**: Giang hồ đã trả lại **${rodData.name}** cho mày. Liệu hồn mà cày cuốc!`;
                }
            } else if (user.seizedRod) {
                returnText = `\n\n⚠️ **CHƯA ĐỦ TRẢ CẦN**: Mày phải trả tối thiểu **${(user.seizedRequire || 0).toLocaleString()} 🪙** để chuộc lại cần câu!`;
            }

            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle('💵 TRẢ TIỀN RỒI ĐẤY Ạ')
                .setDescription(`Giỏi lắm con trai, tao đã thu **${repayAmount.toLocaleString()} 🪙**.\n\n` +
                    `📈 Điểm tín dụng tăng: **+${creditBonus}**\n` +
                    `📉 Dư nợ còn lại: **${newLoan.toLocaleString()} 🪙**. Chưa xong đâu!` + returnText);
            return interaction.editReply({ embeds: [embed] });
        }
    },

    async executePrefix(message, args, client) {
        const subcommand = args[0] ? args[0].toLowerCase() : 'info';
        const amountStr = args[1] || '';

        if (!['info', 'borrow', 'repay'].includes(subcommand)) {
            return message.reply('❌ Bấm lệnh ngu như chó! Cú pháp đây:\n`g!loan info` (xem sổ nợ)\n`g!loan borrow <tiền | max>` (mượn tiền)\n`g!loan repay <tiền | all>` (trả nợ)');
        }

        if ((subcommand === 'borrow' || subcommand === 'repay') && !amountStr) {
            return message.reply(`❌ Đéo nhập số tiền thì tao biết mượn hay trả bao nhiêu? (VD: \`g!loan ${subcommand} 100000\`)`);
        }

        let ref1User = null;
        let ref2User = null;
        if (subcommand === 'borrow') {
            const mentions = Array.from(message.mentions.users.values());
            if (mentions.length < 2) {
                return message.reply('❌ Khi mượn tiền mày phải tag 2 người để làm tham chiếu (người bảo lãnh). VD: `g!loan borrow 1000 @user1 @user2`');
            }
            ref1User = mentions[0];
            ref2User = mentions[1];
        }

        const replyMsg = await message.reply('🏦 Đang gọi đàn em ra đòi nợ...');

        const fakeInteraction = {
            user: message.author,
            client: client,
            options: {
                getSubcommand: () => subcommand,
                getString: (name) => {
                    if (name === 'amount') return amountStr;
                    return null;
                },
                getUser: (name) => {
                    if (name === 'ref1') return ref1User;
                    if (name === 'ref2') return ref2User;
                    return null;
                }
            },
            deferred: true,
            replied: true,
            deferReply: async function () { },
            editReply: async function (options) {
                return await replyMsg.edit(options);
            }
        };

        await this.execute(fakeInteraction);
    }
};
