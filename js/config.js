'use strict';

// =========================================================================
// 1. SUPABASE CONFIGURATION & DEVICE STORAGE KEY
// =========================================================================
const SUPABASE_URL = 'https://jhezhynenhxgnramrhby.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_ztuD1ceo8ME7VSKcYSaYKg_X9A5lHpE';
const DEVICE_AUTH_STORAGE_KEY = 'er_task_log_device_user_v1';

let sb = null;
try {
  if (window.supabase && typeof window.supabase.createClient === 'function') {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
} catch (initErr) {
  console.error('Supabase initialization error:', initErr);
  sb = null;
}

// =========================================================================
// 2. APPLICATION STATE
// =========================================================================
let verifiedLoginCandidate = null;
let currentUser = null;
let currentMode = null; // 'staff' | 'admin' | 'super_admin'
let staffClockTimer = null;

// แคชรายชื่อผู้ใช้งานทั้งหมดสำหรับแปลง UUID -> ชื่อ
let allStaffList = [];
let allStaffMap = {};

// ข้อมูลที่รอยืนยันกรณีตรวจพบงานซ้ำซ้อน
let pendingWorkLogData = null;

// ข้อมูลผลลัพธ์ล่าสุดในหน้า Admin Dashboard สำหรับ Export Excel และการแก้ไข/ลบ
let lastAdminLogs = [];
let lastAdminMeta = null;

// สถานะการยืนยันลบข้อมูลสำหรับทุกตาราง
let pendingDeleteAction = null;

// =========================================================================
// 3. DOM REFERENCES
// =========================================================================
const toastContainer = document.getElementById('toast-container');
const globalLoader = document.getElementById('global-loader');
const globalLoaderText = document.getElementById('global-loader-text');

// Login
const loginView = document.getElementById('login-view');
const loginForm = document.getElementById('login-form');
const accessCodeInput = document.getElementById('access-code-input');
const loginVerifyBox = document.getElementById('login-verify-box');
const loginSubmitBtn = document.getElementById('login-submit-btn');

// App Shell & Header
const appView = document.getElementById('app-view');
const headerAvatar = document.getElementById('header-avatar');
const headerUserName = document.getElementById('header-user-name');
const headerRoleBadge = document.getElementById('header-role-badge');
const logoutBtn = document.getElementById('logout-btn');
const modeSwitcherBar = document.getElementById('mode-switcher-bar');
const modeSwitcherButtons = document.getElementById('mode-switcher-buttons');

// Mode Containers
const modeStaffEl = document.getElementById('mode-staff');
const modeAdminEl = document.getElementById('mode-admin');
const modeSuperAdminEl = document.getElementById('mode-super-admin');

// Staff Mode Elements
const staffTabBtnForm = document.getElementById('staff-tab-btn-form');
const staffTabBtnHistory = document.getElementById('staff-tab-btn-history');
const staffPanelForm = document.getElementById('staff-panel-form');
const staffPanelHistory = document.getElementById('staff-panel-history');
const liveDateDisplay = document.getElementById('live-date-display');
const liveTimeDisplay = document.getElementById('live-time-display');
const workLogForm = document.getElementById('work-log-form');
const hnInput = document.getElementById('hn-input');
const hnError = document.getElementById('hn-error');
const taskCheckboxesContainer = document.getElementById('task-checkboxes-container');
const customTaskCheckbox = document.getElementById('custom-task-checkbox');
const customTaskLabel = document.getElementById('custom-task-label');
const customTaskInputWrap = document.getElementById('custom-task-input-wrap');
const customTaskInput = document.getElementById('custom-task-input');
const taskError = document.getElementById('task-error');
const requesterSelect = document.getElementById('requester-select');
const requesterRequiredStar = document.getElementById('requester-required-star');
const requesterOptionalBadge = document.getElementById('requester-optional-badge');
const requesterError = document.getElementById('requester-error');
const submitWorkLogBtn = document.getElementById('submit-work-log-btn');
const myHistoryDate = document.getElementById('my-history-date');
const refreshMyHistoryBtn = document.getElementById('refresh-my-history-btn');
const myHistoryCount = document.getElementById('my-history-count');
const myHistoryList = document.getElementById('my-history-list');

// Duplicate Modal
const duplicateModal = document.getElementById('duplicate-modal');
const duplicateModalBody = document.getElementById('duplicate-modal-body');
const duplicateCancelBtn = document.getElementById('duplicate-cancel-btn');
const duplicateConfirmBtn = document.getElementById('duplicate-confirm-btn');

// Admin Mode Elements
const adminFilterForm = document.getElementById('admin-filter-form');
const adminFilterStartDate = document.getElementById('admin-filter-start-date');
const adminFilterEndDate = document.getElementById('admin-filter-end-date');
const adminFilterShift = document.getElementById('admin-filter-shift');
const adminStaffMultiselectWrap = document.getElementById('admin-staff-multiselect-wrap');
const adminStaffDropdownBtn = document.getElementById('admin-staff-dropdown-btn');
const adminStaffDropdownLabel = document.getElementById('admin-staff-dropdown-label');
const adminStaffDropdownMenu = document.getElementById('admin-staff-dropdown-menu');
const adminStaffSelectAllBtn = document.getElementById('admin-staff-select-all-btn');
const adminStaffClearSelBtn = document.getElementById('admin-staff-clear-sel-btn');
const adminStaffCheckboxList = document.getElementById('admin-staff-checkbox-list');
const adminClearBtn = document.getElementById('admin-clear-btn');
const adminShiftHint = document.getElementById('admin-shift-hint');
const adminAddWorklogBtn = document.getElementById('admin-add-worklog-btn');
const adminEmptyState = document.getElementById('admin-empty-state');
const adminResultsArea = document.getElementById('admin-results-area');
const adminStatTotal = document.getElementById('admin-stat-total');
const adminStatHn = document.getElementById('admin-stat-hn');
const adminStatRange = document.getElementById('admin-stat-range');
const adminStatStaff = document.getElementById('admin-stat-staff');
const adminTableBadge = document.getElementById('admin-table-badge');
const adminExportBtn = document.getElementById('admin-export-btn');
const adminNoRows = document.getElementById('admin-no-rows');
const adminTableWrap = document.getElementById('admin-table-wrap');
const adminTableActionsTh = document.getElementById('admin-table-actions-th');
const adminTableBody = document.getElementById('admin-table-body');

// Work Log Editor Modal (Super Admin Add/Edit)
const worklogEditorModal = document.getElementById('worklog-editor-modal');
const worklogModalTitle = document.getElementById('worklog-modal-title');
const worklogModalSubtitle = document.getElementById('worklog-modal-subtitle');
const worklogModalCloseX = document.getElementById('worklog-modal-close-x');
const worklogModalCancelBtn = document.getElementById('worklog-modal-cancel-btn');
const worklogEditorForm = document.getElementById('worklog-editor-form');
const editWorklogId = document.getElementById('edit-worklog-id');
const editWorklogDatetime = document.getElementById('edit-worklog-datetime');
const editWorklogHn = document.getElementById('edit-worklog-hn');
const editWorklogTasksContainer = document.getElementById('edit-worklog-tasks-container');
const editWorklogRequester = document.getElementById('edit-worklog-requester');
const editWorklogStaff = document.getElementById('edit-worklog-staff');

// Confirm Delete Modal
const confirmDeleteModal = document.getElementById('confirm-delete-modal');
const confirmDeleteTitle = document.getElementById('confirm-delete-title');
const confirmDeleteBody = document.getElementById('confirm-delete-body');
const confirmDeleteCancelBtn = document.getElementById('confirm-delete-cancel-btn');
const confirmDeleteOkBtn = document.getElementById('confirm-delete-ok-btn');

// Super Admin Elements
const saTabBtns = document.querySelectorAll('.sa-tab-btn');
const saPanelStaff = document.getElementById('sa-panel-staff');
const saPanelRequesters = document.getElementById('sa-panel-requesters');
const saPanelTasks = document.getElementById('sa-panel-tasks');
const saOpenAddStaffBtn = document.getElementById('sa-open-add-staff-btn');
const saStaffTbody = document.getElementById('sa-staff-tbody');
const saAddRequesterForm = document.getElementById('sa-add-requester-form');
const saNewRequesterInput = document.getElementById('sa-new-requester-input');
const saRequestersList = document.getElementById('sa-requesters-list');
const saAddTaskForm = document.getElementById('sa-add-task-form');
const saNewTaskInput = document.getElementById('sa-new-task-input');
const saTasksList = document.getElementById('sa-tasks-list');

// Staff Editor Modal
const staffEditorModal = document.getElementById('staff-editor-modal');
const staffModalTitle = document.getElementById('staff-modal-title');
const staffModalCloseX = document.getElementById('staff-modal-close-x');
const staffModalCancelBtn = document.getElementById('staff-modal-cancel-btn');
const staffEditorForm = document.getElementById('staff-editor-form');
const editStaffId = document.getElementById('edit-staff-id');
const editStaffName = document.getElementById('edit-staff-name');
const editStaffCode = document.getElementById('edit-staff-code');
const generateCodeBtn = document.getElementById('generate-code-btn');
const editStaffRole = document.getElementById('edit-staff-role');
const selfRoleGuardNote = document.getElementById('self-role-guard-note');
const editStaffOperator = document.getElementById('edit-staff-operator');

// Rename Master Modal (Tasks & Requesters)
const renameTaskModal = document.getElementById('rename-task-modal');
const renameModalTitle = document.getElementById('rename-modal-title');
const renameModalLabel = document.getElementById('rename-modal-label');
const renameTargetTable = document.getElementById('rename-target-table');
const renameTaskForm = document.getElementById('rename-task-form');
const renameTaskId = document.getElementById('rename-task-id');
const renameTaskInput = document.getElementById('rename-task-input');
const renameTaskCancelBtn = document.getElementById('rename-task-cancel-btn');

// =========================================================================
// 4. UTILITY HELPERS (TIMEZONE BANGKOK +07:00, TOAST, LOADER, CLIPBOARD)
// =========================================================================
function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatRequesterDisplay(name) {
  if (!name || String(name).trim() === '' || String(name).trim() === '-') {
    return '-';
  }
  return `คุณ${String(name).trim()}`;
}

function showLoader(text = 'กำลังโหลดข้อมูล...') {
  globalLoaderText.textContent = text;
  globalLoader.classList.remove('hidden');
}

function hideLoader() {
  globalLoader.classList.add('hidden');
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const styles = {
    success: 'bg-teal-700 text-white border-teal-600',
    error: 'bg-rose-600 text-white border-rose-500',
    info: 'bg-slate-800 text-white border-slate-700',
  };
  const iconSvg =
    type === 'success'
      ? `<svg class="w-5 h-5 shrink-0 text-teal-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
      : type === 'error'
      ? `<svg class="w-5 h-5 shrink-0 text-rose-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
      : `<svg class="w-5 h-5 shrink-0 text-sky-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

  toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium animate-fade-in ${styles[type] || styles.info}`;
  toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-6px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

function copyTextToClipboard(text) {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    if (ok) {
      showToast(`คัดลอกรหัส ${text} เรียบร้อยแล้ว`, 'success');
    } else {
      showToast('ไม่สามารถคัดลอกรหัสได้ กรุณาคัดลอกด้วยตนเอง', 'error');
    }
  } catch (err) {
    showToast('ไม่สามารถคัดลอกรหัสได้', 'error');
  }
}

function getTodayBangkok() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * แปลง ISO Timestamp เป็นค่าสำหรับ input type="datetime-local" ตามเวลาไทย (YYYY-MM-DDTHH:mm)
 */
function toBangkokDatetimeLocalValue(isoStr) {
  const d = isoStr ? new Date(isoStr) : new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
}

function addDaysToDateStr(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatThaiDateShort(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
}

function formatBangkokTimeHHMM(isoStr) {
  return new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(isoStr));
}

function formatBangkokDateTime(isoStr) {
  const d = new Date(isoStr);
  const datePart = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const timePart = formatBangkokTimeHHMM(isoStr);
  return `${datePart} ${timePart}`;
}

function getShiftRangeIso(startDateStr, endDateStr, shiftKey) {
  const isSameDay = startDateStr === endDateStr;
  const dateDisplay = isSameDay
    ? formatThaiDateShort(startDateStr)
    : `${formatThaiDateShort(startDateStr)} - ${formatThaiDateShort(endDateStr)}`;
  const nextEndDayStr = addDaysToDateStr(endDateStr, 1);

  if (shiftKey === 'morning') {
    return {
      startIso: `${startDateStr}T07:00:00+07:00`,
      endIso: `${endDateStr}T14:59:59+07:00`,
      label: `เวรเช้า (${dateDisplay} • 07:00 - 15:00 น.)`,
    };
  }
  if (shiftKey === 'afternoon') {
    return {
      startIso: `${startDateStr}T15:00:00+07:00`,
      endIso: `${endDateStr}T22:59:59+07:00`,
      label: `เวรบ่าย (${dateDisplay} • 15:00 - 23:00 น.)`,
    };
  }
  if (shiftKey === 'night') {
    return {
      startIso: `${startDateStr}T23:00:00+07:00`,
      endIso: `${nextEndDayStr}T06:59:59+07:00`,
      label: `เวรดึก (${formatThaiDateShort(startDateStr)} 23:00 - ${formatThaiDateShort(nextEndDayStr)} 07:00 น.)`,
    };
  }
  return {
    startIso: `${startDateStr}T00:00:00+07:00`,
    endIso: `${endDateStr}T23:59:59+07:00`,
    label: `ทั้งหมด (${dateDisplay} • 00:00 - 23:59 น.)`,
  };
}

function isTimestampInShift(isoStr, shiftKey) {
  if (shiftKey === 'all') return true;
  const hourStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(isoStr));
  const hour = Number(hourStr);

  if (shiftKey === 'morning') return hour >= 7 && hour < 15;
  if (shiftKey === 'afternoon') return hour >= 15 && hour < 23;
  if (shiftKey === 'night') return hour >= 23 || hour < 7;
  return true;
}

function getRoleBadgeMeta(role) {
  if (role === 'super_admin') {
    return { label: 'Super Admin', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
  }
  if (role === 'admin') {
    return { label: 'Admin', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
  }
  return { label: 'Staff', cls: 'bg-teal-50 text-teal-700 border-teal-200' };
}

function generateRandomAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getStaffName(id) {
  return allStaffMap[id]?.full_name || 'ไม่ทราบชื่อ';
}

function isSuperAdmin() {
  return currentUser && currentUser.role === 'super_admin';
}

function openConfirmDeleteModal({ title, bodyHtml, onConfirm }) {
  confirmDeleteTitle.textContent = title || 'ยืนยันการลบข้อมูล';
  confirmDeleteBody.innerHTML = bodyHtml;
  pendingDeleteAction = onConfirm;
  confirmDeleteModal.classList.remove('hidden');
}

// =========================================================================
// 5. SHARED MASTER DATA FETCHER
// =========================================================================
async function refreshAllStaffCache() {
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from('staff')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    allStaffList = data || [];
    allStaffMap = {};
    allStaffList.forEach((s) => {
      allStaffMap[s.id] = s;
    });
    if (typeof populateAdminStaffFilter === 'function') {
      populateAdminStaffFilter();
    }
  } catch (err) {
    console.error('Error fetching staff cache:', err);
  }
}
