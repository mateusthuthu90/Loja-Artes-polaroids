/* ==========================================================================
   ARTES POLAROIDS — CARRINHO (mockado com localStorage)
   Sem backend por enquanto. Estrutura já pronta para, na Fase 2,
   trocar o armazenamento local por uma API real sem mudar as telas.
   ========================================================================== */

const CART_KEY = 'ap_cart_v1';

function getCart(){
  try{
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  }catch(e){
    return [];
  }
}

function saveCart(cart){
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

// item = { productId, quantity, selectedOptions: {Formato:'Retrato', ...} }
function addToCart(productId, quantity, selectedOptions){
  const cart = getCart();
  const optKey = JSON.stringify(selectedOptions || {});
  const existing = cart.find(i => i.productId === productId && JSON.stringify(i.selectedOptions||{}) === optKey);
  if(existing){
    existing.quantity += quantity;
  } else {
    cart.push({ productId, quantity, selectedOptions: selectedOptions || {} });
  }
  saveCart(cart);
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
    const p = findProduct(i.productId);
    return sum + (p ? p.price * i.quantity : 0);
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

function updateCartBadge(){
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = getCartCount();
  });
}

document.addEventListener('DOMContentLoaded', updateCartBadge);
