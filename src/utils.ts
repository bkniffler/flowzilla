export function insertToArray(
  array: any[],
  item: any,
  position: 'START' | 'END' | 'BEFORE' | 'AFTER' = 'END',
  anchor: any | string | any[] | string[] = [],
  findItem: (item: string) => any = x => x
) {
  if (position === 'END') {
    array.push(item);
  } else if (position === 'AFTER' || position === 'BEFORE') {
    const arr = Array.isArray(anchor) ? anchor : [anchor];
    let index = position === 'AFTER' ? -1 : array.length + 1;
    let i = 0;
    while (i < arr.length) {
      const s = arr[i];
      const item = typeof s === 'string' ? findItem(s) : s;
      if (item === undefined) {
        throw new Error(
          `Skill with name ${s} could not be found, please ensure it is added before ${name}`
        );
      }
      const indexB = array.indexOf(item);
      if (position === 'AFTER') {
        index = indexB > index ? indexB : index;
      } else {
        index = indexB < index ? indexB : index;
      }
      i++;
    }
    if (position === 'AFTER') {
      index = index < 0 ? array.length : index + 1;
    }
    index = index > array.length ? array.length : index;
    // index = index < 0 ? 0 : index;
    array.splice(index, 0, item);
  } else {
    array.splice(0, 0, item);
  }
  return array;
}

export function generateID() {
  return Math.random()
    .toString(36)
    .substr(2, 9);
}
