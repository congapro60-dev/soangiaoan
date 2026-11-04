import { readFileSync, writeFileSync } from 'node:fs';
const p = 'src/components/liveLesson/StudentAskBar.tsx';
let t = readFileSync(p, 'utf8');
const anchor = `  // Reload trang vẫn giữ đúng trạng thái tay (doc theo uid).
  useEffect(() => {
    return subscribeToMyHand(sessionId, participantUid, action => { setHand(action); }, () => {});
  }, [sessionId, participantUid]);`;
if (!t.includes(anchor)) throw new Error('anchor missing');
const add = anchor + `
  // Pulse có thể yêu cầu mở modal hỏi (event — không ràng buộc props).
  useEffect(() => {
    const open = () => setAskOpen(true);
    window.addEventListener('open-anon-question', open);
    return () => window.removeEventListener('open-anon-question', open);
  }, []);`;
t = t.split(anchor).join(add);
writeFileSync(p, t, 'utf8');
console.log('askbar patched');
