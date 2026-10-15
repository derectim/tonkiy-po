import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await fs.readFile(path.join(root, 'dist/payment-adapter.js'), 'utf8');
const application = await fs.readFile(path.join(root, 'dist/app.js'), 'utf8');
const goodConfig = () => ({ enabled: true, createPaymentEndpoint: 'https://cafe.example/api/payments', allowedApiOrigins: [], confirmationOrigins: ['https://pay.example'] });
const goodPayload = () => ({ items: [{ id: 'pho-bo', quantity: 2, price: 1, name: '<b>fake</b>' }], contact: { name: '  Гость  ', phone: '79012345678', token: 'secret' }, fulfillment: { type: 'pickup', address: 'ignored on server', payment: 'paid' }, paymentMethod: 'card', total: 2, deliveryFee: 0, paid: true, orderId: 'spoof', discount: 100 });
const goodResponse = () => ({ ok: true, json: async () => ({ orderId: 'server-42', confirmationUrl: 'https://pay.example/confirm?id=42', paid: true, status: 'succeeded', amount: 1 }) });
const reports = [];
function harness(config = goodConfig(), respond = async () => goodResponse(), search = '') {
  const calls = [];
  let key = 0;
  const context = vm.createContext({ window: { CAFE_PAYMENT_CONFIG: config }, location: { origin: 'https://cafe.example', search }, URL, AbortController, crypto: { randomUUID: () => `test-key-${++key}` }, setTimeout, clearTimeout, TypeError, fetch: async (...args) => { calls.push(args); return respond(...args); } });
  vm.runInContext(source, context, { filename: 'payment-adapter.js' });
  return { api: context.window.CafePayment, calls };
}
async function check(name, test) {
  try { await test(); reports.push({ name, result: 'PASS' }); }
  catch (error) { reports.push({ name, result: 'FAIL', detail: error.message }); }
}
const rejects = async (api, pattern = /./, payload = goodPayload()) => assert.rejects(api.createPayment(payload), pattern);

await check('disabled adapter never calls fetch', async () => {
  for (const config of [undefined, { ...goodConfig(), enabled: false }]) {
    const h = config === undefined ? harness({ enabled: false }) : harness(config);
    assert.equal(h.api.isEnabled(), false);
    await rejects(h.api, /не подключена/);
    assert.equal(h.calls.length, 0);
  }
});
await check('endpoint requires HTTPS and trusted API origin', async () => {
  for (const endpoint of ['http://cafe.example/pay', 'javascript:alert(1)', 'https://evil.example/pay', 'https://user:pass@cafe.example/pay']) {
    const h = harness({ ...goodConfig(), createPaymentEndpoint: endpoint });
    assert.equal(h.api.isEnabled(), false, endpoint);
    await rejects(h.api, /не подключена/);
    assert.equal(h.calls.length, 0);
  }
  const h = harness({ ...goodConfig(), createPaymentEndpoint: 'https://api.example/pay', allowedApiOrigins: ['https://api.example'] });
  await h.api.createPayment(goodPayload());
  assert.equal(h.calls[0][0], 'https://api.example/pay');
  assert.equal(h.calls[0][1].credentials, 'omit');
  assert.equal(h.calls[0][1].redirect, 'error');
});
await check('confirmation URL rejects HTTP, deceptive hosts and credentials', async () => {
  for (const url of ['http://pay.example/pay', 'https://pay.example.evil.test/pay', 'https://evil.test/pay.example', 'https://pay.example@evil.test/pay', 'https://user:pass@pay.example/pay', 'javascript:alert(1)', '//pay.example/pay']) {
    const h = harness(goodConfig(), async () => ({ ok: true, json: async () => ({ orderId: 'server-42', confirmationUrl: url }) }));
    await rejects(h.api, /проверить страницу/, goodPayload());
  }
  const h = harness(goodConfig());
  const result = await h.api.createPayment(goodPayload());
  assert.equal(result.confirmationUrl, 'https://pay.example/confirm?id=42');
  assert.equal(Object.isFrozen(result), true);
});
await check('request contains only IDs, quantities and allowlisted checkout fields', async () => {
  const h = harness();
  await h.api.createPayment(goodPayload());
  const request = h.calls[0][1];
  const body = JSON.parse(request.body);
  assert.deepEqual(body.items, [{ id: 'pho-bo', quantity: 2 }]);
  assert.deepEqual(body.contact, { name: 'Гость', phone: '79012345678' });
  assert.deepEqual(Object.keys(body).sort(), ['items', 'contact', 'fulfillment', 'comment', 'cutlery', 'paymentMethod'].sort());
  assert.equal('payment' in body.fulfillment, false);
  for (const key of ['price', 'total', 'paid', 'orderId', 'discount', 'deliveryFee', 'token']) assert.equal(new RegExp(`"${key}"\\s*:`).test(request.body), false, key);
  assert.equal(request.credentials, 'same-origin');
  assert.ok(request.signal instanceof AbortSignal);
});
await check('invalid product quantities are rejected before network request', async () => {
  for (const quantity of [0, -1, 100, 1.5, '2']) {
    const h = harness();
    await rejects(h.api, /состав заказа/, { ...goodPayload(), items: [{ id: 'pho-bo', quantity }] });
    assert.equal(h.calls.length, 0);
  }
});
await check('transient failure retry reuses key; changed payload gets new key', async () => {
  let count = 0;
  const h = harness(goodConfig(), async () => { if (++count === 1) throw new TypeError('network secret'); return goodResponse(); });
  await rejects(h.api, /Проверьте соединение/);
  await h.api.createPayment(goodPayload());
  assert.equal(h.calls[0][1].headers['Idempotency-Key'], h.calls[1][1].headers['Idempotency-Key']);
  assert.equal(h.calls[0][1].body, h.calls[1][1].body);
  const changed = goodPayload(); changed.items[0].quantity = 3;
  await h.api.createPayment(changed);
  assert.notEqual(h.calls[1][1].headers['Idempotency-Key'], h.calls[2][1].headers['Idempotency-Key']);
});
await check('parallel submission is rejected before second network request', async () => {
  let resolve;
  const h = harness(goodConfig(), () => new Promise((done) => { resolve = done; }));
  const first = h.api.createPayment(goodPayload());
  await rejects(h.api, /уже выполняется/);
  assert.equal(h.calls.length, 1);
  resolve(goodResponse());
  await first;
});
await check('HTTP errors do not expose server response contents', async () => {
  let readBody = false;
  const h = harness(goodConfig(), async () => ({ ok: false, json: async () => { readBody = true; return { error: 'SECRET_DATA' }; } }));
  await rejects(h.api, /^Error: Сервис оплаты временно недоступен/);
  assert.equal(readBody, false);
});
await check('malformed success JSON does not expose parser/server details', async () => {
  const h = harness(goodConfig(), async () => ({ ok: true, json: async () => JSON.parse('<html>SECRET_SERVER_DETAILS</html>') }));
  let error;
  try { await h.api.createPayment(goodPayload()); } catch (caught) { error = caught; }
  assert.ok(error);
  assert.doesNotMatch(error.message, /SECRET_SERVER_DETAILS|Unexpected token|JSON/i);
});
await check('return query parameters cannot mark a payment paid', async () => {
  const h = harness(goodConfig(), async () => goodResponse(), '?paid=true&status=succeeded&payment_id=attacker');
  const result = await h.api.createPayment(goodPayload());
  assert.deepEqual(Object.keys(result).sort(), ['confirmationUrl', 'orderId']);
  assert.equal('paid' in result, false);
  assert.equal('paymentStatus' in result, false);
  assert.doesNotMatch(source, /URLSearchParams|location\.search|searchParams/);
  assert.doesNotMatch(application, /paymentStatus\s*[:=]\s*['"]paid['"]|paid\s*[:=]\s*true|URLSearchParams/);
  assert.match(application, /paymentStatus:\s*'unpaid'/);
});

for (const report of reports) console.log(`${report.result}: ${report.name}${report.detail ? `\n  ${report.detail}` : ''}`);
const failed = reports.filter((report) => report.result === 'FAIL');
console.log(`\n${reports.length - failed.length}/${reports.length} checks passed. No real fetch or payment performed.`);
process.exitCode = failed.length ? 1 : 0;
