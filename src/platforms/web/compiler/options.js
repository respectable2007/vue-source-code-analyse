/* @flow */

import {
  isPreTag,
  mustUseProp,
  isReservedTag,
  getTagNamespace
} from '../util/index'

import modules from './modules/index'
import directives from './directives/index'
import { genStaticKeys } from 'shared/util'
import { isUnaryTag, canBeLeftOpenTag } from './util'

export const baseOptions: CompilerOptions = {
  expectHTML: true,
  modules,//模块
  directives,//指令
  isPreTag,//是否为pre标签
  isUnaryTag,//是否为一元标签
  mustUseProp,//属性是否需要原生dom对象prop方式绑定
  canBeLeftOpenTag,//标签是否会被浏览器自动补全闭合
  isReservedTag,//标签是否为html标签或svg标签
  getTagNamespace,//获取标签命名空间
  staticKeys: genStaticKeys(modules)//模块静态键值字符串
}
