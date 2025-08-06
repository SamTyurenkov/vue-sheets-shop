let imagemin,
imageminGifsicle = require('imagemin-gifsicle'),
optipng = require('imagemin-optipng'),
imageminJpegRecompress = require('imagemin-jpeg-recompress'),
pngquant = require('imagemin-pngquant'),
plumber = require('gulp-plumber');

imgPATH = {
    "input": ["./src/**/*.{png,jpg,jpeg}"],
    "output": "./src"
}


async function loadModules() {
    imagemin = (await import('gulp-imagemin')).default;
    imageminJpegRecompress = (await import('imagemin-jpeg-recompress')).default;
    pngquant = (await import('imagemin-pngquant')).default;
}
loadModules();

module.exports = function() {
    $.gulp.task('imgs', async () => {
        await loadModules();
        return $.gulp.src(imgPATH.input)
        .pipe(plumber())
        .pipe(imagemin([
            imageminGifsicle({
                interlaced: true
            }),
            imageminJpegRecompress({
                loops: 4,
                min: 85,
                max: 100,
                quality: 'high'
            }),
           optipng({
                optimizationLevel: 3
            }),
            pngquant({
                quality: [0.9, 1],
                speed: 5
            })
        ], {
            verbose: true
        }))
        .pipe($.gulp.dest(imgPATH.output));
    });
};
