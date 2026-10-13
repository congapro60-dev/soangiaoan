# R11 — rà soát và sửa công thức Toán,13/10/2026

**PASS_LOCAL_MATH_FIX.** Ownerchỉra screenshotKhámpháu_n/u_3textthô, sauđóduyệt“sửađồngloạtphầnhiểnthị”. Đãsửađúngtypesetting,khôngđổiđápán/gameplay/hình/sourcequotes. Chưapháthành.

## Lỗi và cách sửa
- ExplorationPanelrenderrawJSX,3cardkhôngdelimiter. DùngMathText/KaTeXsẵncho title/category/body/question/options/sourceLabel; bodycóblockdisplay. Explicit$u_n$,$u_3$,$n$;polynomialb_ncùngbiểuthức,tách2dòngaligned. KhôngregexđoánToán,tạoparser/dependency/fontmanually.
- 7fileUI audit đầu +TaskInput: đề/đápánchuỗi/feedback/rubric/objective/expectedProduct/teacherLookFor/orderinglabel renderMathText. ObjectJSON,input/textarea/sourcequote/codeID giữ nguyên.
- NativeoptionkhôngrenderMathML: HS chọnThẻ1/2 hoặcNhóm1/2, danh sách đủcôngthứcMathTextbêncạnh, matchedpreviewhiểnthịđúngcardID. EditorGVchọnstablecardIDkèmfullformulalist. Khôngđổioptionvalues/checkeranswer.
- CSSngăntựgãycôngthứctạidấuToán;inlineblockmaxwidth100%/scrollriêng/paddingkhôngcắtchỉsố. Côngthứcdàiownauthoredmanualaligned. Previewghépthẻdướiôchọn,columnstretch, khôngchépformulaHTMLvàonativeoption.
- 5góihọcliệu: P38/P41=18taskprompt+2rubrictop;pilotP1/P2+P39Must=26trường (mục tiêu/hoạt động/hint/rationale/phươngán/rubric/prerequisite). Chỉmarkup;testsSHAngữnghĩakiểmtoànbộJSONbỏsyntacticformat+contentHash. Source/evaluation/answers/hintmeaning/imageskhôngđổi. ContentHash5góimới;catalogue1pointerpilotupdatedđúnghash. Bảnđangchạyimmutablekhôngmigrate.

## Rà soát
Rendererchung public/math-renderer.js giữ nguyên, hỗtrợ $...$/$$...$$/\\(...\\)/\\[...\\], trustfalse/htmlAndMathml/escapeHTML/errorvisible. Tasks/TV/examstem/options/solutions chính đãdùngMathText; sửa cácrichfieldbịbỏsót.
Read-onlyscan `codex-r11-content-audit.json` cònfalsepositive needs_review/whole_class/teacher_review_required làcodemetadata, khôngformula. Sourcequotesnguyênvăn và editableTeX khôngphảilỗi. Khôngchuẩnhoáchecker/provenancetựđộng.
Tài liệuhướngdẫnPDF/Word làthamkhảo;khôngtạoPDF/Wordmới,khôngđổiXeLaTeX/OMML/export/đềthi/hìnhhọc ngoài yêu cầu.

## Kiểm tra
- RegressionRED/GREEN2layers(plaincontent+rawcomponent) táihiện, MathTextthậtKaTeXSSRrichfields/subscripts/XSS, nativeoptionID/value, actualMatchEditorSSR. Files`lesson-exploration-ui`,`lesson-math-display-fields`,`lesson-authored-math-formatting`,`lesson-task-input-identity`,`math-renderer`.
- Full **1203/1203** `codex-r11-closed-tests.log`. Typecheck0 (`codex-r11-typecheck-verified.log`),lint0errors394existingwarnings (`codex-r11-lint-verified.log`);scopedlint0;finalbuild0 `codex-r11-layout-build.log`.
- Source192byte-match `codex-r11-source-manifest.json`. FinalWorker`548fcf6ee2ca47dd6dc7aa354e2f521c43855ba95875f46219e0477ee9f33dc8`;tree`972df01e322fffee6d2f13feae1f1460438e4862a1ad915f6bd228d9f98a819e`.
- Nativefinal95HTTPactualWorker/D1/R2PASS0external:roles/actor/privacy/replay/expiry/cardclaim/3reward/noacademicchanges/combined150capresave/actualreleasedv7rollback. `codex-r11-native-layout.json`. R10artifactkeptoldhash,khôngghiđèhistory. Khôngclaimrepeat307+453loadR10fullpipelineởR11;95includescombinedmaxcapactualresave.
- CUAfinaldesktop/375:album16MathML/9msub/0matherror;fontloaded;375document.scroll360/dialogscroll=client305;alignedblock265/265. Tênn/u_nkhônglộunderscores. Chọnmảnh/tạmdừng/shared1vs0PASSearlierR11hash(beforeCSS),finalnativecoversmechanics.
- Finalmatching375:select233px/preview233px/controlscroll=client233;card_explicit_formula giữ;longsingleexpressionnowraplocalpreviewscroll218>209,cóthểcuộnđếncuối;0error/page360. Chưacoiảnhcũwrapped/collapsedselector làbằngchứngfinal.
- Standard9notationpreview(actualMathTextSSR+CSSlocalharness):dfrac/sqrt/power/subscript/vector/integral/trig/pmatrix/cases/aligned;9MathML,0error/375scroll360;đãxemtrựcquan3scrollwindowsmọicase. Formula369pxcuộntrong310pxđếnscrollLeft59.33;khôngcắtphầncuối. align/gather/ aligned/gathered rendercanaryPASS. Khôngfontdownsize.
- Independentreview `ag/gemini-3.8-flash-high` **PASS0findings** `codex-r11-math-layout-recheck-flash-2026-10-13T01-20-16-547Z.json`,fullfilehashunchanged. GeminiPro2lần503,khôngcoiPASS;Flashcanary200. Rawreviewgiữ. MộtBLOCKEDCSStruncatedfinding làinputexcerptcắt150characters intonextrule; recheckcompleterulePASS,sourcebuildvalid. Cácfindingfuturemacro/iOSscroll hypothetical khôngđượcbiếnthànhfeatures.

## Giới hạn và bàn giao
- Chỉlocaldữliệugiả,khôngnghiệmthuGV/lớpthật/thiếtbịthật/3Dvisual. KhôngcertifyPDF/WordexporthayfullOSoffline.
- InputTeX/sourcequotes/JSONkeysrawcó chủđích; packageimmutablecũkhôngbịđổi. Họcliệu5góivẫndraft/source/year/teacherapprovalnhưcũ.
- R10+R11chưapháthành;productionnativeversion7/SiteV7/key/HSdata khôngđổi. Ownerduyệtbảncụthểtheosharedplan19.9trướcrelease.
- Previewtab37localhost5202/play;albumreward3/3seededvisualdemođểxemformat,khôngdiceprobabilityproof. QAroute/scriptslocalonlykhôngđượcbundleproduction.
- Báocáo/evidence/sharedcheckbox/HANDOFF/todo/lessons cậpnhậtchoClaude. KhôngclaimfullplanDONE;original2Geminicitation/GVsourceyearformat/timebox/realdevices3Dremain.

Evidence `tasks/codex-r11-evidence.json`, source manifest và screenshots `qa-takeover/r11-final-formulas-desktop.png`, `r11-final-formulas-375.png`, `r11-final-matching-layout-375.png`, `r11-notation-375.png`.
