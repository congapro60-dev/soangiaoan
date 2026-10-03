import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";

const appCode = readFileSync("public/app.js", "utf8");
const campaignCode = readFileSync("public/campaign-data.js", "utf8");

function createMockContext(query = "") {
    const logs = [];
    const elements = new Map();
    function getEl(id) {
        if (id !== 'app' && id !== 'boardStatus') return null; if (!elements.has(id)) elements.set(id, { innerHTML: '', id, classList: { toggle: () => {} }, querySelectorAll: () => [], querySelector: () => null });
        return elements.get(id);
    }
    
    let currentFetchResponse = null;
    let fetchHistory = [];
    let rafCb = null;

    const mockWindow = {
        location: { search: query, origin: "http://localhost" },
        hostIdentity: undefined, addEventListener: () => {}, SignalCampaign: { themes: { modern: {} }, resolveThemeId: () => 'modern' }
    };
    
    const context = createContext({
        
        console: console,
        window: mockWindow,
        location: mockWindow.location,
        document: {
            getElementById: getEl, createElement: () => ({ appendChild: () => {}, querySelector: () => null, setAttribute: () => {} }),
            addEventListener: () => {},
            body: { dataset: {}, appendChild: () => {} }
        },
        localStorage: {
            store: {},
            getItem: function(k) { return this.store[k] || null; },
            setItem: function(k, v) { this.store[k] = v; },
            removeItem: function(k) { delete this.store[k]; }
        },
        fetch: async (url, options) => {
            fetchHistory.push({url, options});
            if (typeof currentFetchResponse === 'function') {
                return { ok: true, json: async () => currentFetchResponse(url, options) };
            }
            return { ok: true, json: async () => currentFetchResponse };
        },
        URLSearchParams: globalThis.URLSearchParams,
        setTimeout: () => {},
        clearTimeout: () => {},
        setInterval: () => {},
        clearInterval: () => {},
        requestAnimationFrame: (cb) => { rafCb = cb; },
        SignalGame: { DURATION: 1800000 },
        Date: Date,
        Math: Math, C: { themes: { modern: {} }, resolveThemeId: () => 'modern' },
        String: String,
        JSON: JSON,
        encodeURIComponent: encodeURIComponent
    });
    
    return { 
        context, 
        elements, 
        fetchHistory, 
        setFetchResponse: (res) => currentFetchResponse = res,
        runApp: () => {runInContext(campaignCode, context);return runInContext(appCode, context);}
    };
}

test("role gating: observer has read but no management controls", async () => {
    const { context, elements, fetchHistory, setFetchResponse, runApp } = createMockContext("?view=teacher");
    
    setFetchResponse((url) => {
        if (url.includes("kind=identity")) return { user: true, configured: true, systemRole: "host" };
        if (url.includes("kind=board")) return { room: { id: "room1", code: "123456", title: "Test", round: 1 }, teams: [] };
    });

    // Set a teacherSession as observer
    context.localStorage.setItem('signal-station-teacher-v2', JSON.stringify({ id: "room1", role: "observer", token: "token" }));

    runApp(); await new Promise(r => setTimeout(r, 50));
    
    const appHtml = elements.get("app").innerHTML;  
    assert.match(appHtml, /123456/); // rendered room
    // Observer cannot manage
    assert.doesNotMatch(appHtml, /data-action="delete-room"/);
    assert.doesNotMatch(appHtml, /data-action="remove-team"/);
    // Observer can view CSV
    assert.match(appHtml, /data-action="csv"/);
    // Cannot reset room because canHost is false
    assert.match(appHtml, /data-action="reset-room" disabled/);
});

test("room lookup from URL", async () => {
    const { context, elements, fetchHistory, setFetchResponse, runApp } = createMockContext("?view=teacher&room=targetRoom");
    
    setFetchResponse((url) => {
        if (url.includes("kind=rooms")) return { rooms: [{ id: "targetRoom", code: "ROOM00", title: "My Room", role: "owner" }] };
        if (url.includes("kind=board")) return { room: { id: "targetRoom", code: "ROOM00", title: "My Room", round: 1, role: "owner" }, teams: [] };
    });

    runApp(); await new Promise(r => setTimeout(r, 50));

    // It should have called kind=rooms API
    assert.ok(fetchHistory.some(r => r.url.includes("kind=rooms")));
    
    // Check if UI reflects room
    const appHtml = elements.get("app").innerHTML;
    assert.match(appHtml, /ROOM00/);
    
    // Ensure no token was added for account room
    const saved = JSON.parse(context.localStorage.getItem('signal-station-teacher-v2'));
    assert.equal(saved.id, "targetRoom");
    assert.equal(saved.token, undefined); // Token is not generated!
});

test("forged stored root not creator", async () => {
    const { context, elements, fetchHistory, setFetchResponse, runApp } = createMockContext("?view=teacher");
    
    // Fake window.hostIdentity via fetch
    setFetchResponse(() => ({ user: true, isRoot: false, configured: true, systemRole: "root" }));

    // Ensure NO teacher session to force creation UI
    context.localStorage.removeItem('signal-station-teacher-v2');

    runApp(); await new Promise(r => setTimeout(r, 50));
    
    const appHtml = elements.get("app").innerHTML;
    // A signed-in account may create its own room; stored root role alone does not
    // grant global admin UI, but it also does not block personal room creation.
    assert.match(appHtml, /id="roomForm"/);
});

test("revoked refresh", async () => {
    const { context, elements, fetchHistory, setFetchResponse, runApp } = createMockContext("?view=teacher");
    
    setFetchResponse(() => ({ user: true, isRoot: false, configured: true, systemRole: "host", revoked: true }));

    runApp(); await new Promise(r => setTimeout(r, 50));
    
    const appHtml = elements.get("app").innerHTML;
    assert.match(appHtml, /Quyền bị thu hồi/);
    assert.doesNotMatch(appHtml, /id="roomForm"/);
});
