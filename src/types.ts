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
  version: number;
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

export type RectificationStatus = 'pending' | 'submitted' | 'completed' | 'reinspected' | 'rejected';

export interface RectificationHistory {
  id: string;
  action: 'submit' | 'complete' | 'reinspect_pass' | 'reinspect_reject' | 'reject';
  operator: string;
  remark: string;
  timestamp: number;
  photoDataUrls: string[];
}

export interface RectificationTask {
  id: string;
  recordId: string;
  templateId: string;
  templateSnapshot: InspectionTemplate;
  itemSnapshot: InspectionItem;
  answerSnapshot: InspectionItemAnswer;
  anomalyLevel: AnomalyLevel;
  rectificationDeadline: number | null;
  responsiblePerson: string;
  rectificationDescription: string;
  rectificationPhotos: string[];
  status: RectificationStatus;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  reinspectedAt: number | null;
  reinspector: string;
  history: RectificationHistory[];
}

export type ViewName = 'templates' | 'template-editor' | 'inspection' | 'records' | 'rectification' | 'rectification-detail';
