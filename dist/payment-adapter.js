/* Payment integration boundary. This file contains NO API keys or card fields.
 *
 * Configure BEFORE this script (disabled by default):
 * window.CAFE_PAYMENT_CONFIG = {
 *   enabled: false,
 *   createPaymentEndpoint: null, // HTTPS URL of YOUR backend
 *   allowedApiOrigins: [],       // needed only for a separate backend origin
 *   confirmationOrigins: []     // exact HTTPS origins approved for your provider
 * };
 *
 * POST createPaymentEndpoint, JSON body:
 * { items:[{id,quantity}], contact:{name,phone},
 *   fulfillment:{type,address,apartment,entrance,floor,scheduledAt},
 *   comment,cutlery,paymentMethod:'card'|'sbp' }
 * The backend MUST authenticate/validate requests, resolve products and prices
 * from its own catalogue, validate delivery zone/fee, availability and cafe hours,
 * create the order, fiscal receipt and payment through the configured provider,
 * and return { orderId: 'server-owned-id', confirmationUrl: 'https://...' }.
 * It must handle idempotency (Idempotency-Key header) and verify provider webhooks.
 * Client prices and return-URL parameters are never evidence of a paid order.
 * Provider secrets, fiscalisation settings, webhook verification and real statuses
 * belong exclusively to the backend. No production provider has been selected.
 */
(() => {
  'use strict';
  const config = window.CAFE_PAYMENT_CONFIG || { enabled: false, createPaymentEndpoint: null, allowedApiOrigins: [], confirmationOrigins: [] };
  window.CAFE_PAYMENT_CONFIG = config;
  const httpsUrl = (value) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? url : null; } catch { return null; }
  };
  const origins = (values) => (Array.isArray(values) ? values : []).map(httpsUrl).filter(Boolean).map((url) => url.origin);
  function settings() {
    const endpoint = httpsUrl(config.createPaymentEndpoint);
    const trustedApi = endpoint && (endpoint.origin === location.origin || origins(config.allowedApiOrigins).includes(endpoint.origin));
    const confirmationOrigins = origins(config.confirmationOrigins);
    return { endpoint, trustedApi, confirmationOrigins };
  }
  let pending = false;
  let retryKey = null;
  let retryPayload = null;
  const isEnabled = () => { const setup = settings(); return config.enabled === true && !!setup.endpoint && !!setup.trustedApi && setup.confirmationOrigins.length > 0; };
  async function createPayment(payload) {
    if (!isEnabled()) throw new Error('Онлайн-касса ещё не подключена. Оплата недоступна.');
    if (pending) throw new Error('Запрос оплаты уже выполняется.');
    if (!Array.isArray(payload?.items) || !payload.items.length || payload.items.length > 100 || payload.items.some((item) => !item || typeof item.id !== 'string' || item.id.length > 120 || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) throw new Error('Проверьте состав заказа.');
    if (!payload.contact || typeof payload.contact.name !== 'string' || !payload.contact.name.trim() || !/^7\d{10}$/.test(payload.contact.phone)) throw new Error('Проверьте имя и телефон.');
    if (!payload.fulfillment || !['delivery', 'pickup'].includes(payload.fulfillment.type)) throw new Error('Укажите способ получения заказа.');
    // Construct an explicit whitelist. Never forward product names/prices/totals.
    const body = { items: payload.items.map((item) => ({ id: item.id, quantity: item.quantity })), contact: { name: payload.contact.name.trim().slice(0, 80), phone: payload.contact.phone }, fulfillment: { type: payload.fulfillment.type, address: String(payload.fulfillment.address || '').trim().slice(0, 250), apartment: String(payload.fulfillment.apartment || '').trim().slice(0, 20), entrance: String(payload.fulfillment.entrance || '').trim().slice(0, 30), floor: String(payload.fulfillment.floor || '').trim().slice(0, 20), scheduledAt: typeof payload.fulfillment.scheduledAt === 'string' ? payload.fulfillment.scheduledAt.slice(0, 50) : null }, comment: String(payload.comment || '').trim().slice(0, 500), cutlery: Number.isInteger(payload.cutlery) ? Math.max(0, Math.min(20, payload.cutlery)) : 0, paymentMethod: payload.paymentMethod === 'sbp' ? 'sbp' : 'card' };
    const serialized = JSON.stringify(body);
    if (retryPayload !== serialized) { retryPayload = serialized; retryKey = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `po-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    const setup = settings(), controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    pending = true;
    try {
      const response = await fetch(setup.endpoint.href, { method: 'POST', credentials: setup.endpoint.origin === location.origin ? 'same-origin' : 'omit', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Idempotency-Key': retryKey }, body: serialized, signal: controller.signal, redirect: 'error' });
      if (!response.ok) throw new Error('Сервис оплаты временно недоступен. Попробуйте ещё раз.');
      let data;
      try { data = await response.json(); }
      catch { throw new Error('Сервис оплаты вернул некорректный ответ. Попробуйте ещё раз.'); }
      const confirmationUrl = httpsUrl(data?.confirmationUrl);
      if (typeof data?.orderId !== 'string' || !data.orderId.trim() || data.orderId.length > 160 || !confirmationUrl || !setup.confirmationOrigins.includes(confirmationUrl.origin)) throw new Error('Не удалось проверить страницу оплаты. Свяжитесь с кафе.');
      return Object.freeze({ orderId: data.orderId, confirmationUrl: confirmationUrl.href });
    } catch (error) {
      if (error?.name === 'AbortError') throw new Error('Сервис оплаты не ответил вовремя. Попробуйте ещё раз.');
      if (error instanceof TypeError) throw new Error('Не удалось подключиться к сервису оплаты. Проверьте соединение и повторите попытку.');
      throw error;
    } finally { clearTimeout(timeout); pending = false; }
  }
  window.CafePayment = Object.freeze({ isEnabled, createPayment });
})();
