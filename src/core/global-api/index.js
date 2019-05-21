/* 包含给Vue构造函数挂载全局方法（静态方法）或属性的代码 */
/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
import keepAlive from '../components/keep-alive';

export function initGlobalAPI (Vue: GlobalAPI) {
  /* 在Vue构造函数上，添加config只读静态属性，config来自于core/config */
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  /* Vue.util不被定义为全局API，尽量不要依赖它们，若使用请注意风险控制 */
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  /* 在Vue构造函数上，添加options静态属性 */
  Vue.options = Object.create(null)
  /* 遍历ASSET_TYPES数组，在Vue.options上，添加components、directives和filters属性，三个属性均为空对象 */
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue
  
  /* 将builtInComponents对象合并到Vue.options.components
     结果是Vue.options.components = { keepAlive}
  */
  extend(Vue.options.components, builtInComponents)
  
  // 在Vue构造函数上，添加静态方法
  initUse(Vue) // 在Vue构造函数上，添加use静态方法
  initMixin(Vue) // 在Vue构造函数上，添加mixin静态方法
  initExtend(Vue) // 在Vue构造函数上，添加cid静态属性和extend静态方法
  initAssetRegisters(Vue) // 遍历ASSET_TYPES数组，在Vue构造函数上，添加component,directive,filter静态方法
}
