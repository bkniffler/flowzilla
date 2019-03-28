<div align="center">
  <a href="https://github.com/bkniffler/service-dog">
    <img alt="alpacka" src="https://raw.githubusercontent.com/bkniffler/service-dog/master/assets/logo.png" height="250px" />
  </a>
</div>
<div align="center">
  <strong>Teach your service-dogs whatever skill it needs and let it handle your requests.</strong>
  <br />
  <br />
  <a href="https://travis-ci.org/bkniffler/service-dog">
    <img src="https://img.shields.io/travis/bkniffler/service-dog.svg?style=flat-square" alt="Build Status">
  </a>
  <a href="https://codecov.io/github/bkniffler/service-dog">
    <img src="https://img.shields.io/codecov/c/github/bkniffler/service-dog.svg?style=flat-square" alt="Coverage Status">
  </a>
  <a href="https://github.com/bkniffler/service-dog">
    <img src="http://img.shields.io/npm/v/service-dog.svg?style=flat-square" alt="Version">
  </a>
  <a href="https://github.com/bkniffler/service-dog">
    <img src="https://img.shields.io/badge/language-typescript-blue.svg?style=flat-square" alt="Language">
  </a>
  <a href="https://github.com/bkniffler/service-dog/master/LICENSE">
    <img src="https://img.shields.io/github/license/bkniffler/service-dog.svg?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/bkniffler/service-dog">
    <img src="https://flat.badgen.net/bundlephobia/minzip/service-dog" alt="License">
  </a>
  <br />
  <br />
</div>

# service-dog

As soon as you send an action, service-dog will run through all of its skills, mutating the action's value along until it is done. Each skill can also hook into the return chain to modify the value again. The executional interface to service-dog is based on promises, though internally, due to performance and flexibility, service-dog uses callbacks. Thus, it can easily handle async stuff like http requests, image transformation, etc.

Service-dog is based a lot on the idea of middlewares (made popular by expressjs) but is completely agnostic to what kind of operations it handles.

## Docs

- [API Documentation per Typedoc](https://bkniffler.github.io/service-dog/)
- more to come...

## Install

```
yarn add service-dog
npm i service-dog
```

### CDN

A browser version is available on https://cdn.jsdelivr.net/npm/service-dog

### CodeSandbox

A very basic codesandbox on https://codesandbox.io/s/pp3zwnxk7m

## Examples

### Database Example

```ts
import { ServiceDog, ISkill, generateID } from 'service-dog';
const Faltu = require('faltu');

// Add a timestamp for storage, remove timestamp on retrieve
const transform: ISkill = (type, value, flow) => {
  function clean(i: any) {
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

// Transform 'remove' operation to 'insert' and set 'deleted': true
const softDelete: ISkill = async (type, value, flow) => {
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

const memoryPersistence = (store: any[]): ISkill => (type, value, flow) => {
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

class MemoryDB extends ServiceDog {
  store: any[] = [];
  constructor() {
    super();
    this.skill('persistence', memoryPersistence(this.store));
  }
  insert(item: any): Promise<any> {
    return this.send('insert', item);
  }
  remove(id: string) {
    return this.send('remove', id);
  }
  get(id: string) {
    return this.send('get', id);
  }
  all(query: any = {}, includeDeleted = false) {
    return this.send('all', query, { includeDeleted });
  }
}

test('db-softdelete', async () => {
  // const tracked: any[] = [];
  const db = new MemoryDB();
  // Insert skills at start of chain
  db.skill([transform, softDelete], 'START');
  // db.tracker = args => (console.log(args) as any) || tracked.push(args);
  const item = await db.insert({ name: 'Oskar' });
  await db.remove(item.id);
  const item2 = await db.get(item.id);
  expect(item2).toBeTruthy();
  expect(item.id).toBe(item2.id);
  const all = await db.all();
  const all2 = await db.all({}, true);
  expect(all.length).toBe(0);
  expect(all2.length).toBe(1);
  // console.log(treeizeTracker(tracked));
});

test('db', async () => {
  const db = new MemoryDB();
  db.skill([transform], 'START');
  const item = await db.insert({ name: 'Oskar' });
  await db.remove(item.id);
  const item2 = await db.get(item.id);
  expect(item2).toBeFalsy();
});
```
