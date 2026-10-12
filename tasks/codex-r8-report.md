# R8 — khôi phục nháp AI và sửa trích dẫn

12/10/2026. Code cục bộPASS; chưa phát hành R1–R8. Productionversion6 vẫnGemini-onlyhotfix. KhôngđổiV7/key/dữliệuHS; khônggọiGemini lại/khôngsaveapprove nhápcũ.

## Sửa
- GETlatest đọc bảnneeds_review gầnnhất theoowner/sourceSHA/parser/extractionhash; sourceService kiểmnguồnready/toànvẹn. KhôngDBwrite,khôngprovider,khôngschema/dependency.
- UI mấtmãnháp khiđóngtab fallbackserver; cachehỏng vẫnđọcserver; latefetch khôngđènhápnewrunning, cancellation/snapshotguard. NútMởbảnnhápAIđãlưu hiệnngoàiproposepanel. Lỗi kiểmđịnh cópath đểchỉđúngcâu.
- ReproactualSQLite: quote-onlyrepair hợp lệ bịpreservesDraft giữabsolutecitation từchối. Chỉcho tasknumeric-invalid mởrộngquote nguyênvăn sameentity/segment/origin=source; canonicalnormalizer vẫn xácnhậnquote trongnguồn vàvalidationgreen. Chặnthêmhint/entities/citation bằngcountguard. Đề/đápán/hints/nguồnkhác giữguard cũ;khôngblindrelabelling.

## Bằng chứng
-44focusedPASS jobs20/citation12/UI3/route8/workerd1. RED/GREEN missinglatest,latefetchrace,parsermismatch,numericcitationdeadlock;rawinitialreviews giữ.
-Full1171/1171: tasks/codex-r8-tests.log. Typecheck/lint0: codex-r8-typecheck.log,codex-r8-lint.log;394warnings. Finalbuild0: codex-r8-final-build.log.175sourcefilesbytematch: codex-r8-source-manifest.json;diffcheck0.
-Gemini fullreview scopedfunctional fixes andtype-recheckPASS: codex-r8-review-type-recheck-2026-10-12T10-52-36-769Z.json. Rawfullreviewfindinginterface đãsửa/review;sharedreferencefinding bácbằngsetEditedPackage deepclone thực.
-ExactWorker33c9b281c59f72d09a62c68ba6d307a51b9132fd5ad0cd50ecc1717d4bdb437a;treebe2e25297ded9c345e2abd9a151fb0ca149995cd3cabcd3f4f7c381def5930b7. Native219HTTP/5stages0external: codex-r8-native-runtime.json. R6load150khác hash;khôngclaimR8load150lặp.
-CUAexacthash: codex-r8-browser-final-evidence.json;QAownerlatest200/foreign404,nguồnuploadedactualAPI/fullsyntheticdraftseedlocalD1,phiênkhôngcachejob→Mởnháp→formneeds_reviewsourcebound. KhôngthựcAI/approve/save. Ảnh qa-takeover/r8-restore-draft-final.jpg. Early8162hashCUA giữriêng;finalbuildđổihash đãlặplại.

## Học liệu và việc còn lại
-F03audit tasks/codex-r8-timebox-audit.md/json:900manual/tiết150HS ở7gói,P39=600,8gói=6900. 150Mustrecheck8phút≤3.2giây/bài nếuGVkhôngđiềuhành;khôngchứngnhậnGVchấmkịp bằngHTTP.
-Đãđềxuấtfullscope:closedfiniteMust35/38/40/41 giảm900→600 vàgate0manual;giữproofopen. Must-onlyscope giảm300manual hoặc0closed nhưngcần authoredtaskmixedobjective riêng,khôngblindlọc8gói.
-Câu hỏi owner chọnMust hayfullscope cònpending;nhápreviewpilot38 đangchuẩnbịriêng,khôngđổi8original/cataloque/nguồn/mãchuẩn.
-Productionjobe60537fd-00c0-4093-bd74-2f85c2107dd6 vẫnneeds_review2numericerrors. BoundedDBcell1687chars truncated,directAPIbrowserblocked;khôngrepair2câutừpartial. R8restorechưadeploy; cầnduyệt phát hànhcụthể đểđọcđủnháp quaUI sauđóđốisoát.
-Nguồn/nămhọc/đápán/timebox phảiGVduyệt,thiếtbị/lớpthật/3DvisualcònHOLD. KhôngfullplanDONE.
