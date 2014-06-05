module.exports = function (config) {
  config.set({
    basePath: '.',
    files: [
      'bower_components/lodash/dist/lodash.js',
      'bower_components/underscore.string/lib/underscore.string.js',
      'bower_components/angular/angular.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/angular-ui-bootstrap-bower/ui-bootstrap-tpls.js',
      'bower_components/firebase/firebase.js',
      'bower_components/firebase-simple-login/firebase-simple-login.js',
      'bower_components/angular-fire/angularfire.js',
      'bower_components/moment/moment.js',
      'bower_components/moment/lang/fr.js',
      'bower_components/angular-moment/angular-moment.js',
      'app.js',
      'hgDefer.js',
      'hgUnique.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'spec.js',
    ],
    frameworks: ['jasmine'],
    browsers: ['PhantomJS'],
    plugins: [
      'karma-jasmine',
      'karma-phantomjs-launcher'
    ]
  });
};
