/** Quote explicit chat commands; preserve prose and existing quotes. Shared before length checks. */
export const quoteChatCommands = (text: string): string => {
  const command = String.raw`(?:xác nhận hủy|nộp hộ|nộp lại|bổ sung|chấm lại|đổi con|kiểm tra|deadline|status|menu|web|xong|hủy|chấm|gv|/khoiphuc|\d{1,3})(?:[ \t]+<[^>\r\n]{1,60}>)*(?![\p{L}\p{N}])`;
  return text.replace(new RegExp(String.raw`(nhắn(?:[ \t]*:[ \t]*|[ \t]+))(${command}(?:[ \t]+(?:hoặc|rồi)[ \t]+${command})*)`, 'giu'),
    (_, lead: string, commands: string) => lead + commands.replace(new RegExp(command, 'giu'), value => `"${value}"`));
};
