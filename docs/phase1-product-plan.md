# Phase 1 — tên, cốt truyện và phản hồi

Phạm vi: mục 7–9 và 15 trong canonical scope, bắt đầu với năm thế giới có sẵn rồi thêm bảy thế giới mới. Không sửa auth/gameplay/campaign scoring trong lát này. Giữ ids năm map cũ, storage/report keys, asset gốc và phòng cũ. Không gọi hoàn thành toàn bộ từ phase này.

1. Thêm lib/product-content.js làm nguồn metadata brand và story fields; lib/campaign.js import nguồn và bổ sung titles/intro/midpoint/ending vào THEMES, giữ math generator không đổi. Regenerate public/campaign-data.js, thêm parity test so exported data phía server/client bằng VM.
2. Update app/layout.tsx metadata, page loading, UI header/landing/teacher/rules/export labels và hiển thị story progression khi waiting/start/midpoint/end. Header dùng Mật Mã Đa Giới. Mỗi thế giới có câu chuyện và mục tiêu riêng, không cùng cứu trạm. Dữ liệu nhiệm vụ Toán giữ nguyên; copy đổi đúng mục tiêu campaign.
3. Pure lib/media-catalog.js: 13 categories (dice/move/correct/wrong/hint/freeze/thaw/reward/abandon/skill/community/rank/finish) với base text, map-specific override, original synthesized sound descriptor, rate limiter 2s và dedupe event ID. Meme có mascot reaction nhỏ, tồn tại tối đa 3s và không che đề.
4. Pure settings contract master/SFX/music/meme/effects/reducedMotion/volume; default sound disabled, gesture enable AudioContext, original oscillator/percussion SFX và nhạc ngắn themed loop nếu user bật. Client public/feedback.js data contract lấy từ cùng nguồn generate; không gọi AudioContext trước gesture; hidden suspend, clear queue; text log cho sự kiện vẫn có khi sound/meme tắt. Panel native dialog labeled controls, persisted local settings, OS reduced motion default, volume 0–100. reducedMotion nối renderer terrain và CSS; master disable nhạc/SFX.
5. Hook canonical events từ state diffs với ID dedupe (poll không phát lại); roll/answer/hint/skills/community/results tạo text/meme/SFX tương ứng. Race events existing ưu tiên, không mutation score. Sync hidden tab không play backlog. Nút mở settings trên mọi màn, teacher cho cấu hình media mặc định phòng ở phase auth sau.
6. New maps cần visual riêng coherent với story: code-native canvas/SVG terrain được phép, không dùng ảnh thương hiệu game. Thêm 7 theme definitions không chỉ relabel ảnh cũ; map selector có geometry/terrain/route/colors/places riêng. Preserve math type và sprite source compatible, phụ kiện/khung theo map nếu cần. Các minigame/mode riêng làm ở phases sau.

Tests: title/storage/report compatibility, story completeness/uniqueness cho 12 maps, export parity, map route/terrain finite, 13 categories và settings independent/clamp/corrupted-storage handling, sound requires gesture, hidden tab drops backlog, repeated polls don't replay, reduced-motion respects OS. Browser read-only local preview QA: settings keyboard, mute/volume, reaction not covering form, 2D fallback/mobile/26 units.

Gate: npm test/typecheck/build/lint; lint 335 warnings baseline phân biệt khỏi warnings mới. Asset/source không lấy từ external games. UI screenshot/console khi preview. Không commit/push.

## Reconcile independent review

- app/page.tsx phải thêm feedback.js vào sources trước app.js và đổi loading copy. Metadata sửa app/layout.tsx; không nhầm file.
- Bảy thế giới mới dùng standalone SVG tự generate vào public/assets bằng Node, cùng tỷ lệ 1600×900. SVG không có URL external; dùng được trong Image/2D/minimap và preview img. WebGL failure giữ fallback. Mỗi map có đủ 33 route points riêng [0,100] và năm checkpoints; mapStops đọc theme.route rồi legacy fallback.
- Dữ liệu ván cũ lưu theme id (modern/historical/future/dewey/pastoral), giữ ids để compatible. Có resolver mapping old display titles và new titles → canonical id nếu gặp string label, không đổi report schema. Test room config cũ và report cũ thật; không rename keys vô cớ.
- landing, briefing, success, finalGate, result, rules/export title phải dùng theme intro/midpoint/ending/places; tất cả literal cứu hộ trạm dùng neutral hoặc campaign context. Không đổi toán hoặc validation.
- VM parity so THEMES/TOPICS/MATH_POINTS/route; 12 ids/titles/story/places/33 coords hợp lệ; media test 13 categories/2s/dedupe/clamp/independent toggles; audio fake context test chứng minh chưa gesture không tạo context, hidden drops queue. Browser walkthrough sẽ bổ sung source test bằng interaction/screenshot.

Các finding kỹ thuật của review đã được đưa vào plan. Không cần sửa auth/mode/arena trong phase1; các yêu cầu đó vẫn trong canonical scope và pending.

## Trạng thái đã kiểm chứng

- Đã thêm `lib/product-content.js` làm nguồn chung cho brand, story progression, 12 theme, places, checkpoints và 33 route points; `lib/campaign.js` dùng cùng metadata và legacy title resolver giữ ids cũ.
- Đã sinh lại `public/campaign-data.js` và `public/feedback.js` bằng `scripts/generate-world-assets.mjs`; bảy SVG mới có viewBox 1600×900, route riêng và không có external URL. Năm asset legacy vẫn giữ nguyên filename/role.
- Đã thêm `lib/media-catalog.js` với 13 categories, settings normalize/clamp, event diff, rate limit 2 giây và dedupe; browser runtime có settings dialog, gesture-gated AudioContext, synthesized SFX/music, hidden-tab queue drop, reduced-motion và meme reaction tối đa 3 giây.
- Đã nối story progression, brand/header/landing metadata, settings loading và route selection vào runtime hiện có; không đổi auth, scoring, fixture hay validation gameplay.
- Đã thêm parity/legacy/route/media regressions trong `tests/phase1-product.test.mjs`; cập nhật campaign baseline assertion từ 5 lên 12 themes.
- `npm test`: exit 0; 22 test pass, 0 fail, 0 skipped.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; có cảnh báo vinext không phân loại được dynamic API route, không phải lỗi.
- `npm run lint`: exit 0; 0 errors, 339 warnings. Warnings được tách khỏi errors; còn baseline warnings và một số warnings mới ở client/generated files.
- Chưa chạy browser walkthrough/screenshot/console QA, chưa independent cross-review sau diff, chưa commit/push. Các Phase 2+ mục tiêu trong canonical scope vẫn pending.

## Cycle 1 Repair Status

- Generator sửa đúng bảy SVG mới và bảo toàn năm asset legacy; hai entrypoint generator dùng cùng output deterministic, không ghi đè WebP/KaTeX.
- `createCampaign` normalize legacy title tại boundary thật; copy user-facing rescue cũ đã được thay bằng copy Mật Mã Đa Giới/campaign context.
- Dedupe ingress tách khỏi display spacing: batch event khác ID được xếp hàng, queue tối đa 13, phát tuần tự mỗi 2 giây, hidden tab xóa backlog.
- `reducedMotion`/`effects` được truyền vào renderer strategic-map, không chỉ áp CSS.
- `tests/phase1-repair.test.mjs` kiểm tra bảy SVG thật, distinct/dimensions/no external URL, generator parity, legacy campaign/report, fake-clock batch queue, trusted gesture, independent toggles và hidden pause/resume.
- `npm test`: exit 0; 25/25 pass, 0 fail, 0 skipped. `npm run typecheck`: exit 0. `npm run build`: exit 0 với cảnh báo vinext dynamic API classification. `npm run lint`: exit 0, 0 errors, 336 warnings.
- Browser walkthrough/audio probe và independent post-diff review chưa chạy; chưa commit/push. Phase 2+ vẫn pending.
