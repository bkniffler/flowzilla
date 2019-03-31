# Database Example

## Introduction

Implement a simple memory database using [faltu](https://github.com/moinism/faltu) to filter arrays with a mongo query like syntax. There is optional plugins for soft-delete and adding `lastChange` timestamp. The data layer could be easily switched to `localStorage`, `mongodb`, `http`, `socketio`, whatever you want.

The code can be seen here: https://codesandbox.io/s/r46m7pz35m

## Demo

This is what the database interface will look like.

```js
// ********************
// With transform plugin
// ********************
const db = new MemoryDB();
db.skill([transform], 'START');
const item = await db.insert({ name: 'Oskar' });
await db.remove(item.id);

// ********************
// With transform + softDelete plugin
// ********************
// const tracked[] = [];
const db = new MemoryDB();
// Insert skills at start of chain
db.skill([transform, softDelete], 'START');
// db.tracker = args => (console.log(args) as any) || tracked.push(args);
const item = await db.insert({ name: 'Oskar' });
await db.remove(item.id);
// Get a single item by id, also if deleted
await db.get(item.id); // { name: 'Oskar', id: ... }
// Fetch all
const all = await db.all(); // returns []
// Fetch including deleted
const all2 = await db.all({}, true); // returns [{ name: 'Oskar', id: ... }]
// console.log(treeizeTracker(tracked));

// ********************
// With tracking
// ********************
const db = new MemoryDB();
db.skill([transform, softDelete], 'START');
db.tracker = args => console.log(args);
const item = await db.insert({ name: 'Oskar' });
await db.remove(item.id);
```

## Database code

The database interface is pretty basic. It extends `Flowzilla` class and exposes some methods that are handed to Flowzilla.

```js
import { Flowzilla, generateID } from 'flowzilla';

class MemoryDB extends Flowzilla {
  store = [];
  constructor() {
    super();
    // Only add the basic memory persistence skill, everything else is optional
    this.skill('persistence', memoryPersistence(this.store));
  }
  insert(item) {
    return this.send('insert', item);
  }
  remove(id) {
    return this.send('remove', id);
  }
  get(id) {
    return this.send('get', id);
  }
  all(query = {}, includeDeleted = false) {
    return this.send('all', query, { includeDeleted });
  }
}
```

## Skills

### Memory persistence

```js
const Faltu = require('faltu');
const memoryPersistence = store => (type, value, flow) => {
  // Handle insert and return item
  if (type === 'insert') {
    if (!value.id) {
      value.id = generateID();
      store.push(value);
    } else {
      const index = store.findIndex(x => x.id === value.id);
      store[index] = value;
    }
    flow.return({ ...value });
  } else if (type === 'all') {
    // Perform query and return items
    flow.return(new Faltu(store).find(value).get());
  } else if (type === 'get') {
    // Perform query and return single item
    flow.return(store.find(x => x.id === value));
  } else if (type === 'remove') {
    // Remove by id and return id
    const index = store.findIndex(x => x.id === value);
    store.splice(index, 1);
    flow.return(value);
  }
};
```

### SoftDelete

```js
// Transform 'remove' operation to 'insert' and set 'deleted': true
const softDelete = async (type, value, flow) => {
  // On remove
  if (type === 'remove') {
    // Retrieve item
    const item = await flow.send('get', value);
    // Restart with item's 'deleted': true
    flow.restart('insert', { ...item, deleted: true });
  } else if (type === 'all') {
    // Get 'includeDeleted' from options
    const includeDeleted = flow.get('includeDeleted');
    // Overwrite query depending on 'includeDeleted': true
    flow(includeDeleted ? { ...value } : { ...value, deleted: { $ne: true } });
  } else {
    // Do nuffin'
    flow(value);
  }
};
```

### TimeStamp

```js
// Add a timestamp for storage, remove timestamp on retrieve
const transform = (type, value, flow) => {
  function clean(i) {
    delete i.lastChanged;
    return i;
  }
  if (type === 'insert') {
    flow(
      // Add timestamp
      { ...value, lastChanged: +new Date() },
      // On return, remove timestamp
      (i, n) => n(clean(i))
    );
  } else if (type === 'all' || type === 'get') {
    flow(
      // Leave untouched
      value,
      // On return, remove timestamp of all/one
      (value, flow) => {
        if (type === 'get') {
          flow(value ? clean(value) : value);
        } else {
          flow(value.map(clean));
        }
      }
    );
  } else {
    // Do nothing
    flow(value);
  }
};
```
