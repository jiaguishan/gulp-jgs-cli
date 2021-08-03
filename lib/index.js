/**
 * src：资源读取方法
 * dest：操作完毕后输出操作
 * parallel：并行执行任务，一起执行，等待慢的
 * series：串行执行任务，顺序执行
 * watch：监听文件
 */
 const { src, dest, parallel, series, watch } = require('gulp');
 const sass = require('gulp-sass')(require('sass')); // gulp-sass在5的版本要求如此引入，需要gulp-sass和sass一起安装
 const del = require('del'); // 清除任务
 const browserSync = require('browser-sync'); // 本地服务

 const loadPlugins = require('gulp-load-plugins'); // 自动加载所有gulp开头的插件
 const plugins = loadPlugins(); // 调用方法加载所有函数，自动返回一个插件对象集合

 const browserServer = browserSync.create(); // 通过create开启一个本地服务

 const cwd = process.cwd(); // 返回当前命令的工作目录
 let config = {
   server: {
     port: 8080, // 服务端口
     open: true // 开启服务后是否打开浏览器，默认开启
   },
   build: {
     src: 'src',
     dist: 'dist',
     temp: 'temp',
     public: 'public',
     paths: {
       styles: 'assets/styles/*.scss',
       scripts: 'assets/scripts/*.js',
       pages: '*.html',
       images: 'assets/images/**',
       fonts: 'assets/fonts/**'
     }
   }
 };

 // 合并配置，已外部传递的为准，没有时以默认的为准
 try {
   const loadConfig = require(`${cwd}/pages.config.js`);
   config = Object.assign({}, config, loadConfig);
 } catch (error) {
   console.log('合并配置出错，请检查根目录下pages.config.js文件')
 }

 // 对配置进行结构，规范化、减少代码量
 const {
   build: {src, dist, temp, public},
   paths: {styles, scripts, pages, images, fonts},
   server: {port, open}
 } = config;

 // 样式任务
 const style = () => {
   /**
    * 通过src函数读取目录src下所有scss格式文件
    * 第二个参数为是个对象
    *  base：为基础路径
    *  cwd： 为入口路径
    *  下同
    */
   return src(styles, { base: src, cwd: src })
     .pipe(plugins.sourcemaps.init()) // 增加sourcemaps，下同
     .pipe(sass({ outputStyle: 'compressed' }).on('error', sass.logError)) // 安装gulp-sass，并将源码sass转换为普通css
     .pipe(plugins.sourcemaps.write())
     .pipe(dest(temp)) // 通过管道，最后将读取的内容放入处理目录
     .pipe(browserServer.reload({ stream: true })) // 已流的形式推送到浏览器，刷新浏览器，常见形式
 }

 // 脚本任务
 const script = () => {
   return src(scripts, { base: src, cwd: src })
     .pipe(plugins.sourcemaps.init())
     .pipe(plugins.babel({ presets: [require('@babel/preset-env')] })) // js处理上默认通过env，后续可对此处增加配置，增加更多规则
     .pipe(plugins.sourcemaps.write())
     .pipe(dest(temp))
     .pipe(browserServer.reload({ stream: true }))
 }

 // page任务
 const page = () => {
   return src(pages, { base: src, cwd: src })
     .pipe(plugins.swig({ data: config, defaults: { cache: false } })) // 为防止swig不刷新，增加cache：false
     .pipe(dest(temp))
     .pipe(browserServer.reload({ stream: true }))
 }

 // 清除任务
 const clean = () => {
   return del([dist, temp]); // 传递需要清空的列表
 }

 // 字体转换
 const font = () => {
   return src(fonts, { base: src, cwd: src })
     .pipe(plugins.imagemin())
     .pipe(dest(dist))
 }

 // 图片转换
 const image = () => {
   return src(images, { base: src, cwd: src })
     .pipe(plugins.imagemin())
     .pipe(dest(dist))
 }

 // 公共文件
 const extra = () => {
   return src('**', { base: public, cwd: public })
     .pipe(dest(dist))
 }

 // 处理中间文件，最终输出到dist
 const useref = () => {
   return src(pages, { base: temp, cwd: temp })
     .pipe(plugins.useref({ searchPath: [temp, '.'] }))
     .pipe(plugins.if(/\.js$/, plugins.uglify())) // 压缩js文件
     .pipe(plugins.if(/\.css$/, plugins.cleanCss())) // 压缩css文件
     .pipe(plugins.if(/\.html$/, plugins.htmlmin({
       collapseWhitespace: true, // 空格清除
       minifyCSS: true, // 行内样式压缩
       minifyJS: true // 行内js压缩
     })))
     .pipe(dest(dist))
 }

 const server = () => {
   watch(styles, { cwd: src }, style);
   watch(scripts, { cwd: src }, script);
   watch(pages, { cwd: src }, page);
   watch([images, fonts], {cwd: src}, browserServer.reload); // 图片和字体直接刷新
   watch('**', { cwd: public }, browserServer.reload); // 静态资源文件夹主要有内容变更，即重新加载页面

   browserServer.init({
     notify: false, // 每次启动不显示页面右上角的信息提示
     port,
     open,
     server: {
       baseDir: [temp, src, public], // 顺序寻找
       routes: {
         '/node_modules/': 'node_modules',
       },
     }
   });
 }

 const compile = parallel(style, script, page); // 编译任务
 const build = series(clean, parallel(series(compile, useref), image, font, extra)) // 构建任务
 const develop = parallel(compile, server) // 本地开发服务

 module.exports = {
   clean,
   build,
   develop,
 };
