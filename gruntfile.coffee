module.exports = (grunt) ->
  grunt.initConfig
    connect:
      serve: {}
    watch:
      options:
        livereload: true
      app:
        files: ['*.js', '*.html', '*.css']

  grunt.loadNpmTasks 'grunt-contrib-connect'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.registerTask 'default', ['connect', 'watch']
