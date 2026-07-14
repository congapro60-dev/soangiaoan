/**
 * Parse JSON từ phản hồi AI, chịu được backslash LaTeX thô.
 *
 * Nội dung Toán (`\cos`, `\sqrt`, `\left`, `\begin`...) khi AI nhét vào chuỗi JSON
 * thường là escape không hợp lệ → `JSON.parse` ném lỗi. Hàm này thử parse thẳng trước;
 * chỉ khi thất bại mới escape các backslash không thuộc chuỗi thoát JSON hợp lệ rồi thử lại,
 * biến "thất bại hoàn toàn" thành "parse được" mà không đụng tới JSON vốn đã hợp lệ.
 */
export const parseLooseJson = <T = any>(jsonStr: string): T => {
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    const repaired = jsonStr.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    return JSON.parse(repaired) as T;
  }
};
