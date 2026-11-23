'use strict';

// =========================================================================
// MODE 3: SUPER ADMIN MANAGEMENT (STAFF / REQUESTERS / TASKS)
// =========================================================================
async function loadSuperAdminTab(tabName) {
  saTabBtns.forEach((btn) => {
    if (btn.dataset.saTab === tabName) {
      btn.className = 'sa-tab-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-teal-600 text-white shadow-xs';
    } else {
      btn.className = 'sa-tab-btn flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all text-slate-600 hover:bg-slate-100';
    }
  });

  saPanelStaff.classList.add('hidden');
  saPanelRequesters.classList.add('hidden');
  saPanelTasks.classList.add('hidden');

  if (tabName === 'staff') {
    saPanelStaff.classList.remove('hidden');
    await renderSuperAdminStaffTable();
  } else if (tabName === 'requesters') {
    saPanelRequesters.classList.remove('hidden');
    await renderSuperAdminRequesters();
  } else if (tabName === 'tasks') {
    saPanelTasks.classList.remove('hidden');
    await renderSuperAdminTasks();
  }
}

// ---------- 10.1 ผู้ใช้งาน (Staff / Admin) ----------
async function renderSuperAdminStaffTable() {
  saStaffTbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">กำลังโหลดรายชื่อผู้ใช้งาน...</td></tr>`;
  try {
    await refreshAllStaffCache();

    if (allStaffList.length === 0) {
      saStaffTbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-xs text-slate-400">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
      return;
    }

    saStaffTbody.innerHTML = allStaffList
      .map((s) => {
        const isSelf = currentUser && s.id === currentUser.id;
        const badge = getRoleBadgeMeta(s.role);
        const opBadge = s.is_operator
          ? `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">ปฏิบัติงานหน้างาน</span>`
          : `<span class="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">ไม่ได้ลงหน้างาน</span>`;

        const statusToggle = `
          <button
            type="button"
            data-toggle-staff-id="${s.id}"
            data-next-active="${!s.is_active}"
            ${isSelf ? 'disabled title="ไม่สามารถปิดใช้งานบัญชีของตนเองได้"' : ''}
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
              s.is_active
                ? 'bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100'
                : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
            } ${isSelf ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}"
          >
            <span class="w-2 h-2 rounded-full ${s.is_active ? 'bg-teal-500' : 'bg-rose-500'}"></span>
            ${s.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
          </button>
        `;

        return `
          <tr class="hover:bg-slate-50/70 transition-colors ${s.is_active ? '' : 'opacity-65'}">
            <td class="py-3.5 px-4 whitespace-nowrap">
              <div class="inline-flex items-center gap-2">
                <span class="font-mono font-bold text-sm tracking-widest text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                  ${escapeHTML(s.access_code)}
                </span>
                <button
                  type="button"
                  data-copy-code="${escapeHTML(s.access_code)}"
                  title="คัดลอกรหัส"
                  class="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </td>
            <td class="py-3.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
              คุณ${escapeHTML(s.full_name)}
              ${isSelf ? '<span class="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">คุณ</span>' : ''}
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.cls}">${badge.label}</span>
            </td>
            <td class="py-3.5 px-4 whitespace-nowrap">${opBadge}</td>
            <td class="py-3.5 px-4 whitespace-nowrap">${statusToggle}</td>
            <td class="py-3.5 px-4 text-right whitespace-nowrap">
              <div class="inline-flex items-center gap-1.5">
                <button
                  type="button"
                  data-edit-staff-id="${s.id}"
                  class="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  แก้ไข
                </button>
                ${
                  isSelf
                    ? ''
                    : `<button
                        type="button"
                        data-delete-staff-id="${s.id}"
                        class="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                      >
                        ลบ
                      </button>`
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join('');

    saStaffTbody.querySelectorAll('[data-copy-code]').forEach((btn) => {
      btn.addEventListener('click', () => copyTextToClipboard(btn.dataset.copyCode));
    });

    saStaffTbody.querySelectorAll('[data-toggle-staff-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.toggleStaffId;
        const nextActive = btn.dataset.nextActive === 'true';
        if (id === currentUser.id && !nextActive) {
          showToast('ไม่สามารถปิดใช้งานบัญชี Super Admin ของตนเองได้', 'error');
          return;
        }
        await toggleStaffActive(id, nextActive);
      });
    });

    saStaffTbody.querySelectorAll('[data-edit-staff-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const staff = allStaffMap[btn.dataset.editStaffId];
        if (staff) openStaffEditorModal(staff);
      });
    });

    saStaffTbody.querySelectorAll('[data-delete-staff-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const staff = allStaffMap[btn.dataset.deleteStaffId];
        if (!staff || staff.id === currentUser.id) return;
        openConfirmDeleteModal({
          title: 'ยืนยันการลบบัญชีผู้ใช้งาน',
          bodyHtml: `
            <div>ต้องการลบบัญชีของ <span class="font-bold text-slate-900">คุณ${escapeHTML(staff.full_name)}</span> (รหัส <span class="font-mono font-bold">${escapeHTML(staff.access_code)}</span>) หรือไม่?</div>
            <div class="mt-2 text-xs text-slate-500">หมายเหตุ: หากผู้ใช้งานนี้มีประวัติการบันทึกงานอยู่ แนะนำให้ใช้การ "ปิดใช้งาน" แทนการลบถาวร</div>
          `,
          onConfirm: async () => {
            showLoader('กำลังลบบัญชีผู้ใช้งาน...');
            try {
              const { error } = await sb.from('staff').delete().eq('id', staff.id);
              hideLoader();
              if (error) throw error;
              showToast(`ลบบัญชี คุณ${staff.full_name} เรียบร้อยแล้ว`, 'success');
              await renderSuperAdminStaffTable();
            } catch (err) {
              hideLoader();
              console.error('Delete staff error:', err);
              if (err.code === '23503') {
                showToast('ไม่สามารถลบได้เนื่องจากมีประวัติบันทึกงานผูกอยู่ กรุณากด "ปิดใช้งาน" แทน', 'error');
              } else {
                showToast(`ลบผู้ใช้งานไม่สำเร็จ: ${err.message || ''}`, 'error');
              }
            }
          },
        });
      });
    });
  } catch (err) {
    console.error('Render staff table error:', err);
    showToast('ไม่สามารถโหลดรายชื่อผู้ใช้งานได้', 'error');
  }
}

async function toggleStaffActive(staffId, nextActive) {
  showLoader('กำลังอัปเดตสถานะ...');
  try {
    const { error } = await sb.from('staff').update({ is_active: nextActive }).eq('id', staffId);
    hideLoader();
    if (error) throw error;
    showToast(nextActive ? 'เปิดใช้งานบัญชีเรียบร้อยแล้ว' : 'ปิดใช้งานบัญชีเรียบร้อยแล้ว', 'success');
    await renderSuperAdminStaffTable();
  } catch (err) {
    hideLoader();
    console.error('Toggle staff active error:', err);
    showToast('อัปเดตสถานะไม่สำเร็จ', 'error');
  }
}

function openStaffEditorModal(staff = null) {
  staffEditorForm.reset();
  const isEdit = Boolean(staff);
  const isSelf = isEdit && currentUser && staff.id === currentUser.id;

  staffModalTitle.textContent = isEdit ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่';
  editStaffId.value = isEdit ? staff.id : '';
  editStaffName.value = isEdit ? staff.full_name : '';
  editStaffCode.value = isEdit ? staff.access_code : '';
  editStaffRole.value = isEdit ? staff.role : 'staff';
  editStaffOperator.checked = isEdit ? Boolean(staff.is_operator) : true;

  editStaffRole.disabled = isSelf;
  selfRoleGuardNote.classList.toggle('hidden', !isSelf);

  staffEditorModal.classList.remove('hidden');
  editStaffName.focus();
}

function closeStaffEditorModal() {
  staffEditorModal.classList.add('hidden');
}

async function handleSaveStaff(e) {
  e.preventDefault();
  const id = editStaffId.value.trim();
  const fullName = editStaffName.value.trim();
  const accessCode = editStaffCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
  const role = editStaffRole.value;
  const isOperator = editStaffOperator.checked;

  if (!fullName) {
    showToast('กรุณากรอกชื่อผู้ใช้งาน', 'error');
    return;
  }
  if (accessCode.length !== 6) {
    showToast('รหัสเข้าใช้งานต้องมี 6 หลัก (ภาษาอังกฤษและตัวเลขเท่านั้น)', 'error');
    return;
  }
  if (id && id === currentUser.id && role !== 'super_admin') {
    showToast('ไม่สามารถลดสิทธิ์บัญชี Super Admin ของตนเองได้', 'error');
    return;
  }

  showLoader('กำลังบันทึกข้อมูลผู้ใช้งาน...');
  try {
    if (id) {
      const { data, error } = await sb
        .from('staff')
        .update({
          full_name: fullName,
          access_code: accessCode,
          role,
          is_operator: isOperator,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (id === currentUser.id && data) {
        currentUser = data;
        saveDeviceUser(data);
        headerUserName.textContent = `คุณ${data.full_name}`;
        headerAvatar.textContent = data.full_name.charAt(0);
      }
      showToast('อัปเดตข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
    } else {
      const { error } = await sb.from('staff').insert({
        full_name: fullName,
        access_code: accessCode,
        role,
        is_operator: isOperator,
        is_active: true,
      });
      if (error) throw error;
      showToast(`เพิ่มผู้ใช้งาน คุณ${fullName} (${accessCode}) เรียบร้อยแล้ว`, 'success');
    }

    hideLoader();
    closeStaffEditorModal();
    await renderSuperAdminStaffTable();
  } catch (err) {
    hideLoader();
    console.error('Save staff error:', err);
    if (err.code === '23505') {
      showToast(`รหัส ${accessCode} มีผู้ใช้งานแล้ว กรุณาเปลี่ยนหรือกดสุ่มใหม่`, 'error');
    } else {
      showToast('บันทึกข้อมูลผู้ใช้งานไม่สำเร็จ', 'error');
    }
  }
}

// ---------- 10.2 ผู้แจ้งให้ทำ (Requesters) ----------
async function renderSuperAdminRequesters() {
  saRequestersList.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">กำลังโหลดรายชื่อผู้แจ้ง...</div>`;
  try {
    const { data, error } = await sb.from('requesters').select('*').order('name', { ascending: true });
    if (error) throw error;

    const items = data || [];
    if (items.length === 0) {
      saRequestersList.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">ยังไม่มีรายชื่อผู้แจ้ง</div>`;
      return;
    }

    saRequestersList.innerHTML = items
      .map(
        (r) => `
        <div class="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 ${r.is_active ? '' : 'opacity-60'}">
          <div class="font-medium text-sm text-slate-800">คุณ${escapeHTML(r.name)}</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-rename-req-id="${r.id}"
              data-rename-req-name="${escapeHTML(r.name)}"
              class="px-3 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              แก้ไขชื่อ
            </button>
            <button
              type="button"
              data-req-id="${r.id}"
              data-req-next="${!r.is_active}"
              class="px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                r.is_active
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              }"
            >
              ${r.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </button>
            <button
              type="button"
              data-delete-req-id="${r.id}"
              data-delete-req-name="${escapeHTML(r.name)}"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              ลบ
            </button>
          </div>
        </div>
      `
      )
      .join('');

    saRequestersList.querySelectorAll('[data-rename-req-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        renameTargetTable.value = 'requesters';
        renameModalTitle.textContent = 'แก้ไขชื่อผู้แจ้งให้ทำ';
        renameModalLabel.textContent = 'ชื่อผู้แจ้งให้ทำ';
        renameTaskId.value = btn.dataset.renameReqId;
        renameTaskInput.value = btn.dataset.renameReqName;
        renameTaskModal.classList.remove('hidden');
        renameTaskInput.focus();
      });
    });

    saRequestersList.querySelectorAll('[data-req-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.reqId);
        const nextActive = btn.dataset.reqNext === 'true';
        showLoader('กำลังอัปเดต...');
        try {
          const { error: uErr } = await sb.from('requesters').update({ is_active: nextActive }).eq('id', id);
          hideLoader();
          if (uErr) throw uErr;
          showToast('อัปเดตสถานะผู้แจ้งเรียบร้อยแล้ว', 'success');
          await renderSuperAdminRequesters();
        } catch (e) {
          hideLoader();
          showToast('อัปเดตสถานะไม่สำเร็จ', 'error');
        }
      });
    });

    saRequestersList.querySelectorAll('[data-delete-req-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.deleteReqId);
        const name = btn.dataset.deleteReqName;
        openConfirmDeleteModal({
          title: 'ยืนยันการลบรายชื่อผู้แจ้งให้ทำ',
          bodyHtml: `ต้องการลบรายชื่อ <span class="font-bold text-slate-900">คุณ${escapeHTML(name)}</span> ออกจากระบบหรือไม่?`,
          onConfirm: async () => {
            showLoader('กำลังลบรายชื่อผู้แจ้ง...');
            try {
              const { error } = await sb.from('requesters').delete().eq('id', id);
              hideLoader();
              if (error) throw error;
              showToast(`ลบรายชื่อ คุณ${name} เรียบร้อยแล้ว`, 'success');
              await renderSuperAdminRequesters();
            } catch (err) {
              hideLoader();
              showToast(`ลบรายชื่อไม่สำเร็จ: ${err.message || ''}`, 'error');
            }
          },
        });
      });
    });
  } catch (err) {
    console.error('Load requesters error:', err);
    showToast('ไม่สามารถโหลดรายชื่อผู้แจ้งได้', 'error');
  }
}

async function handleAddRequester(e) {
  e.preventDefault();
  const name = saNewRequesterInput.value.trim();
  if (!name) return;
  showLoader('กำลังเพิ่มรายชื่อผู้แจ้ง...');
  try {
    const { error } = await sb.from('requesters').insert({ name, is_active: true });
    hideLoader();
    if (error) throw error;
    saNewRequesterInput.value = '';
    showToast(`เพิ่มผู้แจ้ง คุณ${name} เรียบร้อยแล้ว`, 'success');
    await renderSuperAdminRequesters();
  } catch (err) {
    hideLoader();
    if (err.code === '23505') {
      showToast(`มีชื่อ คุณ${name} อยู่ในระบบแล้ว`, 'error');
    } else {
      showToast('เพิ่มรายชื่อผู้แจ้งไม่สำเร็จ', 'error');
    }
  }
}

// ---------- 10.3 รายการงาน (Task Types) ----------
async function renderSuperAdminTasks() {
  saTasksList.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">กำลังโหลดรายการงาน...</div>`;
  try {
    const { data, error } = await sb.from('task_types').select('*').order('id', { ascending: true });
    if (error) throw error;

    const items = data || [];
    if (items.length === 0) {
      saTasksList.innerHTML = `<div class="p-8 text-center text-xs text-slate-400">ยังไม่มีรายการงาน</div>`;
      return;
    }

    saTasksList.innerHTML = items
      .map(
        (t) => `
        <div class="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/70 ${t.is_active ? '' : 'opacity-60'}">
          <div class="font-medium text-sm text-slate-800">${escapeHTML(t.task_name)}</div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              data-rename-task-id="${t.id}"
              data-rename-task-name="${escapeHTML(t.task_name)}"
              class="px-3 py-1 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              แก้ไขชื่อ
            </button>
            <button
              type="button"
              data-task-toggle-id="${t.id}"
              data-task-next="${!t.is_active}"
              class="px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                t.is_active
                  ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
              }"
            >
              ${t.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
            </button>
            <button
              type="button"
              data-delete-task-id="${t.id}"
              data-delete-task-name="${escapeHTML(t.task_name)}"
              class="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              ลบ
            </button>
          </div>
        </div>
      `
      )
      .join('');

    saTasksList.querySelectorAll('[data-rename-task-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        renameTargetTable.value = 'task_types';
        renameModalTitle.textContent = 'แก้ไขชื่อรายการงาน';
        renameModalLabel.textContent = 'ชื่อรายการงาน';
        renameTaskId.value = btn.dataset.renameTaskId;
        renameTaskInput.value = btn.dataset.renameTaskName;
        renameTaskModal.classList.remove('hidden');
        renameTaskInput.focus();
      });
    });

    saTasksList.querySelectorAll('[data-task-toggle-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = Number(btn.dataset.taskToggleId);
        const nextActive = btn.dataset.taskNext === 'true';
        showLoader('กำลังอัปเดต...');
        try {
          const { error: uErr } = await sb.from('task_types').update({ is_active: nextActive }).eq('id', id);
          hideLoader();
          if (uErr) throw uErr;
          showToast('อัปเดตสถานะรายการงานเรียบร้อยแล้ว', 'success');
          await renderSuperAdminTasks();
        } catch (e) {
          hideLoader();
          showToast('อัปเดตสถานะไม่สำเร็จ', 'error');
        }
      });
    });

    saTasksList.querySelectorAll('[data-delete-task-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = Number(btn.dataset.deleteTaskId);
        const name = btn.dataset.deleteTaskName;
        openConfirmDeleteModal({
          title: 'ยืนยันการลบรายการงาน',
          bodyHtml: `ต้องการลบรายการงาน <span class="font-bold text-slate-900">"${escapeHTML(name)}"</span> ออกจากระบบหรือไม่?`,
          onConfirm: async () => {
            showLoader('กำลังลบรายการงาน...');
            try {
              const { error } = await sb.from('task_types').delete().eq('id', id);
              hideLoader();
              if (error) throw error;
              showToast(`ลบรายการงาน "${name}" เรียบร้อยแล้ว`, 'success');
              await renderSuperAdminTasks();
            } catch (err) {
              hideLoader();
              showToast(`ลบรายการงานไม่สำเร็จ: ${err.message || ''}`, 'error');
            }
          },
        });
      });
    });
  } catch (err) {
    console.error('Load tasks error:', err);
    showToast('ไม่สามารถโหลดรายการงานได้', 'error');
  }
}

async function handleAddTask(e) {
  e.preventDefault();
  const taskName = saNewTaskInput.value.trim();
  if (!taskName) return;
  showLoader('กำลังเพิ่มรายการงาน...');
  try {
    const { error } = await sb.from('task_types').insert({ task_name: taskName, is_active: true });
    hideLoader();
    if (error) throw error;
    saNewTaskInput.value = '';
    showToast(`เพิ่มรายการงาน "${taskName}" เรียบร้อยแล้ว`, 'success');
    await renderSuperAdminTasks();
  } catch (err) {
    hideLoader();
    if (err.code === '23505') {
      showToast(`มีรายการงาน "${taskName}" อยู่ในระบบแล้ว`, 'error');
    } else {
      showToast('เพิ่มรายการงานไม่สำเร็จ', 'error');
    }
  }
}

async function handleRenameMaster(e) {
  e.preventDefault();
  const table = renameTargetTable.value;
  const id = Number(renameTaskId.value);
  const newName = renameTaskInput.value.trim();
  if (!id || !newName) return;

  showLoader('กำลังบันทึกชื่อใหม่...');
  try {
    if (table === 'requesters') {
      const { error } = await sb.from('requesters').update({ name: newName }).eq('id', id);
      hideLoader();
      if (error) throw error;
      renameTaskModal.classList.add('hidden');
      showToast('แก้ไขชื่อผู้แจ้งให้ทำเรียบร้อยแล้ว', 'success');
      await renderSuperAdminRequesters();
    } else {
      const { error } = await sb.from('task_types').update({ task_name: newName }).eq('id', id);
      hideLoader();
      if (error) throw error;
      renameTaskModal.classList.add('hidden');
      showToast('แก้ไขชื่อรายการงานเรียบร้อยแล้ว', 'success');
      await renderSuperAdminTasks();
    }
  } catch (err) {
    hideLoader();
    if (err.code === '23505') {
      showToast(`มีชื่อ "${newName}" อยู่ในระบบแล้ว`, 'error');
    } else {
      showToast('แก้ไขชื่อไม่สำเร็จ', 'error');
    }
  }
}
