# Live lesson three-portal UX design

**Status:** Approved by the user on 2026-08-26

## Goal

Keep the three live-lesson URLs (`GV`, `TV`, `HS`) on one realtime session while making each view fit its real device: one-hand teacher control on a phone, a non-scrolling presentation canvas on the TV, and a low-friction student join flow based on the class already selected by the teacher.

## Decisions

### 1. Three views remain separate

- `mode=teacher` remains the private control surface. It reads the teacher-owned session, exposes the cue instructions, and writes state changes.
- `mode=tv` remains a public projection. It reads only public state and aggregate statistics; it never receives teacher cues, board instructions, or raw student responses.
- `mode=student` remains the student response surface. It reads public state and writes only authenticated anonymous student responses after PIN verification.

The three links share one `sessionId`; they are not three independent lessons and only the teacher view is actively operated by the teacher.

### 2. Teacher view is mobile-first

The default teacher screen will prioritize the current cue and the three primary actions:

1. fixed top bar: lesson title, cue number, timeline time, session/connection status;
2. primary card: `GV nói/làm` for the current cue;
3. expandable panels: `Bảng`, `HS`, `Vở & minh chứng`;
4. compact response summary;
5. fixed bottom controls: `Trước`, `Tạm dừng/Tiếp tục`, `Sau`.

The full timeline and secondary actions remain available through a compact drawer/menu. Closing a session is separated from the primary controls and requires confirmation. Landscape and desktop widths remain usable, but the phone portrait layout is the acceptance target.

### 3. TV is a viewport-fitted presentation canvas

The TV root will occupy `100dvh` and disable page scrolling. The layout reserves three regions: compact header, flexible main screen, and one-row statistics footer. Typography and spacing use responsive `clamp()` values. The five pilot statistics (participation, submitted, M, S, C) must remain on one row on a normal 16:9 display. Educational text is not silently clipped; if a future screen is too long for the readability contract, its content must be split into multiple runtime screens rather than shrunk indefinitely.

### 4. Student join uses the selected class context

The teacher launcher already has the authoritative `ClassDoc`. The new student URL will carry the selected class's `classId` and `joinCode` as context; the student never types the class code. The student view will:

1. load the roster through the existing server `roster` endpoint using the embedded join code;
2. verify the returned roster `classId` matches the URL `classId` before showing names;
3. show a name dropdown, storing the selected roster document ID rather than asking for a student code;
4. accept only the PIN as student input;
5. call the existing server-side PIN login with the selected student ID and context join code;
6. retain the existing class/session identity checks before allowing responses.

If an old student link has no embedded join code, it will show an actionable message to generate a fresh session link instead of silently asking the teacher/student to guess which class to enter. The teacher-auth guard remains: a teacher Firebase session is not replaced by anonymous student auth in the same browser.

### 5. Privacy and data boundaries

- The roster response contains only student document IDs and display names, never school codes or PINs.
- PIN verification and `studentLinks` creation remain server-side.
- The client must reject a roster/class mismatch before rendering the roster or submitting a response.
- No Firestore rules or live-session parent reads are widened by this UX change.

## Acceptance criteria

1. A teacher can open the GV URL on a phone and, without horizontal page movement, see the current `GV nói/làm` instruction and operate previous/pause-next controls.
2. Secondary cue information is reachable in one additional tap; closing requires confirmation.
3. The TV view shows the current public content and all five pilot aggregate metrics in one viewport at 16:9 without a vertical scrollbar.
4. The student URL generated after selecting a class contains the class context; the student page has no class-code or student-code input in the normal new-link flow.
5. The student page shows only names from the selected class, accepts a PIN, and rejects a wrong class/roster response before login.
6. Teacher, TV, and student projections continue to exclude private teacher cues and raw response data from public routes.
7. Existing live-session state mutation, realtime subscriptions, offline response queue, and close-session progress bridge continue to pass their current tests.

## Out of scope

- Merging the three routes into one page.
- Replacing the Firebase anonymous-auth boundary with a second auth instance.
- Adding a new Firestore collection or changing the live-session schema.
- Reauthoring lesson content beyond splitting a future overlong TV screen if a separate content task requires it.
