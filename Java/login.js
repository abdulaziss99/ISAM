/* ============================================================
   ISAM — login.js
   Koneksi ke Google Apps Script → MASTER_EMPLOYEE
   Versi : 3.0 — auth via doPost (password tidak lewat GET)
   ============================================================ */

'use strict';

// ── KONFIGURASI ──────────────────────────────────────────────
// Ganti URL ini setelah re-deploy GAS sebagai Web App
var API_URL = 'https://script.google.com/macros/s/AKfycbwPmThYgP9WSxLE8RFmSfNxsVYmdsSLmm6oRNGP42ArVVIpLs914jam3QydYHHxwc0vsA/exec';

/** Role → halaman dashboard tujuan */
var DASHBOARD = {
  pic    : 'pic.html',
  viewer : 'safety.html',
  admin  : 'admin.html',
};
// ─────────────────────────────────────────────────────────────


/* ============================================================
   CEK SESI AKTIF → langsung redirect jika sudah login
   ============================================================ */
(function checkExistingSession() {
  var stored = sessionStorage.getItem('isam_user') || localStorage.getItem('isam_user');
  if (!stored) return;
  try {
    var user   = JSON.parse(stored);
    var target = DASHBOARD[user && user.role];
    if (target) window.location.replace(target);
  } catch (e) {
    sessionStorage.removeItem('isam_user');
    localStorage.removeItem('isam_user');
  }
})();


/* ============================================================
   FETCH HELPER — GET (untuk lookup map saja)
   ============================================================ */
function fetchSheet(sheetName) {
  var url = API_URL + '?sheet=' + encodeURIComponent(sheetName);
  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Gagal fetch sheet "' + sheetName + '": ' + res.status);
      return res.json();
    })
    .then(function (json) {
      if (!json.success) throw new Error(json.message || 'Gagal membaca data.');
      return json.data || [];
    });
}


/* ============================================================
   POST HELPER — Auth via doPost (aman, password tidak di URL)
   ============================================================ */
function postLogin(email, password, role) {
  return fetch(API_URL, {
    method      : 'POST',
    // GAS doPost tidak mendukung Content-Type application/json langsung
    // dari cross-origin, jadi kita kirim sebagai text/plain
    headers     : { 'Content-Type': 'text/plain;charset=utf-8' },
    body        : JSON.stringify({ email: email, password: password, role: role }),
    redirect    : 'follow',
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Server error: ' + res.status);
      return res.json();
    });
}


/* ============================================================
   UI HELPERS
   ============================================================ */
var toastTimer = null;

function showToast(msg) {
  var el = document.getElementById('toast-el');
  document.getElementById('toast-txt').textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
}

function showAlert(msg) {
  var el  = document.getElementById('alert-error');
  var txt = document.getElementById('alert-msg');
  if (txt) txt.textContent = msg;
  el.classList.add('show');
}

function clearFieldError(inputId, errId) {
  document.getElementById('alert-error').classList.remove('show');
  var inp = document.getElementById(inputId);
  var err = document.getElementById(errId);
  if (inp) inp.classList.remove('error');
  if (err) err.classList.remove('show');
}

function setLoading(on) {
  var btn  = document.getElementById('login-btn');
  var hint = document.getElementById('network-hint');
  if (!btn) return;
  if (on) {
    btn.classList.add('loading');
    btn.disabled = true;
    if (hint) hint.style.display = 'block';
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (hint) hint.style.display = 'none';
  }
}


/* ============================================================
   TOGGLE PASSWORD VISIBILITY
   ============================================================ */
function togglePw() {
  var inp  = document.getElementById('inp-password');
  var icon = document.getElementById('pw-icon');
  var show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  icon.innerHTML = show
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
}


/* ============================================================
   MAIN LOGIN — pakai doPost
   ============================================================ */
function doLogin() {
  // Ambil nilai form
  var emailInput = (document.getElementById('inp-email').value    || '').trim().toLowerCase();
  var pwInput    = (document.getElementById('inp-password').value  || '').trim();
  var roleEl     = document.querySelector('input[name="role"]:checked');
  var roleInput  = roleEl ? roleEl.value : '';

  // Validasi kosong
  var hasErr = false;
  if (!emailInput) {
    document.getElementById('inp-email').classList.add('error');
    document.getElementById('err-username').classList.add('show');
    hasErr = true;
  }
  if (!pwInput) {
    document.getElementById('inp-password').classList.add('error');
    document.getElementById('err-password').classList.add('show');
    hasErr = true;
  }
  if (!roleInput) {
    showToast('⚠️ Pilih role terlebih dahulu.');
    hasErr = true;
  }
  if (hasErr) return;

  setLoading(true);

  // Kirim ke GAS via POST — GAS yang verifikasi & catat last_login
  postLogin(emailInput, pwInput, roleInput)
    .then(function (json) {
      if (!json.success) {
        showAlert(json.message || 'Login gagal. Periksa kembali credential Anda.');
        document.getElementById('inp-email').classList.add('error');
        document.getElementById('inp-password').classList.add('error');
        return;
      }

      var user = json.user;

      // Simpan sesi
      var remember = document.getElementById('remember-me').checked;
      var storage  = remember ? localStorage : sessionStorage;
      storage.setItem('isam_user', JSON.stringify({
        employee_id  : user.employee_id,
        email        : user.email,
        nama         : user.nama,
        role         : user.role,
        jabatan      : user.jabatan,
        company_id   : user.company_id,
        company_nama : user.company_nama,
        area_id      : user.area_id,
        area_nama    : user.area_nama,
        subarea_id   : user.subarea_id,
        subarea_nama : user.subarea_nama,
        last_login   : user.last_login,
      }));

      // Redirect berdasarkan role
      var target = DASHBOARD[user.role];
      if (!target) {
        showAlert('Role "' + user.role + '" tidak memiliki dashboard yang terdaftar.');
        return;
      }

      showToast('✅ Selamat datang, ' + (user.nama || user.email) + '! (' + user.area_nama + ')');
      setTimeout(function () { window.location.href = target; }, 900);
    })
    .catch(function (err) {
      console.error('[ISAM] Login error:', err);
      showAlert('Gagal terhubung ke server. Cek koneksi internet dan coba lagi.');
    })
    .finally(function () {
      setLoading(false);
    });
}


/* ============================================================
   ENTER KEY → submit
   ============================================================ */
document.addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    var btn = document.getElementById('login-btn');
    if (btn && !btn.disabled) doLogin();
  }
});


/* ============================================================
   DEMO FILL (untuk testing — hapus di produksi)
   ============================================================ */
function fillDemo(email, password, role) {
  document.getElementById('inp-email').value    = email;
  document.getElementById('inp-password').value = password;
  var radioEl = document.getElementById('role-' + role);
  if (radioEl) radioEl.checked = true;
  showToast('✅ Demo credential diisi — klik Login');
}
