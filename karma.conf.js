module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', 'karma-typescript'],
    karmaTypescriptConfig: {
      tsconfig: './tsconfig.test.json',
    },
    files: [ 'src/**/*.ts' ],
    preprocessors: {
      'src/**/*.ts': 'karma-typescript',
    },
    coverageIstanbulReporter: {
      dir: require('path').join(__dirname, './coverage'),
      reports: ['html', 'lcovonly', 'text-summary'],
      fixWebpackSourcePaths: true
    },
    reporters: ['mocha', 'coverage-istanbul'],
    port: 9876,
    colors: true,
    browsers: ['ChromeHeadless'],
    singleRun: true,
    codeCoverage: true,
  });
};
