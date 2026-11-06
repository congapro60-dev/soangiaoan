"use client";

import React from "react";

export interface LessonModeView {
  rule: string; round: number; startedAt: number; instanceId: string; paused: boolean; finished: boolean;
  participation?:string; gameNow?: number; deadline?: number;
  aggregate: { total: number; completed: number; active: number };
  board?: {
    track?: { length: number; lane: { slot: number; distance: number; own: boolean }[] };
    bomb?: { wires: number; cut: number; exploded: boolean };
    farm?: { stages: number; labels: string[]; day: number; seasonDays: number };
    arena?: { boss: { hp: number; max: number }; classes: string[] };
    seats?: { slot: number; standing: boolean; ring: number; own: boolean }[];
  };
  units?: { id: string; members: { id: string; name: string }[]; outcome: string }[];
  own?: Record<string, unknown> & {
    actions: { label: string; action: Record<string, unknown>; kind: "assessment" | "mechanical" }[];
    selectedAction: Record<string, unknown> | null;
    actionSequence: number;
    isController?: boolean; teamSize?: number; turnNumber?: number;
  };
}

export const lessonRuleLabels: Record<string, string> = { campaign: "Hành trình năm ấn tín", duel: "Đấu trí", zones: "Giữ vùng", survival: "Sinh tồn", escort: "Hộ tống", treasure: "Kho báu", relay: "Tiếp sức", lockdown: "Mở phòng", merchant: "Thương nhân", speedway: "Đường đua tri thức", bellring: "Rung chuông vàng", bomb: "Gỡ bom", farm: "Nông trại tri thức", arena: "Đấu trường RPG" };
export const lessonRuleGuides: Record<string,[string,string,string]> = {
  campaign:["Thu đủ năm ấn tín, mở cổng hành trình.","Nhận ấn tín từ bài tiếp theo; khi đủ điều kiện, tung xúc xắc rồi mở cổng.","Mở được cổng sau năm ấn tín. Bản đồ vẫn giữ các chặng học bắt buộc."],
  duel:["Đấu trí qua năm vòng.","Chọn trả lời lượt đấu, tự làm bài tiếp theo; mỗi vòng so kết quả đúng rồi thời gian.","Hết năm vòng, so điểm đấu, số câu đúng rồi thời gian."],
  zones:["Chiếm và bảo vệ các vùng của phe mình.","Chọn vùng chiếm hoặc bảo vệ, làm bài tiếp theo để hành động có hiệu lực; nhiệm vụ tiếp tế thêm tài nguyên.","Dừng khi một phe đạt mức kiểm soát hoặc hết giờ; so mức kiểm soát, câu đúng rồi tài nguyên."],
  survival:["Duy trì năng lượng qua sáu vòng sinh tồn.","Chọn hồi phục hoặc mục tiêu cho bài tiếp theo; di chuyển để ở trong vùng an toàn.","Sau sáu vòng, so số vòng còn năng lượng, mục tiêu rồi năng lượng còn lại."],
  escort:["Đưa đoàn xe đi đủ sáu chặng.","Dùng bài tiếp theo để tiếp nhiên liệu hoặc sửa xe; cho xe đi khi đủ nhiên liệu và độ bền.","Đoàn xe đi đủ sáu chặng; so quãng đường rồi nguồn lực còn lại."],
  treasure:["Ghép hai bộ kho báu.","Nhận manh mối từ bài tiếp theo, chọn nhánh để khai quật, đủ mảnh thì ghép bộ.","Ghép đủ hai bộ; so số bộ, câu đúng rồi điểm chơi."],
  relay:["Mỗi thành viên góp một chặng tiếp sức.","Người giữ lượt dùng bài của mình để nhận gậy, rồi bấm chuyển gậy cho bạn.","Đủ chặng và mọi thành viên đều đã góp lượt; so chặng rồi điểm chơi."],
  lockdown:["Mở liên tiếp bốn phòng.","Dùng bài tiếp theo để cấp năng lượng, rồi chọn mở phòng khi đủ điều kiện.","Mở hết bốn phòng; so số phòng rồi điểm chơi."],
  merchant:["Hoàn thành ba hợp đồng.","Dùng bài tiếp theo để kiếm xu, mua quặng và gỗ, đủ nguyên liệu thì giao hợp đồng.","Giao đủ ba hợp đồng; so hợp đồng rồi giá trị tài sản."],
  speedway:["Về đích trước các đội khác.","Mỗi câu đúng đẩy xe tiến một bước; ba câu liên tiếp mở lượt bứt phá thêm hai bước.","Ai về đích trước thắng; sau đó so quãng đường và chuỗi đúng dài nhất."],
  bellring:["Trụ lại trên sàn tới cuối.","Mỗi câu đúng giữ em trên sàn; sai thì rời sàn và chờ một lượt cứu khi đã đủ năm câu đúng.","Người cuối cùng còn trên sàn thắng; sau đó so chuỗi đúng và số câu đúng."],
  bomb:["Cắt đủ bốn dây trước khi đồng hồ về không.","Mỗi câu đúng cắt một dây; câu sai không cắt được dây và làm mất thời gian.","Cắt đủ bốn dây là thắng; hết giờ trước khi đủ dây thì bom nổ."],
  farm:["Đưa cây qua năm giai đoạn rồi thu hoạch.","Mỗi câu đúng là một lượt tưới; đủ hai lượt thì cây lên một giai đoạn; hai câu sai liên tiếp làm mất một lượt nước.","Cây tới giai đoạn kết quả thì thu hoạch; so giai đoạn, số vụ và số câu đúng."],
  arena:["Hạ trùm trước khi cả đội gục.","Chọn lớp nhân vật rồi dùng bài tiếp theo để tấn công; câu đúng hồi máu và gây sát thương, câu sai mất máu.","Trùm hết máu thì cả lớp thắng; nếu không, so sát thương và câu đúng."],
};
const metrics: Record<string, string> = { position: "Vị trí", score: "Điểm chơi", completed: "Ấn tín", matchPoints: "Điểm đấu", correct: "Câu đúng", energy: "Năng lượng", rounds: "Vòng đã sống sót", objectives: "Mục tiêu chơi", distance: "Chặng đã đi", fuel: "Nhiên liệu", integrity: "Độ bền đoàn xe", clues: "Manh mối", sets: "Bộ kho báu", points: "Điểm chơi", legs: "Chặng tiếp sức", room: "Phòng đã mở", coins: "Xu", ore: "Quặng", wood: "Gỗ", contracts: "Hợp đồng", combo: "Chuỗi đúng", best: "Chuỗi dài nhất", boosts: "Lần bứt phá", wrong: "Câu sai", ring: "Chuỗi chuông", out: "Đã rời sàn", rescued: "Lượt cứu đã dùng", cut: "Dây đã cắt", mistakes: "Lần sai", water: "Nước tưới", stage: "Giai đoạn cây", dry: "Ngày khô", harvested: "Vụ thu hoạch", hp: "Máu", mp: "Năng lượng", damage: "Sát thương", down: "Đã gục" };

const CLASS_LABELS: Record<string, string> = { warrior: "Chiến binh", mage: "Pháp sư", archer: "Cung thủ", tank: "Tank" };

function GameBoard({ view }: { view: LessonModeView }) {
  const own = (view.own || {}) as Record<string, unknown>;
  const board = view.board || {};
  const num = (value: unknown, fallback = 0) => typeof value === "number" ? value : fallback;

  if (view.rule === "speedway") {
    const length = board.track?.length ?? 20;
    const lanes = board.track?.lane || [];
    return <section className="game-board speedway" aria-label="Đường đua">
      <div className="board-head"><h3>Đường đua tri thức</h3><p>{length} bước tới đích · chuỗi hiện tại {num(own.combo)}</p></div>
      {lanes.map(({ slot, distance, own: ownLane }) => {
        const pct = Math.max(0, Math.min(100, Math.round((distance / length) * 100)));
        return <div key={slot} className={`lane${ownLane ? " own" : ""}`} role="img" aria-label={`${ownLane ? "Em" : `Đội ${slot}`} đang ở bước ${distance} trên ${length}`}>
          <span className="lane-name">{ownLane ? "Em" : `Đội ${slot}`}</span>
          <span className="lane-track"><span className="lane-car" style={{ left: `${pct}%` }} /></span>
          <span className="lane-step">{distance}/{length}</span>
        </div>;
      })}
    </section>;
  }

  if (view.rule === "bellring") {
    const seats = board.seats || [];
    const standing = seats.filter(seat => seat.standing);
    const out = seats.filter(seat => !seat.standing);
    return <section className="game-board bellring" aria-label="Sàn thi đấu">
      <div className="board-head"><h3>Rung chuông vàng</h3><p>Còn {standing.length} người trên sàn</p></div>
      <div className="stage">{standing.length ? standing.map(seat => <span key={seat.slot} className={`standing${seat.own ? " own" : ""}`}>{seat.own ? "Em" : `Đội ${seat.slot}`}{seat.ring ? ` · chuỗi ${seat.ring}` : ""}</span>) : <span className="standing">Trống</span>}</div>
      {out.length > 0 && <p className="small muted">Đã rời sàn: {out.map(seat => seat.own ? "Em" : `Đội ${seat.slot}`).join(" · ")}</p>}
    </section>;
  }

  if (view.rule === "bomb") {
    const wires = board.bomb?.wires ?? 4;
    const cut = board.bomb?.cut ?? 0;
    const exploded = Boolean(board.bomb?.exploded);
    const left = Math.max(0, (view.deadline || 0) - (view.gameNow || 0));
    const minutes = Math.floor(left / 60000);
    const seconds = Math.floor((left % 60000) / 1000);
    return <section className={`game-board bomb${exploded ? " exploded" : ""}`} aria-label="Bảng gỡ bom">
      <div className="board-head"><h3>{exploded ? "Bom đã nổ" : "Gỡ bom"}</h3><p>Đã cắt {cut}/{wires} dây · còn {minutes}:{String(seconds).padStart(2, "0")}</p></div>
      <div className="wires">{Array.from({ length: wires }, (_, i) => <span key={i} className={`wire${i < cut ? " cut" : ""}`}>{i < cut ? "✂" : "│"}</span>)}</div>
      <p className="small muted">{exploded ? "Hết giờ trước khi cắt đủ dây. Giáo viên có thể mở ván mới." : "Trả lời đúng để cắt một dây; trả lời sai không cắt được dây."}</p>
    </section>;
  }

  if (view.rule === "farm") {
    const labels = board.farm?.labels || ["Hạt", "Mầm", "Cây non", "Ra hoa", "Kết quả"];
    const stage = Math.max(0, Math.min(labels.length, num(own.stage)));
    const day = board.farm?.day ?? 0, seasonDays = board.farm?.seasonDays ?? 6;
    return <section className="game-board farm" aria-label="Nông trại của em">
      <div className="board-head"><h3>Nông trại tri thức</h3><p>Ngày {day + 1}/{seasonDays} · giai đoạn {stage}/{labels.length} · nước {num(own.water)} · {num(own.harvested)} vụ đã thu</p></div>
      <div className="plots">{labels.map((name, i) => <span key={name} className={`plot${i < stage ? " grown" : ""}${i === stage ? " current" : ""}`}>{name}</span>)}</div>
      <p className="small muted">Mỗi câu đúng là một lượt tưới; đủ hai lượt thì cây lên một giai đoạn. Bỏ trắng một ngày thì mất một lượt nước; bỏ hai ngày liền thì cây héo một giai đoạn.</p>
    </section>;
  }

  if (view.rule === "arena") {
    const boss = board.arena?.boss || { hp: 0, max: 1 };
    const pct = Math.max(0, Math.min(100, Math.round((boss.hp / Math.max(1, boss.max)) * 100)));
    const items = Array.isArray(own.items) ? own.items as string[] : [];
    return <section className="game-board arena" aria-label="Đấu trường RPG">
      <div className="board-head"><h3>Đấu trường RPG</h3><p>Trùm còn {boss.hp}/{boss.max} máu</p></div>
      <div className="boss-bar" role="progressbar" aria-valuemin={0} aria-valuemax={boss.max} aria-valuenow={boss.hp}><span style={{ width: `${pct}%` }} /></div>
      <p className="small muted">Lớp nhân vật: {CLASS_LABELS[String(own.class)] || "Chiến binh"} · máu {num(own.hp)} · năng lượng {num(own.mp)} · sát thương {num(own.damage)}</p>
      {items.length > 0 && <p className="small">Vật phẩm: {items.join(" · ")}</p>}
    </section>;
  }

  return null;
}

export function LessonModePanel({ view, onAction, disabled = false }: {
  view: LessonModeView | null;
  onAction?: (input: { rule: string; round: number; startedAt: number; instanceId: string; sequence: number; action: Record<string, unknown> }) => Promise<void> | void;
  disabled?: boolean;
}) {
  if (!view) return null;
  const own = view.own;
  const selected = own?.actions.find(choice => JSON.stringify(choice.action) === JSON.stringify(own.selectedAction));
  return <section aria-label="Luật chơi của tiết học" className="lesson-card" style={{ padding: "1rem" }}>
    <p className="lesson-kicker">Luật chơi · {lessonRuleLabels[view.rule] || "Chờ thầy cô chọn luật"}</p>
    <p role="status">{view.finished ? "Hành trình chơi đã kết thúc." : view.paused ? "Hành trình chơi đang tạm dừng." : `${view.aggregate.completed}/${view.aggregate.total} hành trình hoàn thành.`}</p>
    {own && Number(own.teamSize) > 1 && !view.finished && <p role="status">Lượt điều khiển {own.turnNumber}/{own.teamSize}. {own.isController ? "Em đang giữ lượt chơi của đội." : "Em tiếp tục làm bài cá nhân; bạn đang giữ lượt điều khiển phần chơi của đội."}</p>}
    {own && <dl style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
      {Object.entries(metrics).filter(([key]) => typeof own[key] === "number").map(([key, label]) => <div key={key}><dt>{label}</dt><dd style={{ margin: 0 }}>{String(own[key])}</dd></div>)}
    </dl>}
    <GameBoard view={view} />
    {selected && <p role="status">Bài tiếp theo dùng để: {selected.label.toLocaleLowerCase("vi-VN")}. Nộp bài học để nhận kết quả.</p>}
    {own && !view.finished && !view.paused && onAction && <div role="group" aria-label="Lựa chọn hành động chơi" style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
      {own.actions.map(choice => <button type="button" key={JSON.stringify(choice.action)} className="lesson-button lesson-button-outline"
        disabled={disabled} aria-pressed={choice.kind === "assessment" ? choice === selected : undefined}
        onClick={() => onAction({ rule: view.rule, round: view.round, startedAt: view.startedAt, instanceId: view.instanceId, sequence: own.actionSequence + 1, action: choice.action })}
        style={{ minHeight: 44 }}>
        {choice.label}{choice.kind === "assessment" ? " · bài tiếp theo" : ""}
      </button>)}
    </div>}
    <p className="lesson-muted">Điểm chơi tính riêng. Hộ chiếu học tập dùng bằng chứng từ nhiệm vụ cá nhân.</p>
  </section>;
}
