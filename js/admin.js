'use strict';

// =========================================================================
// MODE 2: ADMIN DASHBOARD + SUPER ADMIN CRUD ON WORK_LOGS
// =========================================================================
function getSelectedAdminStaffIds() {
  return Array.from(
    adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]:checked')
  ).map((cb) => cb.value);
}

function updateAdminStaffDropdownLabel() {
  const allCbs = adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]');
  const checked = getSelectedAdminStaffIds();

  if (checked.length === 0 || (allCbs.length > 0 && checked.length === allCbs.length)) {
    adminStaffDropdownLabel.textContent = 'ทั้งหมด';
  } else if (checked.length === 1) {
    adminStaffDropdownLabel.textContent = `คุณ${getStaffName(checked[0])}`;
  } else {
    adminStaffDropdownLabel.textContent = `เลือกแล้ว ${checked.length} คน`;
  }
}

function populateAdminStaffFilter() {
  const prevSelected = new Set(getSelectedAdminStaffIds());
  const operators = allStaffList.filter((s) => s.is_operator === true);

  if (operators.length === 0) {
    adminStaffCheckboxList.innerHTML = `<p class="p-3 text-xs text-slate-400 text-center">ไม่พบรายชื่อผู้ปฏิบัติงาน</p>`;
    updateAdminStaffDropdownLabel();
    return;
  }

  adminStaffCheckboxList.innerHTML = operators
    .map((s) => {
      const isChecked = prevSelected.has(s.id) ? 'checked' : '';
      return `
        <label class="flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-teal-50/70 cursor-pointer select-none transition-colors">
          <input
            type="checkbox"
            name="admin_staff_opt"
            value="${s.id}"
            ${isChecked}
            class="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
          />
          <span class="text-xs sm:text-sm font-medium text-slate-700 truncate">
            คุณ${escapeHTML(s.full_name)}${s.is_active ? '' : ' <span class="text-[11px] text-rose-500">(ปิดใช้งาน)</span>'}
          </span>
        </label>
      `;
    })
    .join('');

  adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]').forEach((cb) => {
    cb.addEventListener('change', updateAdminStaffDropdownLabel);
  });

  updateAdminStaffDropdownLabel();
}

function updateAdminShiftHint() {
  const startD = adminFilterStartDate.value;
  const endD = adminFilterEndDate.value;
  if (!startD || !endD) {
    adminShiftHint.textContent = 'ช่วงเวลา: กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด';
    return;
  }
  if (startD > endD) {
    adminShiftHint.textContent = 'ช่วงเวลา: วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด';
    return;
  }
  const range = getShiftRangeIso(startD, endD, adminFilterShift.value);
  adminShiftHint.textContent = range.label;
}

function resetAdminDashboard(showMsg = true) {
  const today = getTodayBangkok();
  adminFilterStartDate.value = today;
  adminFilterEndDate.value = today;
  adminFilterShift.value = 'all';

  adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]').forEach((cb) => {
    cb.checked = false;
  });
  updateAdminStaffDropdownLabel();
  adminStaffDropdownMenu.classList.add('hidden');
  updateAdminShiftHint();

  lastAdminLogs = [];
  lastAdminMeta = null;
  adminExportBtn.disabled = true;

  adminResultsArea.classList.add('hidden');
  adminEmptyState.classList.remove('hidden');

  if (showMsg) {
    showToast('ล้างข้อมูลการค้นหาเรียบร้อยแล้ว', 'info');
  }
}

async function handleAdminSearch(e) {
  if (e) e.preventDefault();
  adminStaffDropdownMenu.classList.add('hidden');

  const startDateStr = adminFilterStartDate.value;
  const endDateStr = adminFilterEndDate.value;
  const shiftKey = adminFilterShift.value;

  if (!startDateStr || !endDateStr) {
    showToast('กรุณาเลือกวันที่เริ่มต้นและวันที่สิ้นสุด', 'error');
    return;
  }
  if (startDateStr > endDateStr) {
    showToast('วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด', 'error');
    return;
  }

  const range = getShiftRangeIso(startDateStr, endDateStr, shiftKey);
  showLoader('กำลังค้นหาข้อมูลจากฐานข้อมูล...');

  try {
    await refreshAllStaffCache();

    const allOperatorCbs = adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]');
    const selectedStaffIds = getSelectedAdminStaffIds();
    const isAllOperators =
      selectedStaffIds.length === 0 ||
      (allOperatorCbs.length > 0 && selectedStaffIds.length === allOperatorCbs.length);

    let query = sb
      .from('work_logs')
      .select('*')
      .gte('created_at', range.startIso)
      .lte('created_at', range.endIso)
      .order('created_at', { ascending: true });

    if (!isAllOperators) {
      query = query.in('primary_staff_id', selectedStaffIds);
    }

    const { data, error } = await query;
    hideLoader();

    if (error) throw error;

    const logs = (data || []).filter((row) => isTimestampInShift(row.created_at, shiftKey));
    const staffLabel = isAllOperators
      ? 'ผู้ปฏิบัติงานทั้งหมด'
      : selectedStaffIds.map((id) => `คุณ${getStaffName(id)}`).join(', ');

    lastAdminLogs = logs;
    lastAdminMeta = {
      startDateStr,
      endDateStr,
      shiftKey,
      rangeLabel: range.label,
      selectedStaffIds: isAllOperators ? [] : selectedStaffIds,
      staffLabel,
    };

    renderAdminResults(logs, lastAdminMeta);
  } catch (err) {
    hideLoader();
    console.error('Admin search error:', err);
    showToast('เกิดข้อผิดพลาดในการค้นหาข้อมูล', 'error');
  }
}

function renderAdminResults(logs, meta) {
  adminEmptyState.classList.add('hidden');
  adminResultsArea.classList.remove('hidden');

  const canManageLogs = isSuperAdmin();
  adminTableActionsTh.classList.toggle('hidden', !canManageLogs);

  const selectedSet = new Set(meta.selectedStaffIds || []);
  const hasStaffFilter = selectedSet.size > 0;

  const uniqueHns = new Set(logs.map((l) => l.hn.trim().toLowerCase()));
  adminStatTotal.textContent = logs.length.toLocaleString('th-TH');
  adminStatHn.textContent = uniqueHns.size.toLocaleString('th-TH');
  adminStatRange.textContent = meta.rangeLabel;
  adminStatStaff.textContent = `ผู้ปฏิบัติงาน: ${meta.staffLabel}`;
  adminTableBadge.textContent = `${logs.length} รายการ`;

  if (logs.length === 0) {
    adminExportBtn.disabled = true;
    adminTableWrap.classList.add('hidden');
    adminNoRows.classList.remove('hidden');
    adminTableBody.innerHTML = '';
    return;
  }

  adminExportBtn.disabled = false;
  adminNoRows.classList.add('hidden');
  adminTableWrap.classList.remove('hidden');

  adminTableBody.innerHTML = logs
    .map((log) => {
      const taskHtml = (log.tasks || [])
        .map(
          (t) =>
            `<span class="inline-block px-2 py-0.5 rounded-lg text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200/70 mr-1 mb-1">${escapeHTML(t)}</span>`
        )
        .join('');

      const primaryName = getStaffName(log.primary_staff_id);
      const primaryHtml =
        hasStaffFilter && selectedSet.has(log.primary_staff_id)
          ? `<span class="px-2 py-0.5 rounded-lg text-xs font-semibold bg-teal-100 text-teal-800">คุณ${escapeHTML(primaryName)}</span>`
          : `<span class="font-medium text-slate-800">คุณ${escapeHTML(primaryName)}</span>`;

      const actionCellHtml = canManageLogs
        ? `
          <td class="py-3.5 px-4 text-right whitespace-nowrap">
            <div class="inline-flex items-center gap-1.5">
              <button
                type="button"
                data-edit-log-id="${escapeHTML(log.id)}"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                แก้ไข
              </button>
              <button
                type="button"
                data-delete-log-id="${escapeHTML(log.id)}"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
              >
                ลบ
              </button>
            </div>
          </td>
        `
        : '';

      return `
        <tr class="hover:bg-slate-50/80 transition-colors">
          <td class="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700 tabular-nums">
            ${escapeHTML(formatBangkokDateTime(log.created_at))} น.
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap font-bold text-slate-800 tabular-nums">
            ${escapeHTML(log.hn)}
          </td>
          <td class="py-3.5 px-4 max-w-md"><div class="flex flex-wrap">${taskHtml}</div></td>
          <td class="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-slate-700">
            ${escapeHTML(formatRequesterDisplay(log.requester_name))}
          </td>
          <td class="py-3.5 px-4 whitespace-nowrap text-xs">${primaryHtml}</td>
          ${actionCellHtml}
        </tr>
      `;
    })
    .join('');

  if (canManageLogs) {
    adminTableBody.querySelectorAll('[data-edit-log-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = lastAdminLogs.find((item) => String(item.id) === String(btn.dataset.editLogId));
        if (target) openWorkLogEditorModal(target);
      });
    });

    adminTableBody.querySelectorAll('[data-delete-log-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = lastAdminLogs.find((item) => String(item.id) === String(btn.dataset.deleteLogId));
        if (target) promptDeleteWorkLog(target);
      });
    });
  }
}

// ---------- Super Admin: Add / Edit Work Log ----------
async function openWorkLogEditorModal(log = null) {
  if (!isSuperAdmin()) return;
  const isEdit = Boolean(log);
  showLoader('กำลังโหลดตัวเลือก...');
  try {
    const [tasksRes, reqRes] = await Promise.all([
      sb.from('task_types').select('*').order('id', { ascending: true }),
      sb.from('requesters').select('*').order('name', { ascending: true }),
    ]);
    hideLoader();

    if (tasksRes.error) throw tasksRes.error;
    if (reqRes.error) throw reqRes.error;

    worklogModalTitle.textContent = isEdit ? 'แก้ไขรายการบันทึกงาน' : 'เพิ่มรายการบันทึกงานใหม่';
    worklogModalSubtitle.textContent = isEdit
      ? `รหัสรายการ #${log.id} • บันทึกเมื่อ ${formatBangkokDateTime(log.created_at)} น.`
      : 'เพิ่มข้อมูลบันทึกการทำงานโดย Super Admin';

    editWorklogId.value = isEdit ? log.id : '';
    editWorklogDatetime.value = isEdit
      ? toBangkokDatetimeLocalValue(log.created_at)
      : toBangkokDatetimeLocalValue(new Date().toISOString());
    editWorklogHn.value = isEdit ? log.hn : '';

    const existingTasks = new Set(isEdit ? (log.tasks || []) : []);
    const taskNames = Array.from(
      new Set([
        ...(tasksRes.data || []).filter((t) => t.is_active || existingTasks.has(t.task_name)).map((t) => t.task_name),
        ...(isEdit ? (log.tasks || []) : []),
      ])
    );

    editWorklogTasksContainer.innerHTML = taskNames
      .map((name, idx) => {
        const checked = existingTasks.has(name) ? 'checked' : '';
        return `
          <label for="edit-wl-task-${idx}" class="flex items-center gap-2 p-2 rounded-lg bg-white border border-slate-200 cursor-pointer hover:border-teal-400 select-none">
            <input
              type="checkbox"
              id="edit-wl-task-${idx}"
              name="edit_wl_task"
              value="${escapeHTML(name)}"
              ${checked}
              class="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500 shrink-0"
            />
            <span class="text-xs font-medium text-slate-700 leading-snug">${escapeHTML(name)}</span>
          </label>
        `;
      })
      .join('');

    const reqNames = Array.from(
      new Set([
        ...(reqRes.data || []).filter((r) => r.is_active || (isEdit && r.name === log.requester_name)).map((r) => r.name),
        ...(isEdit && log.requester_name && log.requester_name !== '-' ? [log.requester_name] : []),
      ])
    );
    editWorklogRequester.innerHTML =
      `<option value="-">-- ไม่ระบุผู้แจ้ง (-) --</option>` +
      reqNames.map((n) => `<option value="${escapeHTML(n)}">${escapeHTML(n)}</option>`).join('');
    editWorklogRequester.value = isEdit ? (log.requester_name || '-') : '-';

    const operators = allStaffList.filter((s) => s.is_operator || (isEdit && s.id === log.primary_staff_id));
    editWorklogStaff.innerHTML = operators
      .map(
        (s) =>
          `<option value="${s.id}">คุณ${escapeHTML(s.full_name)}${s.is_active ? '' : ' (ปิดใช้งาน)'}</option>`
      )
      .join('');
    if (isEdit) {
      editWorklogStaff.value = log.primary_staff_id;
    } else if (operators.length > 0) {
      editWorklogStaff.value = operators[0].id;
    }

    worklogEditorModal.classList.remove('hidden');
    editWorklogHn.focus();
  } catch (err) {
    hideLoader();
    console.error('Open worklog editor modal error:', err);
    showToast('ไม่สามารถเปิดหน้าต่างจัดการข้อมูลได้', 'error');
  }
}

async function handleSaveWorkLogEditor(e) {
  e.preventDefault();
  if (!isSuperAdmin()) return;

  const logId = editWorklogId.value.trim();
  const dtVal = editWorklogDatetime.value;
  const newHn = editWorklogHn.value.trim();
  const newTasks = Array.from(
    editWorklogTasksContainer.querySelectorAll('input[name="edit_wl_task"]:checked')
  ).map((cb) => cb.value);
  const newRequester = editWorklogRequester.value || '-';
  const newStaffId = editWorklogStaff.value;

  if (!dtVal) {
    showToast('กรุณาระบุวัน-เวลาที่บันทึก', 'error');
    return;
  }
  if (!newHn) {
    showToast('กรุณากรอกเลข HN ผู้ป่วย', 'error');
    return;
  }
  if (newTasks.length === 0) {
    showToast('กรุณาเลือกงานที่ทำอย่างน้อย 1 รายการ', 'error');
    return;
  }
  if (!newStaffId) {
    showToast('กรุณาเลือกผู้ปฏิบัติงาน', 'error');
    return;
  }

  const createdAtIso = `${dtVal}:00+07:00`;

  showLoader(logId ? 'กำลังบันทึกการแก้ไข...' : 'กำลังเพิ่มรายการบันทึก...');
  try {
    if (logId) {
      const parsedId = /^\d+$/.test(String(logId)) ? Number(logId) : logId;
      const { error } = await sb
        .from('work_logs')
        .update({
          created_at: createdAtIso,
          hn: newHn,
          tasks: newTasks,
          requester_name: newRequester,
          primary_staff_id: newStaffId,
          co_staff_ids: [],
        })
        .eq('id', parsedId);

      if (error) throw error;
      showToast('แก้ไขรายการบันทึกงานเรียบร้อยแล้ว', 'success');
    } else {
      const { error } = await sb.from('work_logs').insert({
        created_at: createdAtIso,
        hn: newHn,
        tasks: newTasks,
        requester_name: newRequester,
        primary_staff_id: newStaffId,
        co_staff_ids: [],
      });

      if (error) throw error;
      showToast('เพิ่มรายการบันทึกงานเรียบร้อยแล้ว', 'success');
    }

    hideLoader();
    worklogEditorModal.classList.add('hidden');

    const targetDate = dtVal.slice(0, 10);
    if (!adminFilterStartDate.value || targetDate < adminFilterStartDate.value) {
      adminFilterStartDate.value = targetDate;
    }
    if (!adminFilterEndDate.value || targetDate > adminFilterEndDate.value) {
      adminFilterEndDate.value = targetDate;
    }
    updateAdminShiftHint();
    await handleAdminSearch();
  } catch (err) {
    hideLoader();
    console.error('Save work_log error:', err);
    showToast(`บันทึกข้อมูลไม่สำเร็จ: ${err.message || 'กรุณาตรวจสอบสิทธิ์ SQL'}`, 'error');
  }
}

// ---------- Super Admin: Delete Work Log ----------
function promptDeleteWorkLog(log) {
  if (!isSuperAdmin()) return;
  openConfirmDeleteModal({
    title: 'ยืนยันการลบรายการบันทึกงาน',
    bodyHtml: `
      <div>ต้องการลบรายการของ HN <span class="font-bold text-slate-900">${escapeHTML(log.hn)}</span></div>
      <div class="text-xs text-slate-600 mt-1">
        งาน: <span class="font-semibold">${escapeHTML((log.tasks || []).join(', '))}</span><br/>
        ผู้ปฏิบัติงาน: <span class="font-semibold">คุณ${escapeHTML(getStaffName(log.primary_staff_id))}</span> (${escapeHTML(formatBangkokDateTime(log.created_at))} น.)
      </div>
      <div class="mt-2.5 text-xs font-bold text-rose-700">การลบนี้ไม่สามารถกู้คืนได้ คุณยืนยันหรือไม่?</div>
    `,
    onConfirm: async () => {
      showLoader('กำลังลบรายการบันทึก...');
      try {
        const parsedId = /^\d+$/.test(String(log.id)) ? Number(log.id) : log.id;
        const { error } = await sb.from('work_logs').delete().eq('id', parsedId);
        hideLoader();
        if (error) throw error;
        showToast('ลบรายการบันทึกงานเรียบร้อยแล้ว', 'success');
        await handleAdminSearch();
      } catch (err) {
        hideLoader();
        console.error('Delete work_log error:', err);
        showToast(`ลบข้อมูลไม่สำเร็จ: ${err.message || 'กรุณาตรวจสอบสิทธิ์ SQL'}`, 'error');
      }
    },
  });
}

function exportAdminExcel() {
  if (!lastAdminLogs || lastAdminLogs.length === 0) return;
  try {
    if (typeof XLSX === 'undefined') {
      showToast('ไม่พบไลบรารี SheetJS กรุณาตรวจสอบอินเทอร์เน็ต', 'error');
      return;
    }

    const rows = lastAdminLogs.map((log, idx) => ({
      'ลำดับ': idx + 1,
      'วัน-เวลา': `${formatBangkokDateTime(log.created_at)} น.`,
      'HN ผู้ป่วย': log.hn,
      'งานที่ทำ': (log.tasks || []).join(', '),
      'ผู้แจ้งให้ทำ': formatRequesterDisplay(log.requester_name),
      'ผู้ปฏิบัติงาน': `คุณ${getStaffName(log.primary_staff_id)}`,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 8 },
      { wch: 20 },
      { wch: 14 },
      { wch: 36 },
      { wch: 16 },
      { wch: 22 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ER_Task_Log');

    const dateTag =
      lastAdminMeta.startDateStr === lastAdminMeta.endDateStr
        ? lastAdminMeta.startDateStr
        : `${lastAdminMeta.startDateStr}_to_${lastAdminMeta.endDateStr}`;
    const fileName = `ER_Task_Log_${dateTag}_${lastAdminMeta.shiftKey}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast(`ส่งออกไฟล์ ${fileName} เรียบร้อยแล้ว`, 'success');
  } catch (err) {
    console.error('Excel export error:', err);
    showToast('เกิดข้อผิดพลาดในการสร้างไฟล์ Excel', 'error');
  }
}
