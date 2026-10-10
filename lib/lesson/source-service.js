export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const REVISION = 'p5-binary-1';
const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const encoder = new TextEncoder();
const fail = code => { throw new Error(code); };
const digest = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('');

// Parsers deliberately hide canonical text and locations from their public key lists.
function enumerable(value) {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(enumerable);
  return Object.fromEntries(Object.getOwnPropertyNames(value).map(key => [key, enumerable(value[key])]));
}

export const TEXT = 'text/plain';
export const MAX_TEXT_BYTES = 128 * 1024;

export function createLessonSourceService({ db, bucket, importDocx, importPdf, importText }) {
  const query = (sql, ...args) => db.prepare(sql).bind(...args);
  const rowFor = (owner, id) => query('SELECT * FROM lesson_sources WHERE owner_account_id=? AND id=?', owner, id).first();
  const project = row => ({ id: row.id, originalName: row.original_name, mime: row.mime, bytes: row.bytes, sha256: row.sha256, status: row.status, parserRevision: row.parser_revision, extractionHash: row.extraction_hash, errorCode: row.error_code, createdAt: row.created_at, updatedAt: row.updated_at });
  const key = (id, kind) => `lesson-source/${id}/${kind}`;
  async function stored(objectKey, expectedHash) {
    const object = await bucket.get(objectKey);
    if (!object || object.size > MAX_SOURCE_BYTES) fail('SOURCE_STORAGE_UNAVAILABLE');
    const bytes = new Uint8Array(await object.arrayBuffer());
    if (await digest(bytes) !== expectedHash) fail('SOURCE_STORAGE_UNAVAILABLE');
    return bytes;
  }
  async function put(objectKey, bytes, hash) {
    if (!await bucket.put(objectKey, bytes, { onlyIf: { etagDoesNotMatch: '*' } })) await stored(objectKey, hash);
  }
  async function get(owner, id) {
    if (!owner) fail('AUTH_REQUIRED');
    const row = await rowFor(owner, id);
    if (!row) fail('NOT_FOUND');
    const out = project(row);
    if (row.status === 'ready') out.extraction = JSON.parse(new TextDecoder().decode(await stored(key(id, 'extraction'), row.extraction_hash)));
    return out;
  }
  async function downloadOriginal(owner, id) {
    if (!owner) fail('AUTH_REQUIRED');
    const row = await rowFor(owner, id);
    if (!row) fail('NOT_FOUND');
    return { bytes: await stored(key(id, 'original'), row.sha256), mime: row.mime, originalName: row.original_name };
  }
  async function upload({ ownerAccountId: owner, requestId, originalName, mime, bytes }) {
    if (!owner) fail('AUTH_REQUIRED');
    if (!bucket) fail('SOURCE_STORAGE_UNAVAILABLE');
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(requestId || '')) fail('INVALID_REQUEST_ID');
    if (!(bytes instanceof Uint8Array) || !bytes.length) fail('INVALID_BODY');
    if (bytes.length > MAX_SOURCE_BYTES) fail('BODY_TOO_LARGE');
    if (mime !== DOCX && mime !== 'application/pdf' && !(mime === TEXT && importText)) fail('INVALID_MIME');
    let text = null;
    if (mime === TEXT) {
      // Typed "what I want to teach" briefs: UTF-8 only, small.
      if (bytes.length > MAX_TEXT_BYTES) fail('BODY_TOO_LARGE');
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { fail('INVALID_SIGNATURE'); }
      if (!text.trim() || text.includes(String.fromCharCode(0))) fail('INVALID_SIGNATURE');
    } else if (mime === DOCX ? bytes[0] !== 80 || bytes[1] !== 75 || bytes[2] !== 3 || bytes[3] !== 4 : new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') fail('INVALID_SIGNATURE');
    const name = String(originalName || 'source').normalize('NFC').replace(/[<>:"\\/|?*\u0000-\u001f\u007f]/g, '_').slice(-160);
    const sha = await digest(bytes);
    const fingerprint = await digest(encoder.encode(JSON.stringify([sha, mime, name, REVISION])));
    const now = Date.now(), proposedId = crypto.randomUUID();
    // One SQLite statement reserves quota and request identity atomically, including concurrent requests.
    await query(`INSERT INTO lesson_sources(id,owner_account_id,request_id,request_fingerprint,original_name,mime,bytes,sha256,status,parser_revision,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,?,'pending',?,?,? WHERE
      (SELECT COUNT(*) FROM lesson_sources WHERE owner_account_id=?)<25 AND
      (SELECT COALESCE(SUM(bytes),0) FROM lesson_sources WHERE owner_account_id=?)+?<=104857600
      ON CONFLICT(owner_account_id,request_id) DO NOTHING`, proposedId, owner, requestId, fingerprint, name, mime, bytes.length, sha, REVISION, now, now, owner, owner, bytes.length).run();
    const row = await query('SELECT * FROM lesson_sources WHERE owner_account_id=? AND request_id=?', owner, requestId).first();
    if (!row) fail('SOURCE_QUOTA_EXCEEDED');
    if (row.request_fingerprint !== fingerprint) fail('REQUEST_ID_CONFLICT');
    if (row.status !== 'pending') return get(owner, row.id);
    const id = row.id;
    try {
      await put(key(id, 'original'), bytes, sha);
      const parsed = await (mime === TEXT ? importText({ kind: 'text', originalName: name, text }) : mime === DOCX ? importDocx({ bytes, originalName: name }) : importPdf({ bytes, originalName: name }));
      if (!parsed?.ok) {
        const code = ['ENCRYPTED_PDF', 'CORRUPTED_PDF', 'PDF_PAGE_READ_ERROR', 'MAX_PAGES_EXCEEDED', 'MAX_PAGE_TEXT_EXCEEDED', 'MAX_TOTAL_TEXT_EXCEEDED'].includes(parsed?.errors?.[0]?.code) ? parsed.errors[0].code : 'PARSE_FAILED';
        await query("UPDATE lesson_sources SET status='failed',error_code=?,updated_at=? WHERE id=? AND status='pending'", code, Date.now(), id).run();
      } else {
        if (parsed.segments.length > 10000 || parsed.uncertainties.length > 2000) fail('EXTRACTION_TOO_LARGE');
        const extraction = encoder.encode(JSON.stringify(enumerable(parsed)));
        if (extraction.length > 8 * 1024 * 1024) fail('EXTRACTION_TOO_LARGE');
        const hash = await digest(extraction);
        await put(key(id, 'extraction'), extraction, hash);
        await query("UPDATE lesson_sources SET status='ready',extraction_hash=?,error_code=NULL,updated_at=? WHERE id=? AND status='pending'", hash, Date.now(), id).run();
      }
    } catch (error) {
      if (error.message === 'EXTRACTION_TOO_LARGE') await query("UPDATE lesson_sources SET status='failed',error_code='EXTRACTION_TOO_LARGE',updated_at=? WHERE id=? AND status='pending'", Date.now(), id).run();
      else {
        // Retain the reservation and any objects for an identical retry after storage/process failure.
        await query("UPDATE lesson_sources SET error_code='SOURCE_PROCESSING_UNAVAILABLE',updated_at=? WHERE id=? AND status='pending'", Date.now(), id).run();
        fail('SOURCE_STORAGE_UNAVAILABLE');
      }
    }
    return get(owner, id);
  }
  async function bind({ ownerAccountId, packageRowId, packageVersion, packageHash, sourceId }) {
    const row = await rowFor(ownerAccountId, sourceId);
    if (!row || row.status !== 'ready') fail('NOT_FOUND');
    const result = await query(`INSERT INTO lesson_package_sources(package_row_id,package_version,package_hash,source_id,source_sha256,extraction_revision,extraction_hash,owner_account_id)
      SELECT row_id,version,content_hash,?,?,?,?,? FROM lesson_packages WHERE row_id=? AND version=? AND content_hash=? AND owner_account_id=?
      ON CONFLICT DO NOTHING`, row.id, row.sha256, row.parser_revision, row.extraction_hash, ownerAccountId, packageRowId, packageVersion, packageHash, ownerAccountId).run();
    if (!result.meta.changes && !await query('SELECT 1 FROM lesson_package_sources WHERE package_row_id=? AND package_version=? AND package_hash=? AND source_id=? AND owner_account_id=?', packageRowId, packageVersion, packageHash, sourceId, ownerAccountId).first()) fail('NOT_FOUND');
  }
  async function list(owner) {
    if (!owner) fail('AUTH_REQUIRED');
    return (await query('SELECT * FROM lesson_sources WHERE owner_account_id=? ORDER BY created_at DESC LIMIT 25', owner).all()).results.map(project);
  }
  return { upload, get, list, bind, downloadOriginal };
}
