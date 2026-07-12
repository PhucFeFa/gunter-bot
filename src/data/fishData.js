/**
 * fishData.js – Dữ liệu cá (90 loại) và cần câu (15 loại)
 * Zones: 1=Vịnh Làng Chài, 2=Đại Dương Sâu Thẳm, 3=Vùng Biển Tử Thần
 * Tier 1-8 (1=nhỏ/rẻ, 8=lớn/đắt)
 * basePrice (VNĐ xu): tier1=1k-5k, tier8=3M-15M
 * size: cm, price = basePrice * (size/minSize)
 */

const ZONES = [
    { id: 1, name: 'Vịnh Làng Chài', emoji: '🏖️', roleColor: 0x00BFFF },
    { id: 2, name: 'Đại Dương Sâu Thẳm', emoji: '🌊', roleColor: 0x0000CD },
    { id: 3, name: 'Vùng Biển Tử Thần', emoji: '💀', roleColor: 0x8B0000 },
];

// { id, name, emoji, zone, tier, basePrice, minSize, maxSize }
const FISH_LIST = [
    // ── ZONE 1 – Vịnh Làng Chài (tier 1-5) ─────────────────────
    { id: 1, name: 'Cá Bống', emoji: '🐟', zone: 1, tier: 1, basePrice: 1000, minSize: 5, maxSize: 20 },
    { id: 2, name: 'Cá Rô', emoji: '🐟', zone: 1, tier: 1, basePrice: 1500, minSize: 8, maxSize: 25 },
    { id: 3, name: 'Cá Diếc', emoji: '🐟', zone: 1, tier: 1, basePrice: 2000, minSize: 10, maxSize: 30 },
    { id: 4, name: 'Cá Linh', emoji: '🐟', zone: 1, tier: 1, basePrice: 1200, minSize: 6, maxSize: 18 },
    { id: 5, name: 'Cá Cơm', emoji: '🐟', zone: 1, tier: 1, basePrice: 1000, minSize: 5, maxSize: 15 },
    { id: 6, name: 'Cá Chạch', emoji: '🐟', zone: 1, tier: 1, basePrice: 2500, minSize: 15, maxSize: 40 },
    { id: 7, name: 'Cá Thia', emoji: '🐠', zone: 1, tier: 1, basePrice: 1800, minSize: 5, maxSize: 12 },
    { id: 8, name: 'Cá Sơn', emoji: '🐠', zone: 1, tier: 1, basePrice: 2200, minSize: 8, maxSize: 22 },
    { id: 9, name: 'Cá Lòng Tong', emoji: '🐟', zone: 1, tier: 1, basePrice: 1000, minSize: 4, maxSize: 12 },
    { id: 10, name: 'Cá Giò Nhỏ', emoji: '🐟', zone: 1, tier: 1, basePrice: 3000, minSize: 20, maxSize: 45 },
    { id: 11, name: 'Cá Trê', emoji: '🐟', zone: 1, tier: 2, basePrice: 5000, minSize: 20, maxSize: 60 },
    { id: 12, name: 'Cá Lóc', emoji: '🐟', zone: 1, tier: 2, basePrice: 6000, minSize: 25, maxSize: 70 },
    { id: 13, name: 'Cá Chép', emoji: '🐟', zone: 1, tier: 2, basePrice: 7000, minSize: 30, maxSize: 80 },
    { id: 14, name: 'Cá Trắm', emoji: '🐟', zone: 1, tier: 2, basePrice: 8000, minSize: 35, maxSize: 100 },
    { id: 15, name: 'Cá Mè', emoji: '🐟', zone: 1, tier: 2, basePrice: 5500, minSize: 25, maxSize: 75 },
    { id: 16, name: 'Cá Phi', emoji: '🐟', zone: 1, tier: 2, basePrice: 4500, minSize: 18, maxSize: 55 },
    { id: 17, name: 'Cá Rô Phi Đen', emoji: '🐟', zone: 1, tier: 2, basePrice: 5000, minSize: 20, maxSize: 60 },
    { id: 18, name: 'Cá Tai Tượng', emoji: '🐟', zone: 1, tier: 2, basePrice: 9000, minSize: 40, maxSize: 120 },
    { id: 19, name: 'Cá Sặc', emoji: '🐠', zone: 1, tier: 2, basePrice: 4000, minSize: 12, maxSize: 35 },
    { id: 20, name: 'Cá Cờ', emoji: '🐠', zone: 1, tier: 2, basePrice: 4500, minSize: 15, maxSize: 40 },
    { id: 21, name: 'Cá Vược Sông', emoji: '🐟', zone: 1, tier: 3, basePrice: 15000, minSize: 40, maxSize: 100 },
    { id: 22, name: 'Cá Đù', emoji: '🐟', zone: 1, tier: 3, basePrice: 18000, minSize: 45, maxSize: 120 },
    { id: 23, name: 'Cá Úc', emoji: '🐟', zone: 1, tier: 3, basePrice: 20000, minSize: 50, maxSize: 130 },
    { id: 24, name: 'Cá Hố', emoji: '🐟', zone: 1, tier: 3, basePrice: 25000, minSize: 60, maxSize: 150 },
    { id: 25, name: 'Cá Giò', emoji: '🐟', zone: 1, tier: 3, basePrice: 22000, minSize: 55, maxSize: 140 },
    { id: 26, name: 'Cá Dứa', emoji: '🐟', zone: 1, tier: 3, basePrice: 30000, minSize: 70, maxSize: 180 },
    { id: 27, name: 'Cá Mú Nhỏ', emoji: '🐡', zone: 1, tier: 3, basePrice: 35000, minSize: 80, maxSize: 200 },
    { id: 28, name: 'Cá Trích', emoji: '🐟', zone: 1, tier: 3, basePrice: 12000, minSize: 30, maxSize: 80 },
    { id: 29, name: 'Cá Bướm Đốm', emoji: '🐠', zone: 1, tier: 3, basePrice: 20000, minSize: 20, maxSize: 50 },
    { id: 30, name: 'Cá Nóc Nhỏ', emoji: '🐡', zone: 1, tier: 3, basePrice: 18000, minSize: 15, maxSize: 40 },
    { id: 31, name: 'Cá Thu Nhỏ', emoji: '🐟', zone: 1, tier: 4, basePrice: 60000, minSize: 80, maxSize: 180 },
    { id: 32, name: 'Cá Ngừ Nhỏ', emoji: '🐟', zone: 1, tier: 4, basePrice: 80000, minSize: 100, maxSize: 250 },
    { id: 33, name: 'Cá Hồng Nhỏ', emoji: '🐠', zone: 1, tier: 4, basePrice: 70000, minSize: 90, maxSize: 220 },
    { id: 34, name: 'Cá Cam Nhỏ', emoji: '🐠', zone: 1, tier: 4, basePrice: 65000, minSize: 85, maxSize: 210 },
    { id: 35, name: 'Cá Kiếm Nhỏ', emoji: '🐟', zone: 1, tier: 4, basePrice: 90000, minSize: 120, maxSize: 280 },
    { id: 36, name: 'Cá Đuối Vàng', emoji: '🦈', zone: 1, tier: 5, basePrice: 150000, minSize: 80, maxSize: 200 },
    { id: 37, name: 'Cá Mú Vàng', emoji: '🐡', zone: 1, tier: 5, basePrice: 180000, minSize: 100, maxSize: 280 },
    { id: 38, name: 'Cá Sư Tử', emoji: '🐠', zone: 1, tier: 5, basePrice: 200000, minSize: 30, maxSize: 60 },
    { id: 39, name: 'Cá Thiên Thần', emoji: '🐠', zone: 1, tier: 5, basePrice: 220000, minSize: 15, maxSize: 40 },
    { id: 40, name: 'Cá Koi Đặc Biệt', emoji: '🐠', zone: 1, tier: 5, basePrice: 250000, minSize: 40, maxSize: 90 },

    // ── ZONE 2 – Đại Dương Sâu Thẳm (tier 2-7) ─────────────────
    { id: 41, name: 'Cá Ngừ Vây Xanh', emoji: '🐟', zone: 2, tier: 2, basePrice: 5000, minSize: 80, maxSize: 200 },
    { id: 42, name: 'Cá Thu Đại Dương', emoji: '🐟', zone: 2, tier: 2, basePrice: 6000, minSize: 70, maxSize: 180 },
    { id: 43, name: 'Cá Đuối Sọc', emoji: '🦈', zone: 2, tier: 2, basePrice: 5500, minSize: 60, maxSize: 160 },
    { id: 44, name: 'Cá Bơn', emoji: '🐟', zone: 2, tier: 3, basePrice: 15000, minSize: 40, maxSize: 110 },
    { id: 45, name: 'Cá Bộ Đầu', emoji: '🐟', zone: 2, tier: 3, basePrice: 18000, minSize: 50, maxSize: 130 },
    { id: 46, name: 'Cá Đen Biển', emoji: '🐟', zone: 2, tier: 3, basePrice: 20000, minSize: 55, maxSize: 140 },
    { id: 47, name: 'Cá Tầm', emoji: '🐟', zone: 2, tier: 3, basePrice: 25000, minSize: 100, maxSize: 300 },
    { id: 48, name: 'Cá Vược Biển', emoji: '🐟', zone: 2, tier: 3, basePrice: 22000, minSize: 60, maxSize: 150 },
    { id: 49, name: 'Cá Hồng Biển', emoji: '🐠', zone: 2, tier: 3, basePrice: 20000, minSize: 50, maxSize: 130 },
    { id: 50, name: 'Cá Mú Đỏ', emoji: '🐡', zone: 2, tier: 4, basePrice: 60000, minSize: 80, maxSize: 200 },
    { id: 51, name: 'Cá Mú Đen', emoji: '🐡', zone: 2, tier: 4, basePrice: 65000, minSize: 85, maxSize: 210 },
    { id: 52, name: 'Cá Cam Lớn', emoji: '🐠', zone: 2, tier: 4, basePrice: 70000, minSize: 90, maxSize: 230 },
    { id: 53, name: 'Cá Kiếm Xanh', emoji: '🐟', zone: 2, tier: 4, basePrice: 85000, minSize: 150, maxSize: 350 },
    { id: 54, name: 'Cá Búa', emoji: '🦈', zone: 2, tier: 4, basePrice: 90000, minSize: 200, maxSize: 450 },
    { id: 55, name: 'Cá Mặt Quỷ', emoji: '🐡', zone: 2, tier: 4, basePrice: 80000, minSize: 40, maxSize: 100 },
    { id: 56, name: 'Cá Ngừ Mắt To', emoji: '🐟', zone: 2, tier: 5, basePrice: 150000, minSize: 120, maxSize: 280 },
    { id: 57, name: 'Cá Cờ Xanh', emoji: '🐟', zone: 2, tier: 5, basePrice: 180000, minSize: 150, maxSize: 350 },
    { id: 58, name: 'Cá Hồng Vua', emoji: '🐠', zone: 2, tier: 5, basePrice: 200000, minSize: 100, maxSize: 250 },
    { id: 59, name: 'Cá Đuối Khổng Lồ', emoji: '🦈', zone: 2, tier: 5, basePrice: 250000, minSize: 300, maxSize: 700 },
    { id: 60, name: 'Cá Voi Nhỏ', emoji: '🐋', zone: 2, tier: 5, basePrice: 300000, minSize: 400, maxSize: 800 },
    { id: 61, name: 'Cá Mập Vây Trắng', emoji: '🦈', zone: 2, tier: 6, basePrice: 500000, minSize: 200, maxSize: 500 },
    { id: 62, name: 'Cá Ngừ Vua', emoji: '🐟', zone: 2, tier: 6, basePrice: 600000, minSize: 180, maxSize: 450 },
    { id: 63, name: 'Cá Lưỡi Kiếm', emoji: '🐟', zone: 2, tier: 6, basePrice: 700000, minSize: 200, maxSize: 500 },
    { id: 64, name: 'Cá Mú Khổng Lồ', emoji: '🐡', zone: 2, tier: 6, basePrice: 800000, minSize: 150, maxSize: 400 },
    { id: 65, name: 'Cá Đuối Ma', emoji: '🦈', zone: 2, tier: 7, basePrice: 2000000, minSize: 400, maxSize: 900 },
    { id: 66, name: 'Cá Mập Trắng Nhỏ', emoji: '🦈', zone: 2, tier: 7, basePrice: 2500000, minSize: 300, maxSize: 700 },
    { id: 67, name: 'Cá Voi Lưng Gù', emoji: '🐋', zone: 2, tier: 7, basePrice: 3000000, minSize: 800, maxSize: 1500 },
    { id: 68, name: 'Cá Mập Búa Lớn', emoji: '🦈', zone: 2, tier: 7, basePrice: 2200000, minSize: 350, maxSize: 800 },

    // ── ZONE 3 – Vùng Biển Tử Thần (tier 4-8) ──────────────────
    { id: 69, name: 'Cá Mực Khổng Lồ', emoji: '🦑', zone: 3, tier: 4, basePrice: 80000, minSize: 100, maxSize: 250 },
    { id: 70, name: 'Cá Bạch Tuộc', emoji: '🐙', zone: 3, tier: 4, basePrice: 90000, minSize: 80, maxSize: 200 },
    { id: 71, name: 'Cá Rồng Biển', emoji: '🐉', zone: 3, tier: 5, basePrice: 200000, minSize: 50, maxSize: 120 },
    { id: 72, name: 'Cá Sứa Độc', emoji: '🪼', zone: 3, tier: 5, basePrice: 180000, minSize: 30, maxSize: 80 },
    { id: 73, name: 'Cá Mập Hổ', emoji: '🦈', zone: 3, tier: 5, basePrice: 250000, minSize: 300, maxSize: 700 },
    { id: 74, name: 'Cá Mực Bạch', emoji: '🦑', zone: 3, tier: 5, basePrice: 220000, minSize: 60, maxSize: 150 },
    { id: 75, name: 'Cá Bọ Biển', emoji: '🦞', zone: 3, tier: 5, basePrice: 160000, minSize: 40, maxSize: 100 },
    { id: 76, name: 'Cá Đèn Biển Sâu', emoji: '🐠', zone: 3, tier: 6, basePrice: 500000, minSize: 20, maxSize: 60 },
    { id: 77, name: 'Cá Răng Cưa', emoji: '🦈', zone: 3, tier: 6, basePrice: 600000, minSize: 200, maxSize: 500 },
    { id: 78, name: 'Cá Mập Mako', emoji: '🦈', zone: 3, tier: 6, basePrice: 700000, minSize: 250, maxSize: 600 },
    { id: 79, name: 'Cá Kình Biển', emoji: '🐋', zone: 3, tier: 6, basePrice: 800000, minSize: 500, maxSize: 1200 },
    { id: 80, name: 'Cá Mực Ma', emoji: '🦑', zone: 3, tier: 6, basePrice: 650000, minSize: 100, maxSize: 300 },
    { id: 81, name: 'Cá Mập Đầu Bò', emoji: '🦈', zone: 3, tier: 7, basePrice: 2000000, minSize: 300, maxSize: 700 },
    { id: 82, name: 'Cá Voi Sát Thủ', emoji: '🐋', zone: 3, tier: 7, basePrice: 3000000, minSize: 600, maxSize: 1400 },
    { id: 83, name: 'Cá Mập Ngủ', emoji: '🦈', zone: 3, tier: 7, basePrice: 2500000, minSize: 400, maxSize: 900 },
    { id: 84, name: 'Cá Quái Thú Sâu', emoji: '🐉', zone: 3, tier: 7, basePrice: 3500000, minSize: 200, maxSize: 600 },
    { id: 85, name: 'Cá Mập Trắng Lớn', emoji: '🦈', zone: 3, tier: 8, basePrice: 8000000, minSize: 400, maxSize: 1000 },
    { id: 86, name: 'Cá Voi Xanh', emoji: '🐋', zone: 3, tier: 8, basePrice: 10000000, minSize: 2000, maxSize: 3000 },
    { id: 87, name: 'Cá Mập Thần', emoji: '🦈', zone: 3, tier: 8, basePrice: 12000000, minSize: 500, maxSize: 1200 },
    { id: 88, name: 'Cá Rồng Biển Cổ Đại', emoji: '🐉', zone: 3, tier: 8, basePrice: 15000000, minSize: 300, maxSize: 800 },
    { id: 89, name: 'Quái Vật Biển Sâu', emoji: '👾', zone: 3, tier: 8, basePrice: 9000000, minSize: 400, maxSize: 1000 },
    { id: 90, name: 'Leviathan', emoji: '🌊', zone: 3, tier: 8, basePrice: 15000000, minSize: 1000, maxSize: 3000 },
    // ── ZONE 1 bổ sung (id 91-120) ────────────────────────────
    { id: 91, name: 'Cá Vàng Koi', emoji: '🐠', zone: 1, tier: 1, basePrice: 2000, minSize: 10, maxSize: 30, shinyRate: 0.05 },
    { id: 92, name: 'Cá Chuối Nhỏ', emoji: '🐟', zone: 1, tier: 1, basePrice: 1500, minSize: 8, maxSize: 25 },
    { id: 93, name: 'Cá Trê Vàng', emoji: '🐟', zone: 1, tier: 2, basePrice: 6000, minSize: 22, maxSize: 65 },
    { id: 94, name: 'Cá Lóc Bông', emoji: '🐟', zone: 1, tier: 2, basePrice: 7500, minSize: 28, maxSize: 80 },
    { id: 95, name: 'Cá Chép Hoa', emoji: '🐠', zone: 1, tier: 2, basePrice: 8000, minSize: 30, maxSize: 90, shinyRate: 0.04 },
    { id: 96, name: 'Cá Mè Hoa', emoji: '🐟', zone: 1, tier: 2, basePrice: 6500, minSize: 28, maxSize: 80 },
    { id: 97, name: 'Cá Trắm Đen', emoji: '🐟', zone: 1, tier: 3, basePrice: 18000, minSize: 40, maxSize: 110 },
    { id: 98, name: 'Cá Hồng Sông', emoji: '🐠', zone: 1, tier: 3, basePrice: 22000, minSize: 50, maxSize: 130 },
    { id: 99, name: 'Cá Vược Hồng', emoji: '🐠', zone: 1, tier: 3, basePrice: 20000, minSize: 45, maxSize: 120 },
    { id: 100, name: 'Cá Quả Đỏ', emoji: '🐟', zone: 1, tier: 3, basePrice: 24000, minSize: 55, maxSize: 140 },
    { id: 101, name: 'Cá Mú Nâu', emoji: '🐡', zone: 1, tier: 3, basePrice: 28000, minSize: 65, maxSize: 160 },
    { id: 102, name: 'Cá Sơn Đỏ', emoji: '🐠', zone: 1, tier: 2, basePrice: 5000, minSize: 12, maxSize: 35 },
    { id: 103, name: 'Cá Tai Tượng Đỏ', emoji: '🐟', zone: 1, tier: 3, basePrice: 32000, minSize: 70, maxSize: 180 },
    { id: 104, name: 'Cá Chạch Sông', emoji: '🐟', zone: 1, tier: 2, basePrice: 5500, minSize: 18, maxSize: 50 },
    { id: 105, name: 'Cá Bạc Đầu', emoji: '🐟', zone: 1, tier: 2, basePrice: 5000, minSize: 15, maxSize: 45 },
    { id: 106, name: 'Cá Thu Sông', emoji: '🐟', zone: 1, tier: 4, basePrice: 65000, minSize: 85, maxSize: 200 },
    { id: 107, name: 'Cá Cờ Đỏ', emoji: '🐠', zone: 1, tier: 4, basePrice: 72000, minSize: 90, maxSize: 220, shinyRate: 0.03 },
    { id: 108, name: 'Cá Koi Bạch Kim', emoji: '🐠', zone: 1, tier: 5, basePrice: 220000, minSize: 45, maxSize: 100, shinyRate: 0.06 },
    { id: 109, name: 'Cá Hồng Kim', emoji: '🐠', zone: 1, tier: 5, basePrice: 240000, minSize: 50, maxSize: 110, shinyRate: 0.05 },
    { id: 110, name: 'Cá Rồng Đỏ', emoji: '🐉', zone: 1, tier: 5, basePrice: 280000, minSize: 40, maxSize: 90, shinyRate: 0.04 },
    // ── ZONE 2 bổ sung (id 111-150) ───────────────────────────
    { id: 111, name: 'Cá Kiếm Đỏ', emoji: '🐟', zone: 2, tier: 3, basePrice: 20000, minSize: 55, maxSize: 140 },
    { id: 112, name: 'Cá Bơn Biển', emoji: '🐟', zone: 2, tier: 3, basePrice: 18000, minSize: 45, maxSize: 115 },
    { id: 113, name: 'Cá Thu Nhật', emoji: '🐟', zone: 2, tier: 4, basePrice: 68000, minSize: 90, maxSize: 220 },
    { id: 114, name: 'Cá Mú Trắng', emoji: '🐡', zone: 2, tier: 4, basePrice: 72000, minSize: 95, maxSize: 230 },
    { id: 115, name: 'Cá Ngừ Vây Dài', emoji: '🐟', zone: 2, tier: 4, basePrice: 80000, minSize: 110, maxSize: 260 },
    { id: 116, name: 'Cá Cá Đao Biển', emoji: '🦈', zone: 2, tier: 5, basePrice: 180000, minSize: 200, maxSize: 450 },
    { id: 117, name: 'Cá Mú Khổng Lồ Đỏ', emoji: '🐡', zone: 2, tier: 5, basePrice: 220000, minSize: 130, maxSize: 300, shinyRate: 0.03 },
    { id: 118, name: 'Cá Rạn San Hô', emoji: '🐠', zone: 2, tier: 3, basePrice: 22000, minSize: 20, maxSize: 60 },
    { id: 119, name: 'Cá Cờ Xanh Lớn', emoji: '🐟', zone: 2, tier: 6, basePrice: 650000, minSize: 180, maxSize: 420 },
    { id: 120, name: 'Cá Búa Lớn', emoji: '🦈', zone: 2, tier: 6, basePrice: 750000, minSize: 280, maxSize: 650 },
    { id: 121, name: 'Cá Đuối Điện', emoji: '🦈', zone: 2, tier: 5, basePrice: 200000, minSize: 150, maxSize: 350 },
    { id: 122, name: 'Cá Mực Khổng Lồ 2', emoji: '🦑', zone: 2, tier: 6, basePrice: 700000, minSize: 200, maxSize: 500 },
    { id: 123, name: 'Cá Voi Gù', emoji: '🐋', zone: 2, tier: 7, basePrice: 2800000, minSize: 700, maxSize: 1400 },
    { id: 124, name: 'Cá Mập Hổ Xanh', emoji: '🦈', zone: 2, tier: 6, basePrice: 720000, minSize: 260, maxSize: 600 },
    { id: 125, name: 'Cá Thần Biển', emoji: '🐋', zone: 2, tier: 7, basePrice: 3200000, minSize: 600, maxSize: 1400, shinyRate: 0.02 },
    { id: 126, name: 'Cá Vàng Biển', emoji: '🐠', zone: 2, tier: 4, basePrice: 75000, minSize: 100, maxSize: 240, shinyRate: 0.04 },
    { id: 127, name: 'Cá Mặt Mẹt', emoji: '🐟', zone: 2, tier: 3, basePrice: 17000, minSize: 40, maxSize: 110 },
    { id: 128, name: 'Cá Cúi Biển', emoji: '🐟', zone: 2, tier: 4, basePrice: 70000, minSize: 95, maxSize: 230 },
    { id: 129, name: 'Cá Đèn Lồng', emoji: '🐠', zone: 2, tier: 5, basePrice: 190000, minSize: 15, maxSize: 50 },
    { id: 130, name: 'Cá Mám Khổng Lồ', emoji: '🐟', zone: 2, tier: 5, basePrice: 170000, minSize: 120, maxSize: 290 },
    { id: 131, name: 'Cá Mão Vua', emoji: '🐡', zone: 2, tier: 6, basePrice: 620000, minSize: 60, maxSize: 150 },
    { id: 132, name: 'Cá Ngựa Biển', emoji: '🐠', zone: 2, tier: 3, basePrice: 25000, minSize: 15, maxSize: 40 },
    { id: 133, name: 'Cá Thần Vây Đỏ', emoji: '🐠', zone: 2, tier: 5, basePrice: 210000, minSize: 100, maxSize: 260, shinyRate: 0.03 },
    { id: 134, name: 'Cá Mập Cá Mập', emoji: '🦈', zone: 2, tier: 7, basePrice: 2400000, minSize: 350, maxSize: 800 },
    { id: 135, name: 'Cá Nổ Biển', emoji: '🐡', zone: 2, tier: 4, basePrice: 62000, minSize: 20, maxSize: 55 },
    { id: 136, name: 'Cá Đuối Vân Gỗ', emoji: '🦈', zone: 2, tier: 5, basePrice: 175000, minSize: 180, maxSize: 400 },
    { id: 137, name: 'Cá Heo Mũi', emoji: '🐋', zone: 2, tier: 5, basePrice: 195000, minSize: 150, maxSize: 350 },
    { id: 138, name: 'Cá Lưng Xanh', emoji: '🐟', zone: 2, tier: 3, basePrice: 19000, minSize: 50, maxSize: 125 },
    { id: 139, name: 'Cá Thu Vua', emoji: '🐟', zone: 2, tier: 6, basePrice: 680000, minSize: 200, maxSize: 480 },
    { id: 140, name: 'Cá Khổng Lồ Biển', emoji: '🐋', zone: 2, tier: 7, basePrice: 2600000, minSize: 500, maxSize: 1200 },
    // ── ZONE 3 bổ sung (id 141-190) ───────────────────────────
    { id: 141, name: 'Cá Rồng Lửa', emoji: '🐉', zone: 3, tier: 6, basePrice: 550000, minSize: 100, maxSize: 280 },
    { id: 142, name: 'Cá Mực Đen Sâu', emoji: '🦑', zone: 3, tier: 5, basePrice: 230000, minSize: 80, maxSize: 200 },
    { id: 143, name: 'Cá Mắt Quỷ', emoji: '🐡', zone: 3, tier: 5, basePrice: 210000, minSize: 35, maxSize: 90 },
    { id: 144, name: 'Cá Bạch Tuộc Khổng', emoji: '🐙', zone: 3, tier: 6, basePrice: 580000, minSize: 150, maxSize: 400 },
    { id: 145, name: 'Cá Xương Rồng Biển', emoji: '🦞', zone: 3, tier: 5, basePrice: 195000, minSize: 50, maxSize: 130 },
    { id: 146, name: 'Cá Sứa Điện', emoji: '🪼', zone: 3, tier: 6, basePrice: 510000, minSize: 40, maxSize: 100 },
    { id: 147, name: 'Cá Rồng Băng', emoji: '🐉', zone: 3, tier: 7, basePrice: 2300000, minSize: 180, maxSize: 500, shinyRate: 0.02 },
    { id: 148, name: 'Cá Mập Khủng Long', emoji: '🦈', zone: 3, tier: 7, basePrice: 2700000, minSize: 450, maxSize: 1000 },
    { id: 149, name: 'Cá Voi Sát Thủ 2', emoji: '🐋', zone: 3, tier: 7, basePrice: 3100000, minSize: 700, maxSize: 1500 },
    { id: 150, name: 'Cá Bạch Tuộc Thần', emoji: '🐙', zone: 3, tier: 8, basePrice: 9500000, minSize: 300, maxSize: 900, shinyRate: 0.01 },
    { id: 151, name: 'Cá Rồng Thần', emoji: '🐉', zone: 3, tier: 8, basePrice: 13000000, minSize: 400, maxSize: 1000, shinyRate: 0.01 },
    { id: 152, name: 'Cá Biển Đêm', emoji: '🌑', zone: 3, tier: 6, basePrice: 540000, minSize: 80, maxSize: 200 },
    { id: 153, name: 'Cá Sứa Khổng Lồ', emoji: '🪼', zone: 3, tier: 7, basePrice: 2100000, minSize: 200, maxSize: 600 },
    { id: 154, name: 'Cá Mực Đỏ Sâu', emoji: '🦑', zone: 3, tier: 6, basePrice: 560000, minSize: 120, maxSize: 320 },
    { id: 155, name: 'Cá Mập Trăng', emoji: '🦈', zone: 3, tier: 7, basePrice: 2900000, minSize: 400, maxSize: 900 },
    { id: 156, name: 'Cá Thần Biển Sâu', emoji: '👾', zone: 3, tier: 8, basePrice: 11000000, minSize: 500, maxSize: 1200, shinyRate: 0.015 },
    { id: 157, name: 'Cá Voi Khổng Lồ', emoji: '🐋', zone: 3, tier: 8, basePrice: 12000000, minSize: 2500, maxSize: 3500 },
    { id: 158, name: 'Cá Mập Vũ Trụ', emoji: '🦈', zone: 3, tier: 8, basePrice: 14000000, minSize: 600, maxSize: 1500, shinyRate: 0.01 },
    { id: 159, name: 'Kraken', emoji: '🐙', zone: 3, tier: 8, basePrice: 15000000, minSize: 1500, maxSize: 4000, shinyRate: 0.008 },
    { id: 160, name: 'God of Sea', emoji: '🌊', zone: 3, tier: 8, basePrice: 15000000, minSize: 3000, maxSize: 5000, shinyRate: 0.005 },
    // ── ZONE 1 thêm mới (id 161-170) ────────────────────────────
    { id: 161, name: 'Cá Koi Đen', emoji: '🐠', zone: 1, tier: 2, basePrice: 7000, minSize: 25, maxSize: 75 },
    { id: 162, name: 'Cá Lóc Trắng', emoji: '🐟', zone: 1, tier: 2, basePrice: 6500, minSize: 22, maxSize: 68 },
    { id: 163, name: 'Cá Tra Vàng', emoji: '🐟', zone: 1, tier: 3, basePrice: 16000, minSize: 38, maxSize: 95 },
    { id: 164, name: 'Cá Hồng Hà', emoji: '🐠', zone: 1, tier: 3, basePrice: 21000, minSize: 45, maxSize: 115 },
    { id: 165, name: 'Cá Bống Mú', emoji: '🐡', zone: 1, tier: 3, basePrice: 26000, minSize: 55, maxSize: 140 },
    { id: 166, name: 'Cá Chày Đỏ', emoji: '🐟', zone: 1, tier: 2, basePrice: 5800, minSize: 20, maxSize: 60 },
    { id: 167, name: 'Cá Vược Vàng', emoji: '🐠', zone: 1, tier: 4, basePrice: 68000, minSize: 88, maxSize: 215 },
    { id: 168, name: 'Cá Chép Bạc', emoji: '🐟', zone: 1, tier: 2, basePrice: 6800, minSize: 28, maxSize: 78, shinyRate: 0.03 },
    { id: 169, name: 'Cá Rô Biển', emoji: '🐟', zone: 1, tier: 4, basePrice: 75000, minSize: 95, maxSize: 230 },
    { id: 170, name: 'Cá Long Vương', emoji: '🐉', zone: 1, tier: 5, basePrice: 260000, minSize: 55, maxSize: 120, shinyRate: 0.04 },
    // ── ZONE 2 thêm mới (id 171-180) ────────────────────────────
    { id: 171, name: 'Cá Mú Xanh', emoji: '🐡', zone: 2, tier: 4, basePrice: 72000, minSize: 90, maxSize: 225 },
    { id: 172, name: 'Cá Ngừ Hoàng Kim', emoji: '🐟', zone: 2, tier: 5, basePrice: 195000, minSize: 135, maxSize: 310, shinyRate: 0.03 },
    { id: 173, name: 'Cá Búa Khổng Lồ', emoji: '🦈', zone: 2, tier: 6, basePrice: 680000, minSize: 290, maxSize: 680 },
    { id: 174, name: 'Cá Lưỡi Dao', emoji: '🐟', zone: 2, tier: 5, basePrice: 205000, minSize: 160, maxSize: 370 },
    { id: 175, name: 'Cá Voi Xám', emoji: '🐋', zone: 2, tier: 6, basePrice: 720000, minSize: 320, maxSize: 750 },
    { id: 176, name: 'Cá Rạn Xanh', emoji: '🐠', zone: 2, tier: 3, basePrice: 23000, minSize: 25, maxSize: 65 },
    { id: 177, name: 'Cá Thủy Tinh', emoji: '🐠', zone: 2, tier: 4, basePrice: 78000, minSize: 100, maxSize: 245, shinyRate: 0.04 },
    { id: 178, name: 'Cá Ngựa Biển Khổng', emoji: '🐠', zone: 2, tier: 5, basePrice: 215000, minSize: 25, maxSize: 60 },
    { id: 179, name: 'Cá Mực Vua', emoji: '🦑', zone: 2, tier: 7, basePrice: 2700000, minSize: 380, maxSize: 860, shinyRate: 0.02 },
    { id: 180, name: 'Cá Mập Thần Thánh', emoji: '🦈', zone: 2, tier: 7, basePrice: 3100000, minSize: 420, maxSize: 950, shinyRate: 0.015 },
    // ── ZONE 3 thêm mới (id 181-190) ────────────────────────────
    { id: 181, name: 'Cá Hải Tặc', emoji: '☠️', zone: 3, tier: 6, basePrice: 570000, minSize: 110, maxSize: 295 },
    { id: 182, name: 'Cá Quỷ Biển', emoji: '👹', zone: 3, tier: 7, basePrice: 2200000, minSize: 280, maxSize: 650 },
    { id: 183, name: 'Cá Bóng Tối', emoji: '🌑', zone: 3, tier: 7, basePrice: 2400000, minSize: 300, maxSize: 700 },
    { id: 184, name: 'Cá Thần Chết', emoji: '💀', zone: 3, tier: 8, basePrice: 10500000, minSize: 450, maxSize: 1100, shinyRate: 0.012 },
    { id: 185, name: 'Cá Ngục Vực', emoji: '🔥', zone: 3, tier: 8, basePrice: 11500000, minSize: 500, maxSize: 1300, shinyRate: 0.01 },
    { id: 186, name: 'Cá Sứa Thần', emoji: '🪼', zone: 3, tier: 7, basePrice: 2600000, minSize: 250, maxSize: 600 },
    { id: 187, name: 'Cá Bạch Tuộc Địa Ngục', emoji: '🐙', zone: 3, tier: 8, basePrice: 13500000, minSize: 600, maxSize: 1600, shinyRate: 0.008 },
    { id: 188, name: 'Cá Thần Rồng Xanh', emoji: '🐉', zone: 3, tier: 8, basePrice: 14500000, minSize: 800, maxSize: 2000, shinyRate: 0.006 },
    { id: 189, name: 'Poseidon', emoji: '🔱', zone: 3, tier: 8, basePrice: 15000000, minSize: 2000, maxSize: 4500, shinyRate: 0.004 },
    { id: 190, name: 'Cthulhu', emoji: '👾', zone: 3, tier: 8, basePrice: 15000000, minSize: 5000, maxSize: 10000, shinyRate: 0.002 },
    // ── SUPER ULTRA FISHES (id 191-200) ────────────────────────
    { id: 191, name: 'Cá Siêu Tân Tinh', emoji: '🌟', zone: 3, tier: 9, basePrice: 30000000, minSize: 1000, maxSize: 5000, shinyRate: 0.003 },
    { id: 192, name: 'Cá Quỷ Vương', emoji: '👹', zone: 3, tier: 9, basePrice: 45000000, minSize: 2000, maxSize: 6000, shinyRate: 0.002 },
    { id: 193, name: 'Cá Hố Đen Vũ Trụ', emoji: '🌌', zone: 3, tier: 9, basePrice: 60000000, minSize: 3000, maxSize: 8000, shinyRate: 0.001 },
    { id: 194, name: 'Megalodon', emoji: '🦈', zone: 3, tier: 9, basePrice: 80000000, minSize: 15000, maxSize: 30000, shinyRate: 0.001 },
    { id: 195, name: 'Thần Thú Jörmungandr', emoji: '🐍', zone: 3, tier: 9, basePrice: 120000000, minSize: 20000, maxSize: 50000, shinyRate: 0.0005 },
    { id: 196, name: 'Cá Voi Hư Không', emoji: '🐋', zone: 3, tier: 9, basePrice: 150000000, minSize: 30000, maxSize: 80000, shinyRate: 0.0003 },
    { id: 197, name: 'Bạch Long Vĩ', emoji: '🐉', zone: 3, tier: 9, basePrice: 180000000, minSize: 25000, maxSize: 60000, shinyRate: 0.0002 },
    { id: 198, name: 'Cá Chép Hóa Rồng', emoji: '🐲', zone: 3, tier: 9, basePrice: 200000000, minSize: 10000, maxSize: 30000, shinyRate: 0.0001 },
    { id: 199, name: 'Gunter Bí Ẩn', emoji: '🐧', zone: 3, tier: 9, basePrice: 300000000, minSize: 500, maxSize: 1000, shinyRate: 0.00005 },
    { id: 200, name: 'Cá Thần Khởi Nguyên', emoji: '🧿', zone: 3, tier: 9, basePrice: 500000000, minSize: 100000, maxSize: 500000, shinyRate: 0.00001 },
];

// Weight per tier (higher tier = rarer)
const TIER_WEIGHT = { 1: 35, 2: 25, 3: 18, 4: 10, 5: 6, 6: 3, 7: 2, 8: 1, 9: 0.1 };

// Chest rewards (VNĐ xu)
const CHEST_REWARDS = [
    { label: 'Rác cũ 🗑️', coins: 0, weight: 30 },
    { label: 'Ít tiền 💵', coins: 5000, weight: 30 },
    { label: 'Tiền kha khá 💵', coins: 50000, weight: 20 },
    { label: 'Tiền tốt 💰', coins: 200000, weight: 10 },
    { label: 'Tiền lớn 💎', coins: 1000000, weight: 7 },
    { label: 'Jackpot 🎉', coins: 5000000, weight: 3 },
];

// 15 fishing rods
const RODS = [
    // Normal shop (id 1-10)
    { id: 1, name: 'Cần Tre', emoji: '🎋', price: 0, limited: false, tier: 1, bonusLuck: 0, bonusSize: 0, bonusTime: -0, maxDurability: 30, desc: 'Cần mặc định miễn phí. (30 độ bền)' },
    { id: 2, name: 'Cần Nhựa', emoji: '🎣', price: 50000, limited: false, tier: 1, bonusLuck: 2, bonusSize: 0.05, bonusTime: 1, maxDurability: 50, desc: 'Nhẹ và bền hơn cần tre. (50 độ bền)' },
    { id: 3, name: 'Cần Sợi Carbon', emoji: '🎣', price: 200000, limited: false, tier: 2, bonusLuck: 5, bonusSize: 0.1, bonusTime: 2, maxDurability: 100, desc: 'Sợi carbon nhẹ, cảm giác tốt hơn. (100 độ bền)' },
    { id: 4, name: 'Cần Thép', emoji: '🎣', price: 500000, limited: false, tier: 2, bonusLuck: 8, bonusSize: 0.15, bonusTime: 2, maxDurability: 150, desc: 'Bền, kéo được cá lớn hơn. (150 độ bền)' },
    { id: 5, name: 'Cần Chuyên Nghiệp', emoji: '🎣', price: 1000000, limited: false, tier: 3, bonusLuck: 12, bonusSize: 0.2, bonusTime: 3, maxDurability: 200, desc: 'Dành cho ngư dân có kinh nghiệm. (200 độ bền)' },
    { id: 6, name: 'Cần Titan', emoji: '🪝', price: 3000000, limited: false, tier: 3, bonusLuck: 16, bonusSize: 0.25, bonusTime: 4, maxDurability: 300, desc: 'Titan siêu bền, độ nhạy cao. (300 độ bền)' },
    { id: 7, name: 'Cần Biển Xanh', emoji: '🌊', price: 8000000, limited: false, tier: 4, bonusLuck: 22, bonusSize: 0.35, bonusTime: 5, maxDurability: 500, desc: 'Thiết kế cho câu biển khơi. (500 độ bền)' },
    { id: 8, name: 'Cần Đại Dương', emoji: '🌊', price: 20000000, limited: false, tier: 4, bonusLuck: 28, bonusSize: 0.45, bonusTime: 6, maxDurability: 600, desc: 'Câu được các loài cá biển sâu. (600 độ bền)' },
    { id: 9, name: 'Cần Thủy Thần', emoji: '⚓', price: 50000000, limited: false, tier: 5, bonusLuck: 50, bonusSize: 0.85, bonusTime: 12, bonusShiny: 10, maxDurability: 2000, desc: 'Truyền thuyết ngư dân. (2000 độ bền)' },
    { id: 10, name: 'Cần Huyền Thoại', emoji: '✨', price: 100000000, limited: false, tier: 5, bonusLuck: 62, bonusSize: 1.0, bonusTime: 14, bonusShiny: 15, maxDurability: 3000, desc: 'Đỉnh cao câu cá thông thường. (3000 độ bền)' },
    // Limited shop (id 11-15)
    { id: 11, name: 'Cần Băng Giá', emoji: '❄️', price: 20000000, limited: true, tier: 3, bonusLuck: 40, bonusSize: 0.5, bonusTime: 5, bonusShiny: 8, maxDurability: 1000, shopWeight: 50, desc: '[GIỚI HẠN] Tăng tỉ lệ rương báu. (1000 độ bền)' },
    { id: 12, name: 'Cần Lửa Địa Ngục', emoji: '🔥', price: 50000000, limited: true, tier: 4, bonusLuck: 65, bonusSize: 0.8, bonusTime: 9, bonusShiny: 12, maxDurability: 2500, shopWeight: 35, desc: '[GIỚI HẠN] Tăng tỉ lệ cá tier cao. (2500 độ bền)' },
    { id: 13, name: 'Cần Sét', emoji: '⚡', price: 100000000, limited: true, tier: 4, bonusLuck: 95, bonusSize: 1.2, bonusTime: 12, bonusShiny: 16, maxDurability: 5000, shopWeight: 25, desc: '[GIỚI HẠN] Cá lên cực nhanh, rất may mắn. (5000 độ bền)' },
    { id: 14, name: 'Cần Bóng Tối', emoji: '🌑', price: 150000000, limited: true, tier: 5, bonusLuck: 150, bonusSize: 1.8, bonusTime: 16, bonusShiny: 25, maxDurability: 10000, shopWeight: 18, desc: '[GIỚI HẠN] Quyền năng bóng tối. (10000 độ bền)' },
    { id: 15, name: 'Cần Thần Thánh', emoji: '🌟', price: 250000000, limited: true, tier: 5, bonusLuck: 250, bonusSize: 3.0, bonusTime: 20, bonusShiny: 60, maxDurability: 50000, shopWeight: 8, desc: '[GIỚI HẠN] Tốt nhất tuyệt đối. (50000 độ bền)' },
    // Thêm 10 cần mới (id 16-25)
    { id: 16, name: 'Cần Mây', emoji: '☁️', price: 150000, limited: false, tier: 2, bonusLuck: 4, bonusSize: 0.08, bonusTime: 1, bonusShiny: 1, maxDurability: 120, desc: 'Nhẹ như mây. (120 độ bền)' },
    { id: 17, name: 'Cần Đồng', emoji: '🎣', price: 350000, limited: false, tier: 2, bonusLuck: 6, bonusSize: 0.12, bonusTime: 2, bonusShiny: 0, maxDurability: 160, desc: 'Bền chắc. (160 độ bền)' },
    { id: 18, name: 'Cần Bạc', emoji: '🎣', price: 1500000, limited: false, tier: 3, bonusLuck: 14, bonusSize: 0.22, bonusTime: 3, bonusShiny: 2, maxDurability: 250, desc: 'Câu shiny. (250 độ bền)' },
    { id: 19, name: 'Cần Vàng', emoji: '🪝', price: 5000000, limited: false, tier: 3, bonusLuck: 18, bonusSize: 0.28, bonusTime: 4, bonusShiny: 4, maxDurability: 350, desc: 'Nổi bật. (350 độ bền)' },
    { id: 20, name: 'Cần Pha Lê', emoji: '🔮', price: 12000000, limited: false, tier: 4, bonusLuck: 30, bonusSize: 0.48, bonusTime: 6, bonusShiny: 9, maxDurability: 600, desc: 'Pha lê, may mắn. (600 độ bền)' },
    { id: 21, name: 'Cần Mặt Trăng', emoji: '🌙', price: 30000000, limited: false, tier: 4, bonusLuck: 40, bonusSize: 0.62, bonusTime: 8, bonusShiny: 11, maxDurability: 800, desc: 'Hiệu quả cao. (800 độ bền)' },
    { id: 22, name: 'Cần Thiên Thạch', emoji: '☄️', price: 75000000, limited: false, tier: 5, bonusLuck: 52, bonusSize: 0.82, bonusTime: 11, bonusShiny: 13, maxDurability: 1800, desc: 'Cực hiếm, mạnh mẽ. (1800 độ bền)' },
    { id: 23, name: 'Cần Cầu Vồng', emoji: '🌈', price: 35000000, limited: true, tier: 4, bonusLuck: 38, bonusSize: 0.6, bonusTime: 8, bonusShiny: 18, maxDurability: 900, shopWeight: 30, desc: '[GIỚI HẠN] Tỉ lệ shiny xuất sắc. (900 độ bền)' },
    { id: 24, name: 'Cần Địa Ngục', emoji: '😈', price: 80000000, limited: true, tier: 5, bonusLuck: 65, bonusSize: 0.95, bonusTime: 13, bonusShiny: 22, maxDurability: 2500, shopWeight: 20, desc: '[GIỚI HẠN] Kéo cá từ vực. (2500 độ bền)' },
    { id: 25, name: 'Cần Thiên Đàng', emoji: '😇', price: 200000000, limited: true, tier: 5, bonusLuck: 78, bonusSize: 1.15, bonusTime: 18, bonusShiny: 32, maxDurability: 7000, shopWeight: 10, desc: '[GIỚI HẠN] Chỉ kém Cần Thần Thánh. (7000 độ bền)' },
    // Siêu cần mới (id 26-35)
    { id: 26, name: 'Cần Huyết Kiếm', emoji: '🗡️', price: 120000000, limited: false, tier: 5, bonusLuck: 68, bonusSize: 1.0, bonusTime: 14, bonusShiny: 18, maxDurability: 2800, desc: 'Khát máu cá biển sâu. (2800 độ bền)' },
    { id: 27, name: 'Cần Hỏ Pháp', emoji: '🌊', price: 160000000, limited: false, tier: 5, bonusLuck: 74, bonusSize: 1.08, bonusTime: 15, bonusShiny: 22, maxDurability: 3500, desc: 'Chúẩn hồ pháp câu cá. (3500 độ bền)' },
    { id: 28, name: 'Cần Phượng Hoàng', emoji: '🔥', price: 220000000, limited: false, tier: 5, bonusLuck: 80, bonusSize: 1.18, bonusTime: 17, bonusShiny: 26, maxDurability: 4500, desc: 'Tái sinh từ tro tàn. (4500 độ bền)' },
    { id: 29, name: 'Cần Ngư Đế', emoji: '👑', price: 300000000, limited: false, tier: 5, bonusLuck: 87, bonusSize: 1.28, bonusTime: 19, bonusShiny: 30, maxDurability: 6000, desc: 'Đấng tối thượng của biển. (6000 độ bền)' },
    { id: 30, name: 'Cần Thần Long', emoji: '🐉', price: 400000000, limited: true, tier: 5, bonusLuck: 93, bonusSize: 1.4, bonusTime: 21, bonusShiny: 42, maxDurability: 11000, shopWeight: 7, desc: '[GIỚI HẠN] Rồng Thần hộ trì. (11000 độ bền)' },
    { id: 31, name: 'Cần Vĩnh Cửu', emoji: '♾️', price: 500000000, limited: true, tier: 5, bonusLuck: 96, bonusSize: 1.5, bonusTime: 22, bonusShiny: 48, maxDurability: 14000, shopWeight: 5, desc: '[GIỚI HẠN] Gần không bao giờ gãy. (14000 độ bền)' },
    { id: 32, name: 'Cần Hắc Âm', emoji: '⚫', price: 180000000, limited: true, tier: 5, bonusLuck: 76, bonusSize: 1.12, bonusTime: 17, bonusShiny: 28, maxDurability: 4000, shopWeight: 15, desc: '[GIỚI HẠN] Bóng tối hoàn toàn. (4000 độ bền)' },
    { id: 33, name: 'Cần Mặt Trời', emoji: '☀️', price: 250000000, limited: true, tier: 5, bonusLuck: 84, bonusSize: 1.22, bonusTime: 19, bonusShiny: 34, maxDurability: 6500, shopWeight: 9, desc: '[GIỚI HẠN] Sức mạnh mặt trời. (6500 độ bền)' },
    { id: 34, name: 'Cần Tử Thần', emoji: '☠️', price: 350000000, limited: true, tier: 5, bonusLuck: 91, bonusSize: 1.35, bonusTime: 20, bonusShiny: 40, maxDurability: 9000, shopWeight: 6, desc: '[GIỚI HẠN] Cá tự tìm đến mà cắn. (9000 độ bền)' },
    { id: 35, name: 'Cần Đại Vũ Trụ', emoji: '🌌', price: 600000000, limited: true, tier: 5, bonusLuck: 100, bonusSize: 1.6, bonusTime: 24, bonusShiny: 60, maxDurability: 18000, shopWeight: 3, desc: '[GIỚI HẠN] Tốt nhất toàn vũ trụ. (18000 độ bền)' },
];

// Role names for 3 zones
const ZONE_ROLES = [
    { zone: 1, name: '🏖️ Ngư Dân Vịnh', color: 0x00BFFF },
    { zone: 2, name: '🌊 Thủy Thủ Đại Dương', color: 0x0000CD },
    { zone: 3, name: '💀 Chiến Binh Tử Thần', color: 0x8B0000 },
];

function getFishForZone(zoneId) {
    return FISH_LIST.filter(f => f.zone === zoneId);
}

function getWeightedFish(zoneId) {
    const pool = FISH_LIST.filter(f => f.zone <= zoneId);
    const weights = pool.map(f => TIER_WEIGHT[f.tier]);
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < pool.length; i++) {
        r -= weights[i];
        if (r <= 0) return pool[i];
    }
    return pool[pool.length - 1];
}

function rollFishSize(fish) {
    return Math.floor(fish.minSize + Math.random() * (fish.maxSize - fish.minSize));
}

function calcFishPrice(fish, size) {
    return Math.floor(fish.basePrice * (size / fish.minSize));
}

function rollChest() {
    const total = CHEST_REWARDS.reduce((a, b) => a + b.weight, 0);
    let r = Math.random() * total;
    for (const c of CHEST_REWARDS) {
        r -= c.weight;
        if (r <= 0) return c;
    }
    return CHEST_REWARDS[0];
}

/**
 * Kiểm tra cá có shiny không.
 * shinyRate trên cá (0-1) = tỉ lệ gốc; rod.bonusShiny tăng thêm %.
 * Mặc định cá không có shinyRate → 0.5% cơ bản.
 * Shiny: giá x5, tên có ✨ prefix.
 */
function rollShiny(fish, rod) {
    const baseRate = fish.shinyRate ?? 0.005;
    const bonusMult = 1 + (rod.bonusShiny || 0) / 100;
    return Math.random() < baseRate * bonusMult;
}

function applyShiny(fishResult) {
    return {
        ...fishResult,
        name: `✨ ${fishResult.name}`,
        price: fishResult.price * 5,
        isShiny: true,
    };
}

module.exports = { ZONES, FISH_LIST, RODS, ZONE_ROLES, TIER_WEIGHT, CHEST_REWARDS, getFishForZone, getWeightedFish, rollFishSize, calcFishPrice, rollChest, rollShiny, applyShiny };
