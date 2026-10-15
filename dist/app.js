(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const text = (value, max = 250) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
  const storageKey = 'pocafe-demo-v1';
  const categories = { soups: 'Супы', wok: 'Вок', hot: 'Горячее', snacks: 'Закуски', sides: 'Гарниры', desserts: 'Десерты', drinks: 'Напитки', all: 'Всё меню' };
  const mobileMenu = window.matchMedia?.('(max-width: 600px)') || { matches: false, addEventListener() {} };
  const categoryOrder = ['soups', 'wok', 'hot', 'snacks', 'sides', 'desserts', 'drinks'];
  const sectionLabels = { ...categories, hot: 'Горячие блюда', snacks: 'Закуски и салаты', sides: 'Гарниры и соусы' };
  const products = (Array.isArray(window.CAFE_PRODUCTS) ? window.CAFE_PRODUCTS : []).filter((item) => item && typeof item.id === 'string' && item.id.length < 120 && typeof item.name === 'string' && Number.isFinite(item.price) && item.price >= 0).map((item) => ({ ...item, category: Object.hasOwn(categories, item.category) ? item.category : 'hot', description: text(item.description, 2000), image: text(item.image, 1000), tag: text(item.tag, 80) }));
  const productMap = new Map(products.map((item) => [item.id, item]));
  const hasVariants = (product) => Array.isArray(product?.variants) && product.variants.length > 0;
  const variantLabel = (product, variant) => (product.optionGroups || []).map((group) => {
    const option = group.options.find((candidate) => candidate.value === variant.attributes?.[group.id]);
    return option ? `${group.label}: ${option.label}` : '';
  }).filter(Boolean).join(' · ');
  const sellableMap = new Map();
  for (const product of products) {
    if (!hasVariants(product) && !product.priceFrom) sellableMap.set(product.id, { ...product, parentId: product.id, variantId: '', variantLabel: '' });
    for (const variant of hasVariants(product) ? product.variants : []) {
      if (typeof variant.id !== 'string' || variant.id.length > 120 || !Number.isFinite(variant.price) || variant.price < 0 || variant.available === false) continue;
      sellableMap.set(variant.id, { ...product, id: variant.id, parentId: product.id, variantId: variant.id, variantLabel: variantLabel(product, variant), attributes: variant.attributes, price: variant.price, priceFrom: false });
    }
  }
  const safeQuantity = (value) => Number.isInteger(value) && value > 0 && value <= 99;
  function normalizeOrderItem(item) {
    const known = sellableMap.get(item.variantId) || sellableMap.get(item.id);
    const parent = productMap.get(item.productId) || productMap.get(item.id) || products.find((product) => product.name === item.name);
    return { id: known?.id || text(item.id, 120) || parent?.id || '', productId: known?.parentId || parent?.id || '', variantId: known?.variantId || text(item.variantId, 120), variantLabel: text(item.variantLabel, 500) || known?.variantLabel || '', name: text(item.name, 200), quantity: item.quantity, price: item.price };
  }
  const phoneDigits = (value) => { let digits = String(value || '').replace(/\D/g, ''); if (digits.startsWith('8') && digits.length === 11) digits = `7${digits.slice(1)}`; if (digits.length === 10) digits = `7${digits}`; return digits; };
  const validPhone = (value) => /^7\d{10}$/.test(phoneDigits(value));
  const phoneDisplay = (value) => { const digits = phoneDigits(value); return /^7\d{10}$/.test(digits) ? `+7 ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}` : text(value, 30); };
  const phoneLink = (value) => validPhone(value) ? `<a class="phone-link" href="tel:+${phoneDigits(value)}">${esc(phoneDisplay(value))}</a>` : esc(phoneDisplay(value));
  let raw = {};
  try { raw = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Continue without persistent browser storage. */ }
  const state = { cart: {}, cartMeta: {}, favorites: [], orders: [], category: 'all', query: '', fulfillment: raw.fulfillment === 'pickup' ? 'pickup' : 'delivery', address: text(raw.address), selectedAddressId: text(raw.selectedAddressId, 80), addresses: [], signedIn: raw.signedIn === true, profile: { name: '', phone: '', email: '' } };
  if (raw.cartMeta && typeof raw.cartMeta === 'object' && !Array.isArray(raw.cartMeta)) for (const [id, meta] of Object.entries(raw.cartMeta)) if (id.length < 120 && meta && productMap.has(meta.productId)) state.cartMeta[id] = { productId: meta.productId, variantLabel: text(meta.variantLabel, 500) };
  if (raw.cart && typeof raw.cart === 'object' && !Array.isArray(raw.cart)) for (const [id, quantity] of Object.entries(raw.cart)) if ((sellableMap.has(id) || productMap.has(id) || state.cartMeta[id]) && safeQuantity(quantity)) state.cart[id] = quantity;
  if (Array.isArray(raw.favorites)) state.favorites = [...new Set(raw.favorites.filter((id) => productMap.has(id)))];
  if (raw.profile && typeof raw.profile === 'object') state.profile = { name: text(raw.profile.name, 80), phone: validPhone(raw.profile.phone) ? phoneDigits(raw.profile.phone) : '', email: text(raw.profile.email, 150) };
  if (Array.isArray(raw.addresses)) state.addresses = raw.addresses.filter((address) => address && typeof address.id === 'string' && typeof address.address === 'string' && text(address.address).length >= 5).slice(0, 20).map((address, index) => ({ id: text(address.id, 80), label: text(address.label, 50) || 'Мой адрес', address: text(address.address), entrance: text(address.entrance, 30), floor: text(address.floor, 20), apartment: text(address.apartment, 20), note: text(address.note, 300), isDefault: !!address.isDefault && !raw.addresses.slice(0, index).some((item) => item?.isDefault) }));
  if (state.addresses.length && !state.addresses.some((item) => item.isDefault)) state.addresses[0].isDefault = true;
  if (!state.address) { try { state.address = text(sessionStorage.getItem(`${storageKey}-address`)); } catch { /* Legacy address is optional. */ } }
  if (!state.address && state.addresses.length) state.address = state.addresses.find((item) => item.isDefault)?.address || '';
  if (!state.addresses.some((item) => item.id === state.selectedAddressId)) state.selectedAddressId = '';
  if (!state.selectedAddressId) { const matches = state.addresses.filter((item) => item.address === state.address); state.selectedAddressId = matches.find((item) => item.isDefault)?.id || (matches.length === 1 ? matches[0].id : ''); }
  if (Array.isArray(raw.orders)) state.orders = raw.orders.filter((order) => order && typeof order.id === 'string' && /^PO-\d{5,16}$/.test(order.id) && typeof order.created === 'number' && Number.isFinite(new Date(order.created).getTime()) && Array.isArray(order.items) && ['delivery', 'pickup'].includes(order.fulfillment)).slice(0, 50).map((order) => ({ id: order.id, created: order.created, fulfillment: order.fulfillment, stage: Number.isInteger(order.stage) ? Math.max(0, Math.min(3, order.stage)) : 0, dismissed: !!order.dismissed, demo: true, paymentStatus: 'unpaid', paymentMethod: order.paymentMethod === 'sbp' ? 'sbp' : 'card', contact: { name: text(order.contact?.name, 80), phone: validPhone(order.contact?.phone) ? phoneDigits(order.contact.phone) : '' }, address: text(order.address), apartment: text(order.apartment, 20), entrance: text(order.entrance, 30), floor: text(order.floor, 20), comment: text(order.comment, 500), scheduledAt: text(order.scheduledAt, 50), cutlery: Number.isInteger(order.cutlery) ? Math.max(0, Math.min(20, order.cutlery)) : 0, items: order.items.filter((item) => item && typeof item.name === 'string' && safeQuantity(item.quantity) && Number.isFinite(item.price) && item.price >= 0).map(normalizeOrderItem) })).filter((order) => order.items.length).sort((a, b) => b.created - a.created);
  raw = null;
  const mainDialog = $('#main-dialog'), drawerDialog = $('#drawer-dialog'), dialogBody = $('#dialog-body'), drawerBody = $('#drawer-body');
  const pickupAddress = text(window.CAFE_CONFIG?.pickupAddress) || 'Ильинское-Усово, ул. Архангельская, 15';
  let currentView = '', currentOrderId = '', accountTab = 'orders', editingAddressId = '', loginPhone = '', loginStep = 'phone', returnFromAddress = '', toastTimer, previousFocus, checkoutBusy = false;
  let checkoutDraft = null;
  let activeProduct = null;
  let quantityProductId = '';
  const icon = { heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>', plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>', minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg>', arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>' };
  Object.assign(icon, {
    close: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M14.5 9.50002L9.5 14.5M9.49998 9.5L14.5 14.5"/></g></svg>',
    check: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"><path d="M4 12.9L7.14286 16.5L15 7.5"/><path d="M20 7.5625L11.4283 16.5625L11 16"/></g></svg>',
    pin: '<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path d="M4 10.1433C4 5.64588 7.58172 2 12 2C16.4183 2 20 5.64588 20 10.1433C20 14.6055 17.4467 19.8124 13.4629 21.6744C12.5343 22.1085 11.4657 22.1085 10.5371 21.6744C6.55332 19.8124 4 14.6055 4 10.1433Z"/><circle cx="12" cy="10" r="3"/></g></svg>',
    bag: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.5"><path stroke-linejoin="round" d="M9 9H9.0001"/><path stroke-linejoin="round" d="M15 9H15.0001"/><path d="M3.79424 12.0291C4.33141 9.34329 4.59999 8.00036 5.48746 7.13543C5.65149 6.97557 5.82894 6.8301 6.01786 6.70061C7.04004 6 8.40956 6 11.1486 6H12.8515C15.5906 6 16.9601 6 17.9823 6.70061C18.1712 6.8301 18.3486 6.97557 18.5127 7.13543C19.4001 8.00036 19.6687 9.34329 20.2059 12.0291C20.9771 15.8851 21.3627 17.8131 20.475 19.1793C20.3143 19.4267 20.1267 19.6555 19.9157 19.8616C18.7501 21 16.7839 21 12.8515 21H11.1486C7.21622 21 5.25004 21 4.08447 19.8616C3.87342 19.6555 3.68582 19.4267 3.5251 19.1793C2.63744 17.8131 3.02304 15.8851 3.79424 12.0291Z"/><path d="M9 6.01973V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V6.01973"/></g></svg>'
  });
  const liveRegion = '<div class="interaction-live" role="status" aria-live="polite" aria-atomic="true"></div>';
  const demoNotice = '<div class="demo-notice"><span class="demo-dot" aria-hidden="true"></span><span>Демо-режим: без оплаты и отправки заказа в кафе.</span></div>';
  function cartItem(id) {
    const known = sellableMap.get(id);
    if (known) return known;
    const product = productMap.get(id) || productMap.get(state.cartMeta[id]?.productId);
    return product ? { ...product, id, parentId: product.id, variantId: '', variantLabel: state.cartMeta[id]?.variantLabel || '', needsSelection: true } : null;
  }
  const rows = () => Object.entries(state.cart).map(([id, quantity]) => { const item = cartItem(id); return item ? { ...item, quantity } : null; }).filter(Boolean);
  const needsConfiguration = () => rows().some((item) => item.needsSelection);
  const variantCaption = (item) => item.variantLabel ? `<span class="cart-variant">${esc(item.variantLabel)}</span>` : '';
  const cartPrice = () => `${needsConfiguration() ? 'от ' : ''}${money(cartTotal())}`;
  const cartCount = () => rows().reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = () => rows().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const productRows = (id) => rows().filter((item) => item.parentId === id);
  function cardControlContents(product, entries = productRows(product.id)) {
    const quantity = entries.reduce((total, item) => total + item.quantity, 0);
    const choose = hasVariants(product) || product.priceFrom;
    const plus = `<button class="product-add card-quantity-plus" type="button" data-action="card-add" data-id="${esc(product.id)}" aria-label="${choose ? 'Выбрать вариант' : 'Добавить одну порцию'}: ${esc(product.name)}" ${!choose && quantity >= 99 ? 'disabled' : ''}>${icon.plus}</button>`;
    if (!quantity) return plus;
    return `<button class="card-quantity-minus" type="button" data-action="card-decrease" data-id="${esc(product.id)}" aria-label="${entries.length > 1 ? 'Выбрать вариант для изменения количества' : 'Убрать одну порцию'}: ${esc(product.name)}" ${entries.length > 1 ? 'aria-haspopup="dialog"' : ''}>${icon.minus}</button><span class="card-quantity-value" role="status" aria-live="polite" aria-atomic="true" aria-label="В корзине: ${quantity}">${quantity}</span>${plus}`;
  }
  function cardControl(product) {
    const entries = productRows(product.id), quantity = entries.reduce((total, item) => total + item.quantity, 0);
    return `<div class="card-quantity ${quantity ? 'has-quantity' : ''}" data-card-control="${esc(product.id)}" data-quantity="${quantity}" data-cart-lines="${entries.length}" role="group" aria-label="Количество: ${esc(product.name)}">${cardControlContents(product, entries)}</div>`;
  }
  function syncCardControls() {
    $$('[data-card-control]').forEach((control) => {
      const product = productMap.get(control.dataset.cardControl); if (!product) return;
      const entries = productRows(product.id), quantity = entries.reduce((total, item) => total + item.quantity, 0);
      if (control.dataset.quantity === String(quantity) && control.dataset.cartLines === String(entries.length)) return;
      const focusedAction = control.contains(document.activeElement) ? document.activeElement?.dataset?.action : '';
      const returnAction = control.contains(previousFocus) ? previousFocus?.dataset?.action : '';
      control.innerHTML = cardControlContents(product, entries);
      control.dataset.quantity = String(quantity); control.dataset.cartLines = String(entries.length);
      control.classList.toggle('has-quantity', quantity > 0);
      if (returnAction) { const same = $(`[data-action="${returnAction}"]`, control); previousFocus = same && !same.disabled ? same : $('[data-action="card-decrease"]', control) || $('[data-action="card-add"]', control); }
      if (focusedAction) { const same = $(`[data-action="${focusedAction}"]`, control); const target = same && !same.disabled ? same : $('[data-action="card-decrease"]', control) || $('[data-action="card-add"]', control); target?.focus({ preventScroll: true }); }
    });
  }
  const orderTotal = (order) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderStages = (order) => order.fulfillment === 'pickup' ? ['Принят', 'Готовим', 'Можно забирать', 'Получен'] : ['Принят', 'Готовим', 'У курьера', 'Доставлен'];
  const latestDockOrder = () => state.orders.find((order) => order.stage < 3) || state.orders.find((order) => !order.dismissed);
  const formatDate = (value) => new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(new Date(value));
  function persist(orderChanged = false) {
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 3, cart: state.cart, cartMeta: state.cartMeta, favorites: state.favorites, orders: state.orders, fulfillment: state.fulfillment, address: state.address, selectedAddressId: state.selectedAddressId, addresses: state.addresses, profile: state.profile, signedIn: state.signedIn })); } catch { announce('В этом браузере данные сохранятся только до обновления страницы.'); }
    document.dispatchEvent(new CustomEvent('cafe:state-change', { detail: { cartCount: cartCount(), activeOrder: latestDockOrder()?.id || null } }));
    if (orderChanged) document.dispatchEvent(new CustomEvent('cafe:order-change', { detail: { orderId: currentOrderId || state.orders[0]?.id } }));
  }
  function announce(message) {
    const toast = $('#toast');
    if (toast) { clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('is-visible'); toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500); }
    const status = $('dialog[open] .interaction-live');
    if (status) { status.textContent = ''; requestAnimationFrame(() => { if (status.isConnected) status.textContent = message; }); }
  }
  function updateDockHeight() {
    const dock = $('#order-dock');
    const visible = dock && !dock.hidden && getComputedStyle(dock).display !== 'none';
    document.documentElement.style.setProperty('--order-dock-height', visible ? `${Math.ceil(dock.getBoundingClientRect().height + 26)}px` : '0px');
  }
  function renderDock() {
    const dock = $('#order-dock');
    if (!dock) return;
    const order = latestDockOrder(), count = cartCount();
    dock.hidden = !order && !count;
    dock.classList.toggle('has-active-order', !!order);
    document.body.classList.toggle('has-order-dock', !!order || !!count);
    dock.innerHTML = order ? `<div class="order-dock-inner"><button class="dock-status" type="button" data-action="track-order" data-id="${esc(order.id)}"><span class="dock-dot" aria-hidden="true"></span><span><strong>${esc(orderStages(order)[order.stage])}</strong><span>${esc(order.id)} · демо-заказ</span></span><span class="dock-view"><span class="dock-view-label">Смотреть заказ</span> ${icon.arrow}</span></button>${count ? `<button class="dock-cart" type="button" data-action="cart" aria-label="Корзина, количество блюд: ${count}"><span>Корзина · ${count}</span><strong>${cartPrice()}</strong></button>` : ''}${order.stage === 3 ? `<button class="dock-dismiss" type="button" data-action="dismiss-order" data-id="${esc(order.id)}" aria-label="Скрыть завершённый заказ">${icon.close}</button>` : ''}</div>` : `<button class="dock-cart-only" type="button" data-action="cart"><span>Корзина <span class="dock-count">${count}</span></span><strong>${cartPrice()}</strong>${icon.arrow}</button>`;
    updateDockHeight();
  }
  function syncCart() {
    const count = cartCount();
    for (const selector of ['#cart-count', '#mobile-cart-count']) if ($(selector)) $(selector).textContent = String(count);
    for (const selector of ['#cart-total', '#mobile-cart-total']) if ($(selector)) $(selector).textContent = cartPrice();
    $$('[data-action="cart"]').forEach((button) => button.setAttribute('aria-label', `Корзина, количество блюд: ${count}, ${cartPrice()}`));
    $$('[data-fulfillment]').forEach((button) => { const active = button.dataset.fulfillment === state.fulfillment; button.classList.toggle('is-active', active); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
    if ($('#address-label')) $('#address-label').textContent = state.fulfillment === 'pickup' ? pickupAddress : state.address || 'Укажите адрес доставки';
    const caption = $('.menu-address .control-caption'); if (caption) caption.textContent = state.fulfillment === 'pickup' ? 'Где забрать' : 'Куда привезти';
    const addressAction = $('.menu-address .address-action-label'); if (addressAction) addressAction.textContent = state.fulfillment === 'pickup' ? 'На карте' : state.address ? 'Изменить' : 'Указать';
    const menuAddress = $('.menu-address'); if (menuAddress) { menuAddress.dataset.action = state.fulfillment === 'pickup' ? 'map' : 'address'; menuAddress.setAttribute('aria-haspopup', 'dialog'); }
    syncCardControls();
    syncProductChoices();
    renderDock();
  }
  function setActiveCategory(category) {
    state.category = Object.hasOwn(categories, category) ? category : 'all';
    $$('#category-tabs [data-category]').forEach((button) => { const active = button.dataset.category === state.category; button.classList.toggle('is-active', active); button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  }
  function productCard(item, grouped) {
    const heading = grouped ? 'h4' : 'h3';
    return `<article class="product-card ${hasVariants(item) ? 'has-variants' : ''}"><div class="product-image-wrap"><button class="product-image-button" type="button" data-action="product" data-id="${esc(item.id)}" aria-label="Открыть блюдо: ${esc(item.name)}"><img class="product-photo" src="${esc(item.image)}" alt="${esc(item.name)}" loading="lazy" decoding="async"></button>${item.tag ? `<span class="product-tag">${esc(item.tag)}</span>` : ''}<button class="product-favorite ${state.favorites.includes(item.id) ? 'is-favorite' : ''}" type="button" data-action="favorite" data-id="${esc(item.id)}" aria-label="${state.favorites.includes(item.id) ? 'Убрать из избранного' : 'Добавить в избранное'}: ${esc(item.name)}" aria-pressed="${state.favorites.includes(item.id)}">${icon.heart}</button></div><div class="product-content"><${heading} class="product-name"><button type="button" data-action="product" data-id="${esc(item.id)}">${esc(item.name)}</button></${heading}><p class="product-description">${esc(item.description)}</p><div class="product-bottom"><span class="product-price">${item.priceFrom ? 'от ' : ''}${money(item.price)}</span>${cardControl(item)}</div></div></article>`;
  }
  function renderProducts() {
    const grid = $('#products-grid'); if (!grid) return;
    const query = state.query.trim().toLocaleLowerCase('ru');
    const grouped = mobileMenu.matches;
    const matching = products.filter((item) => !query || `${item.name} ${item.description} ${(item.optionGroups || []).flatMap(group => group.options.map(option => option.label)).join(' ')}`.toLocaleLowerCase('ru').includes(query));
    const filtered = matching.filter((item) => grouped || state.category === 'all' || item.category === state.category);
    if ($('#menu-title')) $('#menu-title').textContent = query ? 'Результаты поиска' : grouped ? 'Всё меню' : categories[state.category] || 'Меню';
    const lastTwo = filtered.length % 100, lastOne = filtered.length % 10;
    const noun = lastTwo >= 11 && lastTwo <= 14 ? 'блюд' : lastOne === 1 ? 'блюдо' : lastOne >= 2 && lastOne <= 4 ? 'блюда' : 'блюд';
    if ($('#menu-count')) $('#menu-count').textContent = `${filtered.length} ${noun}`;
    const shownCategories = categoryOrder.filter((category) => filtered.some((item) => item.category === category));
    if (grouped && state.category !== 'all' && !shownCategories.includes(state.category)) state.category = 'all';
    setActiveCategory(state.category);
    $$('#category-tabs [data-category]').forEach((button) => { button.disabled = grouped && !!query && button.dataset.category !== 'all' && !shownCategories.includes(button.dataset.category); });
    grid.classList.toggle('menu-grouped', grouped);
    grid.innerHTML = filtered.length ? grouped ? shownCategories.map((category) => {
      const items = filtered.filter((item) => item.category === category);
      return `<section class="menu-category-section" data-category-section="${category}" aria-labelledby="menu-section-${category}"><div class="menu-category-heading"><h3 id="menu-section-${category}">${esc(sectionLabels[category])}</h3><span>${items.length}</span></div><div class="menu-category-products">${items.map((item) => productCard(item, true)).join('')}</div></section>`;
    }).join('') : filtered.map((item) => productCard(item, false)).join('') : '<div class="empty-state menu-empty"><h3>Ничего не нашлось</h3><p>Попробуйте другое название или откройте всё меню.</p><button class="interaction-button" type="button" data-action="reset-search">Показать всё меню</button></div>';
    syncCart();
    document.dispatchEvent(new CustomEvent('cafe:menu-rendered', { detail: { grouped, categories: shownCategories, query } }));
  }
  function closeDialogs(restoreFocus = true) {
    if (currentView === 'checkout') captureCheckout();
    if (mainDialog?.open) mainDialog.close(); if (drawerDialog?.open) drawerDialog.close();
    currentView = ''; document.body.classList.remove('has-open-dialog');
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function openDialog(view, html, drawer = false) {
    const target = drawer ? drawerDialog : mainDialog, body = drawer ? drawerBody : dialogBody;
    if (!target || !body) return;
    if (!mainDialog?.open && !drawerDialog?.open) previousFocus = document.activeElement;
    if (currentView === 'checkout' && view !== 'checkout') captureCheckout();
    if (mainDialog?.open) mainDialog.close(); if (drawerDialog?.open) drawerDialog.close();
    currentView = view; body.innerHTML = html + liveRegion;
    target.dataset.view = view;
    target.setAttribute('aria-labelledby', drawer ? 'drawer-title' : 'dialog-title');
    target.showModal(); document.body.classList.add('has-open-dialog');
    requestAnimationFrame(() => { const initial = $('[data-initial-focus]', body) || $('input:not([type="hidden"]):not(:disabled), button:not(:disabled), a[href]', body); initial?.focus({ preventScroll: true }); });
  }
  const quantityControl = (item, prefix = '') => `<div class="quantity-control" aria-label="Количество: ${esc(item.name)}${item.variantLabel ? `, ${esc(item.variantLabel)}` : ''}"><button type="button" data-action="${prefix}decrease" data-id="${esc(item.id)}" aria-label="Уменьшить количество: ${esc(item.name)}${item.variantLabel ? `, ${esc(item.variantLabel)}` : ''}">${icon.minus}</button><span aria-live="polite">${item.quantity}</span><button type="button" data-action="${prefix}increase" data-id="${esc(item.id)}" aria-label="Увеличить количество: ${esc(item.name)}${item.variantLabel ? `, ${esc(item.variantLabel)}` : ''}" ${item.quantity >= 99 ? 'disabled' : ''}>${icon.plus}</button></div>`;
  const fulfillmentControl = () => `<div class="fulfillment-control" role="group" aria-label="Способ получения"><button type="button" data-action="set-fulfillment" data-fulfillment="delivery" class="${state.fulfillment === 'delivery' ? 'is-active' : ''}" aria-pressed="${state.fulfillment === 'delivery'}">Доставка</button><button type="button" data-action="set-fulfillment" data-fulfillment="pickup" class="${state.fulfillment === 'pickup' ? 'is-active' : ''}" aria-pressed="${state.fulfillment === 'pickup'}">Самовывоз</button></div>`;
  const pickupInfo = () => `<div class="pickup-info"><span class="pickup-marker" aria-hidden="true">${icon.pin}</span><div><strong>Забрать в «Тонком По»</strong><p>${esc(pickupAddress)}</p><p class="muted-note">Среда–воскресенье, 11:00–22:00. Время готовности подтвердит кафе.</p></div></div>`;
  function renderCart() {
    const items = rows();
    const html = `<div class="interaction-heading"><p class="interaction-eyebrow">ВАШ ВЫБОР</p><h2 id="drawer-title">Корзина <span class="heading-count">${cartCount()}</span></h2></div>${items.length ? `
      ${needsConfiguration() ? '<div class="variant-cart-notice">В сохранённой корзине есть блюда без выбранных вариантов. Уточните их перед оформлением — количество сохранено.</div>' : ''}
      <div class="cart-items">${items.map((item) => `<article class="cart-item"><img src="${esc(item.image)}" alt="" width="88" height="88"><div class="cart-item-content"><h3>${esc(item.name)}</h3>${variantCaption(item)}${item.needsSelection ? '<p class="variant-required">Нужно выбрать вариант</p>' : ''}<p>${item.needsSelection ? 'от ' : ''}${money(item.price)} / порция</p>${hasVariants(item) ? `<button class="cart-configure" type="button" data-action="configure-cart" data-id="${esc(item.id)}">${item.needsSelection ? 'Выбрать вариант' : 'Изменить вариант'} ${icon.arrow}</button>` : ''}<div class="cart-item-bottom">${quantityControl(item)}<strong>${item.needsSelection ? 'от ' : ''}${money(item.price * item.quantity)}</strong></div></div><button class="cart-remove" type="button" data-action="remove" data-id="${esc(item.id)}" aria-label="Удалить ${esc(item.name)}${item.variantLabel ? `, ${esc(item.variantLabel)}` : ''}">${icon.close}</button></article>`).join('')}</div>
      <div class="cart-summary">${fulfillmentControl()}<button class="cart-address" type="button" data-action="address"><span>${state.fulfillment === 'pickup' ? 'Самовывоз из кафе' : 'Адрес доставки'}<strong>${esc(state.fulfillment === 'pickup' ? pickupAddress : state.address || 'Укажите адрес')}</strong></span>${icon.arrow}</button><p class="muted-note">${state.fulfillment === 'delivery' ? 'Стоимость доставки уточним по адресу.' : 'Время готовности подтвердит кафе.'}</p><div class="summary-total"><span>Блюда</span><strong>${cartPrice()}</strong></div><button class="interaction-button interaction-button-wide" type="button" data-action="checkout">${needsConfiguration() ? 'Выбрать варианты' : 'К оформлению'} ${icon.arrow}</button><p class="fine-print">Сейчас доступен демо-заказ без оплаты.</p></div>` : '<div class="empty-state"><span class="empty-symbol" aria-hidden="true">' + icon.bag + '</span><h3>Что будем пробовать?</h3><p>Выберите блюда в меню — они появятся здесь.</p><button class="interaction-button" type="button" data-action="close-drawer">Открыть меню</button></div>'}`;
    if (drawerDialog?.open && currentView === 'cart') drawerBody.innerHTML = html + liveRegion; else openDialog('cart', html, true);
  }
  function renderVariantQuantities(id = quantityProductId) {
    const product = productMap.get(id); if (!product) return;
    quantityProductId = id;
    const entries = productRows(id);
    const html = `<div class="interaction-heading"><p class="interaction-eyebrow">ВАШ ВЫБОР</p><h2 id="dialog-title">${esc(product.name)}</h2>${entries.length ? '<p class="interaction-intro">Укажите количество для каждого варианта.</p>' : ''}</div>${entries.length ? `<div class="variant-quantity-list">${entries.map((item) => `<article class="variant-quantity-row" data-choice-row="${esc(item.id)}"><div class="variant-quantity-description"><h3>${esc(item.variantLabel || 'Вариант ещё не выбран')}</h3><p>${item.needsSelection ? 'от ' : ''}${money(item.price)} за порцию</p></div><div class="variant-quantity-actions">${quantityControl(item, 'choice-')}<strong>${item.needsSelection ? 'от ' : ''}${money(item.price * item.quantity)}</strong></div></article>`).join('')}</div><button class="secondary-button interaction-button-wide variant-another" type="button" data-action="product" data-id="${esc(id)}">${icon.plus} Другой вариант</button>` : '<div class="empty-state account-empty"><h3>Все варианты убраны</h3><p>Добавить блюдо снова можно кнопкой с плюсом в меню.</p><button class="interaction-button" type="button" data-action="close-dialog">Вернуться в меню</button></div>'}`;
    if (mainDialog?.open && currentView === 'variant-quantities') dialogBody.innerHTML = html + liveRegion;
    else openDialog('variant-quantities', html);
  }
  function inlineVariantControl(variant) {
    const quantity = state.cart[variant.id] || 0;
    return '<div class="direct-variant-quantity" role="group" aria-label="Количество: ' + esc(sellableMap.get(variant.id)?.variantLabel || '') + '"><button type="button" data-action="variant-row-decrease" data-id="' + esc(variant.id) + '" aria-label="Убрать одну порцию" ' + (!quantity ? 'disabled' : '') + '>' + icon.minus + '</button><span class="direct-variant-count" aria-live="polite" aria-atomic="true">' + quantity + '</span><button type="button" data-action="variant-row-increase" data-id="' + esc(variant.id) + '" aria-label="Добавить одну порцию" ' + (quantity >= 99 ? 'disabled' : '') + '>' + icon.plus + '</button></div>';
  }
  function pendingVariantNotice(product) {
    const pending = productRows(product.id).filter(item => item.needsSelection);
    if (!pending.length) return '';
    return '<div class="variant-pending-notice"><strong>Уточните сохранённые позиции</strong><p>Количество осталось в корзине. Выберите вариант для каждой позиции или уберите её.</p>' + pending.map(item => '<div class="variant-pending-row" data-pending-row="' + esc(item.id) + '"><p>' + esc(item.variantLabel || product.name) + ' · ' + item.quantity + ' порц.</p><label class="form-field"><span>Какой вариант?</span><select data-pending-select="' + esc(item.id) + '"><option value="">Выберите вариант</option>' + product.variants.filter(variant => sellableMap.has(variant.id)).map(variant => '<option value="' + esc(variant.id) + '">' + esc(variantLabel(product, variant)) + ' · ' + money(variant.price) + '</option>').join('') + '</select></label><div class="variant-pending-actions"><button type="button" class="secondary-button" data-action="legacy-assign-variant" data-id="' + esc(item.id) + '">Сохранить выбор</button><button type="button" class="interaction-text-button" data-action="legacy-remove-pending" data-id="' + esc(item.id) + '">Убрать позицию</button></div></div>').join('') + '</div>';
  }
  function productVariantPanel(product) {
    const groups = product.optionGroups || [], rowGroup = groups.at(-1), baseGroups = groups.slice(0, -1);
    const current = rowGroup ? rowGroup.options.map(option => ({ option, variant: product.variants.find(variant => variant.available !== false && variant.attributes[rowGroup.id] === option.value && baseGroups.every(group => variant.attributes[group.id] === activeProduct.selected[group.id])) })).filter(row => row.variant && sellableMap.has(row.variant.id)) : [];
    const entries = productRows(product.id).filter(item => !item.needsSelection), quantity = entries.reduce((sum, item) => sum + item.quantity, 0), total = entries.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const currentQuantity = current.reduce((sum, row) => sum + (state.cart[row.variant.id] || 0), 0);
    return pendingVariantNotice(product) + baseGroups.map(group => '<fieldset class="variant-base-group"><legend>' + esc(group.label) + '</legend><div class="variant-base-options">' + group.options.map(option => '<label class="variant-base-option"><input type="radio" name="base-' + esc(group.id) + '" data-variant-base="' + esc(group.id) + '" value="' + esc(option.value) + '" ' + (activeProduct.selected[group.id] === option.value ? 'checked' : '') + '><span>' + esc(option.label) + '</span></label>').join('') + '</div></fieldset>').join('') + '<div class="variant-rows-heading"><h3>' + esc(baseGroups.length ? 'Начинка и количество порций' : rowGroup?.label || 'Варианты') + '</h3><p>Добавляйте разные варианты сразу.</p></div><div class="product-option-rows">' + current.map(({ option, variant }) => '<article class="product-option-row" data-variant-row="' + esc(variant.id) + '"><div class="product-option-caption"><h4>' + esc(option.label) + '</h4><p>' + money(variant.price) + '</p></div>' + inlineVariantControl(variant) + '</article>').join('') + '</div>' + (baseGroups.length && quantity > currentQuantity ? '<p class="variant-other-count">Ещё ' + (quantity - currentQuantity) + ' порц. с другой лапшой — они сохранены в корзине.</p>' : '') + '<p class="variant-direct-message" id="variant-direct-message" role="status" aria-live="polite"></p><div class="variant-direct-footer"><div><span>Выбрано · ' + quantity + ' порц.</span><strong>' + money(total) + '</strong></div><button class="interaction-button" type="button" data-action="close-dialog">Готово ' + icon.check + '</button></div>';
  }
  function syncProductChoices() {
    if (currentView !== 'product' || !activeProduct) return;
    const product = productMap.get(activeProduct.productId), panel = $('#product-variants-panel');
    if (!product || !panel) return;
    const focused = panel.contains(document.activeElement) ? document.activeElement : null;
    const action = focused?.dataset?.action, id = focused?.dataset?.id, base = focused?.dataset?.variantBase, value = focused?.value;
    panel.innerHTML = productVariantPanel(product);
    let target = action ? $$('[data-action]', panel).find(button => button.dataset.action === action && button.dataset.id === id && !button.disabled) : base ? $$('[data-variant-base]', panel).find(input => input.dataset.variantBase === base && input.value === value) : null;
    if (!target && id) target = $$('[data-action="variant-row-increase"], [data-action="variant-row-decrease"]', panel).find(button => button.dataset.id === id && !button.disabled);
    if (!target && focused) target = $$('[data-action="variant-row-increase"], [data-action="variant-row-decrease"], [data-action="close-dialog"]', panel).find(button => !button.disabled);
    target?.focus({ preventScroll: true });
  }
  function renderProduct(id, options = {}) {
    const entry = sellableMap.get(id), item = productMap.get(id) || productMap.get(entry?.parentId); if (!item) return;
    if (hasVariants(item)) {
      const preferred = item.variants.find(variant => variant.id === options.variantId) || item.variants.find(variant => item.optionGroups.every(group => variant.attributes[group.id] === item.defaultAttributes?.[group.id])) || item.variants.find(variant => variant.available !== false);
      activeProduct = { productId: item.id, selected: { ...preferred?.attributes } };
    } else activeProduct = null;
    openDialog('product', '<div class="product-detail ' + (hasVariants(item) ? 'product-detail-configurable product-detail-direct' : '') + '"><div class="detail-image-wrap"><img src="' + esc(item.image) + '" alt="' + esc(item.name) + '">' + (item.tag ? '<span class="detail-tag">' + esc(item.tag) + '</span>' : '') + '</div><div class="detail-content"><p class="interaction-eyebrow">' + esc(categories[item.category]) + '</p><h2 id="dialog-title">' + esc(item.name) + '</h2><p class="detail-description">' + esc(item.description) + '</p>' + (hasVariants(item) ? '<div id="product-variants-panel" class="product-variants-panel">' + productVariantPanel(item) + '</div>' : (item.spicy ? '<p class="detail-spicy">С остринкой</p>' : '') + (item.priceFrom ? '<p class="muted-note">Для этой позиции нужно уточнить варианты и итоговую цену в кафе.</p>' : '') + '<div class="detail-bottom"><strong class="detail-price">' + (item.priceFrom ? 'от ' : '') + money(item.price) + '</strong>' + (item.priceFrom ? '<a class="interaction-button" href="tel:+79015591357">Уточнить в кафе</a>' : '<button class="interaction-button" type="button" data-action="add" data-id="' + esc(item.id) + '">В корзину ' + icon.plus + '</button>') + '</div>') + '<p class="fine-print">Состав и информацию об аллергенах уточняйте в кафе.</p></div></div>');
  }
  const field = (label, name, value = '', options = '') => `<label class="form-field"><span>${label}</span><input name="${name}" value="${esc(value)}" ${options}></label>`;
  function savedAddressSelect(selectedId = state.selectedAddressId) {
    return state.addresses.length ? `<label class="form-field"><span>Сохранённые адреса</span><select name="savedAddress" data-address-select><option value="">Новый адрес</option>${state.addresses.map((address) => `<option value="${esc(address.id)}" ${address.id === selectedId ? 'selected' : ''}>${esc(address.label)} · ${esc(address.address)}${address.apartment ? `, кв. ${esc(address.apartment)}` : ''}</option>`).join('')}</select></label>` : '';
  }
  function renderAddress(returnTo = returnFromAddress) {
    returnFromAddress = returnTo;
    openDialog('address', `<div class="interaction-heading"><p class="interaction-eyebrow">ДОСТАВКА И САМОВЫВОЗ</p><h2 id="dialog-title">Куда привезти?</h2></div>${fulfillmentControl()}<form id="address-form" class="commerce-form">${state.fulfillment === 'delivery' ? `${savedAddressSelect()}${field('Адрес доставки', 'address', state.address, 'id="delivery-address" autocomplete="street-address" maxlength="250" placeholder="Улица и дом" required data-initial-focus')}<p class="muted-note">Стоимость доставки уточним по адресу. Адрес сохранится в этом браузере.</p>` : pickupInfo()}<button class="interaction-button interaction-button-wide" type="submit">${state.fulfillment === 'delivery' ? 'Использовать этот адрес' : 'Выбрать самовывоз'} ${icon.arrow}</button></form>`);
  }
  function availableSlots() {
    const now = Date.now();
    const today = new Date(now + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const start = new Date(`${today}T00:00:00+03:00`).getTime();
    const slots = [];
    for (let day = 0; day < 10; day++) {
      const dayTime = start + day * 86400000;
      const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Moscow' }).format(dayTime);
      if (!['Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(weekday)) continue;
      for (let minute = 11 * 60; minute <= 21 * 60 + 30; minute += 30) {
        const time = dayTime + minute * 60000;
        if (time <= now) continue;
        slots.push({ value: new Date(time).toISOString(), label: new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Moscow' }).format(time) });
      }
    }
    return slots;
  }
  function captureCheckout() {
    const form = $('#checkout-form'); if (!form) return;
    const values = Object.fromEntries(new FormData(form));
    checkoutDraft = { ...checkoutDraft, ...values, cutlery: Number(values.cutlery) || 0, saveAddress: form.elements.namedItem('saveAddress') ? values.saveAddress === 'yes' : !!checkoutDraft?.saveAddress, savedAddressId: typeof values.savedAddress === 'string' ? values.savedAddress : checkoutDraft?.savedAddressId || '' };
  }
  function renderCheckout() {
    if (!cartCount()) { renderCart(); return; }
    const pending = rows().find((item) => item.needsSelection);
    if (pending) { renderProduct(pending.parentId, { replaceKey: pending.id, quantity: pending.quantity }); announce('Выберите вариант сохранённого блюда перед оформлением.'); return; }
    if (!checkoutDraft) { const address = state.addresses.find((item) => item.id === state.selectedAddressId); checkoutDraft = { name: state.profile.name, phone: phoneDisplay(state.profile.phone), address: address?.address || state.address, savedAddressId: address?.id || '', apartment: address?.apartment || '', entrance: address?.entrance || '', floor: address?.floor || '', comment: address?.note || '', cutlery: 1, timing: 'soon', scheduledAt: '', paymentMethod: 'card', saveAddress: false }; }
    const draft = checkoutDraft, slots = availableSlots(), ready = window.CafePayment?.isEnabled() === true;
    openDialog('checkout', `<div class="interaction-heading checkout-heading"><p class="interaction-eyebrow">ЕЩЁ ПАРА ДЕТАЛЕЙ</p><h2 id="dialog-title">Оформление заказа</h2></div><form id="checkout-form" class="checkout-layout commerce-form"><div class="checkout-fields">${fulfillmentControl()}<section class="checkout-section"><h3>Ваши контакты</h3><div class="form-grid">${field('Имя', 'name', draft.name, 'autocomplete="given-name" maxlength="80" placeholder="Как к вам обращаться" required data-initial-focus')}${field('Телефон', 'phone', draft.phone, 'type="tel" inputmode="tel" autocomplete="tel" maxlength="22" placeholder="+7 ___ ___-__-__" required')}</div></section><section class="checkout-section"><h3>${state.fulfillment === 'delivery' ? 'Адрес доставки' : 'Самовывоз'}</h3>${state.fulfillment === 'delivery' ? `${savedAddressSelect(draft.savedAddressId)}${field('Улица и дом', 'address', draft.address, 'id="checkout-address" autocomplete="street-address" maxlength="250" placeholder="Населённый пункт, улица, дом" required')}<div class="form-grid form-grid-three">${field('Квартира', 'apartment', draft.apartment, 'maxlength="20" inputmode="text"')}${field('Подъезд', 'entrance', draft.entrance, 'maxlength="30"')}${field('Этаж', 'floor', draft.floor, 'maxlength="20"')}</div>${state.signedIn ? '<label class="check-field"><input type="checkbox" name="saveAddress" value="yes" ' + (draft.saveAddress ? 'checked' : '') + '><span>Сохранить адрес в кабинете</span></label>' : ''}<p class="muted-note">Стоимость и доступность доставки уточним по адресу.</p>` : pickupInfo()}</section><section class="checkout-section"><h3>Когда удобно?</h3><div class="timing-options"><label class="choice-label"><input type="radio" name="timing" value="soon" ${draft.timing !== 'scheduled' ? 'checked' : ''}><span>Как можно скорее</span></label><label class="choice-label"><input type="radio" name="timing" value="scheduled" ${draft.timing === 'scheduled' ? 'checked' : ''}><span>Ко времени</span></label></div><label class="form-field schedule-field" ${draft.timing !== 'scheduled' ? 'hidden' : ''}><span>Выберите дату и время · МСК</span><select name="scheduledAt" ${draft.timing === 'scheduled' ? 'required' : 'disabled'}><option value="">Выбрать время</option>${slots.map((slot) => `<option value="${esc(slot.value)}" ${draft.scheduledAt === slot.value ? 'selected' : ''}>${esc(slot.label)}</option>`).join('')}</select></label><p class="muted-note">Принимаем заказы со среды по воскресенье, 11:00–22:00. Время подтвердит кафе.</p></section><section class="checkout-section"><h3>Пожелания</h3><div class="cutlery-row"><label for="checkout-cutlery">Приборы</label><div class="quantity-control"><button type="button" data-action="cutlery-minus" aria-label="На один комплект меньше">${icon.minus}</button><input id="checkout-cutlery" name="cutlery" value="${Math.max(0, Math.min(20, Number(draft.cutlery) || 0))}" type="number" min="0" max="20" readonly aria-label="Количество комплектов приборов"><button type="button" data-action="cutlery-plus" aria-label="На один комплект больше">${icon.plus}</button></div></div><label class="form-field"><span>Комментарий к заказу <span class="optional-label">· необязательно</span></span><textarea name="comment" maxlength="500" rows="3" placeholder="Например, позвонить у подъезда">${esc(draft.comment)}</textarea></label></section><section class="checkout-section"><h3>Оплата на сайте</h3><div class="payment-options"><label class="payment-choice"><input type="radio" name="paymentMethod" value="card" ${draft.paymentMethod !== 'sbp' ? 'checked' : ''}><span><strong>Картой</strong><span>На странице оплаты</span></span></label><label class="payment-choice"><input type="radio" name="paymentMethod" value="sbp" ${draft.paymentMethod === 'sbp' ? 'checked' : ''}><span><strong>СБП</strong><span>Через приложение банка</span></span></label></div>${!ready ? '<p class="payment-unavailable">Онлайн-касса ещё не подключена. Здесь можно проверить оформление без списания денег.</p>' : '<p class="muted-note">Вы перейдёте на защищённую страницу платёжного сервиса.</p>'}</section></div><aside class="checkout-summary"><h3>В заказе · ${cartCount()}</h3><div class="checkout-lines">${rows().map((item) => `<div><span>${esc(item.name)} <span class="muted">× ${item.quantity}</span>${variantCaption(item)}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join('')}</div>${state.fulfillment === 'delivery' ? '<div class="checkout-delivery-line"><span>Доставка</span><span>Уточним по адресу</span></div>' : ''}<div class="summary-total"><span>Блюда</span><strong>${cartPrice()}</strong></div>${state.fulfillment === 'delivery' ? '<p class="muted-note">Итоговая стоимость с доставкой рассчитывается после проверки адреса.</p>' : ''}<div class="checkout-submit-area"><div class="checkout-mobile-total"><span>Блюда · ${cartCount()}</span><strong>${cartPrice()}</strong></div>${!ready ? demoNotice : ''}<button class="interaction-button interaction-button-wide" type="submit" ${checkoutBusy ? 'disabled' : ''}>${checkoutBusy ? 'Подождите…' : ready ? 'Перейти к оплате' : 'Создать демо-заказ'} ${icon.arrow}</button><p class="checkout-local-note">Данные демо-заказа хранятся только в этом браузере.</p><p class="form-error" id="checkout-error" role="alert" hidden></p></div><button class="interaction-text-button" type="button" data-action="cart">Изменить состав заказа</button></aside></form>`);
  }
  const stageDescription = (order) => ['Демонстрационный заказ принят. Он не отправлен в кафе и не оплачен.', 'Демо: так выглядит этап приготовления на кухне.', order.fulfillment === 'delivery' ? 'Демо: заказ передан курьеру. Реальные данные появятся после подключения системы кафе.' : 'Демо: заказ готов к самовывозу из кафе.', order.fulfillment === 'delivery' ? 'Демонстрация завершена. Состав заказа сохранён в истории.' : 'Демонстрация завершена. Заказ сохранён в истории.'][order.stage];
  function orderLines(order) { return `<div class="order-detail-items">${order.items.map((item) => `<div><span>${esc(item.name)} <span class="muted">× ${item.quantity}</span>${variantCaption(item)}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join('')}</div><div class="tracking-order-summary"><span>Блюда</span><strong>${money(orderTotal(order))}</strong></div><div class="order-detail-meta"><p><span>Получение</span><strong>${order.fulfillment === 'pickup' ? 'Самовывоз' : 'Доставка'}</strong></p><p><span>Адрес</span><strong>${esc(order.fulfillment === 'pickup' ? pickupAddress : [order.address || 'Адрес не указан', order.apartment ? `кв. ${order.apartment}` : '', order.entrance ? `подъезд ${order.entrance}` : '', order.floor ? `этаж ${order.floor}` : ''].filter(Boolean).join(', '))}</strong></p>${order.contact.name || order.contact.phone ? `<p><span>Получатель</span><strong>${esc(order.contact.name)}${order.contact.phone ? `${order.contact.name ? ' · ' : ''}${phoneLink(order.contact.phone)}` : ''}</strong></p>` : ''}<p><span>Время</span><strong>${order.scheduledAt ? esc(formatDate(order.scheduledAt)) : 'Как можно скорее · подтвердит кафе'}</strong></p><p><span>Оплата</span><strong>Не оплачен · демо-заказ</strong></p><p><span>Приборы</span><strong>${order.cutlery} компл.</strong></p>${order.comment ? `<p><span>Комментарий</span><strong>${esc(order.comment)}</strong></p>` : ''}</div>`; }
  function renderTracker(order = null) {
    const selected = order || state.orders.find((item) => item.id === currentOrderId) || latestDockOrder() || state.orders[0];
    if (!selected) { openDialog('tracker', '<div class="interaction-heading"><p class="interaction-eyebrow">МОЙ ЗАКАЗ</p><h2 id="dialog-title">Заказ всегда под рукой</h2></div><div class="empty-state account-empty"><h3>У вас пока нет заказов</h3><p>После оформления здесь появятся состав и статус. Отследить заказ можно без входа в кабинет.</p><button class="interaction-button" type="button" data-action="close-dialog">Выбрать блюда</button></div>'); return; }
    currentOrderId = selected.id; const stages = orderStages(selected);
    openDialog('tracker', `<div class="interaction-heading"><p class="interaction-eyebrow">МОЙ ЗАКАЗ · ${esc(formatDate(selected.created))}</p><h2 id="dialog-title">${esc(selected.id)}</h2></div>${demoNotice}<div class="tracking-status"><span class="tracking-pulse" aria-hidden="true"></span><span>${esc(stages[selected.stage])}</span></div><p class="tracking-description">${stageDescription(selected)}</p><ol class="tracking-steps">${stages.map((stage, index) => `<li class="${index < selected.stage ? 'is-complete' : index === selected.stage ? 'is-current' : ''}" ${index === selected.stage ? 'aria-current="step"' : ''}><span class="step-marker" aria-hidden="true">${index < selected.stage ? icon.check : index + 1}</span><span>${esc(stage)}</span></li>`).join('')}</ol><details class="tracker-composition"><summary>Состав и детали заказа ${icon.arrow}</summary>${orderLines(selected)}</details><div class="demo-stage-panel"><strong>Проверка демо-статусов</strong><p>В рабочем сервисе статусы будет менять система кафе. Сейчас их можно переключить вручную.</p>${selected.stage < 3 ? `<button class="secondary-button" type="button" data-action="next-stage" data-id="${esc(selected.id)}">Следующий демо-этап ${icon.arrow}</button>` : `<button class="secondary-button" type="button" data-action="repeat-order" data-id="${esc(selected.id)}">Повторить заказ ${icon.arrow}</button>`}</div><a class="tracker-contact" href="tel:+79015591357">Связаться с кафе · +7 901 559-13-57</a>`);
  }
  function renderLogin() {
    openDialog('account-login', `<div class="interaction-heading"><p class="interaction-eyebrow">ЛИЧНЫЙ КАБИНЕТ</p><h2 id="dialog-title">${loginStep === 'code' ? 'Проверим вход' : 'Рады вас видеть'}</h2><p class="interaction-intro">Заказы, адреса и любимые блюда — в одном месте.</p></div><div class="account-local-notice">Демо-кабинет на этом устройстве. Профиль и история сохраняются в этом браузере.</div>${loginStep === 'code' ? `<form id="login-code-form" class="commerce-form"><p class="login-phone">${phoneLink(loginPhone)} <button type="button" class="interaction-text-button" data-action="change-login-phone">Изменить</button></p><div class="demo-code-note"><strong>Демо-код: 1234</strong><p>SMS не отправляется. Введите этот код, чтобы посмотреть сценарий входа.</p></div>${field('Демо-код', 'code', '', 'inputmode="numeric" autocomplete="off" maxlength="4" pattern="1234" placeholder="1234" required data-initial-focus')}<button class="interaction-button interaction-button-wide" type="submit">Войти ${icon.arrow}</button><p class="form-error" id="login-error" role="alert" hidden></p></form>` : `<form id="login-phone-form" class="commerce-form">${field('Номер телефона', 'phone', '', 'type="tel" inputmode="tel" autocomplete="tel" maxlength="22" placeholder="+7 ___ ___-__-__" required data-initial-focus')}<button class="interaction-button interaction-button-wide" type="submit">Продолжить с демо-кодом ${icon.arrow}</button><p class="muted-note">SMS не отправляется. Следующий экран покажет тестовый код.</p></form>`}<div class="login-divider"><span>или</span></div><button class="secondary-button interaction-button-wide" type="button" data-action="demo-login">Посмотреть демо-кабинет</button>`);
  }
  function orderCard(order, active = false) { return `<article class="account-order ${active ? 'account-order-active' : ''}"><div class="account-order-top"><strong>${esc(order.id)}</strong><span>${esc(formatDate(order.created))}</span></div><span class="order-status-chip">${esc(orderStages(order)[order.stage])} · демо</span><p>${order.items.map((item) => `${esc(item.name)}${item.variantLabel ? ` (${esc(item.variantLabel)})` : ''} × ${item.quantity}`).join(', ')}</p><div class="account-order-bottom"><strong>${money(orderTotal(order))}</strong><button class="interaction-text-button" type="button" data-action="${active ? 'track-order' : 'order-details'}" data-id="${esc(order.id)}">${active ? 'Смотреть статус' : 'Детали заказа'} ${icon.arrow}</button></div>${!active ? `<button class="repeat-order" type="button" data-action="repeat-order" data-id="${esc(order.id)}">Повторить заказ</button>` : ''}</article>`; }
  function accountOrders() {
    const active = state.orders.filter((order) => order.stage < 3), history = state.orders.filter((order) => order.stage === 3);
    return `${active.length ? `<div class="account-section-heading"><h3>Сейчас готовим</h3><span>${active.length}</span></div><div class="account-orders">${active.map((order) => orderCard(order, true)).join('')}</div>` : ''}<div class="account-section-heading"><h3>История заказов</h3><span>${history.length}</span></div>${history.length ? `<div class="account-orders">${history.map((order) => orderCard(order)).join('')}</div>` : `<div class="empty-state account-empty"><h3>${active.length ? 'Завершённые заказы будут здесь' : 'Начнём с чего-нибудь вкусного?'}</h3><p>${active.length ? 'Их можно будет посмотреть и повторить в пару нажатий.' : 'Выберите блюда из меню. После оформления заказ появится здесь.'}</p><button class="interaction-text-button" type="button" data-action="close-dialog">Открыть меню ${icon.arrow}</button></div>`}`;
  }
  function accountAddresses() {
    const editing = editingAddressId ? state.addresses.find((item) => item.id === editingAddressId) : null;
    if (editingAddressId) return `<div class="account-section-heading"><h3>${editing ? 'Редактировать адрес' : 'Новый адрес'}</h3></div><form id="saved-address-form" class="commerce-form" data-id="${esc(editing?.id || '')}">${field('Название', 'label', editing?.label || '', 'maxlength="50" placeholder="Например, дом" required data-initial-focus')}${field('Улица и дом', 'address', editing?.address || state.address, 'maxlength="250" autocomplete="street-address" placeholder="Населённый пункт, улица, дом" required')}<div class="form-grid form-grid-three">${field('Квартира', 'apartment', editing?.apartment || '', 'maxlength="20"')}${field('Подъезд', 'entrance', editing?.entrance || '', 'maxlength="30"')}${field('Этаж', 'floor', editing?.floor || '', 'maxlength="20"')}</div>${field('Комментарий для курьера', 'note', editing?.note || '', 'maxlength="300" placeholder="Домофон, ориентир"')}<label class="check-field"><input type="checkbox" name="isDefault" ${editing?.isDefault || !state.addresses.length ? 'checked' : ''}><span>Адрес по умолчанию</span></label><button class="interaction-button" type="submit">Сохранить адрес ${icon.arrow}</button><button class="interaction-text-button" type="button" data-action="cancel-address-edit">Отмена</button></form>`;
    return `<div class="account-section-heading"><h3>Мои адреса</h3><span>${state.addresses.length}</span></div><p class="muted-note">Сохраните адрес — при следующем заказе его можно будет выбрать из списка.</p><div class="saved-address-list">${state.addresses.map((address) => `<article class="saved-address-card"><div class="saved-address-heading"><h4>${esc(address.label)}</h4>${address.isDefault ? '<span class="address-default-label">Основной</span>' : ''}</div><p>${esc([address.address, address.apartment ? `кв. ${address.apartment}` : '', address.entrance ? `подъезд ${address.entrance}` : '', address.floor ? `этаж ${address.floor}` : ''].filter(Boolean).join(', '))}</p>${address.note ? `<p class="muted-note">${esc(address.note)}</p>` : ''}<div class="saved-address-actions"><button class="interaction-text-button" type="button" data-action="use-address" data-id="${esc(address.id)}">Выбрать</button><button class="interaction-text-button" type="button" data-action="edit-address" data-id="${esc(address.id)}">Изменить</button>${!address.isDefault ? `<button class="interaction-text-button" type="button" data-action="default-address" data-id="${esc(address.id)}">Сделать основным</button>` : ''}<button class="interaction-text-button address-delete" type="button" data-action="delete-address" data-id="${esc(address.id)}">Удалить</button></div></article>`).join('')}${!state.addresses.length ? '<div class="empty-state account-empty"><h3>Куда обычно доставлять?</h3><p>Добавьте дом, работу или другой удобный адрес.</p></div>' : ''}</div><button class="secondary-button" type="button" data-action="new-address" ${state.addresses.length >= 20 ? 'disabled' : ''}>${icon.plus} Добавить адрес</button>`;
  }
  function accountFavorites() { return `<div class="account-section-heading"><h3>Избранное</h3><span>${state.favorites.length}</span></div>${state.favorites.length ? `<div class="favorite-list">${state.favorites.map((id) => { const item = productMap.get(id); return `<div class="favorite-row"><button class="favorite-product" type="button" data-action="product" data-id="${esc(id)}"><img src="${esc(item.image)}" alt="" width="58" height="58"><span>${esc(item.name)}<strong>${item.priceFrom ? 'от ' : ''}${money(item.price)}</strong></span></button><button class="favorite-add" type="button" data-action="${hasVariants(item) || item.priceFrom ? 'product' : 'add'}" data-id="${esc(id)}" aria-label="${hasVariants(item) ? 'Выбрать' : item.priceFrom ? 'Подробнее' : 'В корзину'}: ${esc(item.name)}">${hasVariants(item) || item.priceFrom ? icon.arrow : icon.plus}</button><button class="favorite-remove" type="button" data-action="favorite" data-id="${esc(id)}" aria-label="Убрать из избранного: ${esc(item.name)}">${icon.close}</button></div>`; }).join('')}</div>` : '<div class="empty-state account-empty"><h3>Сохраняйте то, что любите</h3><p>Нажмите сердечко у блюда в меню — оно появится здесь.</p><button class="interaction-text-button" type="button" data-action="close-dialog">Открыть меню ' + icon.arrow + '</button></div>'}`; }
  function accountProfile() { return `<div class="account-section-heading"><h3>Профиль</h3></div><form id="profile-form" class="commerce-form">${field('Имя', 'name', state.profile.name, 'autocomplete="given-name" maxlength="80" placeholder="Как к вам обращаться" required')}${field('Телефон', 'phone', phoneDisplay(state.profile.phone), 'type="tel" inputmode="tel" autocomplete="tel" maxlength="22" placeholder="+7 ___ ___-__-__"')}${field('Электронная почта', 'email', state.profile.email, 'type="email" autocomplete="email" maxlength="150" placeholder="Для связи, необязательно"')}<button class="interaction-button" type="submit">Сохранить профиль ${icon.arrow}</button></form><div class="profile-storage-note"><strong>Данные на этом устройстве</strong><p>Это демонстрационный профиль. Данные сохраняются в браузере; после очистки его памяти они исчезнут. SMS и письма не отправляются.</p></div><button class="secondary-button" type="button" data-action="logout">Выйти из кабинета</button>`; }
  function renderAccount(tab = accountTab) {
    if (!state.signedIn) { renderLogin(); return; }
    accountTab = ['orders', 'addresses', 'favorites', 'profile'].includes(tab) ? tab : 'orders';
    const nav = [['orders', 'Заказы', state.orders.length], ['addresses', 'Адреса', state.addresses.length], ['favorites', 'Избранное', state.favorites.length], ['profile', 'Профиль', null]];
    openDialog('account', `<div class="interaction-heading account-heading"><p class="interaction-eyebrow">ЛИЧНЫЙ КАБИНЕТ</p><h2 id="dialog-title">${state.profile.name ? `Здравствуйте, ${esc(state.profile.name)}` : 'Рады вас видеть'}</h2><p class="account-storage-label">Демо-кабинет · данные только на этом устройстве</p></div><div class="account-layout"><nav class="account-navigation" aria-label="Разделы кабинета">${nav.map(([key, title, count]) => `<button type="button" data-action="account-tab" data-tab="${key}" class="${accountTab === key ? 'is-active' : ''}" ${accountTab === key ? 'aria-current="page"' : ''}><span>${title}</span>${count !== null ? `<span>${count}</span>` : icon.arrow}</button>`).join('')}</nav><div class="account-content">${accountTab === 'orders' ? accountOrders() : accountTab === 'addresses' ? accountAddresses() : accountTab === 'favorites' ? accountFavorites() : accountProfile()}</div></div>`);
  }
  function renderOrderDetails(order) { currentOrderId = order.id; openDialog('order-details', `<div class="interaction-heading"><p class="interaction-eyebrow">${esc(formatDate(order.created))}</p><h2 id="dialog-title">Заказ ${esc(order.id)}</h2></div><span class="order-status-chip">${esc(orderStages(order)[order.stage])} · демо</span>${orderLines(order)}<div class="order-details-actions"><button class="interaction-button" type="button" data-action="repeat-order" data-id="${esc(order.id)}">Повторить заказ ${icon.arrow}</button><button class="interaction-text-button" type="button" data-action="account">Вернуться в кабинет</button></div>`); }
  function renderMap() {
    const mapUrl = 'https://yandex.ru/map-widget/v1/?ol=biz&oid=112317817413&z=17';
    openDialog('map', `<div class="interaction-heading map-heading"><p class="interaction-eyebrow">ТОНКИЙ ПО</p><h2 id="dialog-title">Мы на карте</h2><p class="map-address">${esc(pickupAddress)}</p></div><div class="cafe-map-frame"><iframe src="${mapUrl}" title="Карта: Тонкий По, Ильинское-Усово, Архангельская улица, 15" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div><div class="map-contact"><p><strong>Среда–воскресенье</strong><span>11:00–22:00</span></p><a href="tel:+79015591357">+7 901 559-13-57</a></div>`);
  }
  function renderInfo(kind) {
    if (kind === 'info-business') {
      openDialog('info', `<div class="interaction-heading"><p class="interaction-eyebrow">О КАФЕ</p><h2 id="dialog-title">Реквизиты и контакты</h2></div><dl class="business-info-list"><div><dt>Организация</dt><dd>ИП Янтудина Диана Маратовна</dd></div><div><dt>ИНН</dt><dd>550149013987</dd></div><div><dt>Адрес кафе</dt><dd>${esc(pickupAddress)}</dd></div><div><dt>Телефон</dt><dd><a href="tel:+79015591357">+7 901 559-13-57</a></dd></div><div><dt>Время работы</dt><dd>Среда–воскресенье, 11:00–22:00</dd></div></dl>`);
      return;
    }
    openDialog('info', `<div class="interaction-heading"><p class="interaction-eyebrow">УДОБНО КАК ВАМ НРАВИТСЯ</p><h2 id="dialog-title">Доставка и оплата</h2></div><div class="info-block"><h3>Доставка</h3><p>Укажите адрес при выборе блюд или оформлении. Зону, стоимость и время доставки подтвердит кафе.</p></div><div class="info-block"><h3>Самовывоз</h3><p>${esc(pickupAddress)}<br>Среда–воскресенье, 11:00–22:00. Время готовности подтвердит кафе.</p></div><div class="info-block"><h3>Оплата на сайте</h3><p>Онлайн-касса ещё не подключена. Сейчас сайт показывает демонстрацию оформления: деньги не списываются, заказ не отправляется в кафе. После подключения оплата картой или СБП будет открываться на защищённой странице платёжного сервиса.</p></div><a class="tracker-contact" href="tel:+79015591357">Уточнить условия · +7 901 559-13-57</a>`);
  }
  function changeQuantity(id, delta) {
    const item = cartItem(id); if (!item) return;
    if (item.needsSelection && !state.cart[id]) { renderProduct(item.parentId); return; }
    const before = state.cart[id] || 0, quantity = Math.max(0, Math.min(99, before + delta));
    if (quantity === before) { if (quantity === 99) announce('Максимум 99 порций одного блюда.'); return; }
    if (quantity) { state.cart[id] = quantity; if (item.variantId) state.cartMeta[id] = { productId: item.parentId, variantLabel: item.variantLabel }; }
    else { delete state.cart[id]; delete state.cartMeta[id]; }
    persist(); syncCart(); if (currentView === 'cart') renderCart(); else if (currentView === 'variant-quantities') renderVariantQuantities();
  }
  function validatePhone(input, optional = false) {
    if (optional && !input?.value.trim()) return true;
    if (!input || !validPhone(input.value)) { input?.setCustomValidity('Введите российский номер: +7 и 10 цифр'); input?.reportValidity(); input?.setCustomValidity(''); return false; }
    return true;
  }
  function validateAddress(input) { if (!input || text(input.value).length < 5 || !/\d/.test(input.value)) { input?.setCustomValidity('Укажите населённый пункт, улицу и номер дома'); input?.reportValidity(); input?.setCustomValidity(''); return false; } return true; }
  function selectedAddress(id) { return state.addresses.find((address) => address.id === id); }
  function applyAddressToDraft(address) {
    if (!checkoutDraft || !address) return;
    Object.assign(checkoutDraft, { address: address.address, savedAddressId: address.id, apartment: address.apartment || '', entrance: address.entrance || '', floor: address.floor || '', comment: address.note || '' });
  }
  document.addEventListener('click', (event) => {
    const category = event.target.closest('[data-category]');
    if (category && $('#category-tabs')?.contains(category)) {
      if (category.disabled) return;
      setActiveCategory(category.dataset.category);
      if (mobileMenu.matches) document.dispatchEvent(new CustomEvent('cafe:category-request', { detail: { category: state.category } }));
      else renderProducts();
      return;
    }
    const target = event.target.closest('[data-action], [data-fulfillment]'); if (!target || target.disabled) return;
    const action = target.dataset.action, id = target.dataset.id;
    if (action === 'close-dialog' || action === 'close-drawer') { closeDialogs(); return; }
    if (action === 'card-add') { const product = productMap.get(id); if (!product) return; if (hasVariants(product) || product.priceFrom) { renderProduct(id); return; } if ((state.cart[id] || 0) >= 99) { announce('Максимум 99 порций одного блюда.'); return; } changeQuantity(id, 1); announce(`${product.name} — в корзине`); return; }
    if (action === 'card-decrease') { const entries = productRows(id); if (entries.length > 1) { renderVariantQuantities(id); return; } if (entries.length === 1) changeQuantity(entries[0].id, -1); return; }
    if (action === 'choice-increase' || action === 'choice-decrease') { changeQuantity(id, action === 'choice-increase' ? 1 : -1); const next = $$(`[data-action="${action}"]`, dialogBody).find((button) => button.dataset.id === id && !button.disabled); (next || $('[data-action="choice-decrease"], [data-action="close-dialog"]', dialogBody))?.focus({ preventScroll: true }); return; }
    if (action === 'variant-row-increase' || action === 'variant-row-decrease') { const item = sellableMap.get(id); if (!item || !activeProduct || item.parentId !== activeProduct.productId) return; changeQuantity(id, action === 'variant-row-increase' ? 1 : -1); return; }
    if (action === 'legacy-remove-pending') { const item = cartItem(id); if (item?.needsSelection && state.cart[id]) changeQuantity(id, -state.cart[id]); return; }
    if (action === 'legacy-assign-variant') {
      const pending = cartItem(id), quantity = state.cart[id]; if (!pending?.needsSelection || !quantity) return;
      const select = $$('[data-pending-select]', dialogBody).find(input => input.dataset.pendingSelect === id), item = sellableMap.get(select?.value);
      const message = $('#variant-direct-message');
      if (!item || item.parentId !== pending.parentId) { if (message) message.textContent = 'Выберите вариант для сохранённой позиции.'; select?.focus(); return; }
      if ((state.cart[item.id] || 0) + quantity > 99) { if (message) message.textContent = 'Не удалось объединить: максимум 99 порций одного варианта. Корзина сохранена без изменений.'; return; }
      delete state.cart[id]; delete state.cartMeta[id]; state.cart[item.id] = (state.cart[item.id] || 0) + quantity; state.cartMeta[item.id] = { productId: item.parentId, variantLabel: item.variantLabel };
      persist(); syncCart(); $$('[data-action="variant-row-increase"], [data-action="variant-row-decrease"]', dialogBody).find(button => button.dataset.id === item.id && !button.disabled)?.focus({ preventScroll: true }); announce('Выбор сохранён. Количество перенесено без изменений.'); return;
    }
    if (action === 'product') { renderProduct(id); return; }
    if (action === 'configure-cart') { const item = cartItem(id); if (item) renderProduct(item.parentId, { replaceKey: id, quantity: state.cart[id] || 1, variantId: item.variantId }); return; }
    if (action === 'add') { const item = sellableMap.get(id) || productMap.get(id); if (!item) return; if (!sellableMap.has(id) && (hasVariants(item) || item.priceFrom)) { renderProduct(item.id); return; } changeQuantity(id, 1); announce(`${item.name} — в корзине`); return; }
    if (action === 'increase' || action === 'decrease') { changeQuantity(id, action === 'increase' ? 1 : -1); const next = $$(`[data-action="${action}"]`, drawerBody).find((button) => button.dataset.id === id && !button.disabled); (next || $('[data-action="checkout"]', drawerBody))?.focus({ preventScroll: true }); return; }
    if (action === 'remove') { delete state.cart[id]; delete state.cartMeta[id]; persist(); syncCart(); renderCart(); announce('Блюдо удалено из корзины'); return; }
    if (action === 'favorite' && productMap.has(id)) { const existed = state.favorites.includes(id); state.favorites = existed ? state.favorites.filter((item) => item !== id) : [...state.favorites, id]; persist(); renderProducts(); if (currentView === 'account' && accountTab === 'favorites') renderAccount(); else $$('[data-action="favorite"]').find((button) => button.dataset.id === id)?.focus({ preventScroll: true }); announce(existed ? 'Убрали из избранного' : 'Сохранили в избранное'); return; }
    if (action === 'cart') { renderCart(); return; }
    if (action === 'checkout') { renderCheckout(); return; }
    if (action === 'info-delivery' || action === 'info-business') { renderInfo(action); return; }
    if (action === 'map') { renderMap(); return; }
    if (action === 'account') { renderAccount(); return; }
    if (action === 'account-favorites' || action === 'account-profile') { editingAddressId = ''; accountTab = action === 'account-favorites' ? 'favorites' : 'profile'; renderAccount(accountTab); return; }
    if (action === 'account-tab') { editingAddressId = ''; renderAccount(target.dataset.tab); return; }
    if (action === 'demo-login') { state.signedIn = true; loginStep = 'phone'; persist(); renderAccount(); return; }
    if (action === 'logout') { state.signedIn = false; loginPhone = ''; loginStep = 'phone'; persist(); renderLogin(); announce('Вы вышли. Данные демо-кабинета остаются на этом устройстве.'); return; }
    if (action === 'change-login-phone') { loginStep = 'phone'; renderLogin(); return; }
    if (action === 'address') { renderAddress(currentView === 'cart' ? 'cart' : ''); return; }
    if (action === 'set-fulfillment' || target.hasAttribute('data-fulfillment')) { if (!['delivery', 'pickup'].includes(target.dataset.fulfillment)) return; const view = currentView; if (view === 'checkout') captureCheckout(); const addressInput = $('#delivery-address'); if (addressInput) state.address = text(addressInput.value); state.fulfillment = target.dataset.fulfillment; persist(); syncCart(); if (view === 'checkout') renderCheckout(); else if (view === 'cart') renderCart(); else if (view === 'address') renderAddress(); return; }
    if (action === 'track' || action === 'track-demo') { currentOrderId = ''; renderTracker(); return; }
    if (action === 'track-order') { const order = state.orders.find((item) => item.id === id); if (order) renderTracker(order); return; }
    if (action === 'next-stage') { const order = state.orders.find((item) => item.id === id); if (order) { order.stage = Math.min(3, order.stage + 1); persist(true); syncCart(); renderTracker(order); announce(`Демо-статус: ${orderStages(order)[order.stage]}`); } return; }
    if (action === 'dismiss-order') { const order = state.orders.find((item) => item.id === id); if (order?.stage === 3) { order.dismissed = true; persist(true); renderDock(); } return; }
    if (action === 'order-details') { const order = state.orders.find((item) => item.id === id); if (order) renderOrderDetails(order); return; }
    if (action === 'repeat-order') {
      const order = state.orders.find((item) => item.id === id); if (!order) return;
      let added = 0, missing = 0, configure = 0, limited = 0;
      for (const item of order.items) {
        const known = sellableMap.get(item.variantId) || sellableMap.get(item.id);
        const parent = productMap.get(item.productId) || productMap.get(item.id) || products.find((product) => product.name === item.name);
        if (known) { if ((state.cart[known.id] || 0) + item.quantity > 99) { limited++; continue; } state.cart[known.id] = (state.cart[known.id] || 0) + item.quantity; if (known.variantId) state.cartMeta[known.id] = { productId: known.parentId, variantLabel: known.variantLabel }; added++; }
        else if (parent && hasVariants(parent)) { const pendingId = item.variantId || item.id || parent.id; if ((state.cart[pendingId] || 0) + item.quantity > 99) { limited++; continue; } state.cart[pendingId] = (state.cart[pendingId] || 0) + item.quantity; state.cartMeta[pendingId] = { productId: parent.id, variantLabel: item.variantLabel || '' }; added++; configure++; }
        else missing++;
      }
      persist(); syncCart(); if (added || limited) { renderCart(); announce(limited ? 'Часть позиций не добавлена: максимум 99 порций одного варианта. Состав корзины сохранён.' : configure ? 'Блюда добавлены. Выберите варианты для сохранённых позиций.' : missing ? 'Доступные блюда добавлены. Часть позиций отсутствует в текущем меню.' : 'Блюда с выбранными вариантами добавлены по текущим ценам меню.'); } else announce('Этих блюд сейчас нет в меню. Выберите другие.'); return;
    }
    if (action === 'reset-search') { state.query = ''; state.category = 'all'; if ($('#menu-search')) $('#menu-search').value = ''; renderProducts(); return; }
    if (action === 'new-address') { editingAddressId = 'new'; renderAccount('addresses'); return; }
    if (action === 'edit-address') { if (selectedAddress(id)) { editingAddressId = id; renderAccount('addresses'); } return; }
    if (action === 'cancel-address-edit') { editingAddressId = ''; renderAccount('addresses'); return; }
    if (action === 'default-address') { const address = selectedAddress(id); if (!address) return; state.addresses.forEach((item) => { item.isDefault = item.id === id; }); state.address = address.address; state.selectedAddressId = id; applyAddressToDraft(address); persist(); syncCart(); renderAccount('addresses'); announce('Основной адрес сохранён'); return; }
    if (action === 'delete-address') { const address = selectedAddress(id); state.addresses = state.addresses.filter((item) => item.id !== id); if (address?.isDefault && state.addresses.length) state.addresses[0].isDefault = true; if (state.selectedAddressId === id) { const next = state.addresses.find((item) => item.isDefault); state.selectedAddressId = next?.id || ''; state.address = next?.address || ''; if (next) applyAddressToDraft(next); else if (checkoutDraft) Object.assign(checkoutDraft, { savedAddressId: '', address: '', apartment: '', entrance: '', floor: '', comment: '' }); } persist(); syncCart(); renderAccount('addresses'); announce('Адрес удалён'); return; }
    if (action === 'use-address') { const address = selectedAddress(id); if (!address) return; state.address = address.address; state.selectedAddressId = id; state.fulfillment = 'delivery'; applyAddressToDraft(address); persist(); syncCart(); announce('Адрес выбран для доставки'); return; }
    if (action === 'cutlery-minus' || action === 'cutlery-plus') { const input = $('#checkout-cutlery'); if (input) input.value = String(Math.max(0, Math.min(20, Number(input.value) + (action === 'cutlery-plus' ? 1 : -1)))); captureCheckout(); }
    if ((action === 'variant-quantity-minus' || action === 'variant-quantity-plus') && activeProduct) { activeProduct.quantity = Math.max(1, Math.min(99, activeProduct.quantity + (action === 'variant-quantity-plus' ? 1 : -1))); updateVariantPrice(); }
  });
  document.addEventListener('change', (event) => {
    const target = event.target;
    if (target.matches('[data-variant-base]') && activeProduct) { activeProduct.selected[target.dataset.variantBase] = target.value; syncProductChoices(); }
    if (target.matches('[data-address-select]')) { const address = selectedAddress(target.value); const form = target.closest('form'); const input = $('[name="address"]', form); if (input) input.value = address?.address || ''; for (const key of ['apartment', 'entrance', 'floor']) if ($(`[name="${key}"]`, form)) $(`[name="${key}"]`, form).value = address?.[key] || ''; if ($('[name="comment"]', form)) $('[name="comment"]', form).value = address?.note || ''; captureCheckout(); }
    if (target.name === 'timing' && target.closest('#checkout-form')) { const field = $('.schedule-field'), select = $('[name="scheduledAt"]'); if (field && select) { field.hidden = target.value !== 'scheduled'; select.disabled = target.value !== 'scheduled'; select.required = target.value === 'scheduled'; } captureCheckout(); }
  });
  document.addEventListener('input', (event) => { if (event.target.name === 'address') { const form = event.target.closest('form'); const select = form && $('[data-address-select]', form); if (select) select.value = ''; } if (event.target.closest('#checkout-form')) captureCheckout(); });
  document.addEventListener('submit', async (event) => {
    const form = event.target;
    if (!['address-form', 'checkout-form', 'login-phone-form', 'login-code-form', 'saved-address-form', 'profile-form'].includes(form.id)) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    if (form.id === 'address-form') { if (state.fulfillment === 'delivery') { if (!validateAddress($('[name="address"]', form))) return; state.address = text(values.address); const address = selectedAddress(values.savedAddress); state.selectedAddressId = address?.id || ''; if (address) applyAddressToDraft(address); else if (checkoutDraft) Object.assign(checkoutDraft, { savedAddressId: '', address: state.address, apartment: '', entrance: '', floor: '' }); } persist(); syncCart(); if (returnFromAddress === 'cart') renderCart(); else closeDialogs(); announce(state.fulfillment === 'pickup' ? 'Выбран самовывоз' : 'Адрес доставки сохранён'); return; }
    if (form.id === 'login-phone-form') { if (!validatePhone($('[name="phone"]', form))) return; loginPhone = phoneDigits(values.phone); loginStep = 'code'; renderLogin(); return; }
    if (form.id === 'login-code-form') { if (values.code !== '1234') { const error = $('#login-error'); error.hidden = false; error.textContent = 'Для демонстрации введите 1234. SMS не отправляется.'; return; } state.profile.phone = loginPhone; state.signedIn = true; loginStep = 'phone'; persist(); renderAccount(); return; }
    if (form.id === 'profile-form') { const input = $('[name="name"]', form); if (text(input?.value, 80).length < 2) { input?.setCustomValidity('Укажите имя, хотя бы 2 буквы'); input?.reportValidity(); input?.setCustomValidity(''); return; } if (!validatePhone($('[name="phone"]', form), true)) return; state.profile = { name: text(values.name, 80), phone: values.phone ? phoneDigits(values.phone) : '', email: text(values.email, 150) }; persist(); renderAccount('profile'); announce('Профиль сохранён на этом устройстве'); return; }
    if (form.id === 'saved-address-form') { if (!validateAddress($('[name="address"]', form))) return; const existing = selectedAddress(form.dataset.id); if (!existing && state.addresses.length >= 20) { announce('Можно сохранить до 20 адресов.'); return; } const address = { id: existing?.id || `address-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, label: text(values.label, 50), address: text(values.address), apartment: text(values.apartment, 20), entrance: text(values.entrance, 30), floor: text(values.floor, 20), note: text(values.note, 300), isDefault: !!values.isDefault || !state.addresses.length }; if (address.isDefault) state.addresses.forEach((item) => { item.isDefault = false; }); if (existing) state.addresses[state.addresses.indexOf(existing)] = address; else state.addresses.push(address); if (!state.addresses.some((item) => item.isDefault)) address.isDefault = true; if (address.isDefault || state.selectedAddressId === address.id) { state.address = address.address; state.selectedAddressId = address.id; applyAddressToDraft(address); } editingAddressId = ''; persist(); syncCart(); renderAccount('addresses'); announce('Адрес сохранён'); return; }
    if (form.id === 'checkout-form') {
      if (checkoutBusy) return;
      if (!cartCount()) { renderCart(); return; }
      const nameInput = $('[name="name"]', form);
      if (text(nameInput?.value, 80).length < 2) { nameInput?.setCustomValidity('Укажите имя, хотя бы 2 буквы'); nameInput?.reportValidity(); nameInput?.setCustomValidity(''); return; }
      if (!validatePhone($('[name="phone"]', form))) return;
      if (state.fulfillment === 'delivery' && !validateAddress($('[name="address"]', form))) return;
      if (values.timing === 'scheduled' && !availableSlots().some((slot) => slot.value === values.scheduledAt)) { const select = $('[name="scheduledAt"]', form); select.setCustomValidity('Выберите доступное время в будущем'); select.reportValidity(); select.setCustomValidity(''); return; }
      captureCheckout();
      const contact = { name: text(values.name, 80), phone: phoneDigits(values.phone) };
      const fulfillment = { type: state.fulfillment, address: state.fulfillment === 'delivery' ? text(values.address) : '', apartment: text(values.apartment, 20), entrance: text(values.entrance, 30), floor: text(values.floor, 20), scheduledAt: values.timing === 'scheduled' ? values.scheduledAt : null };
      if (window.CafePayment?.isEnabled()) {
        checkoutBusy = true; const submit = $('button[type="submit"]', form); submit.disabled = true; submit.textContent = 'Открываем оплату…';
        try { const result = await window.CafePayment.createPayment({ items: rows().map((item) => ({ id: item.id, quantity: item.quantity })), contact, fulfillment, comment: text(values.comment, 500), cutlery: Math.max(0, Math.min(20, Number(values.cutlery) || 0)), paymentMethod: values.paymentMethod === 'sbp' ? 'sbp' : 'card' }); window.location.assign(result.confirmationUrl); } catch (error) { const message = error instanceof Error ? error.message : 'Не удалось открыть оплату. Попробуйте ещё раз.'; const area = $('#checkout-error'); if (area) { area.hidden = false; area.textContent = message; } submit.disabled = false; submit.textContent = 'Перейти к оплате'; checkoutBusy = false; }
        return;
      }
      if (state.fulfillment === 'delivery') { state.address = fulfillment.address; state.selectedAddressId = selectedAddress(values.savedAddress)?.id || ''; }
      if (state.signedIn) { state.profile.name = contact.name; state.profile.phone = contact.phone; }
      if (values.saveAddress && state.signedIn && state.fulfillment === 'delivery' && state.addresses.length < 20 && !state.addresses.some((item) => item.address === fulfillment.address && item.apartment === fulfillment.apartment)) { const saved = { id: `address-${Date.now()}`, label: 'Мой адрес', address: fulfillment.address, apartment: fulfillment.apartment, entrance: fulfillment.entrance, floor: fulfillment.floor, note: '', isDefault: !state.addresses.length }; state.addresses.push(saved); state.selectedAddressId = saved.id; }
      const order = { id: `PO-${String(Date.now()).slice(-10)}`, created: Date.now(), stage: 0, dismissed: false, fulfillment: state.fulfillment, items: rows().map((item) => ({ id: item.id, productId: item.parentId, variantId: item.variantId || '', variantLabel: item.variantLabel || '', name: item.name, quantity: item.quantity, price: item.price })), contact, address: fulfillment.address, apartment: fulfillment.apartment, entrance: fulfillment.entrance, floor: fulfillment.floor, comment: text(values.comment, 500), cutlery: Math.max(0, Math.min(20, Number(values.cutlery) || 0)), scheduledAt: fulfillment.scheduledAt || '', paymentMethod: values.paymentMethod === 'sbp' ? 'sbp' : 'card', demo: true, paymentStatus: 'unpaid' };
      state.orders.unshift(order); state.orders = state.orders.slice(0, 50); state.cart = {}; state.cartMeta = {}; checkoutDraft = null; currentOrderId = order.id; persist(true); syncCart(); renderTracker(order); checkoutDraft = null; announce('Демо-заказ создан. Оплаты и отправки в кафе не было.');
    }
  });
  $('#menu-search')?.addEventListener('input', (event) => { state.query = event.target.value; if (state.query.trim()) state.category = 'all'; renderProducts(); });
  document.addEventListener('cafe:category-active', (event) => { if (mobileMenu.matches) setActiveCategory(event.detail?.category); });
  mobileMenu.addEventListener('change', () => { renderProducts(); document.dispatchEvent(new CustomEvent('cafe:menu-mode', { detail: { mobile: mobileMenu.matches } })); });
  for (const dialog of [mainDialog, drawerDialog].filter(Boolean)) {
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialogs(); });
    dialog.addEventListener('click', (event) => { if (event.target !== dialog) return; const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialogs(); });
  }
  // Existing local orders deliberately remain demo/unpaid after migration. A URL parameter
  // or a successful redirect must never be treated as proof of a completed payment.
  if (typeof ResizeObserver === 'function' && $('#order-dock')) new ResizeObserver(updateDockHeight).observe($('#order-dock'));
  window.addEventListener('resize', updateDockHeight, { passive: true });
  renderProducts(); syncCart();
})();
