# Skill

## Example

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

## Arguments

### type

Type is a string that is defined when calling Flowzilla.run.

### value

The value can be anything, and it can be altered in each skill.

### flow

`flow` exposes multiple functions to control your data flow.

```js
flow(newValue); // will continue to next skill (if any) or return (if none)
flow.return(finalValue); // will force to retur with specified value instead of proceding to next
await flow.send('new-action', value); // will start a new flow and await its value before continuing
flow.restart('new-action', value); // will stop the current flow and start a new one
```
