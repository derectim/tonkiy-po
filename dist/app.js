(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (value) => `${Math.round(Number(value) || 0).toLocaleString('ru-RU')} ₽`;
  const storageKey = 'pocafe-demo-v1';
  const categories = {
    popular: 'Популярное', soups: 'Супы', wok: 'Вок', hot: 'Горячее',
    snacks: 'Закуски', sides: 'Гарниры', desserts: 'Десерты', drinks: 'Напитки', all: 'Всё меню',
  };
  const products = (Array.isArray(window.CAFE_PRODUCTS) ? window.CAFE_PRODUCTS : []).filter((item) => (
    item && typeof item.id === 'string' && item.id.length < 120 && typeof item.name === 'string'
    && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
  )).map((item) => ({
    ...item, category: Object.hasOwn(categories, item.category) ? item.category : 'hot',
    description: String(item.description || ''), image: String(item.image || ''), tag: String(item.tag || ''),
  }));
  const productMap = new Map(products.map((item) => [item.id, item]));
  const safeQuantity = (value) => Number.isInteger(value) && value > 0 && value <= 99;
  const getStored = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  };
  const raw = getStored(storageKey, {});
  const state = {
    cart: {}, favorites: [], orders: [], category: 'popular', query: '',
    fulfillment: 'delivery', address: '', accountOpen: false,
  };
  if (raw && typeof raw === 'object') {
    if (raw.cart && typeof raw.cart === 'object' && !Array.isArray(raw.cart)) {
      for (const [id, quantity] of Object.entries(raw.cart)) {
        if (productMap.has(id) && !productMap.get(id).priceFrom && safeQuantity(quantity)) state.cart[id] = quantity;
      }
    }
    if (Array.isArray(raw.favorites)) state.favorites = [...new Set(raw.favorites.filter((id) => productMap.has(id)))];
    if (raw.fulfillment === 'pickup') state.fulfillment = 'pickup';
    if (Array.isArray(raw.orders)) {
      state.orders = raw.orders.filter((order) => (
        order && typeof order.id === 'string' && /^PO-\d{5,10}$/.test(order.id)
        && typeof order.created === 'number' && Number.isFinite(new Date(order.created).getTime())
        && Array.isArray(order.items) && order.items.length > 0
        && (order.fulfillment === 'delivery' || order.fulfillment === 'pickup')
      )).slice(0, 30).map((order) => ({
        id: order.id, created: order.created, fulfillment: order.fulfillment,
        stage: Number.isInteger(order.stage) ? Math.max(0, Math.min(3, order.stage)) : 0,
        items: order.items.filter((item) => item && typeof item.name === 'string' && safeQuantity(item.quantity)
          && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0)
          .map((item) => ({ name: item.name.slice(0, 200), quantity: item.quantity, price: item.price })),
      })).filter((order) => order.items.length);
    }
  }
  try { state.address = String(sessionStorage.getItem(`${storageKey}-address`) || '').slice(0, 250); } catch { /* Storage can be unavailable in private mode. */ }
  let currentView = '';
  let currentOrder = null;
  let toastTimer;
  let previousFocus;
  const mainDialog = $('#main-dialog');
  const drawerDialog = $('#drawer-dialog');
  const dialogBody = $('#dialog-body');
  const drawerBody = $('#drawer-body');
  const pickupAddress = typeof window.CAFE_CONFIG?.pickupAddress === 'string' ? window.CAFE_CONFIG.pickupAddress : 'Ильинское-Усово, ул. Архангельская, 15';
  const persist = () => {
    try { localStorage.setItem(storageKey, JSON.stringify({ cart: state.cart, favorites: state.favorites, orders: state.orders, fulfillment: state.fulfillment })); } catch { /* The current visit still works without storage. */ }
  };
  const rows = () => Object.entries(state.cart).filter(([id]) => productMap.has(id)).map(([id, quantity]) => ({ ...productMap.get(id), quantity }));
  const cartCount = () => rows().reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = () => rows().reduce((sum, item) => sum + item.price * item.quantity, 0);
  const orderTotal = (order) => order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const demoNotice = '<div class="demo-notice"><span class="demo-dot" aria-hidden="true"></span><span>Демонстрационный заказ. Не отправляется в кафе.</span></div>';
  const liveRegion = '<div class="interaction-live" role="status" aria-live="polite" aria-atomic="true"></div>';
  const icon = {
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14m-5-5 5 5-5 5"/></svg>',
  };
  const announce = (message) => {
    const toast = $('#toast');
    if (toast) {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.classList.add('is-visible');
      toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
    }
    const dialogStatus = $('dialog[open] .interaction-live');
    if (dialogStatus) {
      dialogStatus.textContent = '';
      requestAnimationFrame(() => { if (dialogStatus.isConnected) dialogStatus.textContent = message; });
    }
  };
  function syncCart() {
    const count = cartCount();
    for (const selector of ['#cart-count', '#mobile-cart-count']) if ($(selector)) $(selector).textContent = String(count);
    for (const selector of ['#cart-total', '#mobile-cart-total']) if ($(selector)) $(selector).textContent = money(cartTotal());
    $$('[data-action="cart"]').forEach((button) => button.setAttribute('aria-label', `Корзина: ${count} ${count === 1 ? 'блюдо' : 'блюд'}, ${money(cartTotal())}`));
    $$('[data-fulfillment]').forEach((button) => {
      const active = button.dataset.fulfillment === state.fulfillment;
      button.classList.toggle('is-active', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const addressLabel = $('#address-label');
    if (addressLabel) addressLabel.textContent = state.fulfillment === 'pickup' ? pickupAddress : (state.address || 'Укажите адрес доставки');
    $$('.product-add[data-action="add"]').forEach((button) => {
      const quantity = state.cart[button.dataset.id] || 0;
      button.classList.toggle('is-added', quantity > 0);
      button.setAttribute('aria-label', `Добавить ${productMap.get(button.dataset.id)?.name || 'блюдо'} в корзину${quantity ? `, уже добавлено: ${quantity}` : ''}`);
      const label = $('.add-label', button);
      if (label) label.textContent = quantity ? `Ещё · ${quantity}` : 'В корзину';
    });
  }
  function renderProducts() {
    const grid = $('#products-grid');
    if (!grid) return;
    const normalizedQuery = state.query.trim().toLocaleLowerCase('ru');
    const filtered = products.filter((item) => (
      (state.category === 'all' || (state.category === 'popular' ? item.popular : item.category === state.category))
      && (!normalizedQuery || `${item.name} ${item.description}`.toLocaleLowerCase('ru').includes(normalizedQuery))
    ));
    const title = $('#menu-title');
    if (title) title.textContent = categories[state.category] || 'Меню';
    if ($('#menu-count')) $('#menu-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'блюдо' : (filtered.length > 1 && filtered.length < 5 ? 'блюда' : 'блюд')}`;
    $$('#category-tabs [data-category]').forEach((button) => {
      const active = button.dataset.category === state.category;
      button.classList.toggle('is-active', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    grid.innerHTML = filtered.length ? filtered.map((item) => `
      <article class="product-card">
        <div class="product-image-wrap">
          <button class="product-image-button" type="button" data-action="product" data-id="${escape(item.id)}" aria-label="Подробнее: ${escape(item.name)}">
            <img class="product-photo" src="${escape(item.image)}" alt="${escape(item.name)}" loading="lazy" decoding="async">
          </button>
          ${item.tag ? `<span class="product-tag">${escape(item.tag)}</span>` : ''}
          <button class="product-favorite ${state.favorites.includes(item.id) ? 'is-favorite' : ''}" type="button" data-action="favorite" data-id="${escape(item.id)}" aria-label="${state.favorites.includes(item.id) ? 'Убрать из' : 'Добавить в'} избранное: ${escape(item.name)}" aria-pressed="${state.favorites.includes(item.id)}">${icon.heart}</button>
        </div>
        <div class="product-content">
          <h3 class="product-name"><button type="button" data-action="product" data-id="${escape(item.id)}">${escape(item.name)}</button></h3>
          <p class="product-description">${escape(item.description)}</p>
          <div class="product-bottom"><span class="product-price">${item.priceFrom ? 'от ' : ''}${money(item.price)}</span><button class="product-add" type="button" data-action="${item.priceFrom ? 'product' : 'add'}" data-id="${escape(item.id)}"><span class="add-label">${item.priceFrom ? 'Подробнее' : 'В корзину'}</span>${item.priceFrom ? icon.arrow : icon.plus}</button></div>
        </div>
      </article>`).join('') : `<div class="empty-state menu-empty"><span class="empty-symbol" aria-hidden="true">⌕</span><h3>Не нашли такое блюдо</h3><p>Попробуйте другое название или откройте всё меню.</p><button class="interaction-button" type="button" data-action="reset-search">Показать всё меню</button></div>`;
    syncCart();
  }
  function closeDialogs(restoreFocus = true) {
    if (mainDialog?.open) mainDialog.close();
    if (drawerDialog?.open) drawerDialog.close();
    currentView = '';
    document.body.classList.remove('has-open-dialog');
    if (restoreFocus && previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  }
  function openDialog(view, html, drawer = false) {
    const target = drawer ? drawerDialog : mainDialog;
    const body = drawer ? drawerBody : dialogBody;
    if (!target || !body) return;
    if (!mainDialog?.open && !drawerDialog?.open) previousFocus = document.activeElement;
    closeDialogs(false);
    currentView = view;
    body.innerHTML = html + liveRegion;
    target.setAttribute('aria-labelledby', drawer ? 'drawer-title' : 'dialog-title');
    target.showModal();
    document.body.classList.add('has-open-dialog');
    requestAnimationFrame(() => {
      const initial = $('[data-initial-focus]', body) || $('input:not([type="hidden"]), button, a[href]', body);
      if (initial) initial.focus({ preventScroll: true });
    });
  }
  const quantityControl = (item) => `<div class="quantity-control" aria-label="Количество: ${escape(item.name)}"><button type="button" data-action="decrease" data-id="${escape(item.id)}" aria-label="Уменьшить количество: ${escape(item.name)}">${icon.minus}</button><span aria-live="polite">${item.quantity}</span><button type="button" data-action="increase" data-id="${escape(item.id)}" aria-label="Увеличить количество: ${escape(item.name)}" ${item.quantity >= 99 ? 'disabled' : ''}>${icon.plus}</button></div>`;
  const fulfillmentControl = () => `<div class="fulfillment-control" role="group" aria-label="Способ получения"><button type="button" data-action="set-fulfillment" data-fulfillment="delivery" class="${state.fulfillment === 'delivery' ? 'is-active' : ''}" aria-pressed="${state.fulfillment === 'delivery'}">Доставка</button><button type="button" data-action="set-fulfillment" data-fulfillment="pickup" class="${state.fulfillment === 'pickup' ? 'is-active' : ''}" aria-pressed="${state.fulfillment === 'pickup'}">Самовывоз</button></div>`;
  function renderCart() {
    const items = rows();
    const html = `<div class="interaction-heading"><p class="interaction-eyebrow">СОБИРАЕМ ВАШ ОБЕД</p><h2 id="drawer-title">Корзина <span class="heading-count">${cartCount()}</span></h2></div>${demoNotice}${items.length ? `
      <div class="cart-items">${items.map((item) => `<article class="cart-item"><img src="${escape(item.image)}" alt="" width="88" height="88"><div class="cart-item-content"><h3>${escape(item.name)}</h3><p>${money(item.price)} / порция</p><div class="cart-item-bottom">${quantityControl(item)}<strong>${money(item.price * item.quantity)}</strong></div></div><button class="cart-remove" type="button" data-action="remove" data-id="${escape(item.id)}" aria-label="Удалить ${escape(item.name)} из корзины">×</button></article>`).join('')}</div>
      <div class="cart-summary">${fulfillmentControl()}<button class="cart-address" type="button" data-action="address"><span>${state.fulfillment === 'pickup' ? 'Забрать в кафе' : 'Адрес доставки'}<strong>${escape(state.fulfillment === 'pickup' ? pickupAddress : state.address || 'Укажите адрес')}</strong></span>${icon.arrow}</button><p class="muted-note">${state.fulfillment === 'delivery' ? 'Стоимость и время доставки уточняются.' : 'Время готовности уточняется в кафе.'}</p><div class="summary-total"><span>Сумма блюд</span><strong>${money(cartTotal())}</strong></div><button class="interaction-button interaction-button-wide" type="button" data-action="checkout">Перейти к демо-заказу ${icon.arrow}</button><p class="fine-print">Без оплаты и отправки в кафе.</p></div>` : `<div class="empty-state"><span class="empty-symbol" aria-hidden="true">＋</span><h3>Здесь будет что-то вкусное</h3><p>Выберите блюда из меню — они появятся здесь.</p><button class="interaction-button" type="button" data-action="close-drawer">Вернуться в меню</button></div>`}`;
    if (drawerDialog?.open && currentView === 'cart') drawerBody.innerHTML = html + liveRegion;
    else openDialog('cart', html, true);
  }
  function renderProduct(id) {
    const item = productMap.get(id);
    if (!item) return;
    openDialog('product', `<div class="product-detail"><div class="detail-image-wrap"><img src="${escape(item.image)}" alt="${escape(item.name)}">${item.tag ? `<span class="detail-tag">${escape(item.tag)}</span>` : ''}</div><div class="detail-content"><p class="interaction-eyebrow">${escape(categories[item.category] || 'МЕНЮ')}</p><h2 id="dialog-title">${escape(item.name)}</h2><p class="detail-description">${escape(item.description)}</p>${item.spicy ? '<p class="detail-spicy">С остринкой</p>' : ''}${item.priceFrom ? '<p class="muted-note">Состав и итоговую цену уточните в кафе. Для этой позиции нужно выбрать варианты, поэтому в прототипе её нельзя добавить в корзину.</p>' : ''}<div class="detail-bottom"><strong class="detail-price">${item.priceFrom ? 'от ' : ''}${money(item.price)}</strong>${item.priceFrom ? '<a class="interaction-button" href="tel:+79015591357">Уточнить в кафе</a>' : `<button class="interaction-button" type="button" data-action="add" data-id="${escape(item.id)}">В корзину ${icon.plus}</button>`}</div><p class="fine-print">Информацию об аллергенах и составе уточняйте в кафе.</p></div></div>`);
  }
  function renderAddress(returnTo = '') {
    openDialog('address', `<div class="interaction-heading"><p class="interaction-eyebrow">УДОБНО, КАК ВАМ НРАВИТСЯ</p><h2 id="dialog-title">Как получить заказ?</h2><p class="interaction-intro">Выберите доставку или заберите блюда сами.</p></div>${fulfillmentControl()}<form id="address-form" class="interaction-form" data-return-to="${escape(returnTo)}">${state.fulfillment === 'delivery' ? `<label for="delivery-address">Адрес доставки</label><input id="delivery-address" name="address" autocomplete="street-address" maxlength="250" value="${escape(state.address)}" placeholder="Улица, дом, квартира" required data-initial-focus><p class="muted-note">Стоимость и время доставки уточняются. В этом прототипе адрес сохраняется только до закрытия вкладки.</p>` : `<div class="pickup-info"><span class="pickup-marker" aria-hidden="true">↗</span><div><strong>Самовывоз из кафе</strong><p>${escape(pickupAddress)}</p><p class="muted-note">Время готовности уточняется в кафе.</p></div></div>`}<button class="interaction-button interaction-button-wide" type="submit">${state.fulfillment === 'delivery' ? 'Сохранить адрес' : 'Выбрать самовывоз'} ${icon.arrow}</button></form>`);
  }
  function renderCheckout() {
    if (!cartCount()) { renderCart(); return; }
    openDialog('checkout', `<div class="interaction-heading"><p class="interaction-eyebrow">ЕЩЁ ОДИН ШАГ</p><h2 id="dialog-title">Демо-оформление</h2><p class="interaction-intro">Посмотрите, как будет работать новый сервис.</p></div>${demoNotice}<form id="checkout-form" class="interaction-form">${fulfillmentControl()}${state.fulfillment === 'delivery' ? `<label for="checkout-address">Адрес доставки</label><input id="checkout-address" name="address" autocomplete="street-address" maxlength="250" value="${escape(state.address)}" placeholder="Улица, дом, квартира" required><p class="muted-note">Стоимость и время доставки уточняются.</p>` : `<div class="pickup-info"><span class="pickup-marker" aria-hidden="true">↗</span><div><strong>Самовывоз из кафе</strong><p>${escape(pickupAddress)}</p><p class="muted-note">Время готовности уточняется в кафе.</p></div></div>`}<div class="checkout-lines">${rows().map((item) => `<div><span>${escape(item.name)} <span class="muted">× ${item.quantity}</span></span><strong>${money(item.price * item.quantity)}</strong></div>`).join('')}</div><div class="summary-total"><span>Сумма блюд</span><strong>${money(cartTotal())}</strong></div><p class="muted-note">Оплата и отправка в кафе отключены. Телефон и банковские данные не нужны. Демо-заказ останется в истории на этом устройстве.</p><button class="interaction-button interaction-button-wide" type="submit">Создать демо-заказ ${icon.arrow}</button><button class="interaction-text-button" type="button" data-action="cart">Вернуться в корзину</button></form>`);
  }
  const orderStages = (order) => order.fulfillment === 'pickup'
    ? ['Принят', 'Готовим', 'Готов к выдаче', 'Получен'] : ['Принят', 'Готовим', 'Передан курьеру', 'Доставлен'];
  const stageDescription = (order) => {
    const delivery = order.fulfillment === 'delivery';
    return [
      'Так будет выглядеть подтверждение заказа после подключения системы кафе.',
      'На этом этапе кухня готовит выбранные блюда.',
      delivery ? 'Здесь появится информация о передаче заказа курьеру.' : 'Здесь появится уведомление, что блюда можно забрать.',
      delivery ? 'Заказ доставлен. Можно повторить его из истории.' : 'Заказ получен. Можно повторить его из истории.',
    ][order.stage];
  };
  function makeSeedOrder() {
    const item = products.find((product) => product.popular) || products[0];
    return { id: 'PO-DEMO', created: Date.now(), fulfillment: state.fulfillment, stage: 0, items: item ? [{ name: item.name, price: item.price, quantity: 1 }] : [], seeded: true };
  }
  function renderTracker(order = currentOrder) {
    currentOrder = order || state.orders[0] || makeSeedOrder();
    const stages = orderStages(currentOrder);
    const progress = currentOrder.stage;
    openDialog('tracker', `<div class="interaction-heading"><p class="interaction-eyebrow">ВСЁ ИДЁТ ПО ПЛАНУ</p><h2 id="dialog-title">Заказ ${escape(currentOrder.id)}</h2><p class="interaction-intro">${currentOrder.seeded ? 'Пример отслеживания заказа' : 'Ваш демонстрационный заказ'} · ${currentOrder.fulfillment === 'delivery' ? 'Доставка' : 'Самовывоз'}</p></div>${demoNotice}<div class="tracking-status"><span class="tracking-pulse" aria-hidden="true"></span><span>${escape(stages[progress])}</span></div><p class="tracking-description">${stageDescription(currentOrder)}</p><ol class="tracking-steps">${stages.map((stage, index) => `<li class="${index < progress ? 'is-complete' : index === progress ? 'is-current' : ''}" ${index === progress ? 'aria-current="step"' : ''}><span class="step-marker" aria-hidden="true">${index < progress ? '✓' : index + 1}</span><span>${escape(stage)}</span></li>`).join('')}</ol><div class="tracking-help"><strong>Статусы в реальном времени</strong><p>В готовом сервисе они будут поступать из системы кафе. В прототипе этапы переключаются только вашей кнопкой.</p></div>${progress < stages.length - 1 ? `<button class="interaction-button interaction-button-wide" type="button" data-action="next-stage">Следующий демо-этап ${icon.arrow}</button>` : '<button class="interaction-button interaction-button-wide" type="button" data-action="account">Перейти в демо-кабинет</button>'}<div class="tracking-order-summary"><span>Сумма блюд</span><strong>${money(orderTotal(currentOrder))}</strong></div><p class="fine-print">${currentOrder.fulfillment === 'delivery' ? 'Стоимость и время доставки уточняются.' : 'Время готовности уточняется в кафе.'}${currentOrder.seeded ? ' Этот пример не добавляется в историю.' : ''}</p>`);
  }
  function renderAccount() {
    if (!state.accountOpen) {
      openDialog('account', `<div class="account-welcome"><div class="account-avatar" aria-hidden="true">ПO</div><p class="interaction-eyebrow">ВКУСНО ВСТРЕТИТЬСЯ СНОВА</p><h2 id="dialog-title">Ваш личный кабинет</h2><p class="interaction-intro">Любимые блюда, история заказов и их статус — в одном месте.</p><div class="demo-notice">Это демо-кабинет на этом устройстве. Без телефона, SMS и регистрации.</div><button class="interaction-button interaction-button-wide" type="button" data-action="demo-login">Открыть демо-кабинет ${icon.arrow}</button></div>`);
      return;
    }
    openDialog('account', `<div class="interaction-heading"><p class="interaction-eyebrow">РАДЫ ВАС ВИДЕТЬ</p><h2 id="dialog-title">Демо-кабинет</h2><p class="interaction-intro">Заказы и избранное сохраняются в этом браузере.</p></div><div class="account-section-heading"><h3>История заказов</h3><span>${state.orders.length}</span></div>${state.orders.length ? `<div class="account-orders">${state.orders.map((order) => `<article class="account-order"><div class="account-order-top"><strong>${escape(order.id)}</strong><span>${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(order.created)}</span></div><span class="order-status-chip">${escape(orderStages(order)[order.stage])} · демо</span><p>${order.items.map((item) => `${escape(item.name)} × ${item.quantity}`).join(', ')}</p><div class="account-order-bottom"><strong>${money(orderTotal(order))}</strong><button type="button" class="interaction-text-button" data-action="track-order" data-id="${escape(order.id)}">Отследить ${icon.arrow}</button></div><button class="repeat-order" type="button" data-action="repeat-order" data-id="${escape(order.id)}">Повторить демо-заказ</button></article>`).join('')}</div>` : '<div class="empty-state account-empty"><h3>Пока без заказов</h3><p>Соберите демо-заказ — здесь появятся его состав и статус.</p><button class="interaction-text-button" type="button" data-action="close-dialog">Выбрать блюда →</button></div>'}<div class="account-section-heading"><h3>Избранное</h3><span>${state.favorites.length}</span></div>${state.favorites.length ? `<div class="favorite-list">${state.favorites.map((id) => { const item = productMap.get(id); return `<div class="favorite-row"><button class="favorite-product" type="button" data-action="product" data-id="${escape(id)}"><img src="${escape(item.image)}" alt="" width="56" height="56"><span>${escape(item.name)}<strong>${item.priceFrom ? 'от ' : ''}${money(item.price)}</strong></span></button><button class="favorite-add" type="button" data-action="${item.priceFrom ? 'product' : 'add'}" data-id="${escape(id)}" aria-label="${item.priceFrom ? 'Подробнее' : 'Добавить в корзину'}: ${escape(item.name)}">${item.priceFrom ? icon.arrow : icon.plus}</button></div>`; }).join('')}</div>` : '<p class="muted-note">Нажмите на сердечко у блюда, чтобы сохранить его здесь.</p>'}<p class="fine-print">Демонстрационный кабинет. История хранится только на этом устройстве.</p>`);
  }
  function changeQuantity(id, delta) {
    if (!productMap.has(id)) return;
    if (productMap.get(id).priceFrom) { renderProduct(id); return; }
    const oldQuantity = state.cart[id] || 0;
    const quantity = Math.max(0, Math.min(99, oldQuantity + delta));
    if (quantity === oldQuantity) { if (quantity === 99) announce('Можно добавить до 99 порций одного блюда.'); return; }
    if (quantity) state.cart[id] = quantity;
    else delete state.cart[id];
    persist();
    syncCart();
    if (currentView === 'cart') renderCart();
  }
  document.addEventListener('click', (event) => {
    const category = event.target.closest('[data-category]');
    if (category && $('#category-tabs')?.contains(category)) {
      state.category = Object.hasOwn(categories, category.dataset.category) ? category.dataset.category : 'all';
      renderProducts();
      return;
    }
    const target = event.target.closest('[data-action], #delivery-switch [data-fulfillment]');
    if (!target || target.disabled) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (action === 'close-dialog' || action === 'close-drawer') { closeDialogs(); return; }
    if (action === 'product') { renderProduct(id); return; }
    if (action === 'add') {
      const item = productMap.get(id);
      if (!item) return;
      if (item.priceFrom) { renderProduct(id); return; }
      changeQuantity(id, 1); announce(`${item.name} — в корзине`); return;
    }
    if (action === 'increase' || action === 'decrease') {
      const wasFocused = document.activeElement === target;
      changeQuantity(id, action === 'increase' ? 1 : -1);
      if (wasFocused) {
        const sameButton = $$(`[data-action="${action}"]`, drawerBody).find((button) => button.dataset.id === id);
        const decreaseButton = $$('[data-action="decrease"]', drawerBody).find((button) => button.dataset.id === id);
        const focusTarget = sameButton && !sameButton.disabled ? sameButton : decreaseButton || $('[data-action="checkout"], [data-action="close-drawer"]', drawerBody);
        focusTarget?.focus({ preventScroll: true });
      }
      return;
    }
    if (action === 'remove') {
      const removedIndex = rows().findIndex((item) => item.id === id);
      delete state.cart[id]; persist(); syncCart(); renderCart();
      const remainingItems = rows();
      const nextId = remainingItems[Math.min(Math.max(removedIndex, 0), remainingItems.length - 1)]?.id;
      const nextControl = $$('[data-action="decrease"]', drawerBody).find((button) => button.dataset.id === nextId);
      (nextControl || $('[data-action="checkout"], [data-action="close-drawer"]', drawerBody))?.focus({ preventScroll: true });
      announce('Блюдо удалено из корзины');
      return;
    }
    if (action === 'favorite' && productMap.has(id)) {
      const wasFavorite = state.favorites.includes(id);
      state.favorites = wasFavorite ? state.favorites.filter((value) => value !== id) : [...state.favorites, id];
      persist(); renderProducts();
      const newButton = $$('[data-action="favorite"]').find((button) => button.dataset.id === id);
      newButton?.focus({ preventScroll: true });
      announce(wasFavorite ? 'Убрали из избранного' : 'Сохранили в избранное');
      return;
    }
    if (action === 'cart') { renderCart(); return; }
    if (action === 'checkout') { renderCheckout(); return; }
    if (action === 'account') { renderAccount(); return; }
    if (action === 'demo-login') { state.accountOpen = true; renderAccount(); return; }
    if (action === 'address') { renderAddress(currentView === 'cart' ? 'cart' : ''); return; }
    if (action === 'set-fulfillment' || target.closest('#delivery-switch')) {
      if (!['delivery', 'pickup'].includes(target.dataset.fulfillment)) return;
      const addressInput = currentView === 'address' ? $('#delivery-address') : currentView === 'checkout' ? $('#checkout-address') : null;
      if (addressInput) state.address = addressInput.value.trim().slice(0, 250);
      state.fulfillment = target.dataset.fulfillment;
      persist(); syncCart();
      if (currentView === 'cart') renderCart();
      else if (currentView === 'checkout') renderCheckout();
      else if (currentView === 'address') renderAddress($('#address-form')?.dataset.returnTo || '');
      return;
    }
    if (action === 'track-demo') { renderTracker(makeSeedOrder()); return; }
    if (action === 'track') { renderTracker(state.orders[0] || makeSeedOrder()); return; }
    if (action === 'track-order') { const order = state.orders.find((item) => item.id === id); if (order) renderTracker(order); return; }
    if (action === 'next-stage' && currentOrder) {
      currentOrder.stage = Math.min(3, currentOrder.stage + 1);
      if (!currentOrder.seeded) persist();
      renderTracker(currentOrder);
      announce(`Демо-статус: ${orderStages(currentOrder)[currentOrder.stage]}`);
      return;
    }
    if (action === 'repeat-order') {
      const order = state.orders.find((item) => item.id === id);
      if (!order) return;
      let added = 0;
      for (const item of order.items) {
        const product = products.find((candidate) => candidate.name === item.name);
        if (product && !product.priceFrom) { state.cart[product.id] = Math.min(99, (state.cart[product.id] || 0) + item.quantity); added++; }
      }
      persist(); syncCart();
      if (added) { renderCart(); announce('Блюда добавлены в корзину'); }
      else announce('Этих блюд больше нет в текущем меню. Выберите другие.');
      return;
    }
    if (action === 'reset-search') {
      state.query = ''; state.category = 'all'; if ($('#menu-search')) $('#menu-search').value = ''; renderProducts();
    }
  });
  document.addEventListener('submit', (event) => {
    if (event.target.id === 'address-form') {
      event.preventDefault();
      const input = $('#delivery-address');
      if (state.fulfillment === 'delivery' && input) {
        if (!input.value.trim()) { input.setCustomValidity('Укажите улицу и дом'); input.reportValidity(); input.setCustomValidity(''); return; }
        state.address = input.value.trim().slice(0, 250);
        try { sessionStorage.setItem(`${storageKey}-address`, state.address); } catch { /* Keep the address for this visit. */ }
      }
      syncCart();
      if (event.target.dataset.returnTo === 'cart') renderCart(); else closeDialogs();
      announce(state.fulfillment === 'delivery' ? 'Адрес сохранён для этой вкладки' : 'Выбран самовывоз');
    }
    if (event.target.id === 'checkout-form') {
      event.preventDefault();
      if (!cartCount()) { renderCart(); return; }
      if (state.fulfillment === 'delivery') {
        const input = $('#checkout-address');
        if (!input?.value.trim()) { input?.setCustomValidity('Укажите улицу и дом'); input?.reportValidity(); input?.setCustomValidity(''); return; }
        state.address = input.value.trim().slice(0, 250);
        try { sessionStorage.setItem(`${storageKey}-address`, state.address); } catch { /* Keep the address for this visit. */ }
      }
      const order = {
        id: `PO-${String(Date.now()).slice(-7)}`, created: Date.now(), stage: 0, fulfillment: state.fulfillment,
        items: rows().map((item) => ({ name: item.name, quantity: item.quantity, price: item.price })),
      };
      state.orders.unshift(order); state.orders = state.orders.slice(0, 30); state.cart = {};
      persist(); syncCart(); renderTracker(order);
      announce('Демо-заказ создан. В кафе ничего не отправлено.');
    }
  });
  $('#menu-search')?.addEventListener('input', (event) => { state.query = event.target.value; renderProducts(); });
  for (const dialog of [mainDialog, drawerDialog].filter(Boolean)) {
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeDialogs(); });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialogs();
    });
  }
  renderProducts();
  syncCart();
})();
