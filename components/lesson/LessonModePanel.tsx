"use client";

import React from "react";

export interface LessonModeView {
  rule: string; round: number; startedAt: number; instanceId: string; paused: boolean; finished: boolean;
  participation?:string;
  aggregate: { total: number; completed: number; active: number };
  own?: Record<string, unknown> & {
    actions: { label: string; action: Record<string, unknown>; kind: "assessment" | "mechanical" }[];
    selectedAction: Record<string, unknown> | null;
    actionSequence: number;
    isController?: boolean; teamSize?: number; turnNumber?: number;
  };
}

export const lessonRuleLabels: Record<string, string> = { campaign: "Hành trình năm ấn tín", duel: "Đấu trí", zones: "Giữ vùng", survival: "Sinh tồn", escort: "Hộ tống", treasure: "Kho báu", relay: "Tiếp sức", lockdown: "Mở phòng", merchant: "Thương nhân" };
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
};
const metrics: Record<string, string> = { position: "Vị trí", score: "Điểm chơi", completed: "Ấn tín", matchPoints: "Điểm đấu", correct: "Câu đúng", energy: "Năng lượng", rounds: "Vòng đã sống sót", objectives: "Mục tiêu chơi", distance: "Chặng đã đi", fuel: "Nhiên liệu", integrity: "Độ bền đoàn xe", clues: "Manh mối", sets: "Bộ kho báu", points: "Điểm chơi", legs: "Chặng tiếp sức", room: "Phòng đã mở", coins: "Xu", ore: "Quặng", wood: "Gỗ", contracts: "Hợp đồng" };

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
