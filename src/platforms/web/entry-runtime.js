/* 运行时构建的入口，不包含模板（template）到render函数的编译器，
所以不支持`template`选项，我们使用vue默认导出的就是这个运行时的版
本。大家使用的时候要注意 */
/* @flow */

import Vue from './runtime/index'

export default Vue
