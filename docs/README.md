# Service-Dog

Create flexible and extandable data flows by encapsulating operations into skills, making an ordered chain that can handle whatever request you throw at it. As soon as you send an action, service-dog will run through all of its skills, mutating the action's value along until it is done. Each skill can also hook into the return chain to modify the value on its way back. The executional interface to service-dog is based on promises, though internally, due to performance and flexibility, service-dog uses callbacks. Thus, it can easily handle async stuff like http requests, image transformation, etc.

Service-Dog is based a lot on the idea of middlewares (made popular by expressjs) but is completely agnostic to what kind of operations it handles. It is also inspired by redux, though only on the action/middleware part. It excels in cases where you'd work with class overwriting and/or hooks to allow extending some part of functionality. A classic example is a database with different adapters and plugins (like soft-delete, auditing, time-stamping), a server that can handle requests, an authentication/authorization system, an API client. Basically anything that has a strong focus on how data flows.

It can also help you check your flow by providing a tracker that will fire on start and completion of your chain and each time a skill is entered.

This library works on node and in the browser, has no dependencies except for tslib (no dependencies, 2kb gzipped) and is tree shackable.

## Install

```
yarn add service-dog
npm i service-dog
```

### CDN

A browser version is available on https://cdn.jsdelivr.net/npm/service-dog
