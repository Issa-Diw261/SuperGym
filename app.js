// ==========================================
// 1. إعدادات تيليجرام والأمان
// ==========================================
const TELEGRAM_CONFIG = {
  botUsername: "SuperGymBackup_bot", // يوزر البوت لفتح المحادثة مباشرة
};

const MASTER_PIN = "1234"; // رمز فك القفل الافتراضي

// ==========================================
// 2. نظام القفل التلقائي بعد دقيقة سكون
// ==========================================
const lockScreen = document.getElementById("lockScreen");
const unlockForm = document.getElementById("unlockForm");
const pinInput = document.getElementById("pinInput");
const lockError = document.getElementById("lockError");
const manualLockBtn = document.getElementById("manualLockBtn");

let idleTimer = null;
const IDLE_TIME_LIMIT = 60 * 1000; // دقيقة واحدة (60 ثانية)

function lockApp() {
  lockScreen.classList.remove("hide");
  pinInput.value = "";
  lockError.textContent = "";
  setTimeout(() => pinInput.focus(), 200);
}

function unlockApp() {
  lockScreen.classList.add("hide");
  resetIdleTimer();
}

function resetIdleTimer() {
  clearTimeout(idleTimer);
  if (lockScreen.classList.contains("hide")) {
    idleTimer = setTimeout(lockApp, IDLE_TIME_LIMIT);
  }
}

["mousemove", "mousedown", "keydown", "touchstart", "scroll"].forEach((evt) => {
  window.addEventListener(evt, resetIdleTimer, { passive: true });
});

resetIdleTimer();

manualLockBtn.addEventListener("click", lockApp);

unlockForm.addEventListener("submit", (e) => {
  e.preventDefault();
  if (pinInput.value.trim() === MASTER_PIN) {
    unlockApp();
  } else {
    lockError.textContent = "الرمز السري غير صحيح!";
    pinInput.value = "";
    pinInput.focus();
  }
});

// ==========================================
// 3. شاشة البداية (Splash Screen)
// ==========================================
const splashScreen = document.getElementById("splashScreen");

function dismissSplashScreen() {
  if (splashScreen && !splashScreen.classList.contains("hide")) {
    splashScreen.classList.add("hide");
    sessionStorage.setItem("supergym_splash_shown", "true");
    setTimeout(() => {
      document.getElementById("memberSearchInput").focus();
    }, 400);
  }
}

if (sessionStorage.getItem("supergym_splash_shown") === "true") {
  splashScreen.style.display = "none";
} else {
  const splashTimer = setTimeout(dismissSplashScreen, 1500);
  splashScreen.addEventListener("click", () => {
    clearTimeout(splashTimer);
    dismissSplashScreen();
  });
}

// ==========================================
// 4. قاعدة البيانات وإدارة الحالة
// ==========================================
let members = JSON.parse(localStorage.getItem("supergym_members")) || [];
let currentMember = null;

const searchInput = document.getElementById("memberSearchInput");
const searchDropdown = document.getElementById("searchResultsDropdown");
const resultCard = document.getElementById("resultCard");
const resName = document.getElementById("resName");
const resDetails = document.getElementById("resDetails");
const resStatus = document.getElementById("resStatus");
const renewBtn = document.getElementById("renewBtn");
const addMemberForm = document.getElementById("addMemberForm");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeIcon = document.getElementById("themeIcon");

const openDrawerBtn = document.getElementById("openDrawerBtn");
const closeDrawerBtn = document.getElementById("closeDrawerBtn");
const expiringDrawer = document.getElementById("expiringDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const drawerExpiringList = document.getElementById("drawerExpiringList");
const expiringContainer = document.getElementById("expiringContainer");
const expiringCountBadge = document.getElementById("expiringCountBadge");

// تبديل الوضع (ليلي / نهاري)
let currentTheme = localStorage.getItem("supergym_theme") || "dark";
applyTheme(currentTheme);

themeToggleBtn.addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(currentTheme);
});

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("supergym_theme", theme);
  themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

// ==========================================
// 5. البحث الذكي والإكمال التلقائي
// ==========================================
searchInput.addEventListener("input", function () {
  const query = this.value.trim().toLowerCase();
  searchDropdown.innerHTML = "";

  if (!query) {
    searchDropdown.style.display = "none";
    return;
  }

  const matches = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query) || m.id.toString().includes(query),
  );

  if (matches.length === 0) {
    searchDropdown.style.display = "none";
    return;
  }

  matches.slice(0, 5).forEach((m) => {
    const item = document.createElement("div");
    item.className = "search-dropdown-item";
    item.innerHTML = `
      <span class="dropdown-item-name">${m.name}</span>
      <span class="dropdown-item-meta">#${m.id} | ${m.phone}</span>
    `;
    item.addEventListener("click", () => {
      searchInput.value = m.id;
      searchDropdown.style.display = "none";
      checkMember(m.id);
    });
    searchDropdown.appendChild(item);
  });

  searchDropdown.style.display = "block";
});

document.addEventListener("click", function (e) {
  if (!searchInput.contains(e.target) && !searchDropdown.contains(e.target)) {
    searchDropdown.style.display = "none";
  }
});

searchInput.addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    const val = this.value.trim();
    searchDropdown.style.display = "none";

    if (!val) return;

    if (!isNaN(val)) {
      const id = parseInt(val);
      if (id < 101) {
        alert("أرقام المشتركين تبدأ من 101 فما فوق.");
        return;
      }
      checkMember(id);
    } else {
      const matched = members.find((m) =>
        m.name.toLowerCase().includes(val.toLowerCase()),
      );
      if (matched) {
        checkMember(matched.id);
      } else {
        showNotFound(val);
      }
    }
    this.select();
  }
});

function showNotFound(identifier) {
  resultCard.style.display = "block";
  resultCard.className = "result-card expired";
  resName.textContent = "غير مسجل";
  resDetails.textContent = "";
  resStatus.textContent = `المشترك (${identifier}) غير مسجل في سوبر جيم`;
  resStatus.style.color = "var(--dark-red)";
  renewBtn.style.display = "none";
}

function checkMember(id) {
  currentMember = members.find((m) => m.id === id);
  resultCard.style.display = "block";

  if (!currentMember) {
    showNotFound(id);
    return;
  }

  resName.textContent = currentMember.name;
  resDetails.textContent = `رقم الكرت: #${currentMember.id} | الفئة: ${currentMember.gender} | النشاط: ${currentMember.activity} | الهاتف: ${currentMember.phone}`;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(currentMember.endDate);
  const diffTime = end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays >= 0) {
    resultCard.className = "result-card active";
    resStatus.textContent = `اشتراك سارٍ (متبقي ${diffDays} يوم - حتى ${currentMember.endDate})`;
    resStatus.style.color = "var(--green)";
    renewBtn.style.display = "none";
  } else {
    resultCard.className = "result-card expired";
    resStatus.textContent = `اشتراك منتهي منذ ${Math.abs(diffDays)} يوم (انتهى في ${currentMember.endDate})`;
    resStatus.style.color = "var(--dark-red)";
    renewBtn.style.display = "inline-block";
  }
}

// ==========================================
// 6. التجديد والتسجيل
// ==========================================
renewBtn.addEventListener("click", function () {
  if (!currentMember) return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentEnd = new Date(currentMember.endDate);

  let baseDate = currentEnd < today ? today : currentEnd;
  const newEnd = new Date(baseDate);
  newEnd.setMonth(newEnd.getMonth() + 1);

  currentMember.endDate = newEnd.toISOString().split("T")[0];
  saveData();
  checkMember(currentMember.id);
  renderExpiring();
  alert(
    `تم تجديد الاشتراك للاعب ${currentMember.name} لمدة شهر حتى تاريخ: ${currentMember.endDate}`,
  );
});

addMemberForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("newFullName").value.trim();
  const phone = document.getElementById("newPhone").value.trim();
  const gender = document.getElementById("memberGender").value;
  const activity = document.getElementById("memberActivity").value;
  const duration = parseInt(document.getElementById("newDuration").value);

  const phoneRegex = /^09\d{8}$/;
  if (!phoneRegex.test(phone)) {
    alert(
      "تنبيه: يجب أن يبدأ رقم الهاتف بـ 09 ويتكون من 10 أرقام ويحوي واتساب فعال.",
    );
    document.getElementById("newPhone").focus();
    return;
  }

  const nextId =
    members.length > 0 ? Math.max(...members.map((m) => m.id)) + 1 : 101;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + duration);

  const newMember = {
    id: nextId,
    name: name,
    phone: phone,
    gender: gender,
    activity: activity,
    startDate: startDate.toISOString().split("T")[0],
    endDate: endDate.toISOString().split("T")[0],
    lastReminderDate: null,
  };

  members.push(newMember);
  saveData();
  renderExpiring();
  this.reset();

  alert(
    `تم تسجيل المشترك بنجاح في سوبر جيم!\nالاسم: ${name}\nرقم الكرت: ${nextId}`,
  );
  searchInput.value = nextId;
  checkMember(nextId);
});

function saveData() {
  localStorage.setItem("supergym_members", JSON.stringify(members));
}

// ==========================================
// 7. التنبيهات واللوحة الجانبية
// ==========================================
openDrawerBtn.addEventListener("click", () => {
  expiringDrawer.classList.add("active");
  drawerBackdrop.classList.add("active");
});

function closeDrawer() {
  expiringDrawer.classList.remove("active");
  drawerBackdrop.classList.remove("active");
}

closeDrawerBtn.addEventListener("click", closeDrawer);
drawerBackdrop.addEventListener("click", closeDrawer);

window.handleWhatsAppReminder = function (id) {
  const member = members.find((m) => m.id === id);
  if (!member) return;

  const todayStr = new Date().toISOString().split("T")[0];
  member.lastReminderDate = todayStr;
  saveData();

  const msg = encodeURIComponent(
    `مرحباً ${member.name}، نود تذكيرك من إدارة نادي سوبر جيم بقرب انتهاء اشتراكك بتاريخ ${member.endDate}. نتشرف بوجودك دائماً.`,
  );
  window.open(`https://wa.me/${member.phone}?text=${msg}`, "_blank");

  renderExpiring();
};

function generateExpiringItemHTML(m) {
  const todayStr = new Date().toISOString().split("T")[0];
  const isSentToday = m.lastReminderDate === todayStr;

  return `
    <div class="expiring-item">
      <div class="expiring-info">
        <span><strong>#${m.id}</strong> ${m.name} (${m.activity})</span>
        <small style="color: var(--text-muted)">ينتهي: ${m.endDate} | هاتف: ${m.phone}</small>
      </div>
      <div class="wa-actions-wrapper">
        ${
          isSentToday
            ? `<span class="wa-btn sent-today">تم الإرسال اليوم ✓</span>
             <a class="wa-btn-retry" href="javascript:void(0)" onclick="handleWhatsAppReminder(${m.id})">تذكير مرة أخرى</a>`
            : `<a class="wa-btn" href="javascript:void(0)" onclick="handleWhatsAppReminder(${m.id})">إرسال واتساب</a>`
        }
      </div>
    </div>
  `;
}

function renderExpiring() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiring = members.filter((m) => {
    const end = new Date(m.endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  });

  expiringCountBadge.textContent = expiring.length;

  if (expiring.length === 0) {
    expiringContainer.textContent = "لا توجد اشتراكات تنتهي خلال 3 أيام.";
    drawerExpiringList.textContent = "لا توجد اشتراكات تنتهي خلال 3 أيام.";
    openDrawerBtn.style.display = "none";
    return;
  }

  const previewItems = expiring.slice(0, 2);
  expiringContainer.innerHTML = previewItems
    .map((m) => generateExpiringItemHTML(m))
    .join("");
  drawerExpiringList.innerHTML = expiring
    .map((m) => generateExpiringItemHTML(m))
    .join("");

  if (expiring.length > 2) {
    openDrawerBtn.style.display = "block";
    openDrawerBtn.textContent = `عرض كل التنبيهات (${expiring.length}) ❯`;
  } else {
    openDrawerBtn.style.display = "none";
  }
}

renderExpiring();

// ==========================================
// 8. النسخ الاحتياطي وفتح محادثة التيليجرام
// ==========================================
const sendBackupTelegramBtn = document.getElementById("sendBackupTelegramBtn");
const restoreFileInput = document.getElementById("restoreFileInput");
const backupStatus = document.getElementById("backupStatus");

sendBackupTelegramBtn.addEventListener("click", () => {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const fileName = `supergym_backup_${dateStr}.json`;
  const dataString = JSON.stringify(members, null, 2);

  // 1. تنزيل ملف النسخة الاحتياطية على الكمبيوتر فوراً
  const blob = new Blob([dataString], { type: "application/json" });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);

  // 2. فتح محادثة البوت في تيليجرام
  const tgUrl = `https://t.me/${TELEGRAM_CONFIG.botUsername}`;
  window.open(tgUrl, "_blank");

  // 3. تحديث رسالة الحالة
  backupStatus.style.color = "var(--green)";
  backupStatus.textContent = `✓ تم تنزيل الملف (${fileName}) وفتح البوت في تيليجرام بنجاح!`;
});

// استعادة النسخة الاحتياطية من ملف
restoreFileInput.addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        if (
          confirm(
            `هل أنت متأكد من استعادة هذه النسخة؟ ستحتوي على (${imported.length}) مشترك وستستبدل البيانات الحالية.`,
          )
        ) {
          members = imported;
          saveData();
          renderExpiring();
          alert("تم استعادة كافة بيانات المشتركين بنجاح!");
          location.reload();
        }
      } else {
        alert("الملف المحدد لا يحتوي على بنية بيانات صحيحة لنادي سوبر جيم.");
      }
    } catch (err) {
      alert("حدث خطأ أثناء قراءة ملف النسخة الاحتياطية.");
    }
  };
  reader.readAsText(file);
});
