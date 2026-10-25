/**
 * Fake Firestore dùng chung cho test api/ — mô phỏng đúng ràng buộc cần thiết:
 * runTransaction có retry on version change, cấm read-after-write, where/limit cho collection scan.
 */
export type Data = Record<string, any>;
export class FakeDb {
  rows = new Map<string, Data>();
  versions = new Map<string, number>();
  retries = 0;
  scans: string[] = [];
  beforeTransaction?: () => void;
  beforeCommit?: () => void;
  put(path: string, data: Data) { this.rows.set(path, structuredClone(data)); this.versions.set(path, (this.versions.get(path) ?? 0) + 1); }
  doc(path: string): any {
    return {
      path, id: path.split('/').at(-1), collection: (name: string) => this.collection(`${path}/${name}`), get: async () => this.snap(path),
      set: async (data: Data, options?: { merge?: boolean }) => { this.put(path, options?.merge ? { ...this.rows.get(path), ...data } : data); },
      update: async (data: Data) => { if (!this.rows.has(path)) throw new Error(`update missing doc: ${path}`); this.put(path, { ...this.rows.get(path), ...data }); },
      delete: async () => { this.rows.delete(path); },
    };
  }
  snap(path: string): any {
    const data = structuredClone(this.rows.get(path));
    return { exists: !!data, id: path.split('/').at(-1), ref: this.doc(path), data: () => data };
  }
  collection(path: string): any {
    const filters: Array<[string, unknown]> = []; let maximum = Infinity;
    const query = { path, doc: (id: string) => this.doc(`${path}/${id}`), where: (field: string, _op: string, value: unknown) => { filters.push([field, value]); return query; }, limit: (n: number) => { maximum = n; return query; }, get: async () => {
      this.scans.push(path);
      const docs = [...this.rows.keys()].filter(key => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1).map(key => this.snap(key)).filter(snap => filters.every(([key, value]) => snap.data()[key] === value)).slice(0, maximum);
      return { docs, empty: !docs.length };
    }, add: async (data: Data) => {
      const id = `auto_${this.rows.size}`; this.put(`${path}/${id}`, data); return { id };
    } };
    return query;
  }
  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    this.beforeTransaction?.(); this.beforeTransaction = undefined;
    for (let attempt = 0; attempt < 100; attempt++) {
      const reads = new Map<string, number>(); const writes: Array<[string, Data, boolean]> = [];
      const validate = (value: any): void => { if (value === undefined) throw new Error('undefined'); if (value && typeof value === 'object') Object.values(value).forEach(validate); };
      const result = await fn({ get: async (ref: any) => {
        if (writes.length) throw new Error('read after write');
        if (typeof ref.get === 'function' && typeof ref.where === 'function') return ref.get();
        reads.set(ref.path, this.versions.get(ref.path) ?? 0); return this.snap(ref.path);
      }, set: (ref: any, data: Data, options?: { merge: boolean }) => {
        validate(data); writes.push([ref.path, structuredClone(data), !!options?.merge]);
      }, update: (ref: any, data: Data) => {
        validate(data); writes.push([ref.path, structuredClone(data), true]);
      } });
      const hook = this.beforeCommit; this.beforeCommit = undefined; hook?.();
      if ([...reads].some(([path, version]) => (this.versions.get(path) ?? 0) !== version)) { this.retries++; continue; }
      writes.forEach(([path, data, merge]) => this.put(path, merge ? { ...this.rows.get(path), ...data } : data));
      return result;
    }
    throw new Error('retry exhausted');
  }
  get db() { return this as unknown as FirebaseFirestore.Firestore; }
}
