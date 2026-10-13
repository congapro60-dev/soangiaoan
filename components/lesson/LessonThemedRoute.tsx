"use client";

import React, { useState } from "react";
import { PRODUCT_THEMES, resolveThemeId } from "../../lib/product-content.js";

export interface MapSegmentPosition {
  index?: number;
  point?: [number, number];
}

export interface PublicMapSegment {
  id?: string;
  activityId?: string;
  order?: number;
  start?: MapSegmentPosition;
  end?: MapSegmentPosition;
  coreGate?: boolean;
  gateIndex?: number | null;
}

export interface PublicActivityPlan {
  id: string;
  order: number;
  phase: string;
  minutes: number;
  participation: string;
  mapSegment?: PublicMapSegment;
}

export interface PublicCheckpoint {
  id: string;
  objectiveCodes?: string[];
}

export interface PublicGamePlanProjection {
  id?: string;
  contentHash?: string;
  schemaVersion?: string;
  theme?: string;
  map?: string;
  rule?: string;
  participation?: string;
  story?: {
    title?: string;
    goal?: string;
  };
  activityPlans?: PublicActivityPlan[];
  checkpoints?: PublicCheckpoint[];
}

export interface LessonThemedRouteProps {
  gamePlan?: PublicGamePlanProjection | unknown | null;
  worldTheme?: string;
  currentActivityIndex?: number;
  currentPhase?: string;
  variant?: "student" | "presenter";
  className?: string;
  onSelectCheckpoint?: (checkpointId: string) => void;
}

export interface SafeWorldMetadata {
  key: string;
  name: string;
  title: string;
  tag: string;
  story: string;
  goal: string;
  intro: string;
  places: string[];
  coverImage: string;
  spriteImage: string;
  mascots: string[];
  palette: string[];
}

export interface RoutePin {
  id: string;
  order: number;
  phase: string;
  x: number;
  y: number;
  isCoreGate: boolean;
  gateIndex: number | null;
  status: "completed" | "active" | "upcoming";
}

export function buildRoutePins(
  activityPlans: PublicActivityPlan[] = [],
  currentActivityIndex = 0
): RoutePin[] {
  const totalActivities = Math.max(1, activityPlans.length);
  const activeIndex = Math.max(0, Math.min(totalActivities - 1, currentActivityIndex));

  const pins: RoutePin[] = [];

  activityPlans.forEach((act, idx) => {
    let x = 15 + (idx / Math.max(1, totalActivities - 1)) * 70;
    let y = 50 + (idx % 2 === 0 ? -16 : 16);

    const seg = act.mapSegment;
    if (seg?.end?.point && Array.isArray(seg.end.point) && seg.end.point.length >= 2) {
      x = Math.max(5, Math.min(95, seg.end.point[0]));
      y = Math.max(10, Math.min(90, seg.end.point[1]));
    } else if (seg?.start?.point && Array.isArray(seg.start.point) && seg.start.point.length >= 2) {
      x = Math.max(5, Math.min(95, seg.start.point[0]));
      y = Math.max(10, Math.min(90, seg.start.point[1]));
    }

    const status: "completed" | "active" | "upcoming" =
      idx < activeIndex ? "completed" : idx === activeIndex ? "active" : "upcoming";

    pins.push({
      id: act.id,
      order: act.order || (idx + 1),
      phase: act.phase,
      x,
      y,
      isCoreGate: Boolean(seg?.coreGate),
      gateIndex: seg?.gateIndex ?? null,
      status,
    });
  });

  return pins;
}

export function handleSelectPin(
  pinId: string,
  onSelectCheckpoint?: (checkpointId: string) => void
): void {
  onSelectCheckpoint?.(pinId);
}

export function getSafeWorldMetadata(themeKey?: string): SafeWorldMetadata {
  const resolvedKey = resolveThemeId(themeKey || "modern") || "modern";
  const themesRecord = PRODUCT_THEMES as unknown as Record<string, {
    name?: string;
    title?: string;
    tag?: string;
    story?: string;
    goal?: string;
    intro?: string;
    places?: string[];
    image?: string;
    sprites?: string;
    mascots?: string[];
    palette?: string[];
  }>;
  const rawTheme = themesRecord[resolvedKey] || themesRecord.modern || {};

  let coverImage = rawTheme.image || "campaign-island.webp";
  if (!coverImage.startsWith("/")) {
    coverImage = `/assets/${coverImage}`;
  }

  let spriteImage = rawTheme.sprites || "mascots.png";
  if (!spriteImage.startsWith("/")) {
    spriteImage = `/assets/${spriteImage}`;
  }

  return {
    key: resolvedKey,
    name: typeof rawTheme.name === "string" ? rawTheme.name : "Hiện đại",
    title: typeof rawTheme.title === "string" ? rawTheme.title : "Hành Trình Khám Phá",
    tag: typeof rawTheme.tag === "string" ? rawTheme.tag : "LỘ TRÌNH THẾ GIỚI",
    story: typeof rawTheme.story === "string" ? rawTheme.story : "",
    goal: typeof rawTheme.goal === "string" ? rawTheme.goal : "",
    intro: typeof rawTheme.intro === "string" ? rawTheme.intro : "",
    places: Array.isArray(rawTheme.places) && rawTheme.places.length
      ? [...rawTheme.places]
      : ["Khởi đầu", "Chặng 1", "Chặng 2", "Chặng 3", "Đích đến"],
    coverImage,
    spriteImage,
    mascots: Array.isArray(rawTheme.mascots) && rawTheme.mascots.length
      ? [...rawTheme.mascots]
      : ["Linh vật"],
    palette: Array.isArray(rawTheme.palette) && rawTheme.palette.length >= 3
      ? [...rawTheme.palette]
      : ["hsl(210 48% 16%)", "hsl(210 52% 30%)", "hsl(210 75% 75%)"],
  };
}

export function LessonThemedRoute({
  gamePlan,
  worldTheme,
  currentActivityIndex = 0,
  currentPhase,
  variant = "student",
  className = "",
  onSelectCheckpoint,
}: LessonThemedRouteProps) {
  const [imgError, setImgError] = useState<boolean>(false);
  const plan = gamePlan as PublicGamePlanProjection | null | undefined;
  const selectedWorld = typeof worldTheme === "string" && Object.hasOwn(PRODUCT_THEMES, worldTheme) ? worldTheme : undefined;

  // Neutral Package-Only Preview state (no approved/active gamePlan or theme)
  if (!plan || !plan.theme) {
    return (
      <section
        className={`lesson-card lesson-themed-route-neutral ${variant === "presenter" ? "lesson-themed-route-presenter" : ""} ${className}`}
        aria-label="Lộ trình học tập cơ bản"
      >
        <div className="themed-route-neutral-header">
          <span className="lesson-badge">Bản xem trước gói bài học</span>
          <span className="themed-route-neutral-mode">Chưa kết nối kế hoạch trò chơi</span>
        </div>
        <div className="themed-route-neutral-body">
          <h3 className="themed-route-neutral-title">Lộ trình bài học độc lập</h3>
          <p className="themed-route-neutral-hint">
            Bài học đang ở chế độ xem trước nội dung sư phạm độc lập. Bản đồ thế giới chủ đề và các cổng mốc sẽ hiển thị khi giáo viên kích hoạt kế hoạch trò chơi đã duyệt.
          </p>
          {Array.isArray(plan?.activityPlans) && plan.activityPlans.length > 0 && (
            <div className="themed-route-neutral-phases">
              {plan.activityPlans.map((act, i) => (
                <div
                  key={act.id || i}
                  className={`themed-route-phase-chip ${i === currentActivityIndex ? "active" : ""}`}
                >
                  <span className="phase-order">HĐ {act.order || (i + 1)}</span>
                  <span className="phase-name">Pha: {act.phase}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  const world = getSafeWorldMetadata(selectedWorld || plan.theme || plan.map);
  const activityPlans = Array.isArray(plan.activityPlans) ? plan.activityPlans : [];
  const totalActivities = Math.max(1, activityPlans.length);
  const activeIndex = Math.max(0, Math.min(totalActivities - 1, currentActivityIndex));

  // Determine current place out of the 5 theme places
  const activePlaceIdx = Math.min(
    world.places.length - 1,
    Math.floor((activeIndex / totalActivities) * world.places.length)
  );

  // Core gates info
  const coreGates = activityPlans.filter((act) => Boolean(act.mapSegment?.coreGate));
  const completedCoreGates = activityPlans
    .filter((act, idx) => idx < activeIndex && Boolean(act.mapSegment?.coreGate))
    .length;
  const nextCoreGate = activityPlans.find(
    (act, idx) => idx >= activeIndex && Boolean(act.mapSegment?.coreGate)
  );

  // Build route points from map segments using pure model helper
  const pins = buildRoutePins(activityPlans, activeIndex);

  // SVG Polyline Path Coordinates
  const pathD = pins.length > 0
    ? pins.reduce((acc, pin, i) => `${acc} ${i === 0 ? "M" : "L"} ${pin.x} ${pin.y}`, "")
    : "";

  const completedPins = pins.filter((p) => p.status === "completed" || p.status === "active");
  const completedPathD = completedPins.length > 1
    ? completedPins.reduce((acc, pin, i) => `${acc} ${i === 0 ? "M" : "L"} ${pin.x} ${pin.y}`, "")
    : "";

  const displayCover = imgError ? "/assets/campaign-historical.webp" : world.coverImage;
  const companionMascot = world.mascots[0] || "Linh vật";
  const storyTitle = selectedWorld && selectedWorld !== plan.theme ? world.title : plan.story?.title || world.title;
  const storyGoal = selectedWorld && selectedWorld !== plan.theme ? world.goal || world.story : plan.story?.goal || world.goal || world.story;

  return (
    <section
      className={`lesson-card lesson-themed-route ${variant === "presenter" ? "lesson-themed-route-presenter" : ""} ${className}`}
      aria-label={`Lộ trình chủ đề: ${storyTitle}`}
    >
      {/* Visual Cover Banner with Story Overlay */}
      <div className="lesson-themed-route-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displayCover}
          alt={storyTitle}
          className="lesson-themed-route-img"
          onError={() => setImgError(true)}
        />
        <div className="lesson-themed-route-cover-overlay">
          <div className="lesson-themed-route-meta-top">
            <span className="lesson-themed-route-tag">{world.tag} · {world.name}</span>
            <span className="lesson-themed-route-mascot-badge" title="Linh vật thế giới">
              🐾 {companionMascot}
            </span>
          </div>
          <h2 className="lesson-themed-route-title">{storyTitle}</h2>
          {storyGoal && (
            <p className="lesson-themed-route-goal">
              🎯 <strong>Mục tiêu chặng:</strong> {storyGoal}
            </p>
          )}
        </div>
      </div>

      {/* Distinct 5 Thematic Places Progression */}
      <div className="lesson-themed-route-places-bar" aria-label="Các địa danh trên lộ trình">
        {world.places.map((placeName, pIdx) => {
          const placeStatus =
            pIdx < activePlaceIdx ? "completed" : pIdx === activePlaceIdx ? "active" : "upcoming";
          return (
            <div
              key={placeName}
              className={`lesson-themed-place-chip ${placeStatus}`}
              title={`Địa danh ${pIdx + 1}: ${placeName}`}
            >
              <span className="place-dot" />
              <span className="place-name">{placeName}</span>
            </div>
          );
        })}
      </div>

      {/* Route Map Projection (Pins & Gates) */}
      <div className="lesson-themed-route-map-container">
        <div className="lesson-themed-route-map-header">
          <span className="route-map-kicker">
            LỘ TRÌNH THỰC THI · HOẠT ĐỘNG {activeIndex + 1}/{totalActivities}
            {currentPhase ? ` (${currentPhase.toUpperCase()})` : ""}
          </span>
          <span className="route-map-progress-badge">
            {completedCoreGates}/{coreGates.length} Cổng cốt lõi
          </span>
        </div>

        <svg
          viewBox="0 0 100 100"
          className="lesson-themed-route-svg"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--lesson-primary, #38bdf8)" />
              <stop offset="100%" stopColor="var(--lesson-accent, #a855f7)" />
            </linearGradient>
          </defs>

          {/* Full planned path line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="rgba(255, 255, 255, 0.2)"
              strokeWidth="2.5"
              strokeDasharray="4 3"
            />
          )}

          {/* Completed / Active path line */}
          {completedPathD && (
            <path
              d={completedPathD}
              fill="none"
              stroke="url(#routeGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}

          {/* Pins for each activity plan */}
          {pins.map((pin) => {
            const isCurrent = pin.status === "active";
            const isCompleted = pin.status === "completed";

            return (
              <g
                key={pin.id}
                className={`route-pin-group ${pin.status} ${pin.isCoreGate ? "core-gate-pin" : ""}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectPin(pin.id, onSelectCheckpoint)}
                aria-label={`Điểm mốc: ${pin.phase} - ${pin.isCoreGate ? "Cổng cốt lõi" : "Nhiệm vụ"}`}
              >
                {/* Active Outer Pulse Ring */}
                {isCurrent && (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r="8"
                    fill="none"
                    stroke="var(--lesson-primary, #38bdf8)"
                    strokeWidth="1.5"
                    className="pin-pulse-ring"
                  />
                )}

                {/* Core Gate Badge or Regular Pin */}
                {pin.isCoreGate ? (
                  <polygon
                    points={`${pin.x},${pin.y - 6} ${pin.x + 6},${pin.y} ${pin.x},${pin.y + 6} ${pin.x - 6},${pin.y}`}
                    fill={isCurrent ? "#38bdf8" : isCompleted ? "#34d399" : "#334155"}
                    stroke={isCurrent ? "#ffffff" : isCompleted ? "#059669" : "#64748b"}
                    strokeWidth="1.5"
                  />
                ) : (
                  <circle
                    cx={pin.x}
                    cy={pin.y}
                    r={isCurrent ? "5" : "4"}
                    fill={isCurrent ? "#38bdf8" : isCompleted ? "#34d399" : "#1e293b"}
                    stroke={isCurrent ? "#ffffff" : isCompleted ? "#10b981" : "#475569"}
                    strokeWidth="1.5"
                  />
                )}

                {/* Pin Text Label */}
                <text
                  x={pin.x}
                  y={pin.y + (pin.y > 75 ? -9 : 12)}
                  textAnchor="middle"
                  className="pin-text-label"
                  fill={isCurrent ? "#38bdf8" : isCompleted ? "#e2e8f0" : "#94a3b8"}
                >
                  {pin.isCoreGate ? `⛩️${pin.gateIndex || ""}` : `#${pin.order}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Core Gate Progression & Checkpoints Footer */}
      <div className="lesson-themed-route-summary">
        <div className="route-gate-status">
          <strong>Cổng cốt lõi: </strong>
          {nextCoreGate ? (
            <span>
              Cổng {nextCoreGate.mapSegment?.gateIndex || "kế tiếp"} (HĐ {nextCoreGate.order || (activityPlans.indexOf(nextCoreGate) + 1)} · Pha {nextCoreGate.phase})
            </span>
          ) : (
            <span style={{ color: "var(--lesson-success)" }}>Đã hoàn tất tất cả cổng cốt lõi</span>
          )}
        </div>

        {Array.isArray(plan.checkpoints) && plan.checkpoints.length > 0 && (
          <div className="route-checkpoints-tags">
            {plan.checkpoints.map((cp) => (
              <span key={cp.id} className="lesson-badge lesson-badge-primary route-checkpoint-badge">
                Mốc: {cp.objectiveCodes?.join(", ") || cp.id}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default LessonThemedRoute;
