/**
 * ASM Nöbet Çizelgesi PWA - Core Engine
 * Geliştirici: Dr. Furkan Aksoy
 */

// ================= CONSTANTS & OFFICIAL HOLIDAYS (TR) =================
const TR_MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const TR_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const OFFICIAL_HOLIDAYS = {
  // 2026
  '2026-01-01': 'Yılbaşı',
  '2026-03-20': 'Ramazan Bayramı Arifesi',
  '2026-03-21': 'Ramazan Bayramı 1. Gün',
  '2026-03-22': 'Ramazan Bayramı 2. Gün',
  '2026-03-23': 'Ramazan Bayramı 3. Gün',
  '2026-04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '2026-05-01': 'Emek ve Dayanışma Günü',
  '2026-05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
  '2026-05-27': 'Kurban Bayramı Arifesi',
  '2026-05-28': 'Kurban Bayramı 1. Gün',
  '2026-05-29': 'Kurban Bayramı 2. Gün',
  '2026-05-30': 'Kurban Bayramı 3. Gün',
  '2026-05-31': 'Kurban Bayramı 4. Gün',
  '2026-07-15': '15 Temmuz Demokrasi ve Milli Birlik Günü',
  '2026-08-30': 'Zafer Bayramı',
  '2026-10-29': 'Cumhuriyet Bayramı',
  // 2027
  '2027-01-01': 'Yılbaşı',
  '2027-03-09': 'Ramazan Bayramı Arifesi',
  '2027-03-10': 'Ramazan Bayramı 1. Gün',
  '2027-03-11': 'Ramazan Bayramı 2. Gün',
  '2027-03-12': 'Ramazan Bayramı 3. Gün',
  '2027-04-23': 'Ulusal Egemenlik ve Çocuk Bayramı',
  '2027-05-01': 'Emek ve Dayanışma Günü',
  '2027-05-16': 'Kurban Bayramı Arifesi',
  '2027-05-17': 'Kurban Bayramı 1. Gün',
  '2027-05-18': 'Kurban Bayramı 2. Gün',
  '2027-05-19': 'Atatürk\'ü Anma, Gençlik ve Spor Bayramı',
  '2027-07-15': '15 Temmuz Demokrasi ve Milli Birlik Günü',
  '2027-08-30': 'Zafer Bayramı',
  '2027-10-29': 'Cumhuriyet Bayramı'
};

// ================= STORAGE =================
const Storage = {
  get: (key, def = null) => {
    try {
      const val = localStorage.getItem(`asm_${key}`);
      return val ? JSON.parse(val) : def;
    } catch {
      return def;
    }
  },
  set: (key, val) => {
    try {
      localStorage.setItem(`asm_${key}`, JSON.stringify(val));
    } catch (e) {
      console.error('Storage error', e);
    }
  }
};

const DEFAULT_PHYSICIANS = [
  { id: '1', name: 'Dr. Ahmet Yılmaz', code: 'AY', color: '#059669' },
  { id: '2', name: 'Dr. Fatma Kaya', code: 'FK', color: '#2563EB' },
  { id: '3', name: 'Dr. Mehmet Demir', code: 'MD', color: '#D97706' },
  { id: '4', name: 'Dr. Ayşe Çelik', code: 'AÇ', color: '#7C3AED' }
];

const state = {
  pin: Storage.get('pin', null),
  physicians: Storage.get('physicians', DEFAULT_PHYSICIANS),
  template: Storage.get('template', { '1': ['1'], '2': ['2'], '3': ['3'], '4': ['4'], '5': ['1', '2'] }), // 1=Mon..5=Fri
  assignments: Storage.get('assignments', {}), // 'YYYY-MM-DD': ['id1', 'id2']
  holidays: Storage.get('holidays', {}),
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth() + 1,
  summaryYear: new Date().getFullYear(),
  summaryMonth: new Date().getMonth() + 1,
  activeTab: 'calendar',
  activeSheetDate: null,
  enteredPin: '',
  setupPinStep: 1,
  tempSetupPin: ''
};

// ================= DOM ELEMENTS =================
const el = {
  splashScreen: document.getElementById('splash-screen'),
  pinScreen: document.getElementById('pin-screen'),
  pinSetupScreen: document.getElementById('pin-setup-screen'),
  appMain: document.getElementById('app-main'),
  
  pinDots: document.getElementById('pin-dots'),
  pinError: document.getElementById('pin-error'),
  pinKeypad: document.getElementById('pin-keypad'),
  
  setupDots: document.getElementById('setup-dots'),
  setupError: document.getElementById('setup-error'),
  setupSubtitle: document.getElementById('setup-subtitle'),
  setupKeypad: document.getElementById('setup-keypad'),
  
  monthLabel: document.getElementById('month-label'),
  prevMonth: document.getElementById('prev-month'),
  nextMonth: document.getElementById('next-month'),
  calendarGrid: document.getElementById('calendar-grid'),
  applyTemplateBtn: document.getElementById('apply-template-btn'),
  clearMonthBtn: document.getElementById('clear-month-btn'),
  
  physicianList: document.getElementById('physician-list'),
  physicianEmpty: document.getElementById('physician-empty'),
  physicianCountBadge: document.getElementById('physician-count-badge'),
  addPhysicianBtn: document.getElementById('add-physician-btn'),
  addFirstPhysicianBtn: document.getElementById('add-first-physician-btn'),
  
  templateDays: document.getElementById('template-days'),
  
  summaryMonthLabel: document.getElementById('summary-month-label'),
  summaryPrev: document.getElementById('summary-prev'),
  summaryNext: document.getElementById('summary-next'),
  summaryList: document.getElementById('summary-list'),
  summaryTotal: document.getElementById('summary-total'),
  
  tabBar: document.getElementById('tab-bar'),
  
  dailySheetOverlay: document.getElementById('daily-sheet-overlay'),
  dailySheet: document.getElementById('daily-sheet'),
  sheetDateTitle: document.getElementById('sheet-date-title'),
  sheetDateSubtitle: document.getElementById('sheet-date-subtitle'),
  sheetPhysicianList: document.getElementById('sheet-physician-list'),
  sheetHolidayToggle: document.getElementById('sheet-holiday-toggle'),
  sheetClose: document.getElementById('sheet-close'),
  
  physicianModalOverlay: document.getElementById('physician-modal-overlay'),
  physicianModal: document.getElementById('physician-modal'),
  modalTitle: document.getElementById('modal-title'),
  physicianNameInput: document.getElementById('physician-name'),
  physicianCodeInput: document.getElementById('physician-code'),
  colorPicker: document.getElementById('color-picker'),
  modalSave: document.getElementById('modal-save'),
  modalDelete: document.getElementById('modal-delete'),
  modalClose: document.getElementById('modal-close'),
  physicianEditId: document.getElementById('physician-edit-id'),
  
  toast: document.getElementById('toast')
};

// ================= HAPTIC FEEDBACK =================
function triggerHaptic() {
  if ('vibrate' in navigator) {
    try { navigator.vibrate(10); } catch {}
  }
}

// ================= TOAST NOTIFICATION =================
let toastTimeout = null;
function showToast(msg) {
  if (toastTimeout) clearTimeout(toastTimeout);
  el.toast.textContent = msg;
  el.toast.classList.remove('hidden');
  toastTimeout = setTimeout(() => {
    el.toast.classList.add('hidden');
  }, 2200);
}

// ================= HELPERS =================
function toDateStr(y, m, d) {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function firstDayMondayIndex(y, m) {
  const day = new Date(y, m - 1, 1).getDay();
  return (day + 6) % 7;
}

function isHoliday(dateStr) {
  if (OFFICIAL_HOLIDAYS[dateStr]) return { isHoliday: true, label: OFFICIAL_HOLIDAYS[dateStr] };
  if (state.holidays[dateStr]?.isHoliday) return { isHoliday: true, label: state.holidays[dateStr].label || 'İdari İzin' };
  return { isHoliday: false, label: '' };
}

// ================= SPLASH & AUTH LOGIC =================
function startAppFlow() {
  // Show luxury splash animation for 1.3 seconds
  setTimeout(() => {
    el.splashScreen.classList.add('fade-out');
    setTimeout(() => {
      el.splashScreen.classList.add('hidden');
      initAuth();
    }, 450);
  }, 1300);
}

function initAuth() {
  if (!state.pin) {
    el.pinScreen.classList.add('hidden');
    el.pinSetupScreen.classList.remove('hidden');
    el.appMain.classList.add('hidden');
    setupPinFlow();
  } else {
    el.pinScreen.classList.remove('hidden');
    el.pinSetupScreen.classList.add('hidden');
    el.appMain.classList.add('hidden');
    loginPinFlow();
  }
}

function updateDots(container, count) {
  const dots = container.querySelectorAll('.pin-dot');
  dots.forEach((d, idx) => {
    if (idx < count) d.classList.add('filled');
    else d.classList.remove('filled');
  });
}

function loginPinFlow() {
  state.enteredPin = '';
  updateDots(el.pinDots, 0);
  el.pinError.textContent = '';

  el.pinKeypad.onclick = (e) => {
    const btn = e.target.closest('.key-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    if (!key) return;

    triggerHaptic();

    if (key === 'delete') {
      state.enteredPin = state.enteredPin.slice(0, -1);
    } else if (state.enteredPin.length < 4) {
      state.enteredPin += key;
    }

    updateDots(el.pinDots, state.enteredPin.length);

    if (state.enteredPin.length === 4) {
      setTimeout(() => {
        if (state.enteredPin === state.pin) {
          unlockApp();
        } else {
          el.pinDots.classList.add('shake');
          el.pinError.textContent = 'Hatalı PIN. Tekrar deneyin.';
          setTimeout(() => {
            el.pinDots.classList.remove('shake');
            state.enteredPin = '';
            updateDots(el.pinDots, 0);
          }, 450);
        }
      }, 80);
    }
  };
}

function setupPinFlow() {
  state.enteredPin = '';
  state.setupPinStep = 1;
  state.tempSetupPin = '';
  el.setupSubtitle.textContent = 'Yeni 4 haneli PIN kodunuzu belirleyin';
  updateDots(el.setupDots, 0);
  el.setupError.textContent = '';

  el.setupKeypad.onclick = (e) => {
    const btn = e.target.closest('.key-btn');
    if (!btn) return;
    const key = btn.dataset.key;
    if (!key) return;

    triggerHaptic();

    if (key === 'delete') {
      state.enteredPin = state.enteredPin.slice(0, -1);
    } else if (state.enteredPin.length < 4) {
      state.enteredPin += key;
    }

    updateDots(el.setupDots, state.enteredPin.length);

    if (state.enteredPin.length === 4) {
      if (state.setupPinStep === 1) {
        state.tempSetupPin = state.enteredPin;
        state.setupPinStep = 2;
        state.enteredPin = '';
        el.setupSubtitle.textContent = 'PIN kodunuzu tekrar girerek onaylayın';
        updateDots(el.setupDots, 0);
        el.setupError.textContent = '';
      } else if (state.setupPinStep === 2) {
        if (state.enteredPin === state.tempSetupPin) {
          state.pin = state.enteredPin;
          Storage.set('pin', state.pin);
          showToast('PIN başarıyla ayarlandı');
          unlockApp();
        } else {
          el.setupDots.classList.add('shake');
          el.setupError.textContent = 'PIN eşleşmedi, tekrar deneyin';
          setTimeout(() => {
            el.setupDots.classList.remove('shake');
            setupPinFlow();
          }, 500);
        }
      }
    }
  };
}

function unlockApp() {
  el.pinScreen.classList.add('hidden');
  el.pinSetupScreen.classList.add('hidden');
  el.appMain.classList.remove('hidden');
  renderAll();
}

// ================= NAVIGATION =================
function initNav() {
  el.tabBar.onclick = (e) => {
    const item = e.target.closest('.tab-bar-item');
    if (!item) return;
    const tab = item.dataset.tab;
    if (!tab) return;

    triggerHaptic();

    document.querySelectorAll('.tab-bar-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    item.classList.add('active');
    document.getElementById(`tab-${tab}`).classList.add('active');
    state.activeTab = tab;

    if (tab === 'calendar') renderCalendar();
    if (tab === 'physicians') renderPhysicians();
    if (tab === 'template') renderTemplate();
    if (tab === 'summary') renderSummary();
  };
}

// ================= CALENDAR TAB =================
function initCalendar() {
  el.prevMonth.onclick = () => {
    triggerHaptic();
    state.currentMonth--;
    if (state.currentMonth < 1) {
      state.currentMonth = 12;
      state.currentYear--;
    }
    renderCalendar();
  };

  el.nextMonth.onclick = () => {
    triggerHaptic();
    state.currentMonth++;
    if (state.currentMonth > 12) {
      state.currentMonth = 1;
      state.currentYear++;
    }
    renderCalendar();
  };

  el.applyTemplateBtn.onclick = applyTemplateToMonth;
  el.clearMonthBtn.onclick = clearMonthAssignments;
}

function clearMonthAssignments() {
  triggerHaptic();
  const monthName = TR_MONTHS[state.currentMonth - 1];
  const confirmMsg = `${monthName} ${state.currentYear} ayının tüm nöbet atamalarını silmek istediğinize emin misiniz?`;
  
  if (!confirm(confirmMsg)) return;

  const totalDays = daysInMonth(state.currentYear, state.currentMonth);
  let clearedCount = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = toDateStr(state.currentYear, state.currentMonth, d);
    if (state.assignments[dateStr]) {
      delete state.assignments[dateStr];
      clearedCount++;
    }
  }

  Storage.set('assignments', state.assignments);
  renderCalendar();
  showToast(`${monthName} ayı nöbetleri sıfırlandı`);
}

function renderCalendar() {
  el.monthLabel.textContent = `${TR_MONTHS[state.currentMonth - 1]} ${state.currentYear}`;
  el.calendarGrid.innerHTML = '';

  const totalDays = daysInMonth(state.currentYear, state.currentMonth);
  const startOffset = firstDayMondayIndex(state.currentYear, state.currentMonth);
  const todayStr = toDateStr(new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate());

  // Empty leading days
  for (let i = 0; i < startOffset; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'calendar-day empty';
    el.calendarGrid.appendChild(emptyDiv);
  }

  // Actual days
  for (let d = 1; d <= totalDays; d++) {
    const dateStr = toDateStr(state.currentYear, state.currentMonth, d);
    const dayOfWeek = ((new Date(state.currentYear, state.currentMonth - 1, d).getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
    const isWeekendDay = dayOfWeek === 6 || dayOfWeek === 7;
    const hol = isHoliday(dateStr);
    const dayAssigned = state.assignments[dateStr] || [];
    
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    if (dateStr === todayStr) dayDiv.classList.add('today');
    if (hol.isHoliday) dayDiv.classList.add('holiday');
    if (isWeekendDay) dayDiv.classList.add('weekend');

    let badgesHtml = '';
    if (hol.isHoliday && hol.label) {
      badgesHtml += `<span class="holiday-tag">${hol.label}</span>`;
    }

    if (isWeekendDay && dayAssigned.length === 0) {
      badgesHtml += `<span class="weekend-closed-text">Kapalı</span>`;
    } else {
      dayAssigned.forEach(id => {
        const p = state.physicians.find(x => x.id === id);
        if (p) {
          badgesHtml += `<span class="physician-pill" style="background:${p.color}">${p.code || p.name.slice(0, 2)}</span>`;
        }
      });
    }

    dayDiv.innerHTML = `
      <div class="day-header">
        <span class="day-number">${d}</span>
      </div>
      <div class="day-badges">${badgesHtml}</div>
    `;

    dayDiv.onclick = () => {
      triggerHaptic();
      openDailySheet(dateStr);
    };
    el.calendarGrid.appendChild(dayDiv);
  }
}

// ================= DAILY ASSIGNMENT BOTTOM SHEET =================
function openDailySheet(dateStr) {
  state.activeSheetDate = dateStr;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayName = TR_DAYS[((new Date(y, m - 1, d).getDay() + 6) % 7)];
  
  el.sheetDateTitle.textContent = `${d} ${TR_MONTHS[m - 1]} ${y}`;
  el.sheetDateSubtitle.textContent = `${dayName} Günü Nöbetçileri`;
  
  const hol = isHoliday(dateStr);
  el.sheetHolidayToggle.checked = hol.isHoliday;

  renderSheetPhysicians();

  el.dailySheetOverlay.classList.remove('hidden');
  el.dailySheet.classList.remove('hidden');
}

function renderSheetPhysicians() {
  const dateStr = state.activeSheetDate;
  const assigned = state.assignments[dateStr] || [];
  
  el.sheetPhysicianList.innerHTML = '';
  
  if (state.physicians.length === 0) {
    el.sheetPhysicianList.innerHTML = '<p style="color:var(--on-surface-secondary);text-align:center;padding:16px;">Kayıtlı hekim bulunamadı.</p>';
    return;
  }

  state.physicians.forEach(p => {
    const isAssigned = assigned.includes(p.id);
    const item = document.createElement('div');
    item.className = `sheet-physician-item ${isAssigned ? 'assigned' : ''}`;
    item.innerHTML = `
      <div class="physician-card-info">
        <div class="physician-badge-circle" style="background:${p.color}">${p.code || p.name.slice(0, 2)}</div>
        <span class="physician-card-name">${p.name}</span>
      </div>
      <div class="check-icon">
        ${isAssigned ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
    `;
    item.onclick = () => {
      triggerHaptic();
      togglePhysicianAssignment(p.id);
    };
    el.sheetPhysicianList.appendChild(item);
  });
}

function togglePhysicianAssignment(physicianId) {
  const dateStr = state.activeSheetDate;
  let current = state.assignments[dateStr] || [];
  
  if (current.includes(physicianId)) {
    current = current.filter(id => id !== physicianId);
  } else {
    current.push(physicianId);
  }

  if (current.length === 0) {
    delete state.assignments[dateStr];
  } else {
    state.assignments[dateStr] = current;
  }

  Storage.set('assignments', state.assignments);
  renderSheetPhysicians();
  renderCalendar();
}

function closeDailySheet() {
  el.dailySheetOverlay.classList.add('hidden');
  el.dailySheet.classList.add('hidden');
  state.activeSheetDate = null;
}

function initDailySheet() {
  el.sheetClose.onclick = closeDailySheet;
  el.dailySheetOverlay.onclick = closeDailySheet;

  el.sheetHolidayToggle.onchange = (e) => {
    triggerHaptic();
    const dateStr = state.activeSheetDate;
    if (!dateStr) return;
    
    if (e.target.checked) {
      state.holidays[dateStr] = { isHoliday: true, label: 'İdari İzin' };
    } else {
      delete state.holidays[dateStr];
    }
    Storage.set('holidays', state.holidays);
    renderCalendar();
  };
}

// ================= APPLY TEMPLATE =================
function applyTemplateToMonth() {
  triggerHaptic();
  const totalDays = daysInMonth(state.currentYear, state.currentMonth);
  let count = 0;

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = toDateStr(state.currentYear, state.currentMonth, d);
    if (isHoliday(dateStr).isHoliday) continue;

    const [y, m] = [state.currentYear, state.currentMonth];
    const dow = ((new Date(y, m - 1, d).getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
    
    // Skip weekends (Saturday=6, Sunday=7)
    if (dow === 6 || dow === 7) continue;

    const templateIds = state.template[String(dow)] || [];
    if (templateIds.length > 0) {
      state.assignments[dateStr] = [...templateIds];
      count++;
    }
  }

  Storage.set('assignments', state.assignments);
  renderCalendar();
  showToast(`Hafta içi şablon uygulandı (${count} gün)`);
}

// ================= PHYSICIANS MANAGEMENT =================
let selectedColor = '#059669';

function initPhysicians() {
  el.addPhysicianBtn.onclick = () => openPhysicianModal();
  el.addFirstPhysicianBtn.onclick = () => openPhysicianModal();
  el.modalClose.onclick = closePhysicianModal;
  el.physicianModalOverlay.onclick = closePhysicianModal;

  el.colorPicker.onclick = (e) => {
    const btn = e.target.closest('.color-option');
    if (!btn) return;
    triggerHaptic();
    el.colorPicker.querySelectorAll('.color-option').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
  };

  el.modalSave.onclick = savePhysician;
  el.modalDelete.onclick = deletePhysician;
}

function renderPhysicians() {
  el.physicianList.innerHTML = '';
  el.physicianCountBadge.textContent = `${state.physicians.length} Hekim`;

  if (state.physicians.length === 0) {
    el.physicianEmpty.classList.remove('hidden');
    return;
  }
  el.physicianEmpty.classList.add('hidden');

  state.physicians.forEach(p => {
    const card = document.createElement('div');
    card.className = 'physician-card';
    card.innerHTML = `
      <div class="physician-card-info">
        <div class="physician-badge-circle" style="background:${p.color}">${p.code || p.name.slice(0, 2)}</div>
        <div>
          <div class="physician-card-name">${p.name}</div>
          <div class="physician-card-code">Etiket Kodu: ${p.code}</div>
        </div>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
    `;
    card.onclick = () => {
      triggerHaptic();
      openPhysicianModal(p);
    };
    el.physicianList.appendChild(card);
  });
}

function openPhysicianModal(physician = null) {
  triggerHaptic();
  if (physician) {
    el.modalTitle.textContent = 'Hekimi Düzenle';
    el.physicianNameInput.value = physician.name;
    el.physicianCodeInput.value = physician.code;
    el.physicianEditId.value = physician.id;
    selectedColor = physician.color;
    el.modalDelete.style.display = 'block';
  } else {
    el.modalTitle.textContent = 'Yeni Hekim Ekle';
    el.physicianNameInput.value = '';
    el.physicianCodeInput.value = '';
    el.physicianEditId.value = '';
    selectedColor = '#059669';
    el.modalDelete.style.display = 'none';
  }

  el.colorPicker.querySelectorAll('.color-option').forEach(b => {
    if (b.dataset.color === selectedColor) b.classList.add('selected');
    else b.classList.remove('selected');
  });

  el.physicianModalOverlay.classList.remove('hidden');
  el.physicianModal.classList.remove('hidden');
}

function closePhysicianModal() {
  el.physicianModalOverlay.classList.add('hidden');
  el.physicianModal.classList.add('hidden');
}

function savePhysician() {
  triggerHaptic();
  const name = el.physicianNameInput.value.trim();
  const code = el.physicianCodeInput.value.trim().toUpperCase();
  const id = el.physicianEditId.value;

  if (!name) {
    showToast('Lütfen hekim ismini girin');
    return;
  }

  if (id) {
    const idx = state.physicians.findIndex(p => p.id === id);
    if (idx !== -1) {
      state.physicians[idx] = { ...state.physicians[idx], name, code: code || name.slice(0, 2), color: selectedColor };
    }
  } else {
    const newPhysician = {
      id: Date.now().toString(),
      name,
      code: code || name.slice(0, 2),
      color: selectedColor
    };
    state.physicians.push(newPhysician);
  }

  Storage.set('physicians', state.physicians);
  closePhysicianModal();
  renderPhysicians();
  renderCalendar();
  showToast('Hekim kaydedildi');
}

function deletePhysician() {
  triggerHaptic();
  const id = el.physicianEditId.value;
  if (!id) return;

  state.physicians = state.physicians.filter(p => p.id !== id);
  
  Object.keys(state.assignments).forEach(date => {
    state.assignments[date] = state.assignments[date].filter(pid => pid !== id);
  });
  Object.keys(state.template).forEach(dow => {
    state.template[dow] = state.template[dow].filter(pid => pid !== id);
  });

  Storage.set('physicians', state.physicians);
  Storage.set('assignments', state.assignments);
  Storage.set('template', state.template);

  closePhysicianModal();
  renderPhysicians();
  renderCalendar();
  showToast('Hekim silindi');
}

// ================= TEMPLATE TAB =================
function renderTemplate() {
  el.templateDays.innerHTML = '';
  const weekdays = TR_DAYS.slice(0, 5);

  weekdays.forEach((dayName, idx) => {
    const dow = String(idx + 1);
    const selectedIds = state.template[dow] || [];

    const dayCard = document.createElement('div');
    dayCard.className = 'template-day-card';

    let chipsHtml = '';
    state.physicians.forEach(p => {
      const isSel = selectedIds.includes(p.id);
      chipsHtml += `
        <button class="template-chip ${isSel ? 'selected' : ''}" 
                data-dow="${dow}" 
                data-pid="${p.id}"
                style="${isSel ? `background:${p.color}` : ''}">
          ${p.name}
        </button>
      `;
    });

    if (state.physicians.length === 0) {
      chipsHtml = '<span style="font-size:12px;color:var(--on-surface-secondary)">Önce hekim ekleyin</span>';
    }

    dayCard.innerHTML = `
      <div class="template-day-title">${dayName}</div>
      <div class="template-physicians-chips">${chipsHtml}</div>
    `;

    el.templateDays.appendChild(dayCard);
  });

  el.templateDays.onclick = (e) => {
    const chip = e.target.closest('.template-chip');
    if (!chip) return;

    triggerHaptic();
    const dow = chip.dataset.dow;
    const pid = chip.dataset.pid;
    let list = state.template[dow] || [];

    if (list.includes(pid)) {
      list = list.filter(id => id !== pid);
    } else {
      list.push(pid);
    }

    state.template[dow] = list;
    Storage.set('template', state.template);
    renderTemplate();
  };
}

// ================= SUMMARY TAB =================
function initSummary() {
  el.summaryPrev.onclick = () => {
    triggerHaptic();
    state.summaryMonth--;
    if (state.summaryMonth < 1) {
      state.summaryMonth = 12;
      state.summaryYear--;
    }
    renderSummary();
  };

  el.summaryNext.onclick = () => {
    triggerHaptic();
    state.summaryMonth++;
    if (state.summaryMonth > 12) {
      state.summaryMonth = 1;
      state.summaryYear++;
    }
    renderSummary();
  };
}

function renderSummary() {
  el.summaryMonthLabel.textContent = `${TR_MONTHS[state.summaryMonth - 1]} ${state.summaryYear}`;
  el.summaryList.innerHTML = '';

  const totalDays = daysInMonth(state.summaryYear, state.summaryMonth);
  const counts = {};
  let totalShifts = 0;

  state.physicians.forEach(p => { counts[p.id] = 0; });

  for (let d = 1; d <= totalDays; d++) {
    const dateStr = toDateStr(state.summaryYear, state.summaryMonth, d);
    const assigned = state.assignments[dateStr] || [];
    assigned.forEach(pid => {
      if (counts[pid] !== undefined) {
        counts[pid]++;
        totalShifts++;
      }
    });
  }

  if (state.physicians.length === 0) {
    el.summaryList.innerHTML = '<p style="color:var(--on-surface-secondary);text-align:center;padding:24px;">Kayıtlı hekim yok.</p>';
    el.summaryTotal.textContent = 'Toplam Nöbet: 0';
    return;
  }

  state.physicians.forEach(p => {
    const cnt = counts[p.id] || 0;
    const card = document.createElement('div');
    card.className = 'summary-card';
    card.innerHTML = `
      <div class="summary-card-left">
        <div class="physician-badge-circle" style="background:${p.color}">${p.code || p.name.slice(0, 2)}</div>
        <span class="physician-card-name">${p.name}</span>
      </div>
      <div class="summary-count-badge">${cnt} nöbet</div>
    `;
    el.summaryList.appendChild(card);
  });

  el.summaryTotal.textContent = `Toplam Aylık Nöbet: ${totalShifts}`;
}

// ================= RENDER ALL =================
function renderAll() {
  renderCalendar();
  renderPhysicians();
  renderTemplate();
  renderSummary();
}

// ================= SERVICE WORKER REGISTRATION & AUTO-UPDATE =================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js?v=5')
      .then((reg) => {
        reg.update();
        console.log('PWA Service Worker registered:', reg.scope);
      })
      .catch((err) => console.log('PWA Service Worker failed:', err));
  });
}

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', () => {
  startAppFlow();
  initNav();
  initCalendar();
  initDailySheet();
  initPhysicians();
  initSummary();
});
