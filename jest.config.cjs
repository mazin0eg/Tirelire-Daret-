module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.js$": "babel-jest", 
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testMatch: [
    '**/test/**/*.test.js'
  ],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js'
  ]
};
