const request = require('supertest');
const app = require('../service');

test('getFranchises', async () => {
    const menuRes = await request(app).get('/api/franchise');
    expect(menuRes.status).toBe(200);
    expect(menuRes.body.length).toBeGreaterThan(0);
  });

  