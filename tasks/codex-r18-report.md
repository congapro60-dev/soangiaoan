# R18 — sửa màn tạo game, 14/10/2026

Chủ hệ thống đã duyệt sửa và phát hành5nhóm vấnđề. R15/Trash/họcliệu đãduyệt và bộ nhậnDeweylocal giữ nguyên. Khôngnhậptruyềndữ liệuHSthật.

## Thay đổi
- Hướng dẫn9luật táidùng nội dungluật phòng: cáchchơi,mục tiêu,xếp hạng,vaiGV,ví dụ/phùhợp. Chọnluật tựđổi mô tả tại chỗ. NhãnĐộkhóToán thấpnhất/cao nhất vàĐộkhócâuđốmởcổng; điểmthưởnggame riêng, không nhầm sốcâu/sốcổng/điểmToán. Gợiýcáchchơinhẹ, nângcao ngữcảnh/format gấp gọn; lớp/bàichọnexplicit, không tựchọnmọi bài khối mới.
- 12 hoạtđộngchung mới nối sharedlesson/class-events thật: Kéo co,Đánhtrùm,Bấmchuông,Jeopardy,Xâylâuđài,Bắncung,Lướtsóng,Đốikháng,Tiếpsức,Kho báu,Ướclượng,Bingo. Giữboat/arena. Serveractor/roomround/CAS/requestid/withdrawal/budget6/nooverlap/pausesettleonce; ownquestions-only,GVnútopen/finish. Studentpollingauto chuyểnphase/question vàgiữnháp; clock500ms; trởlại mainstate nguyênprogress. Không thêmtables/duplicateengine.
- 44chủđề có generator/checker/rationale/contextformat thật (21old+23new),G10/G11/G12 PPCTmapping, chapter/lesson/objective/forms/formats; nguồn adapted, khônginventcanonLO/pagenumber/fullbookclaim. Nâng lượnggiác/cấp sốnhân/dãysố/liêntục/khônggian/tam thức/đườngtròn/conic/Newton/tiệmcận/đơnđiệu/nguyên hàm/diện tích/mũ/lượnggiác/Oxyz/tứ phânvị. Topiccounts đi kèmphạm vi thật. Cognitive labelsThônghiểu/Vậndụng riêng level0..4+gamereward. Exhaustiveseedmath4,400/context5,280 +23independentworkedexamples vànumericoracles/KaTeX/checkchallenge207paths.
- historical/pastoral dùng đúng2file riêng;7newcoverCanva riêng `coverImage`,terrainimage/route khôngđổi. Người dùngduyệt199x112preview cho selectioncards, original1680x944 chưa tảivềđượcthôngquaconnector; ghi backlognângđộnét. Cube/cubesisland khác survivalorganicarchipelago. Modelkhôngcôngbố, provenance7mediaIDs/links in covermanifest. Không tạo ảnhthôngquaAPItrảphíkhác.

## Verification
- Focusedmath/events/setup/nativeauth/CAS/pause/seededchecker PASS; exactall12two-pupil HTTP paths.
- Finalisolatedfull1373/1373, typecheck/buildPASS, lint0errors392warnings. Logs `codex-r18-isolated-tests-final.log`, `codex-r18-typecheck-final.log`, `codex-r18-lint-final.log`, `codex-r18-build-final.log`.
- ActualWorker/D1/R2nativeall12types/localclockcountdownfixture only; `codex-r18-native.json`; noexternalcalls,cleanup active0 afterstop. Covers+publicscript source bytes tracked in470manifest; earlier omissionpublicassets caughtbyactualbrowser, fixedexplicitmanifest.
- Browser actualteachercreate+HSBingo answer/next/draft123/poll/resume/mobile375. Browserloadernativepipe unavailable so dedicatedagent-browserCLI localQA used, no credentialsread/pasted/logged. `codex-r18-browser-evidence.json`, screenshots.
- CrossproviderGeminiFlashlow canary200OK; activities/math/route/UI/finalpoll PASS0. Codexsubagentquota429 endedafterownedcodeprepared; rootreview/integration completed. Do notlabeltimeouterror quota without429.
- ExistingVMfixtures updated importbuiltinsnodecrypto +structuredClone for sharedschema, no runtimefallback. Initialfail9testfiles due testloaders only; final rerunrequired. IntermediateQAstarted duringbuildlostassetdirectory, notcountedPASS; restartagainstfinalhash. No productiondata/permissions/migrations changed.

## Remaining
- HighresCanvaoriginals acquisition; userapprovedpreview ceiling, notcoveredupgrade.
- FullschoolcanonLO/SGK/SBT coverage requiresverifiedOCR/sourcecuration/mathreview. Builtin44notentirecurriculum; broaderAI/teacherpackage flow exists separately.
- Physical150HS40min/TV/iPad/3DQA remainspriorplan gate, notcertifiedby thischange.
- NativeSitesreleaseexactexistingproject only; root `.openai/hosting.json` wrongprojectNEVERdeploy. Nativeaudience/env preserved; priorv12rollbackdoesn'tknowclassActivitypause semantics, useforwardfix or pauseawarepreviousbuild ifactive newevents. No irreversibleDBmigrationR18.
