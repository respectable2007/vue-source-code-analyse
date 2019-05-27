/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  /*  */
  Vue.prototype._init = function (options?: Object) {
    /* 当前Vue实例对象，即new过程产生的对象 */
    const vm: Component = this
    // a uid
    vm._uid = uid++
    
    /* Vue.config.performance，设置为true，即开启性能追踪。
       追踪场景：组件初始化；
                编译-将模板编译为渲染函数；
                渲染-渲染函数的性能（渲染函数执行且生成虚拟DOM的性能）；
                打补丁-虚拟DOM渲染为真实DOM的性能
       使用方法：在代码开头和结尾使用mark函数打标记，在结尾，使用measure
       函数计算性能
       API：window.performance
    */
    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    /* Vue添加_isVue实例属性，
       若一个实例具有_isVue属性，且为true，则表明为Vue实例 
       避免被响应系统观察
    */
    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    /* 合并对象 */
    /* Component初始化 */
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else { //Vue初始化
      /* Vue实例添加$options属性，用于Vue实例初始化 */
      /* 相当于
         vm.$options = mergeOptions({
           components:{
             KeepAlive,
             Transitions,
             TransitionGroup
           },
           directives: {
             model,
             show
           },
           filters: Object.create(null),
           _base: Vue
         }, {
           el: '#app',
           data: {
             test: 1
           }
         },
           vm//当前Vue实例
         )
      */
     /* Vue实例属性$options(实例初始化选项API),暴露给开发者
     */
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    /* 在Vue实例对象上添加_renderProxy属性 */
    /* 非生产环境 */
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    initRender(vm)
    callHook(vm, 'beforeCreate')
    initInjections(vm) // resolve injections before data/props
    initState(vm)
    initProvide(vm) // resolve provide after data/props
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el)
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

/* 解析当前实例构造函数options */
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  /* Vue子类 */
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    /* 子类保存的父类Options与父类自身options是否相同，即父类options是否被改变过 */
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      /* 重写子类superOptions */
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      /* vue-hot-reload-api 或 vue-loader的bug */
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
