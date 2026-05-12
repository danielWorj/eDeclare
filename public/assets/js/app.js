/**
 * app.js — Mairie / Hôpital Portail
 * Utilitaires partagés : modales, fichiers, toasts, navigation
 */

/* ─── Modales ───────────────────────────────────────────────── */
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  document.body.style.overflow = '';
}

// Fermer en cliquant sur l'overlay
document.addEventListener('click', function (e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

// Fermer avec Échap
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(function (m) {
      m.classList.remove('open');
    });
    document.body.style.overflow = '';
  }
});

/* ─── File inputs ───────────────────────────────────────────── */
document.addEventListener('change', function (e) {
  if (e.target.type === 'file') {
    const zone = e.target.closest('.file-input-zone');
    if (!zone) return;
    const nameEl = zone.querySelector('.file-input-filename');
    if (!nameEl) return;
    if (e.target.files && e.target.files.length > 0) {
      nameEl.textContent = e.target.files[0].name;
      nameEl.style.display = 'block';
      zone.style.borderColor = 'var(--primary)';
      zone.style.background = 'var(--primary-xlight)';
    } else {
      nameEl.style.display = 'none';
      zone.style.borderColor = '';
      zone.style.background = '';
    }
  }
});

/* ─── Toast notifications ───────────────────────────────────── */
function showToast(message, type) {
  type = type || 'success';
  var toast = document.createElement('div');
  toast.className = 'toast-notif toast-' + type;
  toast.innerHTML =
    '<span class="toast-icon">' + (type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ') + '</span>' +
    '<span>' + message + '</span>';

  var style = toast.style;
  style.cssText = [
    'position:fixed', 'bottom:1.5rem', 'right:1.5rem', 'z-index:9999',
    'background:' + (type === 'success' ? '#15803d' : type === 'error' ? '#dc2626' : '#003189'),
    'color:#fff', 'padding:.7rem 1.25rem', 'border-radius:8px',
    'font-size:13.5px', 'font-weight:600', 'font-family:var(--font-body)',
    'display:flex', 'align-items:center', 'gap:.6rem',
    'box-shadow:0 8px 24px rgba(0,0,0,.18)',
    'transition:all .3s ease', 'opacity:0', 'transform:translateY(8px)'
  ].join(';');

  document.body.appendChild(toast);
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    });
  });

  setTimeout(function () {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    setTimeout(function () { toast.remove(); }, 350);
  }, 3500);
}

/* ─── Navigation sidebar active ────────────────────────────── */
function setSidebarActive(id) {
  document.querySelectorAll('.sidebar-link').forEach(function (l) {
    l.classList.remove('active');
  });
  var el = document.getElementById(id);
  if (el) el.classList.add('active');
}

/* ─── Toggle section (tabs dans dashboard) ──────────────────── */
function showSection(sectionId, linkEl) {
  document.querySelectorAll('.dash-section').forEach(function (s) {
    s.style.display = 'none';
  });
  var target = document.getElementById(sectionId);
  if (target) target.style.display = 'block';

  document.querySelectorAll('.sidebar-link[data-section]').forEach(function (l) {
    l.classList.remove('active');
  });
  if (linkEl) linkEl.classList.add('active');
}

/* ─── Password toggle ───────────────────────────────────────── */
function togglePassword(inputId, iconEl) {
  var input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  } else {
    input.type = 'password';
    iconEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
  }
}

/* ─── Confirm dialog simple ─────────────────────────────────── */
function confirmAction(message, onConfirm) {
  if (window.confirm(message)) {
    onConfirm();
  }
}

/* ─── Formulaire submit demo ────────────────────────────────── */
function handleFormSubmit(modalId, successMessage) {
  closeModal(modalId);
  showToast(successMessage || 'Enregistrement effectué avec succès.', 'success');
}
