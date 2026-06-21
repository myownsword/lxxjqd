import type {
  InspectionTemplate,
  InspectionRecord,
  AnomalyLevel
} from './types';

const DB_NAME = 'inspection-db';
const DB_VERSION = 1;

export const anomalyLevelLabels: Record<AnomalyLevel, string> = {
  none: '无',
  low: '轻微',
  medium: '一般',
  high: '严重',
  critical: '致命'
};

export const anomalyLevelColors: Record<AnomalyLevel, string> = {
  none: '#10b981',
  low: '#6b7280',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#991b1b'
};

export const anomalyLevelBadgeClasses: Record<AnomalyLevel, string> = {
  none: 'badge badge-ok',
  low: 'badge badge-low',
  medium: 'badge badge-medium',
  high: 'badge badge-high',
  critical: 'badge badge-critical'
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id' });
        store.createIndex('templateId', 'templateId', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export const db = {
  async getAllTemplates(): Promise<InspectionTemplate[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const req = tx.objectStore('templates').getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as InspectionTemplate[];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getTemplate(id: string): Promise<InspectionTemplate | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readonly');
      const req = tx.objectStore('templates').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async saveTemplate(template: InspectionTemplate): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      const req = tx.objectStore('templates').put(template);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async deleteTemplate(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('templates', 'readwrite');
      tx.objectStore('templates').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  async getAllRecords(): Promise<InspectionRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const req = tx.objectStore('records').getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as InspectionRecord[];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getRecordsByTemplate(templateId: string): Promise<InspectionRecord[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const idx = tx.objectStore('records').index('templateId');
      const req = idx.getAll(templateId);
      req.onsuccess = () => {
        const list = (req.result || []) as InspectionRecord[];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getRecord(id: string): Promise<InspectionRecord | undefined> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readonly');
      const req = tx.objectStore('records').get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async saveRecord(record: InspectionRecord): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      const req = tx.objectStore('records').put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async deleteRecord(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('records', 'readwrite');
      tx.objectStore('records').delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};

export function cloneTemplateSnapshot(t: InspectionTemplate): InspectionTemplate {
  return JSON.parse(JSON.stringify(t));
}

export function computeAnomalyCounts(answers: { anomalyLevel: AnomalyLevel }[]): Record<AnomalyLevel, number> {
  const counts: Record<AnomalyLevel, number> = {
    none: 0, low: 0, medium: 0, high: 0, critical: 0
  };
  for (const a of answers) {
    if (a.anomalyLevel in counts) {
      counts[a.anomalyLevel] += 1;
    }
  }
  return counts;
}

export function totalAnomalies(counts: Record<AnomalyLevel, number>): number {
  return counts.low + counts.medium + counts.high + counts.critical;
}

export function formatDateTime(ts: number | null | undefined): string {
  if (!ts) return '-';
  const d = new Date(ts);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
