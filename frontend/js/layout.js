/* ═══════════════════════════════════════════
   TapControl — Shared Layout (Sidebar + Topbar)
   ═══════════════════════════════════════════ */

// Call this from each page's <script>, passing the active nav id
// e.g.  renderLayout('consumers');
function renderLayout(activePage) {

  const navItems = [
    { section: 'Main' },
    { id: 'dashboard', icon: 'bi-speedometer2', label: 'Dashboard',        href: 'index.html' },
    { section: 'Management' },
    { id: 'consumers', icon: 'bi-people',        label: 'Consumers',        href: 'consumers.html' },
    { id: 'meters',    icon: 'bi-speedometer',   label: 'Meter Readings',   href: 'meters.html' },
    { id: 'districts', icon: 'bi-geo-alt',       label: 'Districts',        href: 'districts.html' },
    { id: 'staff',     icon: 'bi-person-badge',  label: 'Staff',            href: 'staff.html' },
    { section: 'Finance' },
    { id: 'billing',   icon: 'bi-receipt',       label: 'Billing',          href: 'billing.html' },
    { id: 'payments',  icon: 'bi-credit-card',   label: 'Payments',         href: 'payments.html' },
    { section: 'Operations' },
    { id: 'requests',  icon: 'bi-tools',         label: 'Service Requests', href: 'servicerequest.html', badge: true },
    { id: 'logout',    icon: 'bi-box-arrow-left',label: 'Logout',           href: '#', danger: true },
  ];

  let navHtml = '';
  navItems.forEach(item => {
    if (item.section) {
      navHtml += `<div class="nav-section-label">${item.section}</div>`;
    } else {
      const isActive = item.id === activePage ? 'active' : '';
      const style    = item.danger ? ' style="color:#e74c3c"' : '';
      const badge    = item.badge  ? `<span class="badge-count" id="sr-badge" style="display:none">0</span>` : '';
      navHtml += `
        <a class="nav-link-item ${isActive}" href="${item.href}"${style}>
          <i class="bi ${item.icon}"></i>
          <span class="nav-text">${item.label}</span>
          ${badge}
        </a>`;
    }
  });

  // Grab all existing page content from body BEFORE injecting anything
  const pageContent = document.body.innerHTML;
  document.body.innerHTML = '';

  document.body.innerHTML = `
    <!-- ════ SIDEBAR ════ -->
    <div id="sidebar">
      <div class="sidebar-brand">
        <div class="brand-text">
          <svg class="brand-logo" width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="8" fill="#042C53"/>
            <path d="M16 5C16 5 9 13.5 9 18.5C9 22.09 12.13 25 16 25C19.87 25 23 22.09 23 18.5C23 13.5 16 5 16 5Z" fill="#1D9E75"/>
            <path d="M16 13C16 13 12.5 17.8 12.5 20.3C12.5 22.07 14.07 23.5 16 23.5C17.93 23.5 19.5 22.07 19.5 20.3C19.5 17.8 16 13 16 13Z" fill="white" fill-opacity="0.25"/>
            <path d="M13 20.5C13 18.8 14.8 16 16 14.5" stroke="white" stroke-width="1.2" stroke-linecap="round" opacity="0.5"/>
          </svg>
          <span id="brand-label">TapControl</span>
        </div>
        <button class="toggle-btn" onclick="toggleSidebar()" id="toggle-icon">
          <i class="bi bi-chevron-double-left"></i>
        </button>
      </div>
      <nav class="sidebar-nav">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">AD</div>
          <div>
            <div class="user-name">Admin</div>
            <div class="user-role">System Administrator</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ════ MAIN WRAPPER ════ -->
    <div id="main">
      <div class="topbar">
        <div class="topbar-page-title" id="topbar-page-title"></div>
        <div class="topbar-right">
          <div class="topbar-avatar">AD</div>
        </div>
      </div>
      <div class="content-area" id="content-area">
        ${pageContent}
      </div>
    </div>

    <!-- TOAST -->
    <div class="toast-container-custom" id="toastContainer"></div>
  `;
}

// ── Sidebar toggle ──
let sidebarCollapsed = false;
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  document.getElementById('sidebar').classList.toggle('collapsed', sidebarCollapsed);
  document.getElementById('main').classList.toggle('expanded', sidebarCollapsed);
  document.getElementById('toggle-icon').innerHTML = sidebarCollapsed
    ? '<i class="bi bi-chevron-double-right"></i>'
    : '<i class="bi bi-chevron-double-left"></i>';
}

// openModal, closeModal, closeModalOutside, toast, zonePill, statusPill, today
// are all defined in utils.js which is loaded in <head> before any HTML renders.

// ── Service Request badge ──
// Called by servicerequest.js whenever the list changes.
// Shows the badge only when there are open requests.
function updateSRBadge() {
  const badge = document.getElementById('sr-badge');
  if (!badge) return;
  const openCount = (typeof serviceRequests !== 'undefined')
    ? serviceRequests.filter(r => r.status === 'Open').length
    : 0;
  if (openCount > 0) {
    badge.textContent = openCount;
    badge.style.display = '';
  } else {
    badge.style.display = 'none';
  }
}