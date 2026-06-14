/* ============================================================
   ISAM Landing Page — app.js
   Versi : 1.0
   ============================================================ */

'use strict';

/* ============================================================
   NAVBAR — scroll effect & active link
   ============================================================ */
var navbar     = document.getElementById('navbar');
var mobileMenu = document.getElementById('mobile-menu');
var hamburger  = document.getElementById('hamburger');
var toastTimer = null;

window.addEventListener('scroll', function () {
  if (window.scrollY > 40) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
  updateActiveNav();
});

/* Hamburger toggle */
hamburger.addEventListener('click', function () {
  mobileMenu.classList.toggle('open');
});

/* Close mobile menu on link click */
document.querySelectorAll('.mobile-link').forEach(function (link) {
  link.addEventListener('click', function () {
    mobileMenu.classList.remove('open');
  });
});

/* Active nav highlight on scroll */
function updateActiveNav() {
  var sections = ['home', 'dashboard', 'pic-area', 'about', 'contact'];
  var scrollY  = window.scrollY + 100;

  sections.forEach(function (id) {
    var el = document.getElementById('sec-' + id);
    if (!el) return;
    var top    = el.offsetTop;
    var bottom = top + el.offsetHeight;
    var link   = document.querySelector('[data-nav="' + id + '"]');
    if (!link) return;

    if (scrollY >= top && scrollY < bottom) {
      document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('active'); });
      link.classList.add('active');
    }
  });
}

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */
function scrollTo(id) {
  var el = document.getElementById('sec-' + id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
  mobileMenu.classList.remove('open');
}

/* ============================================================
   SESSION CHECK — tampilkan profile badge jika sudah login
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
  checkSession();
  initCounters();
  updateActiveNav();
});

function checkSession() {
  try {
    var raw = sessionStorage.getItem('isam_user');
    if (!raw) return;
    var user = JSON.parse(raw);
    if (!user || !user.nama) return;

    /* Sembunyikan tombol Login / Masuk, tampilkan profile badge */
    var loginBtns = document.querySelectorAll('.btn-nav-login, .btn-nav-primary');
    loginBtns.forEach(function (b) { b.style.display = 'none'; });

    var badge    = document.getElementById('profile-badge');
    var avaEl    = document.getElementById('profile-ava');
    var nameEl   = document.getElementById('profile-name');
    var roleEl   = document.getElementById('profile-role');

    if (badge) {
      var inisial = user.nama.split(' ').map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();
      avaEl.textContent  = inisial;
      nameEl.textContent = user.nama;
      roleEl.textContent = getRoleLabel(user.role);
      badge.style.display = 'flex';
    }

  } catch (e) { /* ignore */ }
}

function getRoleLabel(role) {
  var map = { admin: '⚙️ Admin', captain: '🛡 Safety Captain', inspektor: '🔍 Inspektor', pic: '🛠 PIC Area' };
  return map[role] || role;
}

function goDashboard() {
  try {
    var raw  = sessionStorage.getItem('isam_user');
    var user = raw ? JSON.parse(raw) : null;
    if (user && user.role) {
      var map = { admin: 'admin.html', captain: 'captain.html', inspektor: 'inspeksi.html', pic: 'pic.html' };
      window.location.href = map[user.role] || 'login.html';
    } else {
      window.location.href = 'login.html';
    }
  } catch (e) {
    window.location.href = 'login.html';
  }
}

function doLogout() {
  try { sessionStorage.removeItem('isam_user'); } catch (e) {}
  window.location.reload();
}

/* ============================================================
   ANIMATED COUNTERS
   ============================================================ */
function initCounters() {
  var counters = document.querySelectorAll('[data-count]');
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(function (el) { observer.observe(el); });
}

function animateCounter(el) {
  var target   = parseInt(el.getAttribute('data-count'), 10);
  var suffix   = el.getAttribute('data-suffix') || '';
  var duration = 1400;
  var start    = 0;
  var step     = target / (duration / 16);

  var timer = setInterval(function () {
    start += step;
    if (start >= target) {
      start = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(start).toLocaleString('id-ID') + suffix;
  }, 16);
}

/* ============================================================
   CONTACT FORM — submit
   ============================================================ */
function submitContact(e) {
  e.preventDefault();
  var nama    = document.getElementById('cf-nama').value.trim();
  var email   = document.getElementById('cf-email').value.trim();
  var subject = document.getElementById('cf-subject').value;
  var pesan   = document.getElementById('cf-pesan').value.trim();

  if (!nama || !email || !subject || !pesan) {
    showToast('⚠️ Lengkapi semua field terlebih dahulu!');
    return;
  }

  /* Simulasi submit */
  var btn = document.getElementById('btn-contact-submit');
  btn.disabled  = true;
  btn.textContent = '⏳ Mengirim…';

  setTimeout(function () {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Kirim Pesan';
    document.getElementById('contact-form').reset();
    showToast('✅ Pesan berhasil dikirim! Kami akan menghubungi Anda segera.');
  }, 1200);
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg) {
  var el = document.getElementById('toast-el');
  document.getElementById('toast-txt').textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
}