/* ==========================================================================
   ARTES POLAROIDS — COMPONENTES COMPARTILHADOS (Header, Footer, Toast, etc.)
   ========================================================================== */

function renderHeader(activePage){
  const nav = [
    { href: 'index.html', label: 'Início', key: 'home' },
    { href: 'produtos.html', label: 'Produtos', key: 'produtos' },
    { href: 'index.html#como-funciona', label: 'Como funciona', key: 'como-funciona' },
    { href: 'faq.html', label: 'Dúvidas', key: 'faq' },
    { href: 'contato.html', label: 'Contato', key: 'contato' },
  ];

  // Categorias reais do catálogo (vem de products.js), usadas no menu suspenso de "Produtos"
  const navCategories = (typeof CATEGORIES !== 'undefined') ? CATEGORIES.filter(c => c !== 'Todos') : [];

  const navHtml = nav.map(item => {
    const activeClass = activePage === item.key ? 'active' : '';
    if(item.key === 'produtos' && navCategories.length){
      const catLinks = navCategories.map(c => `<a href="produtos.html?cat=${encodeURIComponent(c)}">${c}</a>`).join('');
      return `
        <div class="nav-item nav-item-dropdown">
          <a href="${item.href}" class="${activeClass}">${item.label}</a>
          <div class="nav-dropdown">
            <a href="produtos.html">Todos os produtos</a>
            ${catLinks}
          </div>
        </div>
      `;
    }
    return `<div class="nav-item"><a href="${item.href}" class="${activeClass}">${item.label}</a></div>`;
  }).join('');

  const html = `
    <div class="header-inner">
      <a href="index.html" class="brand">
        <img src="images/brand/logo.png" alt="Artes Polaroids" class="brand-logo">
      </a>
      <nav class="main-nav" id="mainNav">${navHtml}</nav>
      <div class="header-actions">
        <a href="carrinho.html" class="cart-btn">
          🛒 <span>Carrinho</span>
          <span class="cart-count" data-cart-count>0</span>
        </a>
        <button class="menu-toggle" id="menuToggle" aria-label="Abrir menu">☰</button>
      </div>
    </div>
  `;
  document.getElementById('site-header').innerHTML = html;
  document.getElementById('site-header').classList.add('site-header');

  document.getElementById('menuToggle').addEventListener('click', () => {
    document.getElementById('mainNav').classList.toggle('mobile-open');
  });

  initNavDropdowns();
  updateCartBadge();
}

function initNavDropdowns(){
  document.querySelectorAll('.nav-item-dropdown').forEach(item => {
    const dropdown = item.querySelector('.nav-dropdown');
    if(!dropdown) return;
    let closeTimer;

    item.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      dropdown.classList.add('force-open');
    });
    item.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(() => {
        dropdown.classList.remove('force-open');
      }, 400); // dá tempo do mouse descer até o menu sem ele sumir antes da hora
    });
  });
}

function renderFooter(){
  const html = `
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="brand">
          <img src="images/brand/logo.png" alt="Artes Polaroids" class="brand-logo">
        </div>
        <p>Transformamos suas fotos favoritas em lembranças que duram para sempre. Polaroids, quadros, chaveiros e presentes feitos com carinho.</p>
      </div>
      <div class="footer-col">
        <h4>Navegação</h4>
        <a href="produtos.html">Produtos</a>
        <a href="carrinho.html">Carrinho</a>
        <a href="faq.html">Dúvidas frequentes</a>
        <a href="contato.html">Contato</a>
      </div>
      <div class="footer-col">
        <h4>Contato</h4>
        <a href="https://wa.me/5533998035543" target="_blank" rel="noopener">WhatsApp: (33) 99803-5543</a>
        <a href="https://instagram.com/artes.polaroids" target="_blank" rel="noopener">@artes.polaroids</a>
      </div>
    </div>
    <div class="footer-bottom">
      © ${new Date().getFullYear()} Artes Polaroids. Feito com ❤️ para guardar memórias.
    </div>
  `;
  document.getElementById('site-footer').innerHTML = html;
  document.getElementById('site-footer').classList.add('site-footer');
}

function showToast(message){
  let toast = document.getElementById('appToast');
  if(!toast){
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

function showPurchaseModal(options){
  let modal = document.getElementById('purchaseModal');
  if(!modal){
    modal = document.createElement('div');
    modal.id = 'purchaseModal';
    modal.className = 'purchase-modal-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => {
      if(e.target === modal) closePurchaseModal();
    });
  }
  modal.innerHTML = `
    <div class="purchase-modal-box">
      <div class="purchase-modal-icon">${options.icon || '🛍️'}</div>
      <h3>${options.title}</h3>
      <p>${options.message || ''}</p>
      <div class="purchase-modal-actions">
        <button class="btn btn-primary btn-block" id="pmPrimary">${options.primaryLabel}</button>
        <button class="btn btn-outline btn-block" id="pmSecondary">${options.secondaryLabel}</button>
      </div>
    </div>
  `;
  modal.classList.add('open');

  document.getElementById('pmPrimary').addEventListener('click', () => {
    closePurchaseModal();
    if(options.onPrimary) options.onPrimary();
  });
  document.getElementById('pmSecondary').addEventListener('click', () => {
    closePurchaseModal();
    if(options.onSecondary) options.onSecondary();
  });
}

function closePurchaseModal(){
  const modal = document.getElementById('purchaseModal');
  if(modal) modal.classList.remove('open');
}

function initAccordion(){
  document.querySelectorAll('.accordion-item').forEach(item => {
    const question = item.querySelector('.accordion-question');
    const answer = item.querySelector('.accordion-answer');
    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.accordion-item').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.accordion-answer').style.maxHeight = null;
      });
      if(!isOpen){
        item.classList.add('open');
        answer.style.maxHeight = answer.scrollHeight + 'px';
      }
    });
  });
}
