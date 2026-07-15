const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getJobData, updateBalance, updateLastWork } = require('../../utils/economyDB');
const { jobs } = require('../../data/jobs');

const WORK_COOLDOWN = 30 * 1000; // 30 seconds

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Làm việc kiếm tiền dựa trên nghề nghiệp hiện tại của bạn (Cooldown 30s)'),

    async execute(interaction) {
        await interaction.deferReply();
        const userId = interaction.user.id;

        const { job, lastWork } = await getJobData(userId);

        // Kiểm tra xem đã có nghề chưa
        if (!job || !jobs[job]) {
            const embed = new EmbedBuilder()
                .setColor(0xe74c3c)
                .setTitle('❌ Đang ăn bám xã hội à?')
                .setDescription('Mày đang thất nghiệp cạp đất mà ăn chứ đi làm cái đéo gì?\nHãy dùng lệnh `/job spin` để kiếm việc đi thằng bá dơ!');
            return interaction.editReply({ embeds: [embed] });
        }

        // Kiểm tra cooldown 30s
        const now = Date.now();
        if (lastWork && (now - lastWork) < WORK_COOLDOWN) {
            const remaining = WORK_COOLDOWN - (now - lastWork);
            const seconds = Math.ceil(remaining / 1000);

            const embed = new EmbedBuilder()
                .setColor(0xf39c12)
                .setTitle('⏳ Nghỉ tay đi thằng culi!')
                .setDescription(`Mày vừa mới cày xong, tính làm mệt chết bỏ mạng à?\nCút ra chỗ khác nghỉ ngơi **${seconds} giây** rồi quay lại đây!`);
            return interaction.editReply({ embeds: [embed] });
        }

        const currentJob = jobs[job];

        // Random câu thoại
        const randomDialogue = currentJob.dialogues[Math.floor(Math.random() * currentJob.dialogues.length)];

        // Random tiền lương
        const originalSalary = Math.floor(Math.random() * (currentJob.maxSalary - currentJob.minSalary + 1)) + currentJob.minSalary;

        const user = await require('../../utils/economyDB').getUser(userId);
        const { updateLoan } = require('../../utils/economyDB');

        let salary = originalSalary;
        let debtPaid = 0;
        let loanInfo = '';

        let isEvadingDebt = false;
        if (job === 'tu_sena' && user.loanAmount && user.loanAmount > 0) {
            // Tú Sena có 40% cơ hội né nợ khi đi làm
            if (Math.random() < 0.4) {
                isEvadingDebt = true;
                loanInfo = `\n\n🏃‍♂️ **NÉ NỢ THÀNH CÔNG:** Chủ nợ đến tìm nhưng bạn lủi nhanh như chớp! Lương hôm nay còn nguyên! Còn nợ: ${user.loanAmount.toLocaleString()} 🪙.`;
            }
        }

        if (user.loanAmount && user.loanAmount > 0 && !isEvadingDebt) {
            // Trừ 35% lương để trả nợ
            const maxDeduct = Math.floor(originalSalary * 0.35);
            debtPaid = Math.min(maxDeduct, user.loanAmount);
            salary = originalSalary - debtPaid;
            const debtMessages = [
                "Giang hồ tới siết cổ (35%)",
                "Chủ nợ cầm mã tấu đứng chờ sẵn (35%)",
                "Bọn tao bế mày lên đồn nếu đéo trả (35%)",
                "Tiền mồ hôi nước mắt á? Đưa đây tao giữ hộ (35%)",
                "Mày tính quỵt nợ của ngân hàng Gunter à con chó? (35%)",
                "Cắt tiết mày giờ, xì tiền ra đây (35%)",
                "Làm đéo đủ trả lãi mà bày đặt ra vẻ (35%)",
                "Alo giang hồ đòi nợ thuê tới thu họ (35%)",
                "Đừng tưởng trốn nợ được bọn tao, trừ thẳng lương (35%)",
                "Mày đéo trả thì bọn tao quậy nát công ty mày (35%)"
            ];
            const randomDebtMsg = debtMessages[Math.floor(Math.random() * debtMessages.length)];

            await updateLoan(userId, -debtPaid);
            loanInfo = `\n\n🏦 **${randomDebtMsg}:** -${debtPaid.toLocaleString()} 🪙\n📉 **Còn nợ tao:** ${(user.loanAmount - debtPaid).toLocaleString()} 🪙. Trốn đi đâu?`;
        }

        // Xử lý các event đặc biệt của nghề nghiệp (Tú Sena, Jack, Ộ i i)
        let specialInfo = '';
        let penaltyAmount = 0;
        let rewardAmount = 0;
        let addedDebt = 0;

        let isPrisoned = false;
        let prisonDuration = 0;

        if (currentJob.id === 'tu_sena') {
            const inJailChannel = interaction.channelId === '1524752251502067722';
            const hasJailRole = interaction.member && interaction.member.roles.cache.has('1524641571990142986');

            if (inJailChannel || hasJailRole) {
                const requiredBail = 20_000_000;
                const randJail = Math.random();

                if (randJail < 0.4) {
                    // Sự kiện Chan đê
                    penaltyAmount = Math.floor(Math.random() * 2000000) + 1000000; // Phạt 1M - 3M
                    salary = 0;
                    if (user.balance < penaltyAmount) {
                        const missing = penaltyAmount - user.balance;
                        penaltyAmount = user.balance;
                        addedDebt = missing;
                    }
                    specialInfo = `\n\n🎧 **CÓ MỘT THẰNG MỒM LÈO NHÈO BẢO!**\nCó thằng mồm lèo nhại lại: *"Chan đê, chan mẹ mày đê"*. Mày cay cú chửi lại: *"Chan, chan cái mẹ mày cái thằng mặt lồn này!"*\nQuản giáo ngứa mắt vụt cho mày một gậy, trừ cmn **${(penaltyAmount + addedDebt).toLocaleString()} 🪙** tiền bồi thường!`;
                } else {
                    // Làm tạp vụ kiếm tiền chuộc thân
                    salary = Math.floor(Math.random() * 500000) + 500000; // Nhận 500k-1M
                    if (user.balance + salary >= requiredBail) {
                        penaltyAmount = requiredBail;
                        specialInfo = `\n\n⛺ **HIỆU TRƯỞNG ĐẠI HỌC BÔN BA!**\nMày làm tạp vụ trong tù kiếm được **${salary.toLocaleString()} 🪙**.\n✅ **ĐÃ ĐỦ TIỀN CHUỘC THÂN!** Đã đóng đủ **${requiredBail.toLocaleString()} 🪙** bảo lãnh! Tạm thời được thả tự do, về báo nhà tiếp đi con!`;
                        try {
                            if (hasJailRole) {
                                await interaction.member.roles.remove('1524641571990142986').catch(() => false);
                            }
                        } catch (e) { }
                    } else {
                        specialInfo = `\n\n⛺ **KIẾP NGỒI TÙ!**\nMày rửa bát, quét rác trong tù kiếm được **${salary.toLocaleString()} 🪙**.\n📉 *Vẫn chưa đủ tiền bảo lãnh! Cần gom đủ **${requiredBail.toLocaleString()} 🪙** để được thả (hiện có ${(user.balance + salary).toLocaleString()}). Ráng lên Hiệu trưởng!*`;
                    }
                }
            } else {
                const randTusena = Math.random();
                if (randTusena < 0.3) {
                    // Đua vịt (30%)
                    const isWin = Math.random() < 0.5;
                    if (isWin) {
                        rewardAmount = Math.floor(Math.random() * 10000000) + 5000000;
                        salary += rewardAmount;
                        specialInfo = `\n\n🦆 **GÀO THÉT TRƯỜNG ĐUA VỊT!**\nSena All-in con vịt số 3 và nó win! "Đó! Thấy anh mày đỉnh chưa!" - Nhận **${rewardAmount.toLocaleString()} 🪙**!`;
                    } else {
                        penaltyAmount = Math.floor(Math.random() * 5000000) + 2000000;
                        if (user.balance < penaltyAmount) {
                            const missing = penaltyAmount - user.balance;
                            penaltyAmount = user.balance;
                            addedDebt = missing;
                            specialInfo = `\n\n🦆 **ĐUA VỊT THẤT BẠI!**\nSena All-in con vịt số 5 nhưng nó bơi ngược! Bay màu **${(penaltyAmount + missing).toLocaleString()} 🪙**, ngân hàng tự ghi nợ thêm **${addedDebt.toLocaleString()} 🪙**! "Trời ơi má ơiiiii!"`;
                        } else {
                            specialInfo = `\n\n🦆 **ĐUA VỊT THẤT BẠI!**\nSena gào rát họng nhưng con vịt số 2 dậm chân tại chỗ! Bay màu **${penaltyAmount.toLocaleString()} 🪙**!`;
                        }
                    }
                } else if (randTusena < 0.5) {
                    // Bị cảnh sát bắt (20%)
                    penaltyAmount = Math.floor(Math.random() * 3000000) + 2000000;
                    salary = 0;
                    if (user.balance < penaltyAmount) {
                        penaltyAmount = user.balance;
                        isPrisoned = true;
                        prisonDuration = 10;
                    }
                    specialInfo = `\n\n🚨 **CẢNH SÁT ẬP VÀO!**\nBị bế lên đồn vì tội tổ chức đánh bạc, nộp phạt **${penaltyAmount.toLocaleString()} 🪙**!`;
                    if (isPrisoned) {
                        specialInfo += `\n⛓️ **TRUY TỐ:** Mày đéo đủ tiền nộp phạt, đi tù **${prisonDuration} phút**!`;
                    }
                }
            }
        } else if (currentJob.id === 'jack') {
            const randJack = Math.random();
            if (randJack < 0.25) {
                // 25% bị thu tiền nuôi con (cố định 5 củ)
                penaltyAmount = 5000000;
                specialInfo = `\n\n🍼 **TING TING!**\nĐến tháng chu cấp cho Thiên Ân, tự động trừ **5,000,000 🪙** tiền nuôi con! Trách nhiệm của 1 người cha!`;
            } else if (randJack < 0.55) {
                // 30% bị anti-fan dí, view tăng đột biến
                rewardAmount = Math.floor(Math.random() * 5000000) + 3000000; // Nhận thêm 3-8 triệu
                salary += rewardAmount;
                specialInfo = `\n\n🏃‍♂️ **BỊ ANTI-FAN DÍ!**\nBạn bị Đóm con và anti-fan bủa vây, view MV tăng đột biến! Nhận thêm **${rewardAmount.toLocaleString()} 🪙**! Âm nhạc của tôi là không thể cản bước!`;
            }
        } else if (currentJob.id === 'o_i_i') {
            const randOii = Math.random();
            if (randOii < 0.2) { // 20% nổ donate siêu lớn
                rewardAmount = Math.floor(Math.random() * 10000000) + 5000000; // 5-15 triệu
                salary += rewardAmount;
                specialInfo = `\n\n🤑 **DONATE KHỦNG!**\nCó đại gia Donate nổ sập kênh, nhận ngay **${rewardAmount.toLocaleString()} 🪙**! Chúc anh sức khỏe, công việc thuận lợi!`;
            } else if (randOii < 0.4) { // 20% bị vặt tiền xây trường/cầu (5-10 triệu)
                penaltyAmount = Math.floor(Math.random() * 5000000) + 5000000;
                specialInfo = `\n\n🧱 **TỪ THIỆN XÂY TRƯỜNG!**\nHô hào đóng góp xây trường/cầu, bạn bị trừ **${penaltyAmount.toLocaleString()} 🪙**.`;

                // Cơ chế thêm nợ nếu không đủ tiền
                if (user.balance + salary - debtPaid < penaltyAmount) {
                    const thieu = penaltyAmount - (user.balance + salary - debtPaid);
                    addedDebt = thieu;
                    specialInfo += `\nTiền trong người đéo đủ? Ngân hàng đã tự động ép bạn vay **${addedDebt.toLocaleString()} 🪙** để làm từ thiện! Uy tín làm đầu!`;
                }
            }
        } else if (currentJob.id === 'ba_phuong_hang') {
            if (Math.random() < 0.3) { // 30% dính án
                penaltyAmount = Math.floor(Math.random() * 5000000) + 5000000; // 5-10 triệu
                salary = 0; // Mất cả lương

                if (user.balance < penaltyAmount) {
                    penaltyAmount = user.balance; // Trừ về 0
                    isPrisoned = true;
                    prisonDuration = 30; // 30 phút
                }

                specialInfo = `\n\n🚔 **LỆNH BẮT TẠM GIAM!**\nLivestream chửi bới quá lố, bạn bị bế đi vì tội lợi dụng quyền tự do dân chủ! Nộp phạt **${penaltyAmount.toLocaleString()} 🪙**!`;
                if (isPrisoned) {
                    specialInfo += `\n⛓️ **TRUY TỐ:** Tiền đéo đủ đóng phạt, đi tù **${prisonDuration} phút**!`;
                }
            }
        } else if (currentJob.id === 'thay_ong_noi') {
            const randThay = Math.random();
            if (randThay < 0.25) { // 25% thử ADN
                penaltyAmount = Math.floor(Math.random() * 3000000) + 2000000; // 2-5 triệu
                if (user.balance < penaltyAmount) penaltyAmount = user.balance;
                salary = 0;
                specialInfo = `\n\n🧬 **ĐOÀN KIỂM TRA ĐỘT XUẤT!**\nChính quyền ập vào lấy mẫu ADN, tịnh thất bị niêm phong, bạn bị phạt **${penaltyAmount.toLocaleString()} 🪙**!`;
            } else if (randThay < 0.55) { // 30% mạnh thường quân bơm tiền
                rewardAmount = Math.floor(Math.random() * 10000000) + 10000000; // 10-20 triệu
                salary += rewardAmount;
                specialInfo = `\n\n💸 **MẠNH THƯỜNG QUÂN HẢO TÂM!**\nCộng đồng mạng hải ngoại gửi tiền "cứu trợ" tận **${rewardAmount.toLocaleString()} 🪙**! Nam mô a di đà phật!`;
            }
        } else if (currentJob.id === 'bac_vuong') {
            const randVuong = Math.random();
            if (randVuong < 0.2) { // 20% lỗ xe điện
                penaltyAmount = Math.floor(Math.random() * 20000000) + 10000000; // Phạt 10-30m
                if (user.balance < penaltyAmount) penaltyAmount = user.balance;
                salary = 0;
                specialInfo = `\n\n📉 **BÁO CÁO TÀI CHÍNH!**\nMảng xe điện Vin... à nhầm GunterFast báo lỗ quý này, bốc hơi **${penaltyAmount.toLocaleString()} 🪙**! Hãy vững tin vào công nghệ lõi!`;
            } else if (randVuong < 0.5) { // 30% chốt đơn Ocean Park
                rewardAmount = Math.floor(Math.random() * 30000000) + 20000000; // Thưởng 20-50m
                salary += rewardAmount;
                specialInfo = `\n\n🏙️ **PHÂN KHU CHÁY HÀNG!**\nChốt thành công 10 căn biệt thự Gunter Park, tiền hoa hồng chảy về **${rewardAmount.toLocaleString()} 🪙**! Đẳng cấp tinh hoa!`;
            }
        } else if (currentJob.id === 'elon_musk') {
            const randElon = Math.random();
            if (randElon < 0.2) { // 20% tên lửa nổ
                penaltyAmount = Math.floor(Math.random() * 30000000) + 20000000; // Phạt 20-50m
                if (user.balance < penaltyAmount) penaltyAmount = user.balance;
                salary = 0;
                specialInfo = `\n\n🚀💥 **BÙM!**\nTên lửa Starship nổ tung khi vừa rời bệ phóng, cổ phiếu cắm đầu, bạn mất trắng **${penaltyAmount.toLocaleString()} 🪙**! Đó là một "bước tiến học hỏi"!`;
            } else if (randElon < 0.5) { // 30% Doge pump
                rewardAmount = Math.floor(Math.random() * 50000000) + 30000000; // Thưởng 30-80m
                salary += rewardAmount;
                specialInfo = `\n\n🐕 **DOGE TO THE MOON!**\nChỉ với một chiếc Tweet nhảm nhí, Dogecoin dựng cột, bạn chốt lời **${rewardAmount.toLocaleString()} 🪙**! Easy money!`;
            }
        } else if (currentJob.id === 'mark_zuckerberg') {
            const randMark = Math.random();
            if (randMark < 0.2) { // 20% EU phạt
                penaltyAmount = Math.floor(Math.random() * 25000000) + 15000000; // Phạt 15-40m
                if (user.balance < penaltyAmount) penaltyAmount = user.balance;
                salary = 0;
                specialInfo = `\n\n⚖️ **LIÊN MINH CHÂU ÂU SỜ GÁY!**\nBị phạt vì bán dữ liệu người dùng trái phép, bay mất **${penaltyAmount.toLocaleString()} 🪙**! Hãy cẩn thận với người thằn lằn!`;
            } else if (randMark < 0.5) { // 30% Metaverse hype
                rewardAmount = Math.floor(Math.random() * 40000000) + 20000000; // Thưởng 20-60m
                salary += rewardAmount;
                specialInfo = `\n\n🥽 **METAVERSE BÙNG NỔ!**\nBán thành công lô đất ảo và skin VR, thu về **${rewardAmount.toLocaleString()} 🪙**! Thực tại là dối trá, ảo mới là chân lý!`;
            }
        }

        // Cập nhật Database
        let finalIncome = salary - penaltyAmount;
        let newBalance = await updateBalance(userId, finalIncome);
        if (addedDebt > 0) {
            await updateLoan(userId, addedDebt);
        }

        if (isPrisoned) {
            try {
                const member = await interaction.guild.members.fetch(userId);
                if (member) {
                    const roleId = '1524641571990142986'; // Role Tù
                    await member.roles.add(roleId);
                    setTimeout(async () => {
                        try {
                            await member.roles.remove(roleId);
                        } catch (e) { }
                    }, prisonDuration * 60 * 1000);
                }
            } catch (e) {
                console.error('[WORK PRISON] Lỗi:', e);
            }
        }

        await updateLastWork(userId);

        const embed = new EmbedBuilder()
            .setColor(currentJob.color)
            .setTitle(`💼 Phát lương đây thằng culi! (${currentJob.name})`)
            .setDescription(`*${randomDialogue}*\n\n` +
                `💵 Lương cơ bản: **${originalSalary.toLocaleString()} 🪙**` +
                loanInfo +
                specialInfo +
                `\n\n💰 **Thực lãnh cuối cùng:** **${finalIncome.toLocaleString()} 🪙**\n` +
                `💳 Số dư hiện tại: **${newBalance.toLocaleString()} 🪙**`)
            .setThumbnail(interaction.user.displayAvatarURL());

        return interaction.editReply({ embeds: [embed] });
    },

    async executePrefix(message, args, client) {
        const fakeInteraction = {
            user: message.author,
            member: message.member,
            channelId: message.channel.id,
            guild: message.guild,
            deferred: true,
            replied: true,
            deferReply: async function () { },
            editReply: async function (options) {
                return await message.reply(options);
            }
        };
        await this.execute(fakeInteraction);
    }
};
