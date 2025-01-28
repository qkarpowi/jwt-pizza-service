const { DB } = require('./database.js');

test('getMenu', async () => {
    const menu = await DB.getMenu();
    expect(menu.length).toBeGreaterThan(0);
});

test('addMenuItem', async () => {
    const newItem = { title: 'new item', description: "test", image: "nullImage", price: 1.99 };
    const addedItem = await DB.addMenuItem(newItem);
    expect(addedItem).toMatchObject(newItem);
});

