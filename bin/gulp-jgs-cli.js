#!/usr/bin/env node
process.argv.push('--cwd');
process.argv.push(process.cwd()); // 通过process.cwd获取到当前工作目录
process.argv.push('--gulpfile');
process.argv.push(require.resolve('..')); // 通过向上一级回到根目录，根目录自动寻找package.json文件内的入口
require('gulp/bin/gulp'); // 调用gulp目录下的bin命令，此命令是在mac等linux系统下操作，windows操作在cwd文件中
