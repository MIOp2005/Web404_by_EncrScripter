(() => {
  'use strict';

  const views = ['dashboard','ip','domain','email','hash','username','headers','findings','ai'];
  const names = {
    dashboard:'Dashboard', ip:'IP Intelligence', domain:'Domain & DNS', email:'Email Breach',
    hash:'Hash Toolkit', username:'Username OSINT', headers:'Header Scanner', findings:'Findings', ai:'AI Assistant'
  };

  function showView(view) {
    if (!views.includes(view)) return;
    views.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('active-view', id === view);
    });
    document.querySelectorAll('.nav').forEach(button => {
      button.classList.toggle('active', button.dataset.view === view);
      button.style.pointerEvents = 'auto';
      button.style.position = 'relative';
      button.style.zIndex = '10';
    });
    document.querySelectorAll('[data-open]').forEach(card => {
      card.style.pointerEvents = 'auto';
    });
    const pageName = document.getElementById('pageName');
    if (pageName) pageName.textContent = names[view];
    window.scrollTo(0, 0);
    if (view === 'dashboard' && typeof window.refreshDashboard === 'function') window.refreshDashboard();
    if (view === 'findings' && typeof window.loadFindings === 'function') window.loadFindings();
  }

  window.showView = showView;
  window.web404Navigation = { showView };

  function bind() {
    document.querySelectorAll('.nav').forEach(button => {
      button.onclick = event => {
        event.preventDefault();
        event.stopPropagation();
        showView(button.dataset.view);
      };
    });

    document.querySelectorAll('[data-open]').forEach(card => {
      card.onclick = event => {
        event.preventDefault();
        showView(card.dataset.open);
      };
    });

    showView(document.querySelector('.nav.active')?.dataset.view || 'dashboard');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once:true });
  } else {
    bind();
  }
})();
