import { TOPICS } from '../../lib/campaign.js';
// Bài Tuần 12 (practice_eligible=true) theo PPCT
const week12 = {
    10: [
        ['g10-r108', 'Các số đặc trưng đo xu thế trung tâm (Tứ phân vị, mốt)'],
        ['g10-r109', 'Các số đặc trưng đo xu thế trung tâm (Luyện tập)'],
        ['g10-r110', 'Các số đặc trưng đo mức độ phân tán (khoảng biến thiên, tứ phân vị, phương sai, độ lệch chuẩn)'],
        ['g10-r112', 'Tổng và hiệu của hai vectơ (luyện tập)'],
        ['g10-r113', 'Tích của một vectơ với một số, tính chất'],
    ],
    11: [
        ['g11-r112', 'Các số đặc trưng đo xu thế trung tâm — tứ phân vị, mốt mẫu ghép nhóm'],
        ['g11-r113', 'Luyện tập mẫu số liệu ghép nhóm'],
        ['g11-r114', 'Giới hạn hữu hạn của dãy số'],
        ['g11-r115', 'Quy tắc tính giới hạn, tổng CSN lùi vô hạn'],
        ['g11-r116', 'Hai mặt phẳng song song — hình lăng trụ và hình hộp'],
        ['g11-r117', 'Luyện tập hai mặt phẳng song song'],
    ],
    12: [
        ['g12-r120', 'Nguyên hàm — tính chất cơ bản'],
        ['g12-r121', 'Nguyên hàm của hàm số lũy thừa'],
        ['g12-r122', 'Nguyên hàm của hàm số mũ'],
        ['g12-r123', 'Nguyên hàm của hàm số lượng giác'],
        ['g12-r124', 'Phương sai, độ lệch chuẩn — đo độ rủi ro'],
        ['g12-r125', 'Luyện tập phương sai, độ lệch chuẩn'],
    ],
};
// gợi ý chủ đề ma trận cho từng bài (thủ công, dựa trên tên bài)
const suggest = {
    'g10-r108': ['descriptive_quantiles'],
    'g10-r109': ['descriptive_quantiles', 'stat_summary'],
    'g10-r110': ['descriptive_quantiles', 'stat_summary'],
    'g10-r112': ['vector_add_sub'],
    'g10-r113': ['vector_scale'],
    'g11-r112': ['grouped_median11', 'stat_grouped'],
    'g11-r113': ['grouped_median11', 'stat_grouped'],
    'g11-r114': ['limit_sequence'],
    'g11-r115': ['limit_sequence', 'geometric_sequences'],
    'g11-r116': ['space_parallel', 'parallel_planes'],
    'g11-r117': ['space_parallel', 'parallel_planes'],
    'g12-r120': ['antiderivative', 'integral_rules'],
    'g12-r121': ['antiderivative', 'integral_rules'],
    'g12-r122': ['integral_exponential'],
    'g12-r123': ['integral_trig'],
    'g12-r124': ['stat_summary', 'grouped_quartiles'],
    'g12-r125': ['stat_summary', 'grouped_quartiles'],
};
const ids = new Set(TOPICS.map(t => t.id));
let missing = 0;
for (const [grade, rows] of Object.entries(week12)) {
    console.log('=== LỚP ' + grade + ' ===');
    for (const [code, title] of rows) {
        const want = suggest[code] || [];
        const ok = want.filter(w => ids.has(w));
        const bad = want.filter(w => !ids.has(w));
        if (bad.length) missing++;
        console.log(`${code} | ${title.slice(0, 55)}`);
        console.log(`   dùng: ${ok.join(', ') || 'KHÔNG CÓ'}${bad.length ? ' | THIẾU: ' + bad.join(', ') : ''}`);
    }
    console.log('');
}
console.log('bài thiếu chủ đề:', missing);
