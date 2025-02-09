const request = require('supertest');
const app = require('../service'); // Adjust if needed
const { DB } = require('../database/database.js');

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

  let createdFranchiseId;
  let createdStoreId;

  /** ✅ Test fetching franchises */
  test('GET /api/franchise - List all franchises', async () => {
    const res = await request(app).get('/api/franchise');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /** ✅ Test creating a franchise (Admin Only) */
  test('POST /api/franchise - Admin can create a franchise', async () => {
    const newFranchise = { name: 'Test Franchise', admins: [{ email: testAdmin.email }] };

    const res = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newFranchise);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');

    createdFranchiseId = res.body.id; // Store ID for cleanup
  });

  /** ❌ Unauthorized user trying to create a franchise */
  test('POST /api/franchise - Non-admin user cannot create a franchise', async () => {
    const res = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Unauthorized Franchise' });

    expect(res.status).toBe(403); // Forbidden
  });

  /** ❌ Attempt to create a franchise with missing fields */
  test('POST /api/franchise - Creating a franchise without required fields should fail', async () => {
    const res = await request(app)
      .post('/api/franchise')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(500); // Bad request
  });

  /** ✅ Test fetching user franchises */
  test('GET /api/franchise/:userId - List user franchises', async () => {
    const res = await request(app)
      .get(`/api/franchise/4`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  /** ❌ Unauthorized user trying to fetch franchises */
  test('GET /api/franchise/:userId - Unauthorized user should be denied', async () => {
    const res = await request(app).get('/api/franchise/4');
    expect(res.status).toBe(401);
  });

  /** ✅ Create a store (Admin Only) */
  test('POST /api/franchise/:franchiseId/store - Create a store', async () => {
    if (!createdFranchiseId) return;

    const newStore = { name: 'Test Store' };

    const res = await request(app)
      .post(`/api/franchise/${createdFranchiseId}/store`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send(newStore);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');

    createdStoreId = res.body.id; // Store store ID for cleanup
  });

  /** ❌ Unauthorized user trying to create a store */
  test('POST /api/franchise/:franchiseId/store - Non-admin cannot create a store', async () => {
    const res = await request(app)
      .post(`/api/franchise/${createdFranchiseId}/store`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Unauthorized Store' });

    expect(res.status).toBe(403);
  });

  /** ✅ Delete a store (Admin Only) */
  test('DELETE /api/franchise/:franchiseId/store/:storeId - Delete a store', async () => {
    if (!createdFranchiseId || !createdStoreId) return;

    const res = await request(app)
      .delete(`/api/franchise/${createdFranchiseId}/store/${createdStoreId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('store deleted');
  });

  /** ❌ Unauthorized user trying to delete a store */
  test('DELETE /api/franchise/:franchiseId/store/:storeId - Non-admin cannot delete a store', async () => {
    const res = await request(app)
      .delete(`/api/franchise/${createdFranchiseId}/store/${createdStoreId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  /** ✅ Delete a franchise (Admin Only) */
  test('DELETE /api/franchise/:franchiseId - Admin can delete a franchise', async () => {
    if (!createdFranchiseId) return;

    const res = await request(app)
      .delete(`/api/franchise/${createdFranchiseId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('franchise deleted');
  });

  /** ❌ Unauthorized user trying to delete a franchise */
  test('DELETE /api/franchise/:franchiseId - Non-admin cannot delete a franchise', async () => {
    const res = await request(app)
      .delete(`/api/franchise/${createdFranchiseId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });


  afterAll(async () => {
    if (createdFranchiseId) {
      await DB.deleteFranchise(createdFranchiseId);
    }
  });
