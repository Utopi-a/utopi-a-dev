// ゆーとぴあちゃんの記憶。会話の内容は端末の外に出さないので、ブラウザの localStorage にだけ置く。
// 読み書きは失敗しうる（プライベートウィンドウ・容量超過など）ので、失敗したら覚えていない扱いにする。

const STORAGE_KEY = "utopia-companion.memory.v1";
const MAX_NOTES = 40;
const MAX_NOTE_LENGTH = 200;
/** プロンプトに入れる直近の会話の数。古いものはモデルの文脈に収まらないので捨てる */
const MAX_HISTORY = 16;

export type CompanionHistoryEntry = { role: "user" | "assistant"; content: string };

export type CompanionMemory = {
  notes: string[];
  history: CompanionHistoryEntry[];
};

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const EMPTY_MEMORY: CompanionMemory = { notes: [], history: [] };

function isHistoryEntry(value: unknown): value is CompanionHistoryEntry {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const { role, content } = value as Record<string, unknown>;
  return (role === "user" || role === "assistant") && typeof content === "string";
}

export function readCompanionMemory({ storage }: { storage: StorageLike }): CompanionMemory {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (typeof parsed !== "object" || parsed === null) {
      return EMPTY_MEMORY;
    }
    const { notes, history } = parsed as Record<string, unknown>;
    return {
      notes: Array.isArray(notes) ? notes.filter((note) => typeof note === "string") : [],
      history: Array.isArray(history) ? history.filter(isHistoryEntry) : [],
    };
  } catch {
    return EMPTY_MEMORY;
  }
}

function writeCompanionMemory({
  storage,
  memory,
}: {
  storage: StorageLike;
  memory: CompanionMemory;
}) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch {
    // 保存できなくても会話は続けられる
  }
  return memory;
}

/** 覚えておくことを足す。同じ内容は重ねず、上限を超えたら古いものから忘れる */
export function addCompanionNote({ storage, note }: { storage: StorageLike; note: string }) {
  const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
  const memory = readCompanionMemory({ storage });
  if (trimmed.length === 0 || memory.notes.includes(trimmed)) {
    return memory;
  }
  return writeCompanionMemory({
    storage,
    memory: { ...memory, notes: [...memory.notes, trimmed].slice(-MAX_NOTES) },
  });
}

export function appendCompanionHistory({
  storage,
  entries,
}: {
  storage: StorageLike;
  entries: CompanionHistoryEntry[];
}) {
  const memory = readCompanionMemory({ storage });
  return writeCompanionMemory({
    storage,
    memory: { ...memory, history: [...memory.history, ...entries].slice(-MAX_HISTORY) },
  });
}

export function clearCompanionMemory({ storage }: { storage: StorageLike }) {
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // 消せなくても、以後は空として扱う
  }
  return EMPTY_MEMORY;
}
