import {
  Rocket, Lightbulb, PenTool, LayoutDashboard, FileText, SearchCheck,
  MonitorSmartphone, Cpu, BookOpen, Gamepad2, Presentation, ListChecks,
  Repeat, CheckSquare, Wand2, Image as ImageIcon, Users
} from 'lucide-react';
import type { UpgradeMenuItem } from '../../types';

export const UPGRADE_MENU: UpgradeMenuItem[] = [
  { id: 'A', label: 'Thiết kế hoạt động khởi động hấp dẫn', icon: Rocket, group: 'hoat-dong' },
  { id: 'B', label: 'Thiết kế hoạt động hình thành kiến thức', icon: Lightbulb, group: 'hoat-dong' },
  { id: 'C', label: 'Thiết kế hoạt động luyện tập', icon: PenTool, group: 'hoat-dong' },
  { id: 'D', label: 'Thiết kế hoạt động vận dụng/mở rộng', icon: LayoutDashboard, group: 'hoat-dong' },
  
  { id: 'E', label: 'Tạo phiếu học tập cho học sinh', icon: FileText, group: 'danh-gia', reuse: true },
  { id: 'F', label: 'Tạo câu hỏi kiểm tra đánh giá theo mức độ nhận thức', icon: SearchCheck, group: 'danh-gia', reuse: true },
  { id: 'L', label: 'Tạo rubric/bảng tiêu chí đánh giá', icon: ListChecks, group: 'danh-gia', reuse: true },
  
  { id: 'G', label: 'Bổ sung chỉ số năng lực số cho bài học', icon: MonitorSmartphone, group: 'nang-luc', needsKnowledge: true },
  { id: 'H', label: 'Bổ sung năng lực AI phù hợp với bài học', icon: Cpu, group: 'nang-luc', needsKnowledge: true },
  { id: 'I', label: 'Gợi ý phương pháp/kĩ thuật dạy học phù hợp', icon: BookOpen, group: 'nang-luc', needsKnowledge: true },
  
  { id: 'J', label: 'Thiết kế trò chơi học tập tương tác', icon: Gamepad2, group: 'tro-choi-hoc-lieu', needsKnowledge: true },
  { id: 'K', label: 'Tạo slide dàn ý bài giảng', icon: Presentation, group: 'tro-choi-hoc-lieu', reuse: true },
  { id: 'P', label: 'Tạo học liệu số: prompt ảnh, video, mô phỏng', icon: ImageIcon, group: 'tro-choi-hoc-lieu', reuse: true },
  
  { id: 'M', label: 'Viết lại giáo án theo phẩm chất, năng lực', icon: Repeat, group: 'tong-the', reuse: true },
  { id: 'N', label: 'Rà soát và góp ý toàn bộ giáo án', icon: CheckSquare, group: 'tong-the' },
  { id: 'O', label: 'Tạo phiên bản giáo án sáng tạo hơn', icon: Wand2, group: 'tong-the' },
  { id: 'Q', label: 'Tạo nhiệm vụ học tập phân hóa', icon: Users, group: 'tong-the', reuse: true },
];

export const UPGRADE_GROUPS = [
  { id: 'hoat-dong', label: 'Hoạt động dạy học' },
  { id: 'danh-gia', label: 'Kiểm tra & Đánh giá' },
  { id: 'nang-luc', label: 'Năng lực & Phương pháp' },
  { id: 'tro-choi-hoc-lieu', label: 'Trò chơi & Học liệu' },
  { id: 'tong-the', label: 'Nâng cấp tổng thể' }
];
