/**
 * Mô tả 4 mức (Xuất sắc / Tốt / Đạt yêu cầu / Chưa đạt yêu cầu) của các năng lực CÓ SẴN trong file mẫu
 * trường ("Mẫu hồ sơ học sinh Toán THPT Discover 26-27", tab "Năng lực toán học") — chép nguyên văn
 * ngày 2026-09-30 để HS/GV xem ngay trên web khi tự đánh giá. Năng lực app bổ sung mang mô tả trong `rubric`.
 */
import { competencyById, type Competency } from './framework.js';

const TEMPLATE_RUBRICS: Readonly<Record<string, readonly [string, string, string, string]>> = {
  'g10-tap-hop-va-menh-de': [
    "Phát biểu chính xác, đầy đủ các mệnh đề và đưa ra ví dụ minh họa",
    "Phát biểu được các mệnh đề và điều kiện nhưng thiếu ví dụ minh họa",
    "Hiểu và phát biểu được nhưng mắc lỗi nhỏ",
    "Không hiểu và không phát biểu được",
  ],
  'g10-phep-toan-tren-tap-hop': [
    "Thực hiện chính xác các phép toán và biểu diễn rõ ràng trên biểu đồ Ven",
    "Thực hiện đúng các phép toán nhưng biểu đồ thiếu chính xác",
    "Hiểu và thực hiện được nhưng mắc lỗi nhỏ",
    "Không thực hiện được các phép toán cơ bản",
  ],
  'g10-bpt-bac-nhat-hai-an': [
    "Giải đúng và biểu diễn chính xác miền nghiệm",
    "Giải đúng nhưng biểu diễn miền nghiệm chưa rõ ràng",
    "Hiểu và giải được nhưng mắc lỗi nhỏ",
    "Không giải được hoặc không biểu diễn được",
  ],
  'g10-ham-so-bac-hai': [
    "Vẽ chính xác Parabola và giải quyết đúng bài toán thực tiễn",
    "Vẽ được đồ thị nhưng chưa giải quyết hết bài toán",
    "Hiểu và vẽ được đồ thị nhưng mắc lỗi nhỏ",
    "Không vẽ được đồ thị hoặc không hiểu bài toán",
  ],
  'g10-he-thuc-luong-tam-giac': [
    "Giải đúng và chính xác bài toán về tam giác",
    "Giải đúng nhưng thiếu lập luận rõ ràng",
    "Hiểu và giải được nhưng chưa đầy đủ",
    "Không hiểu và không giải được bài toán",
  ],
  'g10-vecto-va-phep-toan': [
    "Thực hiện đúng và giải quyết bài toán vectơ phức tạp",
    "Thực hiện đúng phép toán nhưng bài toán thiếu chính xác",
    "Hiểu và thực hiện được nhưng mắc lỗi nhỏ",
    "Không thực hiện được các phép toán cơ bản",
  ],
  'g10-so-gan-dung-sai-so': [
    "Giải thích đúng và tính chính xác sai số",
    "Tính đúng nhưng giải thích chưa rõ ràng",
    "Hiểu và tính được nhưng mắc lỗi nhỏ",
    "Không tính được sai số hoặc không giải thích được",
  ],
  'g10-xac-suat-co-dien': [
    "Tính chính xác xác suất và giải thích rõ ràng",
    "Tính đúng xác suất nhưng giải thích thiếu sót",
    "Hiểu và tính được nhưng chưa chắc chắn",
    "Không tính được xác suất hoặc giải thích sai",
  ],
  'g11-ham-va-pt-luong-giac': [
    "Hiểu sâu về hàm số, vẽ chính xác đồ thị và giải quyết bài toán thực tiễn",
    "Vẽ được đồ thị và giải quyết phương trình lượng giác",
    "Vẽ được đồ thị nhưng chưa giải quyết được hết bài toán",
    "Không vẽ được đồ thị và không giải được phương trình",
  ],
  'g11-day-so-cap-so': [
    "Giải quyết chính xác các bài toán về dãy số và áp dụng vào thực tế",
    "Giải được bài toán về cấp số cộng, cấp số nhân",
    "Hiểu nhưng tính toán chưa chính xác",
    "Không giải được bài toán về dãy số",
  ],
  'g11-gioi-han': [
    "Tính chính xác giới hạn của dãy số và hàm số, giải quyết các bài toán liên quan",
    "Tính đúng giới hạn và vận dụng vào bài toán thực tiễn",
    "Hiểu và tính được nhưng mắc lỗi nhỏ",
    "Không tính được giới hạn và không hiểu bài toán",
  ],
  'g11-ham-mu-va-logarit': [
    "Giải quyết chính xác các bài toán về hàm số mũ, lôgarit",
    "Giải được các bài toán cơ bản về mũ, lôgarit",
    "Hiểu nhưng mắc lỗi trong giải phương trình",
    "Không giải được bài toán liên quan đến mũ và lôgarit",
  ],
  'g11-dao-ham': [
    "Tính chính xác đạo hàm và giải quyết bài toán liên quan",
    "Giải được các bài toán cơ bản về đạo hàm",
    "Hiểu nhưng mắc lỗi trong tính toán",
    "Không tính được đạo hàm hoặc không hiểu bài toán",
  ],
  'g11-duong-thang-mat-phang-kg': [
    "Mô tả rõ ràng và giải quyết bài toán không gian liên quan đến đường thẳng và mặt phẳng",
    "Xác định được đúng các tính chất và quan hệ giữa đường thẳng và mặt phẳng",
    "Hiểu nhưng giải quyết bài toán chưa chính xác",
    "Không hiểu và không xác định được quan hệ giữa đường thẳng và mặt phẳng",
  ],
  'g11-quan-he-song-song': [
    "Giải quyết chính xác các bài toán về quan hệ song song trong không gian",
    "Xác định được đúng quan hệ song song và giải bài toán thực tiễn",
    "Hiểu nhưng chưa chắc chắn trong giải quyết bài toán",
    "Không nhận biết và giải được các bài toán về song song",
  ],
  'g11-quan-he-vuong-goc': [
    "Giải quyết chính xác các bài toán về quan hệ vuông góc trong không gian",
    "Xác định được đúng quan hệ vuông góc và giải bài toán thực tiễn",
    "Hiểu nhưng mắc lỗi trong giải quyết bài toán",
    "Không hiểu và không giải được bài toán về vuông góc",
  ],
  'g11-phan-tich-du-lieu': [
    "Tính chính xác các số đặc trưng và phân tích kết quả",
    "Tính được các số đặc trưng cơ bản và vận dụng vào thực tiễn",
    "Hiểu nhưng kết quả tính toán chưa chính xác",
    "Không tính được các số đặc trưng hoặc không hiểu kết quả",
  ],
  'g11-xac-suat-co-dien-quy-tac': [
    "Giải quyết chính xác các bài toán xác suất và vận dụng quy tắc tính xác suất",
    "Tính được xác suất của biến cố trong các bài toán đơn giản",
    "Hiểu nhưng tính toán chưa chính xác",
    "Không tính được xác suất hoặc không hiểu bài toán",
  ],
  'g12-khao-sat-ham-so': [
    "Khảo sát đầy đủ và vẽ chính xác đồ thị hàm số, giải quyết bài toán thực tiễn",
    "Khảo sát và vẽ đúng đồ thị hàm số, giải bài toán cơ bản",
    "Khảo sát và vẽ được đồ thị nhưng còn mắc lỗi nhỏ",
    "Không khảo sát được và vẽ sai đồ thị",
  ],
  'g12-nguyen-ham-tich-phan': [
    "Giải quyết chính xác các bài toán về tích phân và ứng dụng vào thực tế",
    "Tính được tích phân và giải bài toán cơ bản về diện tích, thể tích",
    "Hiểu nhưng mắc lỗi trong tính toán",
    "Không tính được tích phân và không giải quyết được bài toán",
  ],
  'g12-ung-dung-tich-phan': [
    "Áp dụng chính xác và linh hoạt tích phân vào giải các bài toán phức tạp",
    "Giải được bài toán ứng dụng tích phân trong thực tế",
    "Hiểu và giải được nhưng chưa đầy đủ",
    "Không áp dụng được tích phân vào giải bài toán thực tiễn",
  ],
  'g12-ham-mu-va-logarit': [
    "Giải quyết chính xác các bài toán về hàm số mũ, lôgarit",
    "Giải được các bài toán cơ bản về mũ, lôgarit",
    "Hiểu nhưng mắc lỗi trong giải phương trình",
    "Không giải được bài toán liên quan đến mũ và lôgarit",
  ],
  'g12-dao-ham': [
    "Tính chính xác đạo hàm và giải quyết bài toán liên quan",
    "Giải được các bài toán cơ bản về đạo hàm",
    "Hiểu nhưng mắc lỗi trong tính toán",
    "Không tính được đạo hàm hoặc không hiểu bài toán",
  ],
  'g12-toa-do-khong-gian': [
    "Xác định đúng và giải bài toán không gian với phương pháp tọa độ",
    "Giải được bài toán về tọa độ vectơ cơ bản",
    "Hiểu nhưng mắc lỗi trong tính toán",
    "Không giải được bài toán về tọa độ trong không gian",
  ],
  'g12-pt-mat-phang': [
    "Giải đúng và thiết lập chính xác phương trình mặt phẳng",
    "Thiết lập được phương trình mặt phẳng trong các trường hợp cơ bản",
    "Hiểu nhưng lập sai phương trình",
    "Không thiết lập được phương trình mặt phẳng",
  ],
  'g12-pt-duong-thang': [
    "Thiết lập chính xác và giải bài toán về đường thẳng trong không gian",
    "Giải được bài toán cơ bản về đường thẳng trong không gian",
    "Hiểu nhưng mắc lỗi trong lập luận",
    "Không giải được bài toán về đường thẳng",
  ],
  'g12-pt-mat-cau': [
    "Thiết lập chính xác phương trình mặt cầu và giải quyết bài toán liên quan",
    "Xác định được tâm và bán kính của mặt cầu",
    "Hiểu nhưng chưa lập đúng phương trình",
    "Không xác định được phương trình mặt cầu",
  ],
  'g12-phan-tich-du-lieu': [
    "Tính chính xác và phân tích ý nghĩa của các số đặc trưng trong thực tiễn",
    "Tính được các số đặc trưng cơ bản và giải thích được ý nghĩa",
    "Hiểu nhưng kết quả tính toán chưa chính xác",
    "Không tính được các số đặc trưng hoặc không hiểu ý nghĩa",
  ],
  'g12-xac-suat-dieu-kien-bayes': [
    "Giải quyết chính xác các bài toán liên quan đến xác suất có điều kiện",
    "Tính được xác suất và giải quyết bài toán cơ bản về xác suất có điều kiện",
    "Hiểu nhưng mắc lỗi trong tính toán",
    "Không tính được xác suất hoặc không giải bài toán xác suất",
  ],
};

/** Mô tả 4 mức của một năng lực, theo thứ tự COMPETENCY_LEVELS; không có thì null. */
export const levelDescriptions = (competency: Competency | string): readonly [string, string, string, string] | null => {
  const item = typeof competency === 'string' ? competencyById(competency) : competency;
  if (!item) return null;
  return item.rubric ?? TEMPLATE_RUBRICS[item.id] ?? null;
};
