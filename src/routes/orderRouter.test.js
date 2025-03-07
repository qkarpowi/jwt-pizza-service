const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testAdmin;
const testUser = { email: 'order@jwt.com', password: 'test' };

let adminToken;
let userToken;

function randomName() {
  const adjectives = ['Swift', 'Brave', 'Clever', 'Bold', 'Mighty', 'Wise', 'Fierce', 'Noble'];
  const animals = ['Falcon', 'Tiger', 'Wolf', 'Panther', 'Eagle', 'Hawk', 'Lion', 'Bear'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomNumber = Math.floor(Math.random() * 1000);

  return `${randomAdjective}${randomAnimal}${randomNumber}`;
}

async function createAdminUser() {
  let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + '@admin.com';

  user = await DB.addUser(user);
  return { ...user, password: 'toomanysecrets' };
}

async function loginUser(user) {
  const loginRes = await request(app).put('/api/auth').send(user);
  return loginRes.body.token;
}

async function registerUser(user) {
  const registerRes = await request(app).post('/api/auth').send(user);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toBeDefined();
  return registerRes.body.token;
}

beforeAll(async () => {
  testAdmin = await createAdminUser();
  adminToken = await loginUser(testAdmin);
  userToken = await loginUser(testUser);
  if(!userToken){
    testUser.name = "order";
    userToken = await registerUser(testUser);
  }
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
  test('PUT /api/order/menu - Missing fields should return 500', async () => {
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

    global.fetch.mockRestore();
  });

  afterAll(async () => {
    const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
  });
