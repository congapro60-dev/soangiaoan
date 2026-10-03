# Phase 3 — mode contracts, recovery và sự kiện

Mục tiêu: tách cách tham gia khỏi luật ván, tạo state machine thuần và xử lý câu quá khó mà không sửa câu trả lời Toán. Chưa nối host auth production.

- `lib/game-modes.js`: participation `group|individual|pairs`, rule `campaign|duel|zones|survival|escort|treasure|relay|lockdown|merchant`; capacity 26 learners / 13 pairs, faction 4, deterministic pairing/late join/leaver. Không có standalone solo mode; duel là cạnh tranh trong lớp. Outcome `active|spectator|temporary-defeat|completed|abandoned`.
- `lib/recovery.js`: hint tier, draft key `(participant,round,questionRevision)`, downgrade tạo questionRevision mới và điểm công bố, guided gate đầu/cuối, middle abandon, teacher-help request, broken-question/swap-equivalent. Penalty ceiling và pause composition bất biến; không lộ đáp án học sinh.
- `lib/room-events.js`: event version, requestId, payload fingerprint, round/revision, deadline, conflict codes. Same id/same hash replay; same id/different hash reject. Reward at-most-once.
- `lib/arena.js`: state machine Lôi Đài Ngũ Ấn 75 giây, fixed seed bracket/bye, action `answer|guard|assist|stun`, loss temporary stun, reward once, return target question. No permanent elimination.
- Add tests first for same fixture across rule modes (different objective/progression/ranking), 26/13-pair/faction 7-7-6-6/odd/late/leaver, downgrade/draft mismatch/help, conflict/deadline/reward, arena bracket/timeout/retry/no elimination.
- Integrate only after pure tests pass: campaign room config, API actions and serializers. Student public state excludes expected answers/teacher guides; teacher gets canonical explanation/history by role. Preserve V7 modes/regatta as legacy.

Gate: npm test/typecheck/build/lint; no production mode switch until route integration, seeded migration and browser 26-session simulation prove canonical state.
