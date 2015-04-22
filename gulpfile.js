'use strict';

var gulp = require('gulp');
var ts = require('gulp-typescript');
var merge = require('merge2');
var child_process = require('child_process');
var insert = require('gulp-insert');
// var debug = require('gulp-debug');

// Default task set.
gulp.task('default', ['typescript']);

/*
 * Watch for changes.
 */
gulp.task('watch', function() {
    gulp.watch('source/**/*.ts', ['typescript']);
});

/*
 * Transpile typescript to javascript.
 */
gulp.task('typescript', [], function() {
    var tsClientResult = gulp.src('./source/client/*.ts')
       .pipe(ts({
            typescript: require('typescript'),
            target: 'ES5',
            module: 'amd',
       }));
    var tsServerResult = gulp.src('./source/server/*.ts')
       .pipe(ts({
            typescript: require('typescript'),
            target: 'ES5',
            module: 'commonjs',
       }));

    return merge([
        tsClientResult.dts,
        tsClientResult
            .js
            .pipe(gulp.dest('./build/client')),
        tsServerResult.dts,
        tsServerResult
            .js
            .pipe(insert.prepend('#!/usr/bin/env node\n'))
            .pipe(gulp.dest('./build/server'))]);
});
