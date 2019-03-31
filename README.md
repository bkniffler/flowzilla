<div align="center">
  <a href="https://github.com/bkniffler/flowzilla">
    <img alt="flowzilla" src="https://raw.githubusercontent.com/bkniffler/flowzilla/master/assets/logo.png" height="250px" />
  </a>
</div>
<div align="center">
  <strong>Create flexible and extandable data flows by encapsulating operations into skills, making an ordered chain that can handle whatever request you throw at it.</strong>
  <br />
  <br />
  <a href="https://travis-ci.org/bkniffler/flowzilla">
    <img src="https://img.shields.io/travis/bkniffler/flowzilla.svg?style=flat-square" alt="Build Status">
  </a>
  <a href="https://codecov.io/github/bkniffler/flowzilla">
    <img src="https://img.shields.io/codecov/c/github/bkniffler/flowzilla.svg?style=flat-square" alt="Coverage Status">
  </a>
  <a href="https://github.com/bkniffler/flowzilla">
    <img src="http://img.shields.io/npm/v/flowzilla.svg?style=flat-square" alt="Version">
  </a>
  <a href="https://github.com/bkniffler/flowzilla">
    <img src="https://img.shields.io/badge/language-typescript-blue.svg?style=flat-square" alt="Language">
  </a>
  <a href="https://github.com/bkniffler/flowzilla/master/LICENSE">
    <img src="https://img.shields.io/github/license/bkniffler/flowzilla.svg?style=flat-square" alt="License">
  </a>
  <a href="https://github.com/bkniffler/flowzilla">
    <img src="https://flat.badgen.net/bundlephobia/minzip/flowzilla" alt="License">
  </a>
  <br />
  <br />
</div>

# flowzilla

Create flexible and extandable data flows by encapsulating operations into skills, making an ordered chain that can handle whatever request you throw at it. As soon as you send an action, flowzilla will run through all of its skills, mutating the action's value along until it is done. Each skill can also hook into the return chain to modify the value on its way back. The executional interface to flowzilla is based on promises, though internally, due to performance and flexibility, flowzilla uses callbacks. Thus, it can easily handle async stuff like http requests, image transformation, etc.

Flowzilla is based a lot on the idea of middlewares (made popular by expressjs) but is completely agnostic to what kind of operations it handles. It is also inspired by redux, though only on the action/middleware part. It excels in cases where you'd work with class overwriting and/or hooks to allow extending some part of functionality. A classic example is a database with different adapters and plugins (like soft-delete, auditing, time-stamping), a server that can handle requests, an authentication/authorization system, an API client. Basically anything that has a strong focus on how data flows.

It can also help you check your flow by providing a tracker that will fire on start and completion of your chain and each time a skill is entered.

This library works on node and in the browser, has no dependencies except for tslib (no dependencies, 2kb gzipped) and is tree shackable.

## Performance

The overhead of running flowzilla compared to using callbacks or a chain of promises is very low.
Checkout the (simple) benchmark at: https://github.com/bkniffler/flowzilla/blob/master/src/tests/benchmark.test.ts

```bash
# Macbook Pro 13
callback x 761 ops/sec ±1.80% (74 runs sampled)
promise x 750 ops/sec ±0.99% (76 runs sampled)
flowzilla x 758 ops/sec ±0.98% (74 runs sampled)
```

# Table of Contents

- Install
  - Yarn/NPM
  - CDN
  - Sandbox
- API Documentation
  - Skill
- Example
  - Database Example

## Install

### Yarn/NPM

```
yarn add flowzilla
npm i flowzilla
```

### CDN

A browser version is available on https://cdn.jsdelivr.net/npm/flowzilla

### Sandbox

- [CodeSandbox Playground](https://codesandbox.io/s/pp3zwnxk7m)

# API Documentation

## Skill

### Example

```js
const calculator = (type, value, flow) => {
  if (type === 'add') {
    flow.return(value[0] + value[1]);
  } else if (type === 'multiply') {
    flow.return(value[0] * value[1]);
  } else {
    // Do nothing
    flow(value);
  }
};
```

### Arguments

#### type

Type is a string that is defined when calling Flowzilla.run.

#### value

The value can be anything, and it can be altered in each skill.

#### flow

`flow` exposes multiple functions to control your data flow.

```js
flow(newValue); // will continue to next skill (if any) or return (if none)
flow.return(finalValue); // will force to retur with specified value instead of proceding to next
await flow.send('new-action', value); // will start a new flow and await its value before continuing
flow.restart('new-action', value); // will stop the current flow and start a new one
```

# Examples

## Database Example

### Introduction

Implement a simple memory database using [faltu](https://github.com/moinism/faltu) to filter arrays with a mongo query like syntax. There is optional plugins for soft-delete and adding `lastChange` timestamp. The data layer could be easily switched to `localStorage`, `mongodb`, `http`, `socketio`, whatever you want.

The code can be seen here: https://codesandbox.io/s/r46m7pz35m

### Demo

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

### Database code

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

### Skills

#### Memory persistence

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

#### SoftDelete

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

#### TimeStamp

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
