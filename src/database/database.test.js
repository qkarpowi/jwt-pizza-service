const { DB } = require('../database/database.js');
const bcrypt = require('bcryptjs');

describe('Database Functions', () => {
  let testUser;
  let testFranchiseId;
  let testStoreId;
  let testMenuItemId;

  beforeAll(async () => {
    testUser = { name: 'Test User', email: Math.random().toString(36).substring(2, 12) + '@test.com', password: 'testpassword', roles: [{ role: 'diner' }] };
    const registeredUser = await DB.addUser(testUser);
    testUser.id = registeredUser.id;
  });

  afterAll(async () => {
    await DB.logoutUser('test_token');
  });

  /** ✅ Test database initialization */
  test('initializeDatabase', async () => {
    await expect(DB.initializeDatabase()).resolves.not.toThrow();
  });

  /** ✅ Test adding a menu item */
  test('addMenuItem', async () => {
    const menuItem = { title: 'Test Pizza', description: 'Tasty', image: 'test.png', price: 9.99 };
    const result = await DB.addMenuItem(menuItem);
    expect(result).toHaveProperty('id');
    testMenuItemId = result.id;
  });

  /** ❌ Test getting a non-existent menu item */
  test('getMenu - empty result', async () => {
    await expect(DB.getMenu()).resolves.not.toBeNull();
  });

  /** ✅ Test adding a franchise */
  test('createFranchise', async () => {
    const franchise = { name: 'Test Franchise', admins: [{ email: testUser.email }] };
    const result = await DB.createFranchise(franchise);
    expect(result).toHaveProperty('id');
    testFranchiseId = result.id;
  });

  /** ❌ Test creating a franchise with a non-existent admin */
  test('createFranchise - unknown admin', async () => {
    const franchise = { name: 'Invalid Franchise', admins: [{ email: 'fakeadmin@test.com' }] };
    await expect(DB.createFranchise(franchise)).rejects.toThrow('unknown user for franchise admin');
  });

  /** ✅ Test adding a store */
  test('createStore', async () => {
    const store = { name: 'Test Store' };
    const result = await DB.createStore(testFranchiseId, store);
    expect(result).toHaveProperty('id');
    testStoreId = result.id;
  });

  /** ✅ Test getting franchises */
  test('getFranchises', async () => {
    const result = await DB.getFranchises();
    expect(Array.isArray(result)).toBe(true);
  });

  /** ✅ Test getting franchises for a user */
  test('getUserFranchises', async () => {
    const result = await DB.getUserFranchises(testUser.id);
    expect(Array.isArray(result)).toBe(true);
  });

  /** ❌ Test getting franchises for a non-existent user */
  test('getUserFranchises - unknown user', async () => {
    const result = await DB.getUserFranchises(999999);
    expect(result).toEqual([]);
  });

  /** ✅ Test adding a diner order */
  test('addDinerOrder', async () => {
    const order = {
      franchiseId: testFranchiseId,
      storeId: testStoreId,
      items: [{ menuId: testMenuItemId, description: 'Test Item', price: 5.99 }],
    };
    const result = await DB.addDinerOrder(testUser, order);
    expect(result).toHaveProperty('id');
  });

  /** ✅ Test getting orders */
  test('getOrders', async () => {
    const result = await DB.getOrders(testUser);
    expect(result).toHaveProperty('orders');
    expect(Array.isArray(result.orders)).toBe(true);
  });

  /** ❌ Test getting orders for a user with no orders */
  test('getOrders - no orders', async () => {
    const result = await DB.getOrders({ id: 99999 });
    expect(result.orders).toEqual([]);
  });


  /** ✅ Test logging out a user */
  test('logoutUser', async () => {
    await expect(DB.logoutUser('test_token')).resolves.not.toThrow();
  });

  /** ❌ Test updating a user with invalid fields */
  test('updateUser - invalid fields', async () => {
    await expect(DB.updateUser(testUser.id)).rejects.toThrow();
  });

  /** ✅ Test deleting store */
  test('deleteStore', async () => {
    await expect(DB.deleteStore(testFranchiseId, testStoreId)).resolves.not.toThrow();
  });

  /** ✅ Test deleting franchise */
  test('deleteFranchise', async () => {
    await expect(DB.deleteFranchise(testFranchiseId)).resolves.not.toThrow();
  });

  /** ❌ Test getting a non-existent user */
  test('getUser - unknown user', async () => {
    await expect(DB.getUser('unknown@test.com', 'password')).rejects.toThrow('unknown user');
  });

  /** ❌ Test hashing a password */
  test('bcrypt hashing', async () => {
    const hash = await bcrypt.hash('password', 10);
    expect(hash).toBeDefined();
    expect(await bcrypt.compare('password', hash)).toBe(true);
  });
});
