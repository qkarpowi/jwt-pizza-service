const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../service');
const config = require('../config');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testUserAuthToken;
let registeredUserId;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toBeDefined();
  
  testUserAuthToken = registerRes.body.token;
  registeredUserId = registerRes.body.user.id;
  expectValidJwt(testUserAuthToken);
});

/** ✅ Successful login */
test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send({
    email: testUser.email,
    password: testUser.password,
  });

  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);
});

/** ❌ Attempt to login with wrong password */
test('login - wrong password', async () => {
  const res = await request(app).put('/api/auth').send({
    email: testUser.email,
    password: 'wrongpassword',
  });

  expect(res.status).toBe(404);
  expect(res.body.message).toBeDefined();
});

/** ❌ Attempt to login with non-existent user */
test('login - non-existent user', async () => {
  const res = await request(app).put('/api/auth').send({
    email: 'fakeuser@test.com',
    password: 'password',
  });

  expect(res.status).toBe(404);
  expect(res.body.message).toBeDefined();
});

/** ❌ Attempt to login with missing fields */
test('login - missing fields', async () => {
  const res = await request(app).put('/api/auth').send({});

  expect(res.status).toBe(500);
  expect(res.body.message).toBeDefined();
});

/** ✅ Logout a user */
test('logout', async () => {
  const logoutRes = await request(app)
    .delete('/api/auth')
    .set('Authorization', `Bearer ${testUserAuthToken}`);

  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

/** ❌ Attempt to logout without a token */
test('logout - no token', async () => {
  const res = await request(app).delete('/api/auth');

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

/** ✅ Register a new user */
test('register', async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);

  expect(registerRes.status).toBe(200);
  expect(registerRes.body.token).toBeDefined();
});

/** ❌ Attempt to register with missing fields */
test('register - missing fields', async () => {
  const res = await request(app).post('/api/auth').send({});

  expect(res.status).toBe(400);
  expect(res.body.message).toBe('name, email, and password are required');
});


/** ❌ Attempt to update another user */
test('update user - unauthorized update', async () => {
  const res = await request(app)
    .put('/api/auth/99999')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({ email: 'hacker@test.com', password: 'hacked' });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

/** ❌ Attempt to update with missing fields */
test('update user - missing fields', async () => {
  const res = await request(app)
    .put(`/api/auth/${registeredUserId}`)
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send({});

  expect(res.status).toBe(401);
  expect(res.body.message).toBeDefined();
});

/** ❌ Attempt to update without authentication */
test('update user - no auth', async () => {
  const res = await request(app)
    .put(`/api/auth/${registeredUserId}`)
    .send({ email: 'noauth@test.com', password: 'pass' });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

/** ❌ Test authentication with invalid token */
test('auth middleware - invalid token', async () => {
  const res = await request(app)
    .put(`/api/auth/${registeredUserId}`)
    .set('Authorization', 'Bearer invalidToken')
    .send({ email: 'invalidtoken@test.com' });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

/** ❌ Test authentication with expired token */
test('auth middleware - expired token', async () => {
  const expiredToken = jwt.sign(
    { id: registeredUserId, email: testUser.email },
    config.jwtSecret,
    { expiresIn: -10 } // Expired 10 seconds ago
  );

  const res = await request(app)
    .put(`/api/auth/${registeredUserId}`)
    .set('Authorization', `Bearer ${expiredToken}`)
    .send({ email: 'expiredtoken@test.com' });

  expect(res.status).toBe(401);
  expect(res.body.message).toBe('unauthorized');
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}
