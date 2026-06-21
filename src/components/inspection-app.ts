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
  isTemplateNameDuplicate
} from '../db';
import type {
  InspectionTemplate,
  InspectionItem,
  InspectionRecord,
  InspectionItemAnswer,
  AnomalyLevel,
  ViewName
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
    const [templates, records] = await Promise.all([
      db.getAllTemplates(),
      db.getAllRecords()
    ]);
    this.templates = templates;
    this.records = records;
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
    this.showToast('巡检记录已提交');
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
    if (!confirm('确认删除此记录？')) return;
    await db.deleteRecord(id);
    this.showToast('记录已删除');
    this.activeRecord = null;
    this.activeRecordId = null;
    await this.refreshData();
  }

  exportRecordJSON(record: InspectionRecord) {
    const anomalyItems = record.answers.filter(a => a.anomalyLevel !== 'none');
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
    this.showToast('JSON 已导出');
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
        </div>
      </div>
      <div class="app-main">
        ${this.view === 'templates' ? this.renderTemplatesView() : ''}
        ${this.view === 'template-editor' ? this.renderTemplateEditor() : ''}
        ${this.view === 'inspection' ? this.renderInspectionView() : ''}
        ${this.view === 'records' ? this.renderRecordsView() : ''}
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

  renderRecordDetail() {
    const r = this.activeRecord!;
    return html`
      <div class="card">
        <button class="back-link" @click=${() => { this.activeRecord = null; this.activeRecordId = null; }}>← 返回记录列表</button>
        <div class="card-header" style="margin-top: 10px;">
          <h3 class="card-title">${r.templateSnapshot.name} <span style="font-size: 14px; font-weight: 400; color: var(--color-text-muted);">v${r.templateSnapshot.version || 0}</span></h3>
          <div style="display: flex; gap: 8px;">
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

        <h4 style="margin: 20px 0 12px; font-size: 15px;">检查项详情</h4>

        ${repeat(r.answers, a => a.itemId, answer => {
          const item = answer.itemSnapshot;
          return html`
            <div class="answer-item">
              <div class="answer-header">
                <div>
                  <h4>${item.name}${item.required ? html`<span class="required-tag"> (必填)</span>` : ''}</h4>
                  ${item.description ? html`<div class="answer-meta">${item.description}</div>` : ''}
                </div>
                <div style="display: flex; gap: 8px; align-items: center;">
                  ${answer.anomalyLevel !== 'none'
                    ? html`<span class="${anomalyLevelBadgeClasses[answer.anomalyLevel]}">
                        ${anomalyLevelLabels[answer.anomalyLevel]}
                      </span>`
                    : ''}
                  <span style="font-weight: 600;">
                    ${answer.result === 'pass' ? '✅ 通过' : answer.result === 'fail' ? '❌ 不通过' : '⚪ N/A'}
                  </span>
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
            </div>
          `;
        })}
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
