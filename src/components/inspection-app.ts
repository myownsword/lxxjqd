import { LitElement, html, css, PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { createRef, Ref } from 'lit/directives/ref.js';
import { repeat } from 'lit/directives/repeat.js';
import { classMap } from 'lit/directives/class-map.js';
import {
  db,
  uid,
  anomalyLevelLabels,
  anomalyLevelBadgeClasses,
  cloneTemplateSnapshot,
  computeAnomalyCounts,
  totalAnomalies,
  formatDateTime,
  readFileAsDataURL,
  isTemplateNameDuplicate,
  rectificationStatusLabels,
  rectificationStatusBadgeClasses
} from '../db';
import type {
  InspectionTemplate,
  InspectionItem,
  InspectionRecord,
  InspectionItemAnswer,
  AnomalyLevel,
  ViewName,
  RectificationTask,
  RectificationStatus,
  RectificationHistory
} from '../types';

@customElement('inspection-app')
export class InspectionApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
    }
    .app-header {
      background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
      color: white;
      padding: 18px 24px;
      box-shadow: 0 2px 12px rgba(37, 99, 235, 0.3);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .app-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }
    .app-header .subtitle {
      opacity: 0.85;
      font-size: 13px;
      margin-top: 4px;
    }
    .nav-tabs {
      display: flex;
      gap: 4px;
      margin-top: 14px;
      flex-wrap: wrap;
    }
    .nav-tab {
      background: rgba(255, 255, 255, 0.15);
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 8px 8px 0 0;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.15s;
    }
    .nav-tab:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .nav-tab.active {
      background: #f4f6fa;
      color: #1e3a8a;
      font-weight: 600;
    }
    .app-main {
      max-width: 1100px;
      margin: 0 auto;
      padding: 24px;
    }
    .card {
      background: var(--color-surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      padding: 20px;
      margin-bottom: 20px;
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      flex-wrap: wrap;
      gap: 12px;
    }
    .card-title {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    .btn {
      border: 1px solid var(--color-border);
      background: white;
      color: var(--color-text);
      padding: 8px 16px;
      border-radius: var(--radius-sm);
      font-size: 14px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.15s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover {
      border-color: #d1d5db;
      background: #f9fafb;
    }
    .btn-primary {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: white;
    }
    .btn-primary:hover {
      background: var(--color-primary-hover);
      border-color: var(--color-primary-hover);
    }
    .btn-danger {
      background: var(--color-danger);
      border-color: var(--color-danger);
      color: white;
    }
    .btn-danger:hover {
      background: var(--color-danger-hover);
      border-color: var(--color-danger-hover);
    }
    .btn-success {
      background: var(--color-success);
      border-color: var(--color-success);
      color: white;
    }
    .btn-sm {
      padding: 5px 10px;
      font-size: 13px;
    }
    .btn[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .empty {
      text-align: center;
      padding: 48px 20px;
      color: var(--color-text-muted);
    }
    .template-list {
      display: grid;
      gap: 14px;
    }
    .template-item {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius);
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      transition: all 0.15s;
    }
    .template-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .template-info h3 {
      margin: 0 0 6px 0;
      font-size: 16px;
    }
    .template-info p {
      margin: 0 0 8px 0;
      color: var(--color-text-muted);
      font-size: 13px;
    }
    .template-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px 18px;
      font-size: 12px;
      color: var(--color-text-muted);
    }
    .template-meta .item-count {
      font-weight: 500;
    }
    .template-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge-ok { background: #d1fae5; color: #065f46; }
    .badge-low { background: #e5e7eb; color: #374151; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-high { background: #fee2e2; color: #991b1b; }
    .badge-critical { background: #7f1d1d; color: white; }

    .field {
      margin-bottom: 14px;
    }
    .field label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 6px;
      color: var(--color-text);
    }
    .field .hint {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-top: 4px;
    }
    .field input[type="text"],
    .field input[type="number"],
    .field textarea,
    .field select {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      font-size: 14px;
      font-family: inherit;
      background: white;
    }
    .field input:focus,
    .field textarea:focus,
    .field select:focus {
      outline: none;
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
    }
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 14px;
    }
    .item-editor-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: var(--radius-sm);
      padding: 14px;
      margin-bottom: 12px;
    }
    .item-editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      gap: 8px;
    }
    .checkbox-inline {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      user-select: none;
    }
    .checkbox-inline input {
      width: 16px;
      height: 16px;
    }
    .result-radios {
      display: inline-flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    .result-radio {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      cursor: pointer;
    }
    .answer-item {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 14px;
      margin-bottom: 12px;
    }
    .answer-item.missing {
      border-color: #ef4444;
      background: #fef2f2;
    }
    .answer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .answer-header h4 {
      margin: 0;
      font-size: 15px;
    }
    .answer-header .required-tag {
      color: #dc2626;
      font-weight: 600;
      font-size: 12px;
    }
    .answer-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      margin: 6px 0 10px;
    }
    .answer-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .filter-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
    }
    .photo-preview {
      display: inline-block;
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      margin: 4px;
    }
    .summary-bar {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 16px;
      background: #eff6ff;
      border-radius: var(--radius-sm);
      margin-bottom: 16px;
      align-items: center;
    }
    .toast {
      position: fixed;
      top: 80px;
      left: 50%;
      transform: translateX(-50%);
      background: #111827;
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      font-size: 14px;
      animation: fadeIn 0.2s;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translate(-50%, -10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }
    .record-item {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 14px 18px;
      margin-bottom: 10px;
    }
    .record-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
    }
    .record-head h4 {
      margin: 0;
    }
    .record-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
    }
    .back-link {
      background: none;
      border: none;
      color: var(--color-primary);
      cursor: pointer;
      padding: 4px 0;
      font-size: 14px;
    }
    .back-link:hover {
      text-decoration: underline;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px dashed var(--color-border);
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .status-tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
    }
    .status-draft {
      background: #fef3c7;
      color: #92400e;
    }
    .status-submitted {
      background: #d1fae5;
      color: #065f46;
    }
    .photo-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .photo-grid img {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--color-border);
    }
    .rect-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;
      flex-wrap: wrap;
      border-bottom: 2px solid var(--color-border);
    }
    .rect-tab {
      background: none;
      border: none;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: var(--color-text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      transition: all 0.15s;
    }
    .rect-tab:hover {
      color: var(--color-text);
    }
    .rect-tab.active {
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
      font-weight: 600;
    }
    .rect-tab .count {
      background: var(--color-border);
      color: var(--color-text-muted);
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 12px;
      margin-left: 6px;
    }
    .rect-tab.active .count {
      background: var(--color-primary);
      color: white;
    }
    .rect-task-item {
      background: white;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      padding: 14px 18px;
      margin-bottom: 10px;
      transition: all 0.15s;
      cursor: pointer;
    }
    .rect-task-item:hover {
      border-color: #cbd5e1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }
    .rect-task-item.overdue {
      border-left: 4px solid #ef4444;
    }
    .rect-task-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 8px;
    }
    .rect-task-head h4 {
      margin: 0;
      font-size: 15px;
    }
    .rect-task-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      margin-top: 6px;
    }
    .rect-task-meta .overdue-text {
      color: #dc2626;
      font-weight: 600;
    }
    .history-timeline {
      margin-top: 16px;
      padding-left: 8px;
    }
    .history-item {
      position: relative;
      padding: 10px 0 10px 20px;
      border-left: 2px solid var(--color-border);
      margin-left: 8px;
    }
    .history-item::before {
      content: '';
      position: absolute;
      left: -7px;
      top: 14px;
      width: 12px;
      height: 12px;
      background: var(--color-primary);
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 2px var(--color-primary);
    }
    .history-item .history-action {
      font-weight: 600;
      font-size: 14px;
    }
    .history-item .history-meta {
      font-size: 12px;
      color: var(--color-text-muted);
      margin-top: 2px;
    }
    .history-item .history-remark {
      font-size: 13px;
      margin-top: 6px;
      color: var(--color-text);
    }
    .history-item .history-photos {
      margin-top: 8px;
    }
    .section-title {
      font-size: 15px;
      font-weight: 600;
      margin: 20px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--color-border);
    }
    .photo-upload-area {
      border: 2px dashed var(--color-border);
      border-radius: var(--radius-sm);
      padding: 20px;
      text-align: center;
      color: var(--color-text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .photo-upload-area:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: #eff6ff;
    }
    .deadline-warning {
      color: #dc2626;
      font-weight: 600;
    }
    .deadline-ok {
      color: #059669;
    }
  `;

  @state()
  view: ViewName = 'templates';

  @state()
  templates: InspectionTemplate[] = [];

  @state()
  records: InspectionRecord[] = [];

  @state()
  editingTemplateId: string | null = null;

  @state()
  activeRecordId: string | null = null;

  @state()
  editingTemplate: InspectionTemplate | null = null;

  @state()
  activeRecord: InspectionRecord | null = null;

  @state()
  activeTemplateIdForRun: string | null = null;

  @state()
  toastMsg: string | null = null;

  @state()
  filterLevel: AnomalyLevel | 'all' = 'all';

  @state()
  recordFilterTemplate: string | null = null;

  @state()
  rectificationTasks: RectificationTask[] = [];

  @state()
  activeRectificationTask: RectificationTask | null = null;

  @state()
  rectificationTab: RectificationStatus | 'all' | 'overdue' = 'all';

  @state()
  rectificationFilterTemplate: string | null = null;

  @state()
  rectificationRemark: string = '';

  @state()
  rectificationPhotos: string[] = [];

  @state()
  reinspectorName: string = '';

  @state()
  responsiblePerson: string = '';

  private toastTimer: number | null = null;

  private inspectionFormRef: Ref<HTMLFormElement> = createRef();

  connectedCallback() {
    super.connectedCallback();
    this.refreshData();
    window.addEventListener('beforeunload', this.handleBeforeUnload);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
  }

  handleBeforeUnload = () => {
    if (this.view === 'inspection' && this.activeRecord && this.activeRecord.status === 'draft') {
      this.autosaveDraft();
    }
  };

  async refreshData() {
    const [templates, records, rectificationTasks] = await Promise.all([
      db.getAllTemplates(),
      db.getAllRecords(),
      db.getAllRectificationTasks()
    ]);
    this.templates = templates;
    this.records = records;
    this.rectificationTasks = rectificationTasks;
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastMsg = null;
    }, 2400);
  }

  goTo(view: ViewName) {
    if (this.view === 'inspection' && this.activeRecord?.status === 'draft') {
      this.autosaveDraft();
    }
    this.view = view;
    this.editingTemplate = null;
    this.activeRecord = null;
    this.activeTemplateIdForRun = null;
    this.editingTemplateId = null;
    this.activeRecordId = null;
    this.activeRectificationTask = null;
    this.rectificationRemark = '';
    this.rectificationPhotos = [];
    this.reinspectorName = '';
    this.responsiblePerson = '';
  }

  async startCreateTemplate() {
    this.editingTemplate = {
      id: uid(),
      name: '',
      description: '',
      items: [this.createEmptyItem()],
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSubmittedAt: null,
      submissionCount: 0
    };
    this.view = 'template-editor';
  }

  async startEditTemplate(id: string) {
    const tpl = await db.getTemplate(id);
    if (tpl) {
      this.editingTemplate = JSON.parse(JSON.stringify(tpl));
      this.editingTemplateId = id;
      this.view = 'template-editor';
    }
  }

  createEmptyItem(): InspectionItem {
    return {
      id: uid(),
      name: '',
      description: '',
      required: false,
      photoPlaceholder: '',
      anomalyLevel: 'none',
      rectificationDays: 0
    };
  }

  addItem() {
    if (!this.editingTemplate) return;
    this.editingTemplate = {
      ...this.editingTemplate,
      items: [...this.editingTemplate.items, this.createEmptyItem()]
    };
  }

  removeItem(itemId: string) {
    if (!this.editingTemplate) return;
    if (this.editingTemplate.items.length <= 1) {
      this.showToast('至少保留一个检查项');
      return;
    }
    this.editingTemplate = {
      ...this.editingTemplate,
      items: this.editingTemplate.items.filter(i => i.id !== itemId)
    };
  }

  updateTemplateField<K extends keyof InspectionTemplate>(field: K, value: InspectionTemplate[K]) {
    if (!this.editingTemplate) return;
    this.editingTemplate = { ...this.editingTemplate, [field]: value };
  }

  updateItemField<K extends keyof InspectionItem>(itemId: string, field: K, value: InspectionItem[K]) {
    if (!this.editingTemplate) return;
    this.editingTemplate = {
      ...this.editingTemplate,
      items: this.editingTemplate.items.map(i =>
        i.id === itemId ? { ...i, [field]: value } : i
      )
    };
  }

  async saveTemplate() {
    if (!this.editingTemplate) return;
    if (this.editingTemplate.name.trim() === '') {
      this.showToast('请输入模板名称');
      return;
    }
    if (isTemplateNameDuplicate(this.editingTemplate.name, this.editingTemplate.id, this.templates)) {
      this.showToast('模板名称已存在，请使用其他名称');
      return;
    }
    const invalidItem = this.editingTemplate.items.find(i => i.name.trim() === '');
    if (invalidItem) {
      this.showToast('请填写所有检查项的名称');
      return;
    }
    if (this.editingTemplateId) {
      this.editingTemplate.version = (this.editingTemplate.version || 0) + 1;
    }
    this.editingTemplate.updatedAt = Date.now();
    await db.saveTemplate(this.editingTemplate);
    this.showToast('模板已保存');
    await this.refreshData();
    this.goTo('templates');
  }

  async deleteTemplate(id: string) {
    if (!confirm('确认删除此模板？已提交的巡检记录将保留。')) return;
    await db.deleteTemplate(id);
    this.showToast('模板已删除');
    await this.refreshData();
  }

  async startInspection(templateId: string, resumeRecordId?: string) {
    let record: InspectionRecord;
    if (resumeRecordId) {
      const existing = await db.getRecord(resumeRecordId);
      if (existing) {
        record = existing;
      } else {
        return;
      }
    } else {
      const tpl = await db.getTemplate(templateId);
      if (!tpl) return;
      const snapshot = cloneTemplateSnapshot(tpl);
      record = {
        id: uid(),
        templateId,
        templateSnapshot: snapshot,
        inspector: '',
        answers: snapshot.items.map(item => ({
          itemId: item.id,
          itemSnapshot: JSON.parse(JSON.stringify(item)),
          result: 'na',
          note: '',
          photoDataUrls: [],
          anomalyLevel: item.anomalyLevel,
          rectificationDeadline: item.rectificationDays > 0
            ? Date.now() + item.rectificationDays * 86400000
            : null
        })),
        status: 'draft',
        startedAt: Date.now(),
        submittedAt: null,
        updatedAt: Date.now(),
        anomalyCounts: { none: 0, low: 0, medium: 0, high: 0, critical: 0 }
      };
    }
    await db.saveRecord(record);
    this.activeRecord = record;
    this.activeTemplateIdForRun = templateId;
    this.view = 'inspection';
    await this.refreshData();
  }

  updateAnswer(itemId: string, patch: Partial<InspectionItemAnswer>) {
    if (!this.activeRecord) return;
    const newAnswers = this.activeRecord.answers.map(a =>
      a.itemId === itemId ? { ...a, ...patch } : a
    );
    const counts = computeAnomalyCounts(newAnswers);
    this.activeRecord = {
      ...this.activeRecord,
      answers: newAnswers,
      anomalyCounts: counts,
      updatedAt: Date.now()
    };
  }

  updateInspector(name: string) {
    if (!this.activeRecord) return;
    this.activeRecord = {
      ...this.activeRecord,
      inspector: name,
      updatedAt: Date.now()
    };
  }

  async autosaveDraft() {
    if (!this.activeRecord || this.activeRecord.status !== 'draft') return;
    this.activeRecord.updatedAt = Date.now();
    await db.saveRecord(this.activeRecord);
  }

  async saveDraft() {
    await this.autosaveDraft();
    this.showToast('草稿已保存');
    await this.refreshData();
  }

  async submitRecord() {
    if (!this.activeRecord) return;
    const missing: string[] = [];
    for (const a of this.activeRecord.answers) {
      if (a.itemSnapshot.required && a.result === 'na') {
        missing.push(a.itemSnapshot.name);
      }
    }
    if (missing.length > 0) {
      this.showToast('请完成必填项: ' + missing.join(', '));
      return;
    }
    if (!this.activeRecord.inspector.trim()) {
      this.showToast('请填写巡检人');
      return;
    }
    this.activeRecord.status = 'submitted';
    this.activeRecord.submittedAt = Date.now();
    this.activeRecord.updatedAt = Date.now();
    await db.saveRecord(this.activeRecord);

    const tpl = await db.getTemplate(this.activeRecord.templateId);
    if (tpl) {
      tpl.lastSubmittedAt = Date.now();
      tpl.submissionCount = (tpl.submissionCount || 0) + 1;
      await db.saveTemplate(tpl);
    }

    const anomalyAnswers = this.activeRecord.answers.filter(
      a => a.anomalyLevel !== 'none' && a.result !== 'pass'
    );
    if (anomalyAnswers.length > 0) {
      const tasks: RectificationTask[] = anomalyAnswers.map(answer => {
        const task: RectificationTask = {
          id: uid(),
          recordId: this.activeRecord!.id,
          templateId: this.activeRecord!.templateId,
          templateSnapshot: JSON.parse(JSON.stringify(this.activeRecord!.templateSnapshot)),
          itemSnapshot: JSON.parse(JSON.stringify(answer.itemSnapshot)),
          answerSnapshot: JSON.parse(JSON.stringify(answer)),
          anomalyLevel: answer.anomalyLevel,
          rectificationDeadline: answer.rectificationDeadline,
          responsiblePerson: '',
          rectificationDescription: '',
          rectificationPhotos: [],
          status: 'pending',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          completedAt: null,
          reinspectedAt: null,
          reinspector: '',
          history: [{
            id: uid(),
            action: 'submit',
            operator: this.activeRecord!.inspector,
            remark: '巡检提交，自动生成整改任务',
            timestamp: Date.now(),
            photoDataUrls: []
          }]
        };
        return task;
      });
      await db.saveRectificationTasks(tasks);
      this.showToast(`巡检记录已提交，生成 ${tasks.length} 条整改任务`);
    } else {
      this.showToast('巡检记录已提交');
    }

    await this.refreshData();
    this.view = 'records';
  }

  async handlePhotoUpload(itemId: string, files: FileList | null) {
    if (!files || files.length === 0) return;
    const dataUrls = await Promise.all(Array.from(files).map(f => readFileAsDataURL(f)));
    const current = this.activeRecord?.answers.find(a => a.itemId === itemId);
    if (!current) return;
    this.updateAnswer(itemId, {
      photoDataUrls: [...current.photoDataUrls, ...dataUrls]
    });
  }

  removePhoto(itemId: string, index: number) {
    const current = this.activeRecord?.answers.find(a => a.itemId === itemId);
    if (!current) return;
    const newPhotos = current.photoDataUrls.filter((_, i) => i !== index);
    this.updateAnswer(itemId, { photoDataUrls: newPhotos });
  }

  viewRecord(id: string) {
    const r = this.records.find(x => x.id === id);
    if (r) {
      this.activeRecord = r;
      this.activeRecordId = id;
      this.view = 'records';
    }
  }

  async deleteRecord(id: string) {
    if (!confirm('确认删除此记录？关联的整改任务也将被删除。')) return;
    const rectTasks = await db.getRectificationTasksByRecord(id);
    for (const task of rectTasks) {
      await db.deleteRectificationTask(task.id);
    }
    await db.deleteRecord(id);
    this.showToast('记录及关联整改任务已删除');
    this.activeRecord = null;
    this.activeRecordId = null;
    await this.refreshData();
  }

  async exportRecordJSON(record: InspectionRecord) {
    const anomalyItems = record.answers.filter(a => a.anomalyLevel !== 'none');
    const rectTasks = await db.getRectificationTasksByRecord(record.id);

    const exportData = {
      exportTime: new Date().toISOString(),
      record: {
        id: record.id,
        status: record.status,
        inspector: record.inspector,
        startedAt: new Date(record.startedAt).toISOString(),
        submittedAt: record.submittedAt ? new Date(record.submittedAt).toISOString() : null,
        finishedAt: record.submittedAt ? new Date(record.submittedAt).toISOString() : null,
        anomalyCounts: record.anomalyCounts
      },
      template: {
        id: record.templateSnapshot.id,
        name: record.templateSnapshot.name,
        description: record.templateSnapshot.description,
        version: record.templateSnapshot.version || 0,
        snapshotItems: record.templateSnapshot.items.length
      },
      anomalyItems: anomalyItems.map(a => ({
        name: a.itemSnapshot.name,
        description: a.itemSnapshot.description,
        result: a.result,
        note: a.note,
        anomalyLevel: a.anomalyLevel,
        anomalyLevelLabel: anomalyLevelLabels[a.anomalyLevel],
        rectificationDeadline: a.rectificationDeadline
          ? new Date(a.rectificationDeadline).toISOString()
          : null,
        photoCount: a.photoDataUrls.length
      })),
      items: record.answers.map(a => ({
        name: a.itemSnapshot.name,
        description: a.itemSnapshot.description,
        required: a.itemSnapshot.required,
        result: a.result,
        note: a.note,
        anomalyLevel: a.anomalyLevel,
        anomalyLevelLabel: anomalyLevelLabels[a.anomalyLevel],
        rectificationDeadline: a.rectificationDeadline
          ? new Date(a.rectificationDeadline).toISOString()
          : null,
        photoCount: a.photoDataUrls.length
      })),
      rectificationTasks: rectTasks.map(task => ({
        id: task.id,
        itemName: task.itemSnapshot.name,
        anomalyLevel: task.anomalyLevel,
        anomalyLevelLabel: anomalyLevelLabels[task.anomalyLevel],
        status: task.status,
        statusLabel: rectificationStatusLabels[task.status],
        responsiblePerson: task.responsiblePerson,
        rectificationDeadline: task.rectificationDeadline
          ? new Date(task.rectificationDeadline).toISOString()
          : null,
        rectificationDescription: task.rectificationDescription,
        rectificationPhotoCount: task.rectificationPhotos.length,
        createdAt: new Date(task.createdAt).toISOString(),
        completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
        reinspectedAt: task.reinspectedAt ? new Date(task.reinspectedAt).toISOString() : null,
        reinspector: task.reinspector,
        history: task.history.map(h => ({
          action: h.action,
          actionLabel: this.getHistoryActionLabel(h.action),
          operator: h.operator,
          remark: h.remark,
          timestamp: new Date(h.timestamp).toISOString(),
          photoCount: h.photoDataUrls.length
        }))
      }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inspection-' + record.id + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showToast('JSON 已导出（含整改数据）');
  }

  getTemplateSubmissionStats(templateId: string) {
    const related = this.records.filter(r => r.templateId === templateId && r.status === 'submitted');
    const last = related.reduce<number | null>((acc, r) => {
      if (!acc) return r.submittedAt;
      return r.submittedAt && r.submittedAt > acc ? r.submittedAt : acc;
    }, null);
    const anomalySum = related.reduce((acc, r) => acc + totalAnomalies(r.anomalyCounts), 0);
    return { lastSubmittedAt: last, anomalyCount: anomalySum, submissionCount: related.length };
  }

  render() {
    return html`
      ${this.toastMsg
        ? html`<div class="toast">${this.toastMsg}</div>`
        : null}
      <div class="app-header">
        <h1>📋 离线巡检清单</h1>
        <div class="subtitle">数据本地存储（IndexedDB），无需后端</div>
        <div class="nav-tabs">
          <button class="nav-tab ${this.view === 'templates' ? 'active' : ''}" @click=${() => this.goTo('templates')}>
            巡检模板
          </button>
          <button class="nav-tab ${this.view === 'records' ? 'active' : ''}" @click=${() => this.goTo('records')}>
            巡检记录
          </button>
          <button class="nav-tab ${this.view === 'rectification' || this.view === 'rectification-detail' ? 'active' : ''}" @click=${() => this.goTo('rectification')}>
            整改闭环
          </button>
        </div>
      </div>
      <div class="app-main">
        ${this.view === 'templates' ? this.renderTemplatesView() : ''}
        ${this.view === 'template-editor' ? this.renderTemplateEditor() : ''}
        ${this.view === 'inspection' ? this.renderInspectionView() : ''}
        ${this.view === 'records' ? this.renderRecordsView() : ''}
        ${this.view === 'rectification' ? this.renderRectificationView() : ''}
        ${this.view === 'rectification-detail' ? this.renderRectificationDetailView() : ''}
      </div>
    `;
  }

  renderTemplatesView() {
    const drafts = this.records.filter(r => r.status === 'draft');

    return html`
      ${drafts.length > 0
      ? html`
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">未完成的草稿</h3>
          </div>
          <div class="template-list">
            ${repeat(drafts, d => d.id, draft => {
              const tplName = draft.templateSnapshot?.name || '(模板已删除)';
              return html`
                <div class="template-item">
                  <div class="template-info">
                    <h3>${tplName} <span style="font-size: 12px; font-weight: 400; color: var(--color-text-muted);">v${draft.templateSnapshot?.version || 0}</span></h3>
                    <p>巡检人：${draft.inspector || '(未填写)'} · 保存于：${formatDateTime(draft.updatedAt)}</p>
                    <div class="template-meta">
                      <span>共 ${draft.answers.length} 项</span>
                      ${this.renderAnomalyBadges(draft.anomalyCounts)}
                    </div>
                  </div>
                  <div class="template-actions">
                    <button class="btn btn-primary btn-sm" @click=${() => this.startInspection(draft.templateId, draft.id)}>
                      继续编辑
                    </button>
                    <button class="btn btn-sm" @click=${() => this.deleteRecord(draft.id)}>删除</button>
                  </div>
                </div>
              `;
            })}
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">巡检模板</h3>
          <button class="btn btn-primary" @click=${this.startCreateTemplate}>+ 新建模板</button>
        </div>
        ${this.templates.length === 0
          ? html`<div class="empty">暂无模板，点击"新建模板"开始创建</div>`
          : html`
            <div class="template-list">
              ${repeat(this.templates, t => t.id, tpl => {
                const stats = this.getTemplateSubmissionStats(tpl.id);
                return html`
                  <div class="template-item">
                    <div class="template-info">
                      <h3>${tpl.name}</h3>
                      <p>${tpl.description || '(无描述)'}</p>
                      <div class="template-meta">
                        <span class="item-count">共 ${tpl.items.length} 项检查项</span>
                        <span>版本 v${tpl.version || 0}</span>
                        <span>创建于 ${formatDateTime(tpl.createdAt)}</span>
                        <span>最近提交 ${formatDateTime(stats.lastSubmittedAt || tpl.updatedAt)}</span>
                        ${stats.submissionCount > 0
                          ? html`<span>提交 ${stats.submissionCount} 次</span>`
                          : ''}
                        ${stats.anomalyCount > 0
                          ? html`<span>异常共 ${stats.anomalyCount} 项</span>`
                          : ''}
                      </div>
                    </div>
                    <div class="template-actions">
                      <button class="btn btn-primary btn-sm" @click=${() => this.startInspection(tpl.id)}>执行</button>
                      <button class="btn btn-sm" @click=${() => this.startEditTemplate(tpl.id)}>编辑</button>
                      <button class="btn btn-sm" @click=${() => this.deleteTemplate(tpl.id)}>删除</button>
                    </div>
                  </div>
                `;
              })}
            </div>
          `}
      </div>
    `;
  }

  renderTemplateEditor() {
    if (!this.editingTemplate) return '';
    const t = this.editingTemplate;
    return html`
      <div class="card">
        <button class="back-link" @click=${() => this.goTo('templates')}>← 返回模板列表</button>
        <div class="card-header" style="margin-top: 10px;">
          <h3 class="card-title">${this.editingTemplateId ? '编辑模板' : '新建模板'}</h3>
          <div style="display: flex; gap: 8px;">
            <button class="btn" @click=${() => this.goTo('templates')}>取消</button>
            <button class="btn btn-primary" @click=${() => this.saveTemplate()}>保存模板</button>
          </div>
        </div>

        <div class="field">
          <label>模板名称 *</label>
          <input
            type="text"
            .value=${t.name}
            @input=${(e: Event) => this.updateTemplateField('name', (e.target as HTMLInputElement).value)}
            placeholder="如：月度设备安全检查"
          />
        </div>
        <div class="row">
          <div class="field">
            <label>模板描述</label>
            <textarea
              rows="2"
              .value=${t.description}
              @input=${(e: Event) => this.updateTemplateField('description', (e.target as HTMLTextAreaElement).value)}
              placeholder="说明该模板的用途和场景"
            ></textarea>
          </div>
          <div class="field">
            <label>模板版本</label>
            <input
              type="text"
              value="v${t.version || 0}"
              disabled
              style="background: #f3f4f6; color: #6b7280;"
            />
            <div class="hint">新建时为 v1，每次编辑保存后自动递增</div>
          </div>
        </div>

        <h4 style="margin: 20px 0 12px; font-size: 15px;">检查项</h4>

        ${repeat(t.items, item => item.id, (item, idx) => html`
          <div class="item-editor-card">
            <div class="item-editor-header">
              <strong>检查项 #${idx + 1}</strong>
              <button class="btn btn-sm btn-danger" @click=${() => this.removeItem(item.id)}>删除</button>
            </div>
            <div class="field">
              <label>名称 *</label>
              <input
                type="text"
                .value=${item.name}
                @input=${(e: Event) => this.updateItemField(item.id, 'name', (e.target as HTMLInputElement).value)}
                placeholder="检查内容名称"
              />
            </div>
            <div class="field">
              <label>说明</label>
              <textarea
                rows="2"
                .value=${item.description}
                @input=${(e: Event) => this.updateItemField(item.id, 'description', (e.target as HTMLTextAreaElement).value)}
              ></textarea>
            </div>
            <div class="row">
              <div class="field">
                <label class="checkbox-inline">
                  <input
                    type="checkbox"
                    ?checked=${item.required}
                    @change=${(e: Event) => this.updateItemField(item.id, 'required', (e.target as HTMLInputElement).checked)}
                  />
                  必填项
                </label>
                <div class="hint">执行时必须填写结果，否则无法提交</div>
              </div>
              <div class="field">
                <label>异常等级（默认）</label>
                <select
                  .value=${item.anomalyLevel}
                  @change=${(e: Event) => this.updateItemField(item.id, 'anomalyLevel', (e.target as HTMLSelectElement).value as AnomalyLevel)}
                >
                  <option value="none">无</option>
                  <option value="low">轻微</option>
                  <option value="medium">一般</option>
                  <option value="high">严重</option>
                  <option value="critical">致命</option>
                </select>
              </div>
              <div class="field">
                <label>整改期限（天）</label>
                <input
                  type="number"
                  min="0"
                  .value=${item.rectificationDays}
                  @input=${(e: Event) => this.updateItemField(item.id, 'rectificationDays', Number((e.target as HTMLInputElement).value || 0))}
                />
                <div class="hint">0 表示不限期</div>
              </div>
            </div>
            <div class="field">
              <label>拍照说明占位</label>
              <input
                type="text"
                .value=${item.photoPlaceholder}
                @input=${(e: Event) => this.updateItemField(item.id, 'photoPlaceholder', (e.target as HTMLInputElement).value)}
                placeholder="例如：拍摄设备正面、异常部位等"
              />
            </div>
          </div>
        `)}

        <div style="margin-top: 14px;">
          <button class="btn" @click=${this.addItem}>+ 添加检查项</button>
        </div>
      </div>
    `;
  }

  renderInspectionView() {
    if (!this.activeRecord) return '';
    const r = this.activeRecord;
    const tpl = r.templateSnapshot;
    const filteredAnswers = this.filterLevel === 'all'
      ? r.answers
      : r.answers.filter(a => a.anomalyLevel === this.filterLevel);

    const filterLevels: (AnomalyLevel | 'all')[] = ['all', 'none', 'low', 'medium', 'high', 'critical'];

    return html`
      <div class="card">
        <button class="back-link" @click=${() => { this.saveDraft(); this.goTo('templates'); }}>← 返回并保存草稿</button>
        <div class="card-header" style="margin-top: 10px;">
          <h3 class="card-title">${tpl.name} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-muted);">v${tpl.version || 0}</span></h3>
          <span class="status-tag ${r.status === 'draft' ? 'status-draft' : 'status-submitted'}">
            ${r.status === 'draft' ? '草稿' : '已提交'}
          </span>
        </div>
        <p style="color: var(--color-text-muted); margin: 0 0 16px;">${tpl.description || ''}</p>

        <div class="summary-bar">
          <div style="font-weight: 600;">摘要：</div>
          ${this.renderAnomalyBadges(r.anomalyCounts)}
          <span style="margin-left: auto; font-size: 13px; color: var(--color-text-muted);">
            开始于 ${formatDateTime(r.startedAt)}
          </span>
        </div>

        <div class="field" style="max-width: 300px;">
          <label>巡检人 *</label>
          <input
            type="text"
            .value=${r.inspector}
            @input=${(e: Event) => this.updateInspector((e.target as HTMLInputElement).value)}
            placeholder="请输入巡检人姓名"
            ?disabled=${r.status === 'submitted'}
          />
        </div>

        <div class="filter-bar">
          <div style="font-weight: 600; font-size: 13px;">按异常等级过滤：</div>
          ${repeat(filterLevels, l => l, level => html`
            <button
              class="btn btn-sm ${this.filterLevel === level ? 'btn-primary' : ''}"
              @click=${() => { this.filterLevel = level; }}
            >
              ${level === 'all' ? '全部' : anomalyLevelLabels[level]}
            </button>
          `)}
        </div>

        ${repeat(filteredAnswers, a => a.itemId, answer => {
          const item = answer.itemSnapshot;
          const isMissing = item.required && answer.result === 'na' && r.status === 'draft';
          return html`
            <div class="answer-item ${classMap({ missing: isMissing })}">
              <div class="answer-header">
                <div>
                  <h4>
                    ${item.name}
                    ${item.required ? html`<span class="required-tag"> (必填)</span>` : ''}
                  </h4>
                  ${item.description
                    ? html`<div class="answer-meta">${item.description}</div>`
                    : ''}
                </div>
                ${answer.anomalyLevel !== 'none'
                  ? html`<span class="${anomalyLevelBadgeClasses[answer.anomalyLevel]}">
                      ${anomalyLevelLabels[answer.anomalyLevel]}
                    </span>`
                  : ''}
              </div>

              ${item.rectificationDays > 0
                ? html`<div class="answer-meta">
                  整改期限：${formatDateTime(answer.rectificationDeadline)}
                  (${item.rectificationDays} 天内)
                </div>`
                : ''}

              <div class="answer-body">
                <div class="field">
                  <label>检查结果 ${item.required ? '*' : ''}</label>
                  <div class="result-radios">
                    ${(['pass', 'fail', 'na'] as const).map(res => html`
                      <label class="result-radio">
                        <input
                          type="radio"
                          name="result-${item.id}"
                          ?checked=${answer.result === res}
                          ?disabled=${r.status === 'submitted'}
                          @change=${() => this.updateAnswer(item.id, {
                            result: res,
                            anomalyLevel: res === 'pass' ? 'none' : item.anomalyLevel
                          })}
                        />
                        ${res === 'pass' ? '✅ 通过' : res === 'fail' ? '❌ 不通过' : '⚪ N/A'}
                      </label>
                    `)}
                  </div>
                </div>

                <div class="row">
                  <div class="field">
                    <label>异常等级（实际）</label>
                    <select
                      .value=${answer.anomalyLevel}
                      ?disabled=${r.status === 'submitted' || answer.result === 'pass'}
                      @change=${(e: Event) => this.updateAnswer(item.id, {
                        anomalyLevel: (e.target as HTMLSelectElement).value as AnomalyLevel
                      })}
                    >
                      <option value="none">无</option>
                      <option value="low">轻微</option>
                      <option value="medium">一般</option>
                      <option value="high">严重</option>
                      <option value="critical">致命</option>
                    </select>
                  </div>
                </div>

                <div class="field">
                  <label>备注说明</label>
                  <textarea
                    rows="2"
                    .value=${answer.note}
                    @input=${(e: Event) => this.updateAnswer(item.id, { note: (e.target as HTMLTextAreaElement).value })}
                    ?disabled=${r.status === 'submitted'}
                    placeholder="记录情况描述"
                  ></textarea>
                </div>

                <div class="field">
                  <label>${item.photoPlaceholder || '照片证据'}</label>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    ?disabled=${r.status === 'submitted'}
                    @change=${(e: Event) => this.handlePhotoUpload(item.id, (e.target as HTMLInputElement).files)}
                  />
                  ${answer.photoDataUrls.length > 0
                    ? html`
                      <div class="photo-grid" style="margin-top: 8px;">
                        ${answer.photoDataUrls.map((url, idx) => html`
                          <div style="position: relative; display: inline-block;">
                            <img src="${url}" class="photo-preview" />
                            ${r.status !== 'submitted'
                              ? html`<button
                                class="btn btn-sm btn-danger"
                                style="position: absolute; top: 2px; right: 2px; padding: 0 6px; font-size: 12px;"
                                @click=${() => this.removePhoto(item.id, idx)}
                              >×</button>`
                              : ''}
                          </div>
                        `)}
                      </div>
                    ` : ''}
                </div>
              </div>
            </div>
          `;
        })}

        <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
          <button class="btn" ?disabled=${r.status === 'submitted'} @click=${this.saveDraft}>
            💾 保存草稿
          </button>
          <button class="btn btn-success" ?disabled=${r.status === 'submitted'} @click=${this.submitRecord}>
            ✅ 提交记录
          </button>
          ${r.status === 'submitted'
            ? html`<button class="btn btn-primary" @click=${() => this.exportRecordJSON(r)}>
                📤 导出 JSON
              </button>`
            : ''}
        </div>
      </div>
    `;
  }

  renderRecordsView() {
    if (this.activeRecord) {
      return this.renderRecordDetail();
    }

    const submittedRecords = this.records.filter(r => r.status === 'submitted');
    const filtered = this.recordFilterTemplate
      ? submittedRecords.filter(r => r.templateId === this.recordFilterTemplate)
      : submittedRecords;

    return html`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">巡检记录</h3>
        </div>

        <div class="filter-bar">
          <div style="font-weight: 600; font-size: 13px;">按模板筛选：</div>
          <select
            .value=${this.recordFilterTemplate || ''}
            @change=${(e: Event) => { this.recordFilterTemplate = (e.target as HTMLSelectElement).value || null; }}
          >
            <option value="">全部模板</option>
            ${this.templates.map(t => html`<option value="${t.id}">${t.name}</option>`)}
          </select>
        </div>

        ${filtered.length === 0
          ? html`<div class="empty">暂无已提交的记录</div>`
          : html`
            ${repeat(filtered, r => r.id, record => html`
              <div class="record-item">
                <div class="record-head">
                  <h4>${record.templateSnapshot.name} <span style="font-size: 12px; font-weight: 400; color: var(--color-text-muted);">v${record.templateSnapshot.version || 0}</span></h4>
                  <div>
                    <button class="btn btn-sm btn-primary" @click=${() => this.viewRecord(record.id)}>
                      查看
                    </button>
                    <button class="btn btn-sm" @click=${() => this.exportRecordJSON(record)}>
                      导出JSON
                    </button>
                    <button class="btn btn-sm" @click=${() => this.deleteRecord(record.id)}>
                      删除
                    </button>
                  </div>
                </div>
                <div class="record-meta">
                  <span>巡检人：<strong>${record.inspector}</strong></span>
                  <span>开始：${formatDateTime(record.startedAt)}</span>
                  <span>完成：${formatDateTime(record.submittedAt)}</span>
                  ${this.renderAnomalyBadges(record.anomalyCounts)}
                </div>
              </div>
            `)}
          `}
      </div>
    `;
  }

  getRectTasksForRecord(recordId: string): RectificationTask[] {
    return this.rectificationTasks.filter(t => t.recordId === recordId);
  }

  renderRecordDetail() {
    const r = this.activeRecord!;
    const rectTasks = this.getRectTasksForRecord(r.id);

    return html`
      <div class="card">
        <button class="back-link" @click=${() => { this.activeRecord = null; this.activeRecordId = null; }}>← 返回记录列表</button>
        <div class="card-header" style="margin-top: 10px;">
          <h3 class="card-title">${r.templateSnapshot.name} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-muted);">v${r.templateSnapshot.version || 0}</span></h3>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <span class="status-tag status-submitted">已提交</span>
            <button class="btn btn-primary btn-sm" @click=${() => this.exportRecordJSON(r)}>导出 JSON</button>
          </div>
        </div>
        <p style="color: var(--color-text-muted); margin: 0 0 16px;">${r.templateSnapshot.description || ''}</p>

        <div class="summary-bar">
          <div><strong>巡检人：</strong>${r.inspector}</div>
          <div><strong>模板版本：</strong>v${r.templateSnapshot.version || 0}</div>
          <div><strong>开始：</strong>${formatDateTime(r.startedAt)}</div>
          <div><strong>完成：</strong>${formatDateTime(r.submittedAt)}</div>
          ${this.renderAnomalyBadges(r.anomalyCounts)}
        </div>

        ${rectTasks.length > 0
          ? html`
            <div class="summary-bar" style="background: #fef3c7; margin-top: 12px;">
              <div><strong>整改任务：</strong>${rectTasks.length} 条</div>
              <button class="btn btn-sm btn-primary" @click=${() => {
                this.rectificationFilterTemplate = r.templateId;
                this.goTo('rectification');
              }}>查看全部整改</button>
            </div>
          `
          : ''}

        <h4 style="margin: 20px 0 12px; font-size: 15px;">检查项详情</h4>

        ${repeat(r.answers, a => a.itemId, answer => {
          const item = answer.itemSnapshot;
          const rectTask = rectTasks.find(t => t.itemSnapshot.id === item.id);
          return html`
            <div class="answer-item">
              <div class="answer-header">
                <div>
                  <h4>${item.name}${item.required ? html`<span class="required-tag"> (必填)</span>` : ''}</h4>
                  ${item.description ? html`<div class="answer-meta">${item.description}</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  ${answer.anomalyLevel !== 'none'
                    ? html`<span class="${anomalyLevelBadgeClasses[answer.anomalyLevel]}">
                        ${anomalyLevelLabels[answer.anomalyLevel]}
                      </span>`
                    : ''}
                  <span style="font-weight: 600;">
                    ${answer.result === 'pass' ? '✅ 通过' : answer.result === 'fail' ? '❌ 不通过' : '⚪ N/A'}
                  </span>
                  ${rectTask
                    ? html`<span class="${rectificationStatusBadgeClasses[rectTask.status]}">
                        ${rectificationStatusLabels[rectTask.status]}
                      </span>`
                    : ''}
                </div>
              </div>

              <div class="detail-row">
                <span>整改期限</span>
                <span>${formatDateTime(answer.rectificationDeadline)}</span>
              </div>
              ${answer.note
                ? html`<div class="detail-row"><span>备注</span><span>${answer.note}</span></div>`
                : ''}
              ${answer.photoDataUrls.length > 0
                ? html`
                  <div class="detail-row">
                    <span>照片 (${answer.photoDataUrls.length})</span>
                    <div class="photo-grid">
                      ${answer.photoDataUrls.map(url => html`<img src="${url}" />`)}
                    </div>
                  </div>
                ` : ''}
              ${rectTask
                ? html`
                  <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--color-border);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                      <span style="font-size: 13px; color: var(--color-text-muted);">
                        责任人：${rectTask.responsiblePerson || '(未指定)'}
                      </span>
                      <button class="btn btn-sm" @click=${() => this.viewRectificationTask(rectTask.id)}>
                        查看整改详情
                      </button>
                    </div>
                  </div>
                `
                : ''}
            </div>
          `;
        })}
      </div>
    `;
  }

  isTaskOverdue(task: RectificationTask): boolean {
    if (!task.rectificationDeadline) return false;
    if (task.status === 'reinspected' || task.status === 'completed') return false;
    return Date.now() > task.rectificationDeadline;
  }

  getFilteredRectificationTasks(): RectificationTask[] {
    let tasks = this.rectificationTasks;
    if (this.rectificationFilterTemplate) {
      tasks = tasks.filter(t => t.templateId === this.rectificationFilterTemplate);
    }
    if (this.rectificationTab === 'all') {
      return tasks;
    }
    if (this.rectificationTab === 'overdue') {
      return tasks.filter(t => this.isTaskOverdue(t));
    }
    return tasks.filter(t => t.status === this.rectificationTab);
  }

  getRectTaskCount(status: RectificationStatus | 'overdue'): number {
    if (status === 'overdue') {
      return this.rectificationTasks.filter(t => this.isTaskOverdue(t)).length;
    }
    return this.rectificationTasks.filter(t => t.status === status).length;
  }

  async viewRectificationTask(taskId: string) {
    const task = await db.getRectificationTask(taskId);
    if (task) {
      this.activeRectificationTask = task;
      this.rectificationRemark = '';
      this.rectificationPhotos = [];
      this.reinspectorName = '';
      this.responsiblePerson = task.responsiblePerson;
      this.view = 'rectification-detail';
    }
  }

  async handleRectificationPhotoUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const dataUrls = await Promise.all(Array.from(files).map(f => readFileAsDataURL(f)));
    this.rectificationPhotos = [...this.rectificationPhotos, ...dataUrls];
  }

  removeRectificationPhoto(index: number) {
    this.rectificationPhotos = this.rectificationPhotos.filter((_, i) => i !== index);
  }

  async updateResponsiblePerson(name: string) {
    if (!this.activeRectificationTask) return;
    this.responsiblePerson = name;
  }

  async saveRectification() {
    if (!this.activeRectificationTask) return;
    const task = this.activeRectificationTask;
    task.responsiblePerson = this.responsiblePerson;
    task.updatedAt = Date.now();
    await db.saveRectificationTask(task);
    this.activeRectificationTask = { ...task };
    this.showToast('责任人已保存');
    await this.refreshData();
  }

  async submitRectificationComplete() {
    if (!this.activeRectificationTask) return;
    if (!this.responsiblePerson.trim()) {
      this.showToast('请填写责任人');
      return;
    }
    if (this.rectificationRemark.trim() === '' && this.rectificationPhotos.length === 0) {
      this.showToast('请填写整改说明或上传整改照片');
      return;
    }
    const task = this.activeRectificationTask;
    const historyItem: RectificationHistory = {
      id: uid(),
      action: 'complete',
      operator: this.responsiblePerson,
      remark: this.rectificationRemark,
      timestamp: Date.now(),
      photoDataUrls: [...this.rectificationPhotos]
    };
    task.status = 'completed';
    task.responsiblePerson = this.responsiblePerson;
    task.rectificationDescription = this.rectificationRemark;
    task.rectificationPhotos = [...this.rectificationPhotos];
    task.completedAt = Date.now();
    task.updatedAt = Date.now();
    task.history = [...task.history, historyItem];
    await db.saveRectificationTask(task);
    this.activeRectificationTask = { ...task };
    this.rectificationRemark = '';
    this.rectificationPhotos = [];
    this.showToast('整改已提交，等待复检');
    await this.refreshData();
  }

  async reinspectPass() {
    if (!this.activeRectificationTask) return;
    if (!this.reinspectorName.trim()) {
      this.showToast('请填写复检人');
      return;
    }
    const task = this.activeRectificationTask;
    const historyItem: RectificationHistory = {
      id: uid(),
      action: 'reinspect_pass',
      operator: this.reinspectorName,
      remark: this.rectificationRemark || '复检通过',
      timestamp: Date.now(),
      photoDataUrls: [...this.rectificationPhotos]
    };
    task.status = 'reinspected';
    task.reinspector = this.reinspectorName;
    task.reinspectedAt = Date.now();
    task.updatedAt = Date.now();
    task.history = [...task.history, historyItem];
    await db.saveRectificationTask(task);
    this.activeRectificationTask = { ...task };
    this.rectificationRemark = '';
    this.rectificationPhotos = [];
    this.reinspectorName = '';
    this.showToast('复检通过，整改闭环完成');
    await this.refreshData();
  }

  async reinspectReject() {
    if (!this.activeRectificationTask) return;
    if (!this.reinspectorName.trim()) {
      this.showToast('请填写复检人');
      return;
    }
    if (this.rectificationRemark.trim() === '') {
      this.showToast('请填写退回原因');
      return;
    }
    const task = this.activeRectificationTask;
    const historyItem: RectificationHistory = {
      id: uid(),
      action: 'reinspect_reject',
      operator: this.reinspectorName,
      remark: this.rectificationRemark,
      timestamp: Date.now(),
      photoDataUrls: [...this.rectificationPhotos]
    };
    task.status = 'rejected';
    task.reinspector = this.reinspectorName;
    task.updatedAt = Date.now();
    task.history = [...task.history, historyItem];
    await db.saveRectificationTask(task);
    this.activeRectificationTask = { ...task };
    this.rectificationRemark = '';
    this.rectificationPhotos = [];
    this.reinspectorName = '';
    this.showToast('已退回，需重新整改');
    await this.refreshData();
  }

  async resubmitRectification() {
    if (!this.activeRectificationTask) return;
    if (this.rectificationRemark.trim() === '' && this.rectificationPhotos.length === 0) {
      this.showToast('请填写整改说明或上传整改照片');
      return;
    }
    const task = this.activeRectificationTask;
    const historyItem: RectificationHistory = {
      id: uid(),
      action: 'complete',
      operator: task.responsiblePerson,
      remark: this.rectificationRemark,
      timestamp: Date.now(),
      photoDataUrls: [...this.rectificationPhotos]
    };
    task.status = 'completed';
    task.rectificationDescription = this.rectificationRemark;
    task.rectificationPhotos = [...this.rectificationPhotos];
    task.completedAt = Date.now();
    task.updatedAt = Date.now();
    task.history = [...task.history, historyItem];
    await db.saveRectificationTask(task);
    this.activeRectificationTask = { ...task };
    this.rectificationRemark = '';
    this.rectificationPhotos = [];
    this.showToast('重新提交整改，等待复检');
    await this.refreshData();
  }

  getHistoryActionLabel(action: string): string {
    const labels: Record<string, string> = {
      'submit': '任务创建',
      'complete': '整改完成',
      'reinspect_pass': '复检通过',
      'reinspect_reject': '复检退回',
      'reject': '退回整改'
    };
    return labels[action] || action;
  }

  renderRectificationView() {
    const filtered = this.getFilteredRectificationTasks();
    const tabs: { key: RectificationStatus | 'all' | 'overdue'; label: string }[] = [
      { key: 'all', label: '全部' },
      { key: 'pending', label: '待整改' },
      { key: 'overdue', label: '已逾期' },
      { key: 'completed', label: '待复检' },
      { key: 'rejected', label: '已退回' },
      { key: 'reinspected', label: '已完成' }
    ];

    return html`
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">整改任务</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span style="font-size: 13px; color: var(--color-text-muted);">
              共 ${this.rectificationTasks.length} 条任务
            </span>
          </div>
        </div>

        <div class="filter-bar">
          <div style="font-weight: 600; font-size: 13px;">按模板筛选：</div>
          <select
            .value=${this.rectificationFilterTemplate || ''}
            @change=${(e: Event) => { this.rectificationFilterTemplate = (e.target as HTMLSelectElement).value || null; }}
          >
            <option value="">全部模板</option>
            ${this.templates.map(t => html`<option value="${t.id}">${t.name}</option>`)}
          </select>
        </div>

        <div class="rect-tabs">
          ${tabs.map(tab => html`
            <button
              class="rect-tab ${this.rectificationTab === tab.key ? 'active' : ''}"
              @click=${() => { this.rectificationTab = tab.key; }}
            >
              ${tab.label}
              ${tab.key !== 'all' ? html`<span class="count">${this.getRectTaskCount(tab.key as any)}</span>` : ''}
            </button>
          `)}
        </div>

        ${filtered.length === 0
          ? html`<div class="empty">暂无整改任务</div>`
          : html`
            ${repeat(filtered, t => t.id, task => {
              const overdue = this.isTaskOverdue(task);
              return html`
                <div
                  class="rect-task-item ${classMap({ overdue })}"
                  @click=${() => this.viewRectificationTask(task.id)}
                >
                  <div class="rect-task-head">
                    <div>
                      <h4>${task.itemSnapshot.name}</h4>
                      <div class="rect-task-meta">
                        <span>来源模板：${task.templateSnapshot.name} v${task.templateSnapshot.version || 0}</span>
                        <span>创建时间：${formatDateTime(task.createdAt)}</span>
                      </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                      ${task.anomalyLevel !== 'none'
                        ? html`<span class="${anomalyLevelBadgeClasses[task.anomalyLevel]}">
                            ${anomalyLevelLabels[task.anomalyLevel]}
                          </span>`
                        : ''}
                      <span class="${rectificationStatusBadgeClasses[task.status]}">
                        ${rectificationStatusLabels[task.status]}
                      </span>
                    </div>
                  </div>
                  <div class="rect-task-meta">
                    ${task.responsiblePerson
                      ? html`<span>责任人：<strong>${task.responsiblePerson}</strong></span>`
                      : html`<span style="color: #dc2626;">未指定责任人</span>`}
                    ${task.rectificationDeadline
                      ? html`<span class="${overdue ? 'overdue-text' : ''}">
                          整改期限：${formatDateTime(task.rectificationDeadline)}
                          ${overdue ? '（已逾期）' : ''}
                        </span>`
                      : html`<span>整改期限：不限</span>`}
                  </div>
                </div>
              `;
            })}
          `}
      </div>
    `;
  }

  renderRectificationDetailView() {
    const task = this.activeRectificationTask;
    if (!task) return '';
    const overdue = this.isTaskOverdue(task);
    const canEdit = task.status === 'pending' || task.status === 'rejected';
    const canReinspect = task.status === 'completed';

    return html`
      <div class="card">
        <button class="back-link" @click=${() => { this.goTo('rectification'); }}>← 返回整改列表</button>
        <div class="card-header" style="margin-top: 10px;">
          <h3 class="card-title">${task.itemSnapshot.name}</h3>
          <span class="${rectificationStatusBadgeClasses[task.status]}">
            ${rectificationStatusLabels[task.status]}
          </span>
        </div>

        <div class="summary-bar">
          <div><strong>模板：</strong>${task.templateSnapshot.name} v${task.templateSnapshot.version || 0}</div>
          <div><strong>异常等级：</strong>
            <span class="${anomalyLevelBadgeClasses[task.anomalyLevel]}">
              ${anomalyLevelLabels[task.anomalyLevel]}
            </span>
          </div>
          <div><strong>创建时间：</strong>${formatDateTime(task.createdAt)}</div>
          <div class="${overdue ? 'deadline-warning' : 'deadline-ok'}">
            <strong>整改期限：</strong>${task.rectificationDeadline ? formatDateTime(task.rectificationDeadline) : '不限'}
            ${overdue ? '（已逾期）' : ''}
          </div>
        </div>

        <h4 class="section-title">检查项信息</h4>
        <div class="detail-row">
          <span>检查项名称</span>
          <span><strong>${task.itemSnapshot.name}</strong></span>
        </div>
        ${task.itemSnapshot.description
          ? html`<div class="detail-row"><span>检查项说明</span><span>${task.itemSnapshot.description}</span></div>`
          : ''}
        <div class="detail-row">
          <span>巡检时备注</span>
          <span>${task.answerSnapshot.note || '-'}</span>
        </div>
        ${task.answerSnapshot.photoDataUrls.length > 0
          ? html`
            <div class="detail-row">
              <span>巡检照片 (${task.answerSnapshot.photoDataUrls.length})</span>
              <div class="photo-grid">
                ${task.answerSnapshot.photoDataUrls.map(url => html`<img src="${url}" />`)}
              </div>
            </div>
          `
          : ''}

        ${task.status === 'pending' || task.status === 'rejected'
          ? html`
            <h4 class="section-title">整改信息</h4>
            <div class="field" style="max-width: 300px;">
              <label>责任人 ${task.status === 'pending' ? '*' : ''}</label>
              <input
                type="text"
                .value=${this.responsiblePerson}
                @input=${(e: Event) => this.updateResponsiblePerson((e.target as HTMLInputElement).value)}
                placeholder="请输入责任人姓名"
              />
            </div>
            <div class="field">
              <label>整改说明 *</label>
              <textarea
                rows="3"
                .value=${this.rectificationRemark}
                @input=${(e: Event) => { this.rectificationRemark = (e.target as HTMLTextAreaElement).value; }}
                placeholder="请详细描述整改措施和结果"
              ></textarea>
            </div>
            <div class="field">
              <label>整改照片</label>
              <input
                type="file"
                accept="image/*"
                multiple
                @change=${(e: Event) => this.handleRectificationPhotoUpload((e.target as HTMLInputElement).files)}
              />
              ${this.rectificationPhotos.length > 0
                ? html`
                  <div class="photo-grid" style="margin-top: 8px;">
                    ${this.rectificationPhotos.map((url, idx) => html`
                      <div style="position: relative; display: inline-block;">
                        <img src="${url}" class="photo-preview" />
                        <button
                          class="btn btn-sm btn-danger"
                          style="position: absolute; top: 2px; right: 2px; padding: 0 6px; font-size: 12px;"
                          @click=${() => this.removeRectificationPhoto(idx)}
                        >×</button>
                      </div>
                    `)}
                  </div>
                `
                : ''}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
              ${task.status === 'pending'
                ? html`<button class="btn" @click=${() => this.saveRectification()}>💾 保存责任人</button>`
                : ''}
              <button class="btn btn-success" @click=${() => {
                if (task.status === 'rejected') {
                  this.resubmitRectification();
                } else {
                  this.submitRectificationComplete();
                }
              }}>
                ✅ 提交整改
              </button>
            </div>
          `
          : ''}

        ${canReinspect
          ? html`
            <h4 class="section-title">复检</h4>
            <div class="field" style="max-width: 300px;">
              <label>复检人 *</label>
              <input
                type="text"
                .value=${this.reinspectorName}
                @input=${(e: Event) => { this.reinspectorName = (e.target as HTMLInputElement).value; }}
                placeholder="请输入复检人姓名"
              />
            </div>
            <div class="field">
              <label>复检意见</label>
              <textarea
                rows="3"
                .value=${this.rectificationRemark}
                @input=${(e: Event) => { this.rectificationRemark = (e.target as HTMLTextAreaElement).value; }}
                placeholder="请填写复检意见（退回时必填）"
              ></textarea>
            </div>
            <div class="field">
              <label>复检照片</label>
              <input
                type="file"
                accept="image/*"
                multiple
                @change=${(e: Event) => this.handleRectificationPhotoUpload((e.target as HTMLInputElement).files)}
              />
              ${this.rectificationPhotos.length > 0
                ? html`
                  <div class="photo-grid" style="margin-top: 8px;">
                    ${this.rectificationPhotos.map((url, idx) => html`
                      <div style="position: relative; display: inline-block;">
                        <img src="${url}" class="photo-preview" />
                        <button
                          class="btn btn-sm btn-danger"
                          style="position: absolute; top: 2px; right: 2px; padding: 0 6px; font-size: 12px;"
                          @click=${() => this.removeRectificationPhoto(idx)}
                        >×</button>
                      </div>
                    `)}
                  </div>
                `
                : ''}
            </div>
            <div style="display: flex; gap: 10px; margin-top: 16px; flex-wrap: wrap;">
              <button class="btn btn-success" @click=${() => this.reinspectPass()}>
                ✅ 复检通过
              </button>
              <button class="btn btn-danger" @click=${() => this.reinspectReject()}>
                ❌ 退回整改
              </button>
            </div>
          `
          : ''}

        ${task.status === 'reinspected' || task.status === 'completed' || task.rectificationPhotos.length > 0
          ? html`
            <h4 class="section-title">整改结果</h4>
            <div class="detail-row">
              <span>责任人</span>
              <span>${task.responsiblePerson || '-'}</span>
            </div>
            <div class="detail-row">
              <span>整改说明</span>
              <span>${task.rectificationDescription || '-'}</span>
            </div>
            ${task.rectificationPhotos.length > 0
              ? html`
                <div class="detail-row">
                  <span>整改照片 (${task.rectificationPhotos.length})</span>
                  <div class="photo-grid">
                    ${task.rectificationPhotos.map(url => html`<img src="${url}" />`)}
                  </div>
                </div>
              `
              : ''}
            ${task.completedAt
              ? html`<div class="detail-row"><span>整改完成时间</span><span>${formatDateTime(task.completedAt)}</span></div>`
              : ''}
            ${task.reinspectedAt
              ? html`
                <div class="detail-row"><span>复检人</span><span>${task.reinspector}</span></div>
                <div class="detail-row"><span>复检时间</span><span>${formatDateTime(task.reinspectedAt)}</span></div>
              `
              : ''}
          `
          : ''}

        <h4 class="section-title">处理历史</h4>
        <div class="history-timeline">
          ${repeat([...task.history].reverse(), h => h.id, history => html`
            <div class="history-item">
              <div class="history-action">${this.getHistoryActionLabel(history.action)}</div>
              <div class="history-meta">
                操作人：${history.operator || '-'} · ${formatDateTime(history.timestamp)}
              </div>
              ${history.remark ? html`<div class="history-remark">${history.remark}</div>` : ''}
              ${history.photoDataUrls.length > 0
                ? html`
                  <div class="history-photos photo-grid">
                    ${history.photoDataUrls.map(url => html`<img src="${url}" />`)}
                  </div>
                `
                : ''}
            </div>
          `)}
        </div>
      </div>
    `;
  }

  renderAnomalyBadges(counts: Record<AnomalyLevel, number>) {
    const levels: AnomalyLevel[] = ['low', 'medium', 'high', 'critical'];
    const levelsWithCount = levels.filter(l => counts[l] > 0);
    return html`
      ${levelsWithCount.map(level => html`
        <span class="${anomalyLevelBadgeClasses[level]}">
          ${anomalyLevelLabels[level]} ${counts[level]}
        </span>
      `)}
      ${totalAnomalies(counts) === 0 ? html`<span class="badge badge-ok">正常</span>` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'inspection-app': InspectionApp;
  }
}
