export type AnomalyLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface InspectionItem {
  id: string;
  name: string;
  description: string;
  required: boolean;
  photoPlaceholder: string;
  anomalyLevel: AnomalyLevel;
  rectificationDays: number;
}

export interface InspectionTemplate {
  id: string;
  name: string;
  description: string;
  items: InspectionItem[];
  createdAt: number;
  updatedAt: number;
  lastSubmittedAt: number | null;
  submissionCount: number;
}

export interface InspectionItemAnswer {
  itemId: string;
  itemSnapshot: InspectionItem;
  result: 'pass' | 'fail' | 'na';
  note: string;
  photoDataUrls: string[];
  anomalyLevel: AnomalyLevel;
  rectificationDeadline: number | null;
}

export interface InspectionRecord {
  id: string;
  templateId: string;
  templateSnapshot: InspectionTemplate;
  inspector: string;
  answers: InspectionItemAnswer[];
  status: 'draft' | 'submitted';
  startedAt: number;
  submittedAt: number | null;
  updatedAt: number;
  anomalyCounts: Record<AnomalyLevel, number>;
}

export type ViewName = 'templates' | 'template-editor' | 'inspection' | 'records';
