/**
 * YÊU CẦU CẦN ĐẠT môn Toán — Chương trình GDPT 2018 (ban hành kèm Thông tư 32/2018/TT-BGDĐT).
 *
 * Lời văn giữ đúng Chương trình (văn bản pháp quy, dùng chung mọi trường). Một vài mục gộp nhiều bài được TÁCH theo
 * bài SGK để chẩn đoán chính xác hơn (vd lớp 10: "Thực hiện được các phép toán trên vectơ…" tách tổng–hiệu / tích với
 * một số / tích vô hướng; "hoán vị… bằng máy tính cầm tay. Khai triển nhị thức Newton…" tách hai ý).
 * `sgk` chỉ là bài tương ứng trong bộ Kết nối tri thức — để giáo viên tra, KHÔNG chép chữ của sách.
 *
 * `id` là KHOÁ ỔN ĐỊNH (đã lưu trong báo cáo) — không đổi số; thêm mục mới thì thêm id mới ở cuối khối.
 * Module thuần, không import gì — máy chủ (api/) dùng được.
 */

export type YccdStrand = 'Đại số' | 'Hình học và Đo lường' | 'Thống kê và Xác suất';

export interface YccdItem {
  id: string;
  strand: YccdStrand;
  /** Chủ đề nội dung — dùng làm nhóm khi hiện báo cáo. */
  topic: string;
  /** Bài tương ứng trong SGK Kết nối tri thức. */
  sgk: string;
  text: string;
}

const G10: readonly YccdItem[] = [
  { id: 'T10.01', strand: 'Đại số', topic: 'Mệnh đề', sgk: 'Bài 1', text: 'Thiết lập và phát biểu được các mệnh đề toán học, bao gồm: mệnh đề phủ định; mệnh đề đảo; mệnh đề tương đương; mệnh đề có chứa kí hiệu ∀, ∃; điều kiện cần, điều kiện đủ, điều kiện cần và đủ.' },
  { id: 'T10.02', strand: 'Đại số', topic: 'Mệnh đề', sgk: 'Bài 1', text: 'Xác định được tính đúng/sai của một mệnh đề toán học trong những trường hợp đơn giản.' },
  { id: 'T10.03', strand: 'Đại số', topic: 'Tập hợp và các phép toán trên tập hợp', sgk: 'Bài 2', text: 'Nhận biết được các khái niệm cơ bản về tập hợp (tập con, hai tập hợp bằng nhau, tập rỗng) và biết sử dụng các kí hiệu ⊂, ⊃, ∅.' },
  { id: 'T10.04', strand: 'Đại số', topic: 'Tập hợp và các phép toán trên tập hợp', sgk: 'Bài 2', text: 'Thực hiện được phép toán trên các tập hợp (hợp, giao, hiệu của hai tập hợp, phần bù của một tập con) và biết dùng biểu đồ Ven để biểu diễn chúng trong những trường hợp cụ thể.' },
  { id: 'T10.05', strand: 'Đại số', topic: 'Tập hợp và các phép toán trên tập hợp', sgk: 'Bài 2', text: 'Giải quyết được một số vấn đề thực tiễn gắn với phép toán trên tập hợp (ví dụ: những bài toán liên quan đến đếm số phần tử của hợp các tập hợp,...).' },
  { id: 'T10.06', strand: 'Đại số', topic: 'Bất phương trình, hệ bất phương trình bậc nhất hai ẩn', sgk: 'Bài 3–4', text: 'Nhận biết được bất phương trình và hệ bất phương trình bậc nhất hai ẩn.' },
  { id: 'T10.07', strand: 'Đại số', topic: 'Bất phương trình, hệ bất phương trình bậc nhất hai ẩn', sgk: 'Bài 3–4', text: 'Biểu diễn được miền nghiệm của bất phương trình và hệ bất phương trình bậc nhất hai ẩn trên mặt phẳng toạ độ.' },
  { id: 'T10.08', strand: 'Đại số', topic: 'Bất phương trình, hệ bất phương trình bậc nhất hai ẩn', sgk: 'Bài 3–4', text: 'Vận dụng được kiến thức về bất phương trình, hệ bất phương trình bậc nhất hai ẩn vào giải quyết bài toán thực tiễn (ví dụ: bài toán tìm cực trị của biểu thức F = ax + by trên một miền đa giác,...).' },
  { id: 'T10.09', strand: 'Đại số', topic: 'Hàm số và đồ thị', sgk: 'Bài 15', text: 'Nhận biết được những mô hình thực tế (dạng bảng, biểu đồ, công thức) dẫn đến khái niệm hàm số.' },
  { id: 'T10.10', strand: 'Đại số', topic: 'Hàm số và đồ thị', sgk: 'Bài 15', text: 'Mô tả được các khái niệm cơ bản về hàm số: định nghĩa hàm số, tập xác định, tập giá trị, hàm số đồng biến, hàm số nghịch biến, đồ thị của hàm số.' },
  { id: 'T10.11', strand: 'Đại số', topic: 'Hàm số và đồ thị', sgk: 'Bài 15', text: 'Mô tả được các đặc trưng hình học của đồ thị hàm số đồng biến, hàm số nghịch biến.' },
  { id: 'T10.12', strand: 'Đại số', topic: 'Hàm số và đồ thị', sgk: 'Bài 15', text: 'Vận dụng được kiến thức của hàm số vào giải quyết bài toán thực tiễn (ví dụ: xây dựng hàm số bậc nhất trên những khoảng khác nhau để tính số tiền y (phải trả) theo số phút gọi x đối với một gói cước điện thoại,...).' },
  { id: 'T10.13', strand: 'Đại số', topic: 'Hàm số bậc hai', sgk: 'Bài 16', text: 'Thiết lập được bảng giá trị của hàm số bậc hai.' },
  { id: 'T10.14', strand: 'Đại số', topic: 'Hàm số bậc hai', sgk: 'Bài 16', text: 'Vẽ được Parabola (parabol) là đồ thị hàm số bậc hai.' },
  { id: 'T10.15', strand: 'Đại số', topic: 'Hàm số bậc hai', sgk: 'Bài 16', text: 'Nhận biết được các tính chất cơ bản của Parabola như đỉnh, trục đối xứng.' },
  { id: 'T10.16', strand: 'Đại số', topic: 'Hàm số bậc hai', sgk: 'Bài 16', text: 'Nhận biết và giải thích được các tính chất của hàm số bậc hai thông qua đồ thị.' },
  { id: 'T10.17', strand: 'Đại số', topic: 'Hàm số bậc hai', sgk: 'Bài 16', text: 'Vận dụng được kiến thức về hàm số bậc hai và đồ thị vào giải quyết bài toán thực tiễn (ví dụ: xác định độ cao của cầu, cổng có hình dạng Parabola,...).' },
  { id: 'T10.18', strand: 'Đại số', topic: 'Dấu của tam thức bậc hai. Bất phương trình bậc hai một ẩn', sgk: 'Bài 17', text: 'Giải thích được định lí về dấu của tam thức bậc hai từ việc quan sát đồ thị của hàm bậc hai.' },
  { id: 'T10.19', strand: 'Đại số', topic: 'Dấu của tam thức bậc hai. Bất phương trình bậc hai một ẩn', sgk: 'Bài 17', text: 'Giải được bất phương trình bậc hai.' },
  { id: 'T10.20', strand: 'Đại số', topic: 'Dấu của tam thức bậc hai. Bất phương trình bậc hai một ẩn', sgk: 'Bài 17', text: 'Vận dụng được bất phương trình bậc hai một ẩn vào giải quyết bài toán thực tiễn (ví dụ: xác định chiều cao tối đa để xe có thể qua hầm có hình dạng Parabola,...).' },
  { id: 'T10.21', strand: 'Đại số', topic: 'Phương trình quy về phương trình bậc hai', sgk: 'Bài 18', text: 'Giải được phương trình chứa căn thức có dạng: √(ax² + bx + c) = √(dx² + ex + f); √(ax² + bx + c) = dx + e.' },
  { id: 'T10.22', strand: 'Đại số', topic: 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp', sgk: 'Bài 23–24', text: 'Vận dụng được quy tắc cộng và quy tắc nhân trong một số tình huống đơn giản (ví dụ: đếm số khả năng xuất hiện mặt sấp/ngửa khi tung một số đồng xu,...).' },
  { id: 'T10.23', strand: 'Đại số', topic: 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp', sgk: 'Bài 23–24', text: 'Vận dụng được sơ đồ hình cây trong các bài toán đếm đơn giản các đối tượng trong Toán học, trong các môn học khác cũng như trong thực tiễn (ví dụ: đếm số hợp tử tạo thành trong Sinh học, hoặc đếm số trận đấu trong một giải thể thao,...).' },
  { id: 'T10.24', strand: 'Đại số', topic: 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp', sgk: 'Bài 23–24', text: 'Tính được số các hoán vị, chỉnh hợp, tổ hợp.' },
  { id: 'T10.25', strand: 'Đại số', topic: 'Quy tắc đếm, hoán vị, chỉnh hợp, tổ hợp', sgk: 'Bài 23–24', text: 'Tính được số các hoán vị, chỉnh hợp, tổ hợp bằng máy tính cầm tay.' },
  { id: 'T10.26', strand: 'Đại số', topic: 'Nhị thức Newton', sgk: 'Bài 25', text: 'Khai triển được nhị thức Newton (a + b)ⁿ với số mũ thấp (n = 4 hoặc n = 5) bằng cách vận dụng tổ hợp.' },
  { id: 'T10.27', strand: 'Hình học và Đo lường', topic: 'Giá trị lượng giác của một góc từ 0° đến 180°', sgk: 'Bài 5', text: 'Nhận biết được giá trị lượng giác của một góc từ 0° đến 180°.' },
  { id: 'T10.28', strand: 'Hình học và Đo lường', topic: 'Giá trị lượng giác của một góc từ 0° đến 180°', sgk: 'Bài 5', text: 'Tính được giá trị lượng giác (đúng hoặc gần đúng) của một góc từ 0° đến 180° bằng máy tính cầm tay.' },
  { id: 'T10.29', strand: 'Hình học và Đo lường', topic: 'Giá trị lượng giác của một góc từ 0° đến 180°', sgk: 'Bài 5', text: 'Giải thích được hệ thức liên hệ giữa giá trị lượng giác của các góc phụ nhau, bù nhau.' },
  { id: 'T10.30', strand: 'Hình học và Đo lường', topic: 'Hệ thức lượng trong tam giác', sgk: 'Bài 6', text: 'Giải thích được các hệ thức lượng cơ bản trong tam giác: định lí côsin, định lí sin, công thức tính diện tích tam giác.' },
  { id: 'T10.31', strand: 'Hình học và Đo lường', topic: 'Hệ thức lượng trong tam giác', sgk: 'Bài 6', text: 'Mô tả được cách giải tam giác và vận dụng được vào việc giải một số bài toán có nội dung thực tiễn (ví dụ: xác định khoảng cách giữa hai địa điểm khi gặp vật cản, xác định chiều cao của vật khi không thể đo trực tiếp,...).' },
  { id: 'T10.32', strand: 'Hình học và Đo lường', topic: 'Vectơ: khái niệm mở đầu', sgk: 'Bài 7', text: 'Nhận biết được khái niệm vectơ, vectơ bằng nhau, vectơ-không.' },
  { id: 'T10.33', strand: 'Hình học và Đo lường', topic: 'Vectơ: khái niệm mở đầu', sgk: 'Bài 7', text: 'Biểu thị được một số đại lượng trong thực tiễn bằng vectơ.' },
  { id: 'T10.34', strand: 'Hình học và Đo lường', topic: 'Tổng và hiệu của hai vectơ', sgk: 'Bài 8', text: 'Thực hiện được phép toán tổng và hiệu hai vectơ và mô tả được những tính chất hình học (trung điểm của đoạn thẳng, trọng tâm của tam giác,...) bằng vectơ.' },
  { id: 'T10.35', strand: 'Hình học và Đo lường', topic: 'Tích của một vectơ với một số', sgk: 'Bài 9', text: 'Thực hiện được phép toán tích của một số với vectơ và mô tả được những tính chất hình học (ba điểm thẳng hàng, trung điểm của đoạn thẳng, trọng tâm của tam giác,...) bằng vectơ.' },
  { id: 'T10.36', strand: 'Hình học và Đo lường', topic: 'Tích vô hướng của hai vectơ', sgk: 'Bài 11', text: 'Thực hiện được phép toán tích vô hướng của hai vectơ.' },
  { id: 'T10.37', strand: 'Hình học và Đo lường', topic: 'Vectơ và ứng dụng', sgk: 'Bài 8–11', text: 'Sử dụng được vectơ và các phép toán trên vectơ để giải thích một số hiện tượng có liên quan đến Vật lí và Hoá học (ví dụ: những vấn đề liên quan đến lực, đến chuyển động,...).' },
  { id: 'T10.38', strand: 'Hình học và Đo lường', topic: 'Vectơ và ứng dụng', sgk: 'Bài 8–11', text: 'Vận dụng được kiến thức về vectơ để giải một số bài toán hình học và một số bài toán liên quan đến thực tiễn (ví dụ: xác định lực tác dụng lên vật,...).' },
  { id: 'T10.39', strand: 'Hình học và Đo lường', topic: 'Vectơ trong mặt phẳng toạ độ', sgk: 'Bài 10', text: 'Nhận biết được toạ độ của vectơ đối với một hệ trục toạ độ.' },
  { id: 'T10.40', strand: 'Hình học và Đo lường', topic: 'Vectơ trong mặt phẳng toạ độ', sgk: 'Bài 10', text: 'Tìm được toạ độ của một vectơ, độ dài của một vectơ khi biết toạ độ hai đầu mút của nó.' },
  { id: 'T10.41', strand: 'Hình học và Đo lường', topic: 'Vectơ trong mặt phẳng toạ độ', sgk: 'Bài 10', text: 'Sử dụng được biểu thức toạ độ của các phép toán vectơ trong tính toán.' },
  { id: 'T10.42', strand: 'Hình học và Đo lường', topic: 'Vectơ trong mặt phẳng toạ độ', sgk: 'Bài 10', text: 'Vận dụng được kiến thức về toạ độ của vectơ để giải một số bài toán liên quan đến thực tiễn (ví dụ: vị trí của vật trên mặt phẳng toạ độ,...).' },
  { id: 'T10.43', strand: 'Hình học và Đo lường', topic: 'Vectơ trong mặt phẳng toạ độ', sgk: 'Bài 11', text: 'Vận dụng được phương pháp toạ độ vào bài toán giải tam giác.' },
  { id: 'T10.44', strand: 'Hình học và Đo lường', topic: 'Phương trình đường thẳng', sgk: 'Bài 19', text: 'Mô tả được phương trình tổng quát và phương trình tham số của đường thẳng trong mặt phẳng toạ độ.' },
  { id: 'T10.45', strand: 'Hình học và Đo lường', topic: 'Phương trình đường thẳng', sgk: 'Bài 19', text: 'Thiết lập được phương trình của đường thẳng trong mặt phẳng khi biết: một điểm và một vectơ pháp tuyến; biết một điểm và một vectơ chỉ phương; biết hai điểm.' },
  { id: 'T10.46', strand: 'Hình học và Đo lường', topic: 'Phương trình đường thẳng', sgk: 'Bài 19', text: 'Giải thích được mối liên hệ giữa đồ thị hàm số bậc nhất và đường thẳng trong mặt phẳng toạ độ.' },
  { id: 'T10.47', strand: 'Hình học và Đo lường', topic: 'Vị trí tương đối, góc và khoảng cách', sgk: 'Bài 20', text: 'Nhận biết được hai đường thẳng cắt nhau, song song, trùng nhau, vuông góc với nhau bằng phương pháp toạ độ.' },
  { id: 'T10.48', strand: 'Hình học và Đo lường', topic: 'Vị trí tương đối, góc và khoảng cách', sgk: 'Bài 20', text: 'Thiết lập được công thức tính góc giữa hai đường thẳng.' },
  { id: 'T10.49', strand: 'Hình học và Đo lường', topic: 'Vị trí tương đối, góc và khoảng cách', sgk: 'Bài 20', text: 'Tính được khoảng cách từ một điểm đến một đường thẳng bằng phương pháp toạ độ.' },
  { id: 'T10.50', strand: 'Hình học và Đo lường', topic: 'Vị trí tương đối, góc và khoảng cách', sgk: 'Bài 20', text: 'Vận dụng được kiến thức về phương trình đường thẳng để giải một số bài toán có liên quan đến thực tiễn.' },
  { id: 'T10.51', strand: 'Hình học và Đo lường', topic: 'Đường tròn trong mặt phẳng toạ độ', sgk: 'Bài 21', text: 'Thiết lập được phương trình đường tròn khi biết toạ độ tâm và bán kính; biết toạ độ ba điểm mà đường tròn đi qua; xác định được tâm và bán kính đường tròn khi biết phương trình của đường tròn.' },
  { id: 'T10.52', strand: 'Hình học và Đo lường', topic: 'Đường tròn trong mặt phẳng toạ độ', sgk: 'Bài 21', text: 'Thiết lập được phương trình tiếp tuyến của đường tròn khi biết toạ độ của tiếp điểm.' },
  { id: 'T10.53', strand: 'Hình học và Đo lường', topic: 'Đường tròn trong mặt phẳng toạ độ', sgk: 'Bài 21', text: 'Vận dụng được kiến thức về phương trình đường tròn để giải một số bài toán liên quan đến thực tiễn (ví dụ: bài toán về chuyển động tròn trong Vật lí,...).' },
  { id: 'T10.54', strand: 'Hình học và Đo lường', topic: 'Ba đường conic', sgk: 'Bài 22', text: 'Nhận biết được ba đường conic bằng hình học.' },
  { id: 'T10.55', strand: 'Hình học và Đo lường', topic: 'Ba đường conic', sgk: 'Bài 22', text: 'Nhận biết được phương trình chính tắc của ba đường conic trong mặt phẳng toạ độ.' },
  { id: 'T10.56', strand: 'Hình học và Đo lường', topic: 'Ba đường conic', sgk: 'Bài 22', text: 'Giải quyết được một số vấn đề thực tiễn gắn với ba đường conic (ví dụ: giải thích một số hiện tượng trong Quang học,...).' },
  { id: 'T10.57', strand: 'Thống kê và Xác suất', topic: 'Số gần đúng và sai số', sgk: 'Bài 12', text: 'Hiểu được khái niệm số gần đúng, sai số tuyệt đối.' },
  { id: 'T10.58', strand: 'Thống kê và Xác suất', topic: 'Số gần đúng và sai số', sgk: 'Bài 12', text: 'Xác định được số gần đúng của một số với độ chính xác cho trước.' },
  { id: 'T10.59', strand: 'Thống kê và Xác suất', topic: 'Số gần đúng và sai số', sgk: 'Bài 12', text: 'Xác định được sai số tương đối của số gần đúng.' },
  { id: 'T10.60', strand: 'Thống kê và Xác suất', topic: 'Số gần đúng và sai số', sgk: 'Bài 12', text: 'Xác định được số quy tròn của số gần đúng với độ chính xác cho trước.' },
  { id: 'T10.61', strand: 'Thống kê và Xác suất', topic: 'Số gần đúng và sai số', sgk: 'Bài 12', text: 'Biết sử dụng máy tính cầm tay để tính toán với các số gần đúng.' },
  { id: 'T10.62', strand: 'Thống kê và Xác suất', topic: 'Mô tả và biểu diễn dữ liệu', sgk: 'Chương V', text: 'Phát hiện và lí giải được số liệu không chính xác dựa trên mối liên hệ toán học đơn giản giữa các số liệu đã được biểu diễn trong nhiều ví dụ.' },
  { id: 'T10.63', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo xu thế trung tâm', sgk: 'Bài 13', text: 'Tính được số đặc trưng đo xu thế trung tâm cho mẫu số liệu không ghép nhóm: số trung bình cộng (hay số trung bình), trung vị (median), tứ phân vị (quartiles), mốt (mode).' },
  { id: 'T10.64', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo xu thế trung tâm', sgk: 'Bài 13', text: 'Giải thích được ý nghĩa và vai trò của các số đặc trưng nói trên của mẫu số liệu trong thực tiễn.' },
  { id: 'T10.65', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo xu thế trung tâm', sgk: 'Bài 13', text: 'Chỉ ra được những kết luận nhờ ý nghĩa của số đặc trưng nói trên của mẫu số liệu trong trường hợp đơn giản.' },
  { id: 'T10.66', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo mức độ phân tán', sgk: 'Bài 14', text: 'Tính được số đặc trưng đo mức độ phân tán cho mẫu số liệu không ghép nhóm: khoảng biến thiên, khoảng tứ phân vị, phương sai, độ lệch chuẩn.' },
  { id: 'T10.67', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo mức độ phân tán', sgk: 'Bài 14', text: 'Giải thích được ý nghĩa và vai trò của các số đặc trưng nói trên của mẫu số liệu trong thực tiễn.' },
  { id: 'T10.68', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo mức độ phân tán', sgk: 'Bài 14', text: 'Chỉ ra được những kết luận nhờ ý nghĩa của số đặc trưng nói trên của mẫu số liệu trong trường hợp đơn giản.' },
  { id: 'T10.69', strand: 'Thống kê và Xác suất', topic: 'Số đặc trưng đo mức độ phân tán', sgk: 'Bài 14', text: 'Nhận biết được mối liên hệ giữa thống kê với những kiến thức của các môn học trong Chương trình lớp 10 và trong thực tiễn.' },
  { id: 'T10.70', strand: 'Thống kê và Xác suất', topic: 'Biến cố và định nghĩa cổ điển của xác suất', sgk: 'Bài 26', text: 'Nhận biết được một số khái niệm về xác suất cổ điển: phép thử ngẫu nhiên; không gian mẫu; biến cố (biến cố là tập con của không gian mẫu); biến cố đối; định nghĩa cổ điển của xác suất; nguyên lí xác suất bé.' },
  { id: 'T10.71', strand: 'Thống kê và Xác suất', topic: 'Biến cố và định nghĩa cổ điển của xác suất', sgk: 'Bài 26', text: 'Mô tả được không gian mẫu, biến cố trong một số thí nghiệm đơn giản (ví dụ: tung đồng xu hai lần, tung đồng xu ba lần, tung xúc xắc hai lần).' },
  { id: 'T10.72', strand: 'Thống kê và Xác suất', topic: 'Biến cố và định nghĩa cổ điển của xác suất', sgk: 'Bài 26', text: 'Mô tả được các tính chất cơ bản của xác suất.' },
  { id: 'T10.73', strand: 'Thống kê và Xác suất', topic: 'Tính xác suất theo định nghĩa cổ điển', sgk: 'Bài 27', text: 'Tính được xác suất của biến cố trong một số bài toán đơn giản bằng phương pháp tổ hợp (trường hợp xác suất phân bố đều).' },
  { id: 'T10.74', strand: 'Thống kê và Xác suất', topic: 'Tính xác suất theo định nghĩa cổ điển', sgk: 'Bài 27', text: 'Tính được xác suất trong một số thí nghiệm lặp bằng cách sử dụng sơ đồ hình cây (ví dụ: tung xúc xắc hai lần, tính xác suất để tổng số chấm xuất hiện trong hai lần tung bằng 7).' },
  { id: 'T10.75', strand: 'Thống kê và Xác suất', topic: 'Tính xác suất theo định nghĩa cổ điển', sgk: 'Bài 27', text: 'Tính được xác suất của biến cố đối.' },
];

const BY_GRADE: Readonly<Record<number, readonly YccdItem[]>> = { 10: G10 };
const BY_ID = new Map<string, YccdItem>(Object.values(BY_GRADE).flatMap(list => list.map(item => [item.id, item] as const)));

/** Danh sách YCCĐ của khối (theo thứ tự Chương trình); khối chưa có dữ liệu → mảng rỗng. */
export const yccdForGrade = (grade: unknown): readonly YccdItem[] => {
  const n = Number(String(grade ?? '').match(/\d+/)?.[0]);
  return BY_GRADE[n] ?? [];
};

export const yccdById = (id: string): YccdItem | undefined => BY_ID.get(id);
