/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest", // Use Babel to transform JS files
  },
};
