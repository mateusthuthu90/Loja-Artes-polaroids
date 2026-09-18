/* ==========================================================================
   ARTES POLAROIDS — CARRINHO (mockado com localStorage)
   Sem backend por enquanto. Estrutura já pronta para, na Fase 2,
   trocar o armazenamento local por uma API real sem mudar as telas.
   ========================================================================== */

const CART_KEY = 'ap_cart_v1';

function getCart(){
  let cart;
  try{
    cart = JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){
    cart = [];
  }
  // Remove itens que referenciam produtos que não existem mais no catálogo
  // (ex: kits antigos removidos numa atualização). Mantém o carrinho sempre consistente.
  const cleaned = cart.filter(i => !!findProduct(i.productId));
  if(cleaned.length !== cart.length){
    localStorage.setItem(CART_KEY, JSON.stringify(cleaned));
  }
  return cleaned;
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// item = { productId, quantity, selectedOptions: {Formato:'Retrato', ...}, unitPrice }
// unitPrice é opcional: usado quando o preço do item varia (ex: kits com desconto por quantidade).
// Se não vier, usa o preço padrão do catálogo (findProduct(id).price).
function addToCart(productId, quantity, selectedOptions, unitPrice){
  const cart = getCart();
  const optKey = JSON.stringify(selectedOptions || {});
  const existing = cart.find(i => i.productId === productId && JSON.stringify(i.selectedOptions||{}) === optKey);
  if(existing){
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity, selectedOptions: selectedOptions || {}, unitPrice: unitPrice ?? null });
  }
  saveCart(cart);
}

function getItemUnitPrice(item){
  const p = findProduct(item.productId);
  if(item.unitPrice !== undefined && item.unitPrice !== null) return item.unitPrice;
  return p ? p.price : 0;
}

// Clique no botão "Comprar" dos cards (listagem/relacionados).
// Produtos com preço por quantidade (tiers) precisam da escolha na página do produto primeiro.
// Produtos simples abrem uma mini confirmação antes de adicionar.
function handleBuyClick(event, productId){
  event.preventDefault();
  event.stopPropagation();
  const p = findProduct(productId);
  if(!p) return;

  if(p.tiers && p.tiers.length){
    window.location.href = `produto.html?id=${p.id}`;
    return;
  }

  showPurchaseModal({
    icon: '🛍️',
    title: 'Adicionar ao carrinho?',
    message: `${p.name} — ${formatBRL(p.price)}`,
    primaryLabel: 'Adicionar ao carrinho',
    secondaryLabel: 'Continuar comprando',
    onPrimary: () => {
      addToCart(p.id, 1, {});
      if(typeof showToast === 'function') showToast(`✅ ${p.name} adicionado ao carrinho`);
    }
  });
}

function updateCartItemQty(index, delta){
  const cart = getCart();
  if(!cart[index]) return;
  cart[index].quantity += delta;
  if(cart[index].quantity <= 0){
    cart.splice(index, 1);
  }
  saveCart(cart);
}

function removeCartItem(index){
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart(){
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function getCartCount(){
  return getCart().reduce((sum, i) => sum + i.quantity, 0);
}

function getCartSubtotal(){
  return getCart().reduce((sum, i) => {
    return sum + (getItemUnitPrice(i) * i.quantity);
  }, 0);
}

// ---- Cupom mockado (apenas demonstração visual) ----
const MOCK_COUPONS = {
  'MEMORIA10': 0.10,
  'BEMVINDO5': 0.05,
};

function applyCouponMock(code){
  const pct = MOCK_COUPONS[code.trim().toUpperCase()];
  return pct || 0;
}

// ---- Frete mockado ----
function getMockShipping(subtotal){
  if(subtotal === 0) return 0;
  return subtotal >= 100 ? 0 : 14.90;
}

// ---- Entrega: retirada presencial ou frete calculado por CEP (mockado) ----
const SHIPPING_KEY = 'ap_shipping_v1';

function getShipping(){
  try{
    return JSON.parse(localStorage.getItem(SHIPPING_KEY)) || null;
  }catch(e){
    return null;
  }
}

function setShipping(obj){
  localStorage.setItem(SHIPPING_KEY, JSON.stringify(obj));
}

function clearShipping(){
  localStorage.removeItem(SHIPPING_KEY);
}

// Calcula um frete mockado a partir do CEP (determinístico, sem API dos Correios ainda).
// Retorna null se o CEP for inválido (menos de 8 dígitos).
function calculateShippingFee(cep, subtotal){
  if(subtotal >= 100) return 0; // frete grátis acima de R$100, mesmo com entrega
  const digits = (cep || '').replace(/\D/g, '');
  if(digits.length < 8) return null;
  const sum = digits.split('').reduce((a, d) => a + parseInt(d, 10), 0);
  const fee = 12 + (sum % 10); // varia entre R$12 e R$21, só pra dar sensação de cálculo real
  return Math.round(fee * 100) / 100;
}

function updateCartBadge(){
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = getCartCount();
  });
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
