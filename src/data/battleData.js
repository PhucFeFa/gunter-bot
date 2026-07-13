const WEAPONS = [
    { id: 1, name: 'Nắm Đấm', emoji: '✊', price: 0, damage: [10, 20], critRate: 0.05, critMult: 1.5, desc: 'Vũ khí mặc định. Đấm chay.' },
    { id: 2, name: 'Kiếm Gỗ', emoji: '🗡️', price: 50000, damage: [20, 35], critRate: 0.10, critMult: 1.5, desc: 'Đồ chơi trẻ em.' },
    { id: 3, name: 'Đao Rỉ Sét', emoji: '🔪', price: 200000, damage: [45, 70], critRate: 0.15, critMult: 1.6, desc: 'Dễ gây uốn ván.' },
    { id: 4, name: 'Chùy Gai', emoji: '🏏', price: 800000, damage: [90, 130], critRate: 0.15, critMult: 1.8, desc: 'Chậm nhưng đau.' },
    { id: 5, name: 'Kiếm Katana', emoji: '🤺', price: 3000000, damage: [180, 260], critRate: 0.20, critMult: 2.0, desc: 'Bén như dao cạo.' },
    { id: 6, name: 'Rìu Chiến Thần', emoji: '🪓', price: 10000000, damage: [350, 500], critRate: 0.20, critMult: 2.2, desc: 'Chẻ đôi núi đá.' },
    { id: 7, name: 'Ma Pháp Trượng', emoji: '🪄', price: 35000000, damage: [700, 1000], critRate: 0.25, critMult: 2.3, desc: 'Sức mạnh phép thuật.' },
    { id: 8, name: 'Thánh Kiếm Excalibur', emoji: '⚔️', price: 100000000, damage: [1500, 2200], critRate: 0.25, critMult: 2.5, desc: 'Kiếm của các vị vua.' },
    { id: 9, name: 'Hắc Long Đao', emoji: '🐉', price: 300000000, damage: [3000, 4500], critRate: 0.30, critMult: 2.6, desc: 'Lưỡi đao ngâm máu rồng.' },
    { id: 10, name: 'Găng Tay Vô Cực', emoji: '🧤', price: 1000000000, damage: [6000, 9000], critRate: 0.30, critMult: 2.8, desc: 'Búng tay là bay màu.' },
    { id: 11, name: 'Trượng Ma Thần', emoji: '🔮', price: 3000000000, damage: [12000, 18000], critRate: 0.35, critMult: 3.0, desc: 'Gọi hồn kẻ chết, nuốt chửng linh hồn.' },
    { id: 12, name: 'Song Kiếm Phá Trần', emoji: '⚔️', price: 10000000000, damage: [25000, 38000], critRate: 0.35, critMult: 3.2, desc: 'Chém đứt vạn vật, phá vỡ hư không.' },
    { id: 13, name: 'Rìu Khổng Lồ Ymir', emoji: '🪓', price: 30000000000, damage: [50000, 75000], critRate: 0.40, critMult: 3.5, desc: 'Sức mạnh của người khổng lồ băng.' },
    { id: 14, name: 'Cung Mặt Trời', emoji: '🏹', price: 100000000000, damage: [120000, 180000], critRate: 0.45, critMult: 3.8, desc: 'Bắn rớt cả mặt trời.' },
    { id: 15, name: 'Thanh Gươm Vũ Trụ', emoji: '🌌', price: 500000000000, damage: [300000, 450000], critRate: 0.50, critMult: 4.0, desc: 'Cắt đôi vũ trụ, sáng tạo ngân hà.' }
];

const ARMORS = [
    { id: 1, name: 'Áo Vải', emoji: '👕', price: 0, defense: 0, hpBonus: 100, desc: 'Mặc cho có.' },
    { id: 2, name: 'Giáp Da', emoji: '🦺', price: 50000, defense: 5, hpBonus: 250, desc: 'Chống trầy xước.' },
    { id: 3, name: 'Giáp Sắt', emoji: '🛡️', price: 200000, defense: 10, hpBonus: 500, desc: 'Nặng nề nhưng an toàn.' },
    { id: 4, name: 'Giáp Bạc', emoji: '🥋', price: 800000, defense: 15, hpBonus: 1200, desc: 'Sáng bóng, chống tà ma.' },
    { id: 5, name: 'Giáp Hiệp Sĩ', emoji: '🪖', price: 3000000, defense: 20, hpBonus: 2500, desc: 'Trang bị hoàng gia.' },
    { id: 6, name: 'Giáp Titan', emoji: '🦾', price: 10000000, defense: 25, hpBonus: 5000, desc: 'Công nghệ tiên tiến.' },
    { id: 7, name: 'Áo Choàng Bóng Tối', emoji: '🥷', price: 35000000, defense: 30, hpBonus: 10000, desc: 'Khó bị đòn trúng.' },
    { id: 8, name: 'Giáp Thiên Thần', emoji: '👼', price: 100000000, defense: 35, hpBonus: 20000, desc: 'Ánh sáng bảo hộ.' },
    { id: 9, name: 'Giáp Vảy Rồng', emoji: '🐉', price: 300000000, defense: 40, hpBonus: 40000, desc: 'Không thể xuyên thủng.' },
    { id: 10, name: 'Hào Quang Đấng', emoji: '✨', price: 1000000000, defense: 45, hpBonus: 85000, desc: 'Bảo hộ thần thánh.' },
    { id: 11, name: 'Giáp Ác Quỷ', emoji: '👿', price: 3000000000, defense: 50, hpBonus: 180000, desc: 'Lấy sức mạnh từ địa ngục.' },
    { id: 12, name: 'Chiến Bào Tiên Nhân', emoji: '🥻', price: 10000000000, defense: 55, hpBonus: 380000, desc: 'Bay lượn như tiên, khó trúng đòn.' },
    { id: 13, name: 'Giáp Hư Không', emoji: '🕳️', price: 30000000000, defense: 60, hpBonus: 800000, desc: 'Hút mọi đòn đánh vào lỗ đen.' },
    { id: 14, name: 'Vòng Sáng Thiên Hà', emoji: '💫', price: 100000000000, defense: 65, hpBonus: 1800000, desc: 'Phản chiếu sát thương.' },
    { id: 15, name: 'Áo Choàng Đấng Tối Cao', emoji: '👑', price: 500000000000, defense: 70, hpBonus: 3500000, desc: 'Phòng ngự tuyệt đối.' }
];

module.exports = { WEAPONS, ARMORS };
