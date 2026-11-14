/**
 * In-memory Firestore Admin SDK test stub for deterministic persistence,
 * transaction, batch, lease-locking, and cross-tenant isolation tests.
 */

type StoreMap = Map<string, Record<string, any>>;

function deepClone<T>(val: T): T {
  if (val === undefined || val === null) return val;
  return JSON.parse(JSON.stringify(val));
}

function mergeObjects(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = { ...target };
  for (const [k, v] of Object.entries(source)) {
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      out[k] &&
      typeof out[k] === 'object' &&
      !Array.isArray(out[k])
    ) {
      out[k] = mergeObjects(out[k], v);
    } else {
      out[k] = deepClone(v);
    }
  }
  return out;
}

class MockDocSnapshot {
  constructor(
    public readonly id: string,
    private readonly _data: Record<string, any> | undefined
  ) {}

  get exists(): boolean {
    return this._data !== undefined;
  }

  data(): Record<string, any> | undefined {
    return this._data ? deepClone(this._data) : undefined;
  }
}

class MockQuerySnapshot {
  constructor(public readonly docs: Array<MockDocSnapshot & { ref: MockDocRef }>) {}

  get empty(): boolean {
    return this.docs.length === 0;
  }

  get size(): number {
    return this.docs.length;
  }

  forEach(cb: (doc: MockDocSnapshot & { ref: MockDocRef }) => void): void {
    this.docs.forEach(cb);
  }
}

class MockDocRef {
  constructor(
    private readonly store: StoreMap,
    public readonly path: string,
    public readonly id: string
  ) {}

  collection(name: string): MockCollectionRef {
    return new MockCollectionRef(this.store, `${this.path}/${name}`);
  }

  async get(): Promise<MockDocSnapshot> {
    return new MockDocSnapshot(this.id, this.store.get(this.path));
  }

  async set(data: Record<string, any>, options?: { merge?: boolean }): Promise<void> {
    if (options?.merge && this.store.has(this.path)) {
      const merged = mergeObjects(this.store.get(this.path)!, data);
      this.store.set(this.path, merged);
    } else {
      this.store.set(this.path, deepClone(data));
    }
  }

  async update(data: Record<string, any>): Promise<void> {
    if (!this.store.has(this.path)) {
      throw new Error(`NOT_FOUND: Document '${this.path}' does not exist.`);
    }
    const merged = mergeObjects(this.store.get(this.path)!, data);
    this.store.set(this.path, merged);
  }

  async delete(): Promise<void> {
    this.store.delete(this.path);
  }
}

interface FilterClause {
  field: string;
  op: string;
  value: any;
}

class MockQuery {
  constructor(
    protected readonly store: StoreMap,
    protected readonly collectionPath: string,
    protected readonly filters: FilterClause[] = [],
    protected readonly limitCount?: number
  ) {}

  where(field: string, op: string, value: any): MockQuery {
    return new MockQuery(this.store, this.collectionPath, [...this.filters, { field, op, value }], this.limitCount);
  }

  limit(n: number): MockQuery {
    return new MockQuery(this.store, this.collectionPath, this.filters, n);
  }

  orderBy(): MockQuery {
    return this;
  }

  async get(): Promise<MockQuerySnapshot> {
    const prefix = `${this.collectionPath}/`;
    const matched: Array<MockDocSnapshot & { ref: MockDocRef }> = [];

    for (const [docPath, docData] of this.store.entries()) {
      if (!docPath.startsWith(prefix)) continue;
      const remainder = docPath.slice(prefix.length);
      if (remainder.includes('/')) continue; // Direct children only

      let passes = true;
      for (const f of this.filters) {
        const val = docData[f.field];
        if (f.op === '==' && val !== f.value) passes = false;
        else if (f.op === '!=' && val === f.value) passes = false;
        else if (f.op === 'in' && (!Array.isArray(f.value) || !f.value.includes(val))) passes = false;
        if (!passes) break;
      }

      if (passes) {
        const ref = new MockDocRef(this.store, docPath, remainder);
        const snap = new MockDocSnapshot(remainder, docData) as MockDocSnapshot & { ref: MockDocRef };
        snap.ref = ref;
        matched.push(snap);
        if (this.limitCount && matched.length >= this.limitCount) break;
      }
    }

    return new MockQuerySnapshot(matched);
  }
}

class MockCollectionRef extends MockQuery {
  constructor(store: StoreMap, collectionPath: string) {
    super(store, collectionPath);
  }

  doc(id: string): MockDocRef {
    return new MockDocRef(this.store, `${this.collectionPath}/${id}`, id);
  }
}

export class MockFirestore {
  public readonly store: StoreMap = new Map();

  collection(name: string): MockCollectionRef {
    return new MockCollectionRef(this.store, name);
  }

  batch() {
    const ops: Array<() => Promise<void>> = [];
    return {
      set: (ref: MockDocRef, data: Record<string, any>, options?: { merge?: boolean }) => {
        ops.push(() => ref.set(data, options));
      },
      update: (ref: MockDocRef, data: Record<string, any>) => {
        ops.push(() => ref.update(data));
      },
      delete: (ref: MockDocRef) => {
        ops.push(() => ref.delete());
      },
      commit: async () => {
        for (const op of ops) {
          await op();
        }
      },
    };
  }

  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    const ops: Array<() => Promise<void>> = [];
    const tx = {
      get: (ref: MockDocRef) => ref.get(),
      set: (ref: MockDocRef, data: Record<string, any>, options?: { merge?: boolean }) => {
        ops.push(() => ref.set(data, options));
      },
      update: (ref: MockDocRef, data: Record<string, any>) => {
        ops.push(() => ref.update(data));
      },
      delete: (ref: MockDocRef) => {
        ops.push(() => ref.delete());
      },
    };
    const res = await fn(tx);
    for (const op of ops) {
      await op();
    }
    return res;
  }

  clear(): void {
    this.store.clear();
  }
}
