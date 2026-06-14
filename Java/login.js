/* ============================================================
   ISAM — login.js
   Koneksi ke Google Apps Script → MASTER_EMPLOYEE
   Versi : 2.0
   ============================================================ */

'use strict';

// ── KONFIGURASI ──────────────────────────────────────────────
var API_URL = 'https://script.google.com/macros/s/AKfycbyj_4pc-IxMd3VEt45l-ycdvqeiEdCia7wl6W-1oc6cnmZDdjeS-9x10gnQ6SUZfv7j/exec';

/**
 * Map nilai role di sheet → value radio button di form
 * Role "Inspektor" TIDAK login — diarahkan ke form eksternal via tombol.
 */
var ROLE_MAP = {
  'administrator' : 'admin',
  'admin'         : 'admin',
  'pic'           : 'pic',
  'pic area'      : 'pic',
  'viewer'        : 'viewer',
  'safety captain': 'viewer',
  'captain'       : 'viewer',
  'lead ssb'      : 'viewer',
};

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
   FETCH HELPER
   ============================================================ */
/**
 * Fetch data dari Apps Script.
 * @param {string} sheetName
 * @returns {Promise<Array>}
 */
function fetchSheet(sheetName) {
  var url = API_URL + '?sheet=' + encodeURIComponent(sheetName);
  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('Gagal fetch sheet "' + sheetName + '": ' + res.status);
      return res.json();
    })
    .then(function (json) {
      return json.data || [];
    });
}

/**
 * Fetch MASTER_AREA → Map { 'AR001': 'KGB', 'AR002': 'GRB', … }
 * @returns {Promise<Object>}
 */
function fetchAreaMap() {
  return fetchSheet('MASTER_AREA').then(function (rows) {
    var map = {};
    rows.forEach(function (r) {
      var keys = Object.keys(r);
      if (keys.length < 2) return;
      var kode = String(r[keys[0]] || '').trim().toUpperCase();
      var nama = String(r[keys[1]] || '').trim();
      if (kode) map[kode] = nama;
    });
    return map;
  });
}

/**
 * Fetch & normalise MASTER_EMPLOYEE.
 * @returns {Promise<Array>}
 */
function fetchEmployees() {
  return fetchSheet('MASTER_EMPLOYEE').then(function (rows) {
    return rows
      .filter(function (r) { return r['email']; })
      .map(function (r) {
        var rawRole    = String(r['role']     || '').trim().toLowerCase();
        var mappedRole = ROLE_MAP[rawRole]   || rawRole;
        return {
          email    : String(r['email']    || '').trim().toLowerCase(),
          password : String(r['Sandi_id'] || '').trim(),
          role     : mappedRole,
          nama     : String(r['nama']     || '').trim(),
          area_id  : String(r['area_id']  || '').trim().toUpperCase(),
          jabatan  : String(r['jabatan']  || '').trim(),
        };
      });
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
  var btn = document.getElementById('login-btn');
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
   MAIN LOGIN
   ============================================================ */
function doLogin() {
  /* Ambil nilai form */
  var emailInput = (document.getElementById('inp-email').value   || '').trim().toLowerCase();
  var pwInput    = (document.getElementById('inp-password').value || '').trim();
  var roleEl     = document.querySelector('input[name="role"]:checked');
  var roleInput  = roleEl ? roleEl.value : '';

  /* Validasi field kosong */
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

  /* Fetch paralel */
  Promise.all([fetchEmployees(), fetchAreaMap()])
    .then(function (results) {
      var employees = results[0];
      var areaMap   = results[1];

      /* Cari user yang cocok */
      var user = null;
      for (var i = 0; i < employees.length; i++) {
        var e = employees[i];
        if (e.email === emailInput && e.password === pwInput && e.role === roleInput) {
          user = e;
          break;
        }
      }

      if (!user) {
        /* Feedback spesifik */
        var emailExists = employees.some(function (e) { return e.email === emailInput; });
        var roleMatch   = employees.some(function (e) { return e.email === emailInput && e.role === roleInput; });

        if (!emailExists) {
          showAlert('Email tidak terdaftar di sistem.');
        } else if (!roleMatch) {
          showAlert('Role yang dipilih tidak sesuai dengan akun ini.');
        } else {
          showAlert('Password salah. Silakan coba lagi.');
        }

        document.getElementById('inp-email').classList.add('error');
        document.getElementById('inp-password').classList.add('error');
        return;
      }

      /* Resolve nama area */
      var namaArea = areaMap[user.area_id] || user.area_id || '-';

      /* Simpan sesi */
      var remember = document.getElementById('remember-me').checked;
      var storage  = remember ? localStorage : sessionStorage;
      storage.setItem('isam_user', JSON.stringify({
        email     : user.email,
        nama      : user.nama,
        role      : user.role,
        jabatan   : user.jabatan,
        area_id   : user.area_id,
        area_nama : namaArea,
      }));

      /* Redirect */
      var target = DASHBOARD[user.role];
      if (!target) {
        showAlert('Role "' + user.role + '" tidak memiliki dashboard yang terdaftar.');
        return;
      }

      showToast('✅ Selamat datang, ' + (user.nama || user.email) + '! (' + namaArea + ')');
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
   DEMO FILL (untuk testing — bisa dihapus di produksi)
   ============================================================ */
function fillDemo(email, password, role) {
  document.getElementById('inp-email').value    = email;
  document.getElementById('inp-password').value = password;
  var radioEl = document.getElementById('role-' + role);
  if (radioEl) radioEl.checked = true;
  showToast('✅ Demo credential diisi — klik Login');
}