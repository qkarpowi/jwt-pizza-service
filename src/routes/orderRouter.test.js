const request = require('supertest');
const app = require('../service');

test('getMenu', async () => {
    const menuRes = await request(app).get('/api/order/menu');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body.length).toBeGreaterThan(0);
  });

  