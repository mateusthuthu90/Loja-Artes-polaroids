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

  const navHtml = nav.map(item => `
    <a href="${item.href}" class="${activePage === item.key ? 'active' : ''}">${item.label}</a>
  `).join('');

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

  updateCartBadge();
}

function renderFooter(){
  const html = `
    <div class="footer-inner">
      <div class="footer-brand">
        <div class="brand">
          <img src="images/brand/logo.png" alt="Artes Polaroids" class="brand-logo">
          ARTES POLAROIDS
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
