// Calls to the two exam routes, shared by the teacher and pupil screens.
export interface ExamQuestion {
  id: string;
  section: string;
  label: string;
  type: "mc" | "tf" | "short" | "essay";
  points: number;
  options?: string[];
  statements?: string[];
  text?: string;
  hasImage?: boolean;
  imageMode?: "question" | "figure";
  questionImages?: Array<{ id: string; bytes: number }>;
  choiceText?: Record<string, string>;
  statementText?: Record<string, string>;
  choiceImages?: Record<string, string>;
  statementImages?: Record<string, string>;
  noShuffle?: boolean;
  key?: unknown;
  solution?: string;
  solutionImages?: Array<{ id: string; bytes: number }>;
  rubric?: string;
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, status: number) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

async function call<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { cache: "no-store", ...init });
  } catch {
    throw new ApiError("NETWORK", 0);
  }
  if (!response.ok) {
    let code = "EXAM_UNAVAILABLE";
    try {
      code = ((await response.json()) as { error?: string }).error || code;
    } catch {
      /* not JSON */
    }
    throw new ApiError(code, response.status);
  }
  return (await response.json()) as T;
}

export const teacherGet = <T,>(query: string) => call<T>("/api/exams" + query, { method: "GET" });
export const teacherPost = <T,>(body: Record<string, unknown>) =>
  call<T>("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const pupilGet = <T,>(token: string) => call<T>("/api/exam-play", { method: "GET", headers: { Authorization: "Bearer " + token } });
export const pupilPost = <T,>(body: Record<string, unknown>, token?: string) =>
  call<T>("/api/exam-play", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) }, body: JSON.stringify(body) });

/** Downloads a picture with the pupil's token and returns a local URL for <img>. */
export async function pupilImageUrl(token: string, query: string): Promise<string> {
  const response = await fetch("/api/exam-play?" + query, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new ApiError("IMAGE", response.status);
  return URL.createObjectURL(await response.blob());
}

export async function teacherImageUrl(query: string): Promise<string> {
  const response = await fetch("/api/exams?" + query);
  if (!response.ok) throw new ApiError("IMAGE", response.status);
  return URL.createObjectURL(await response.blob());
}

const MESSAGES: Record<string, string> = {
  NETWORK: "Mất kết nối mạng. Em kiểm tra wifi rồi thử lại nhé.",
  AUTH_REQUIRED: "Phiên làm bài không còn hiệu lực. Em vào lại bằng mã phòng và đúng tên cũ.",
  REVIEW_UNAVAILABLE: "Chưa mở được bài xem lại. Kiểm tra mã phòng, tên và PIN; phòng phải kết thúc và giáo viên cho xem lời giải. Nếu đã thử nhiều lần, chờ 15 phút.",
  ROOM_NOT_FOUND: "Không có phòng với mã này. Em kiểm tra lại mã (6 ký tự).",
  EXAM_NOT_OPEN: "Thầy/cô chưa mở phòng. Em chờ một chút rồi thử lại.",
  EXAM_CLOSED: "Bài kiểm tra đã kết thúc.",
  EXAM_ENDED: "Đã hết giờ làm bài.",
  EXAM_LOCKED: "Phòng đã khóa, không nhận thêm bạn vào lúc này. Em báo thầy/cô.",
  NAME_TAKEN: "Tên này đã có người dùng trên một thiết bị khác. Nếu là em, báo thầy/cô để được vào lại.",
  INVALID_NAME: "Em nhập họ tên (tối đa 40 ký tự).",
  ALREADY_SUBMITTED: "Em đã nộp bài rồi.",
  EXAM_NOT_STARTED: "Bài kiểm tra chưa bắt đầu.",
  INTEGRITY_REQUIRED: "Em cần xác nhận làm bài trung thực trước khi bắt đầu.",
  INTEGRITY_LOCKED: "Lời xác nhận đã được ghi nhận. Báo thầy/cô nếu cần điều chỉnh.",
  KEY_MISSING: "Còn câu chưa có đáp án. Điền đáp án rồi mới bắt đầu, hoặc chọn bắt đầu vẫn tiếp tục.",
  AI_PROVIDER_NOT_CONFIGURED: "Dịch vụ AI chưa được bật hoặc chưa cấu hình. Giáo viên có thể tự tạo mã đề mới.",
  AI_CONSENT_REQUIRED: "Cần xác nhận nội dung đề và dịch vụ AI trước khi gửi.",
  SOURCE_CHANGED: "Đề hoặc dịch vụ đã thay đổi. Xem lại nội dung, xác nhận lại trước khi tạo nháp.",
  VARIANT_NOT_ALLOWED: "Câu có hình hoặc yêu cầu chứng minh chưa hỗ trợ đổi số tự động.",
  AI_QUOTA_EXCEEDED: "Dịch vụ AI hết hạn mức. Bản đề hiện tại vẫn được giữ.",
  AI_TIMEOUT: "AI trả lời quá lâu. Đề hiện tại được giữ; thử lại sau.",
  AI_GENERATION_FAILED: "AI chưa tạo được bản nháp. Đề hiện tại vẫn được giữ.",
  AI_OUTPUT_TRUNCATED: "Bản nháp AI chưa đầy đủ; chưa được áp dụng.",
  INVALID_PROPOSAL: "Bản nháp AI chưa hợp lệ; chưa được áp dụng.",
  PROPOSAL_TOO_LARGE: "Nội dung vượt giới hạn. Chọn ít câu hơn rồi tạo nháp.",
  ACCOMMODATION_CHANGED: "Hỗ trợ riêng đã được cập nhật ở nơi khác. Làm mới danh sách rồi thử lại.",
  BAD_STATE: "Việc này không làm được ở trạng thái hiện tại của phòng.",
  QUESTIONS_LOCKED: "Đã có học sinh vào nên không đổi được số câu hay loại câu; chỉ sửa được đáp án và điểm.",
  INVALID_EXAM: "Đề chưa hợp lệ: cần tên, thời gian 5–300 phút và ít nhất một câu.",
  INVALID_IMAGE: "Ảnh không đọc được hoặc quá lớn.",
  TOO_MANY_PHOTOS: "Đã đủ số ảnh tối đa cho bài làm.",
  BODY_TOO_LARGE: "Dữ liệu quá lớn.",
  EXAM_UNAVAILABLE: "Hệ thống đang bận, thử lại sau ít giây.",
};

export const messageFor = (error: unknown): string => MESSAGES[(error as ApiError)?.code] || "Có lỗi, thử lại sau ít giây.";
