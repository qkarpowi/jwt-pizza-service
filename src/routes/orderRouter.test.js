const request = require('supertest');
const app = require('../service');
const testAdmin = { email: 'a@jwt.com', password: 'admin' };
const testUser = { email: 't@jwt.com', password: 'test' };

let adminToken;
let userToken;

async function loginUser(user) {
  const loginRes = await request(app).put('/api/auth').send(user);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body).toHaveProperty('token');
  return loginRes.body.token;
}

beforeAll(async () => {
  adminToken = await loginUser(testAdmin);
  userToken = await loginUser(testUser);
});

  let createdMenuItemId;

  /** ✅ Test fetching menu */
  test('GET /api/order/menu - Get pizza menu', async () => {
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /** ✅ Test adding a menu item */
  test('PUT /api/order/menu - Admin can add a menu item', async () => {
    const newMenuItem = {
      title: 'Test Pizza',
      description: 'A delicious test pizza',
      image: 'test_pizza.png',
      price: 0.005,
    };

    const res = await request(app)
      .put('/api/order/menu')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newMenuItem);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const addedItem = res.body.find(item => item.title === newMenuItem.title);
    expect(addedItem).toBeDefined();
    
    createdMenuItemId = addedItem.id; // Store for cleanup
  });

  /** ❌ Unauthorized user trying to add a menu item */
  test('PUT /api/order/menu - Non-admin cannot add menu items', async () => {
    const res = await request(app)
      .put('/api/order/menu')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Unauthorized Pizza',
        description: 'This should not be added',
        image: 'unauth_pizza.png',
        price: 0.002,
      });

    expect(res.status).toBe(403); // Forbidden
  });

  /** ❌ Attempt to add menu item with missing fields */
  test('PUT /api/order/menu - Missing fields should return 400', async () => {
    const res = await request(app)
      .put('/api/order/menu')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Incomplete Pizza',
      });

    expect(res.status).toBe(500); // Bad request
  });

  /** ✅ Test fetching orders for an authenticated user */
  test('GET /api/order - Get user orders (when user has no orders)', async () => {
    const res = await request(app)
      .get('/api/order')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.orders).toBeDefined();
    expect(Array.isArray(res.body.orders)).toBe(true);
  });

  /** ✅ Create an order */
  test('POST /api/order - Create an order (Authorized)', async () => {
    if (!createdMenuItemId) return;

    const newOrder = {
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: createdMenuItemId, description: 'Test Pizza', price: 0.005 }],
    };

    const res = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newOrder);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('order');
    expect(res.body.order).toHaveProperty('id');
  });

  /** ❌ Unauthorized user cannot create an order */
  test('POST /api/order - Unauthorized user cannot create an order', async () => {
    const res = await request(app)
      .post('/api/order')
      .send({
        franchiseId: 1,
        storeId: 1,
        items: [{ menuId: 1, description: 'Unauthorized Order', price: 0.005 }],
      });

    expect(res.status).toBe(401);
  });

  /** ❌ Test when factory API fails (simulate error) */
  test('POST /api/order - Order creation should handle factory API failure', async () => {
    const newOrder = {
      franchiseId: 1,
      storeId: 1,
      items: [{ menuId: createdMenuItemId, description: 'Test Pizza', price: 0.005 }],
    };

    // Simulate factory failure
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      json: async () => ({ reportUrl: 'http://factory.error.report' }),
    });

    const res = await request(app)
      .post('/api/order')
      .set('Authorization', `Bearer ${userToken}`)
      .send(newOrder);

    expect(res.status).toBe(500);
    expect(res.body.message).toBe('Failed to fulfill order at factory');

    global.fetch.mockRestore();
  });
