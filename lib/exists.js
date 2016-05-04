module.exports = function exists(variable) {
  return (typeof variable !== "undefined" && variable !== null);
}
