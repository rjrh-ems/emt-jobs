'use strict';

// =========================================================================
// MODE 1: STAFF VIEW (FORM + DUPLICATE CHECK + MY HISTORY)
// =========================================================================
function updateStaffClock() {
  const now = new Date();
  liveDateDisplay.textContent = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);
  liveTimeDisplay.textContent = new Intl.DateTimeFormat('th-TH', {
    timeZone: 'Asia/Bangkok',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(now);
}

function startStaffClock() {
  updateStaffClock();
  stopStaffClock();
  staffClockTimer = setInterval(updateStaffClock, 1000);
}

function stopStaffClock() {
  if (staffClockTimer) {
    clearInterval(staffClockTimer);
    staffClockTimer = null;
  }
}

function switchStaffSubTab(tab) {
  if (tab === 'form') {
    staffPanelForm.classList.remove('hidden');
    staffPanelHistory.classList.add('hidden');
    staffTabBtnForm.className = 'py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white text-teal-700 shadow-sm';
    staffTabBtnHistory.className = 'py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800';
  } else {
    staffPanelForm.classList.add('hidden');
    staffPanelHistory.classList.remove('hidden');
    staffTabBtnHistory.className = 'py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white text-teal-700 shadow-sm';
    staffTabBtnForm.className = 'py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800';
    loadMyHistory();
  }
}

function isErReceiveTaskSelected() {
  const checkedValues = Array.from(
    taskCheckboxesContainer.querySelectorAll('input[name="task_item"]:checked')
  ).map((cb) => cb.value.trim());
  return checkedValues.includes('รับผู้ป่วยหน้า ER');
}

function updateRequesterOptionalState() {
  const isOptional = isErReceiveTaskSelected();
  requesterRequiredStar.classList.toggle('hidden', isOptional);
  requesterOptionalBadge.classList.toggle('hidden', !isOptional);

  const defaultOpt = requesterSelect.querySelector('option[value=""]');
  if (defaultOpt) {
    defaultOpt.textContent = isOptional
      ? '-- ไม่ระบุผู้แจ้ง (รับผู้ป่วยหน้า ER) --'
      : '-- กรุณาเลือกชื่อผู้แจ้งให้ทำ --';
  }

  if (isOptional) {
    hideFieldError(requesterError);
  }
}

async function loadStaffFormMasterData() {
  try {
    const [tasksRes, reqRes] = await Promise.all([
      sb.from('task_types').select('*').eq('is_active', true).order('id', { ascending: true }),
      sb.from('requesters').select('*').eq('is_active', true).order('name', { ascending: true }),
    ]);

    if (tasksRes.error) throw tasksRes.error;
    if (reqRes.error) throw reqRes.error;

    renderTaskCheckboxes(tasksRes.data || []);
    renderRequesterSelect(reqRes.data || []);
    updateRequesterOptionalState();
  } catch (err) {
    console.error('Load form master data error:', err);
    showToast('ไม่สามารถโหลดข้อมูลตัวเลือกได้ กรุณาลองใหม่', 'error');
  }
}

function renderTaskCheckboxes(tasks) {
  if (tasks.length === 0) {
    taskCheckboxesContainer.innerHTML = `<p class="col-span-full text-xs text-slate-400">ยังไม่มีรายการงานในระบบ</p>`;
    return;
  }
  taskCheckboxesContainer.innerHTML = tasks
    .map(
      (t) => `
      <label
        for="task-id-${t.id}"
        class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-teal-400 transition-all select-none"
      >
        <input
          type="checkbox"
          id="task-id-${t.id}"
          name="task_item"
          value="${escapeHTML(t.task_name)}"
          class="w-5 h-5 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
        />
        <span class="text-sm font-medium text-slate-700 leading-snug">${escapeHTML(t.task_name)}</span>
      </label>
    `
    )
    .join('');

  taskCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const label = cb.closest('label');
      if (cb.checked) {
        label.classList.add('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
        label.classList.remove('border-slate-200', 'bg-white');
      } else {
        label.classList.remove('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
        label.classList.add('border-slate-200', 'bg-white');
      }
      hideFieldError(taskError);
      updateRequesterOptionalState();
    });
  });
}

function renderRequesterSelect(requesters) {
  const currentVal = requesterSelect.value;
  requesterSelect.innerHTML =
    `<option value="">-- กรุณาเลือกชื่อผู้แจ้งให้ทำ --</option>` +
    requesters.map((r) => `<option value="${escapeHTML(r.name)}">${escapeHTML(r.name)}</option>`).join('');
  if (currentVal) requesterSelect.value = currentVal;
  updateRequesterOptionalState();
}

function updateCustomTaskUI() {
  if (customTaskCheckbox.checked) {
    customTaskLabel.classList.add('border-teal-500', 'bg-teal-50/60');
    customTaskLabel.classList.remove('border-slate-200', 'bg-slate-50/60');
    customTaskInputWrap.classList.remove('hidden');
    customTaskInput.focus();
  } else {
    customTaskLabel.classList.remove('border-teal-500', 'bg-teal-50/60');
    customTaskLabel.classList.add('border-slate-200', 'bg-slate-50/60');
    customTaskInputWrap.classList.add('hidden');
    customTaskInput.value = '';
  }
}

function showFieldError(el, msg) {
  el.textContent = msg;
  el.classList.remove('hidden');
}

function hideFieldError(el) {
  el.textContent = '';
  el.classList.add('hidden');
}

function resetWorkLogForm() {
  workLogForm.reset();
  hideFieldError(hnError);
  hideFieldError(taskError);
  hideFieldError(requesterError);

  taskCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.checked = false;
    const label = cb.closest('label');
    label.classList.remove('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
    label.classList.add('border-slate-200', 'bg-white');
  });

  customTaskCheckbox.checked = false;
  updateCustomTaskUI();
  updateRequesterOptionalState();
}

async function handleWorkLogSubmit(e) {
  e.preventDefault();
  if (!currentUser) return;

  let isValid = true;
  let firstErrEl = null;

  // 1. HN
  const hnVal = hnInput.value.trim();
  if (!hnVal) {
    showFieldError(hnError, 'กรุณากรอกเลข HN ผู้ป่วย');
    isValid = false;
    firstErrEl = firstErrEl || hnInput;
  } else {
    hideFieldError(hnError);
  }

  // 2. งานที่ทำ
  const selectedTasks = Array.from(
    taskCheckboxesContainer.querySelectorAll('input[name="task_item"]:checked')
  ).map((cb) => cb.value);

  let customTaskName = '';
  if (customTaskCheckbox.checked) {
    customTaskName = customTaskInput.value.trim();
    if (!customTaskName) {
      showFieldError(taskError, 'กรุณาพิมพ์ชื่องานในช่อง "ระบุเอง"');
      isValid = false;
      firstErrEl = firstErrEl || customTaskInput;
    } else {
      const exists = selectedTasks.some((t) => t.toLowerCase() === customTaskName.toLowerCase());
      if (!exists) selectedTasks.push(customTaskName);
    }
  }

  if (selectedTasks.length === 0 && !customTaskCheckbox.checked) {
    showFieldError(taskError, 'กรุณาเลือกงานที่ทำอย่างน้อย 1 รายการ');
    isValid = false;
    firstErrEl = firstErrEl || taskCheckboxesContainer;
  } else if (!(customTaskCheckbox.checked && !customTaskName)) {
    hideFieldError(taskError);
  }

  // 3. ผู้แจ้งให้ทำ
  const isRequesterOptional = isErReceiveTaskSelected();
  const requesterVal = requesterSelect.value;
  if (!requesterVal && !isRequesterOptional) {
    showFieldError(requesterError, 'กรุณาเลือกชื่อผู้แจ้งให้ทำ');
    isValid = false;
    firstErrEl = firstErrEl || requesterSelect;
  } else {
    hideFieldError(requesterError);
  }

  if (!isValid) {
    showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
    if (firstErrEl && typeof firstErrEl.scrollIntoView === 'function') {
      firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  const payload = {
    hn: hnVal,
    tasks: selectedTasks,
    customTaskName,
    requester_name: requesterVal || '-',
    primary_staff_id: currentUser.id,
    co_staff_ids: [],
  };

  submitWorkLogBtn.disabled = true;
  showLoader('กำลังตรวจสอบข้อมูลซ้ำซ้อน...');
  try {
    const { data: dupRows, error: dupErr } = await sb.rpc('check_duplicate_task', {
      p_hn: payload.hn,
      p_tasks: payload.tasks,
    });

    if (dupErr) throw dupErr;

    if (Array.isArray(dupRows) && dupRows.length > 0) {
      hideLoader();
      submitWorkLogBtn.disabled = false;
      pendingWorkLogData = payload;
      const match = dupRows[0];
      const matchedText = (match.matched_tasks || []).join(', ');
      const loggedTime = formatBangkokTimeHHMM(match.logged_at);

      duplicateModalBody.innerHTML = `
        ผู้ป่วย HN <span class="font-bold text-slate-900">${escapeHTML(payload.hn)}</span>
        มีคุณ <span class="font-bold text-teal-700">${escapeHTML(match.staff_name)}</span>
        มีการบันทึกงาน <span class="font-bold text-amber-800">[${escapeHTML(matchedText)}]</span>
        ไปแล้วเมื่อเวลา <span class="font-semibold">${escapeHTML(loggedTime)} น.</span>
        <div class="mt-2 font-bold text-slate-800">คุณยืนยันจะบันทึกซ้ำหรือไม่?</div>
      `;
      duplicateModal.classList.remove('hidden');
      return;
    }

    await commitWorkLogToSupabase(payload);
  } catch (err) {
    hideLoader();
    submitWorkLogBtn.disabled = false;
    console.error('Duplicate check / submit error:', err);
    showToast('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่', 'error');
  }
}

async function commitWorkLogToSupabase(payload) {
  showLoader('กำลังบันทึกข้อมูลการทำงาน...');
  submitWorkLogBtn.disabled = true;
  try {
    if (payload.customTaskName) {
      const { error: customErr } = await sb.rpc('add_custom_task', {
        p_task_name: payload.customTaskName,
      });
      if (customErr) throw customErr;
    }

    const { error: insertErr } = await sb.from('work_logs').insert({
      hn: payload.hn,
      tasks: payload.tasks,
      requester_name: payload.requester_name,
      primary_staff_id: payload.primary_staff_id,
      co_staff_ids: [],
    });

    if (insertErr) throw insertErr;

    duplicateModal.classList.add('hidden');
    pendingWorkLogData = null;

    if (payload.customTaskName) {
      await loadStaffFormMasterData();
    }

    resetWorkLogForm();
    hideLoader();
    submitWorkLogBtn.disabled = false;
    showToast('บันทึกข้อมูลการทำงานเรียบร้อยแล้ว', 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    hideLoader();
    submitWorkLogBtn.disabled = false;
    console.error('Insert work_log error:', err);
    showToast('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}

async function loadMyHistory() {
  if (!currentUser) return;
  const selectedDate = myHistoryDate.value || getTodayBangkok();
  const startIso = `${selectedDate}T00:00:00+07:00`;
  const endIso = `${selectedDate}T23:59:59+07:00`;

  myHistoryList.innerHTML = `
    <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
      กำลังโหลดรายการงาน...
    </div>
  `;

  try {
    await refreshAllStaffCache();
    const { data, error } = await sb
      .from('work_logs')
      .select('*')
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .eq('primary_staff_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const logs = data || [];
    myHistoryCount.textContent = `${logs.length} งาน`;

    if (logs.length === 0) {
      myHistoryList.innerHTML = `
        <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <p class="text-sm font-semibold text-slate-600">ยังไม่มีรายการงานในวันที่ ${escapeHTML(formatThaiDateShort(selectedDate))}</p>
          <p class="text-xs text-slate-400 mt-1">รายการงานที่คุณบันทึกในวันที่เลือกจะแสดงที่นี่</p>
        </div>
      `;
      return;
    }

    myHistoryList.innerHTML = logs
      .map((log) => {
        const taskPills = (log.tasks || [])
          .map(
            (t) =>
              `<span class="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70">${escapeHTML(t)}</span>`
          )
          .join('');

        return `
          <article class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
            <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md tabular-nums">
                  ${escapeHTML(formatBangkokTimeHHMM(log.created_at))} น.
                </span>
                <span class="text-base font-bold text-slate-800">HN: ${escapeHTML(log.hn)}</span>
              </div>
              <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                คุณ${escapeHTML(getStaffName(log.primary_staff_id))}
              </span>
            </div>
            <div class="py-3 flex flex-wrap gap-1.5">${taskPills}</div>
            <div class="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
              <div class="flex justify-between gap-2">
                <span class="text-slate-400">ผู้แจ้งให้ทำ:</span>
                <span class="font-medium text-slate-700">${escapeHTML(formatRequesterDisplay(log.requester_name))}</span>
              </div>
              <div class="flex justify-between gap-2">
                <span class="text-slate-400">ผู้ปฏิบัติงาน:</span>
                <span class="font-medium text-slate-700">คุณ${escapeHTML(getStaffName(log.primary_staff_id))}</span>
              </div>
            </div>
          </article>
        `;
      })
      .join('');
  } catch (err) {
    console.error('Load my history error:', err);
    myHistoryList.innerHTML = `
      <div class="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center text-xs text-rose-700">
        ไม่สามารถโหลดประวัติงานได้ กรุณาลองใหม่อีกครั้ง
      </div>
    `;
  }
}
