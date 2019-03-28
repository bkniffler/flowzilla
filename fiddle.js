function callback(type, value, cb) {
  value.push(1);
  callback2(type, value, cb);
}
function callback2(type, value, cb) {
  value.push(2);
  callback3(type, value, cb);
}
function callback3(type, value, cb) {
  value.push(3);
  cb(value);
}
function promise(type, value) {
  value.push(1);
  return new Promise(yay => yay(value))
    .then(value => promise2(type, value))
    .then(value => promise3(type, value));
}
function promise2(type, value) {
  value.push(2);
  return new Promise(yay => yay(value));
}
function promise3(type, value) {
  value.push(3);
  return new Promise(yay => yay(value));
}
