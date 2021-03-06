/* @flow */

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError,
  noop
} from '../util/index'

import { traverse } from './traverse'
import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import type { SimpleSet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: SimpleSet;
  newDepIds: SimpleSet;
  before: ?Function;
  getter: Function;
  value: any;

  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: ?Object,
    isRenderWatcher?: boolean
  ) {
    /* 观察实例的vm，指向的是当前的Vue实例 */
    this.vm = vm
    /* 是否为渲染函数的watcher */
    if (isRenderWatcher) {
      /* 当前Vue实例属性_watcher指向的是渲染函数观察实例 */
      vm._watcher = this
    }
    /* 当前Vue实例_watchers数组保存着这个组件实例的渲染函数和非渲染函数观察实例 */
    vm._watchers.push(this)

    // options
    /* 初始化options */
    if (options) {
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
      this.before = options.before
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    /* 回调函数 */
    this.cb = cb
    /* watcher实例id，唯一标识符 */
    this.id = ++uid // uid for batching
    /* 当前观察实例是否处于激活状态 */
    this.active = true
    /* 该属性与lazy保持一致，即只有惰性属性，
       当前观察者实例的direty为真
    */
    this.dirty = this.lazy // for lazy watchers
    /* 与订阅者有关，用于避免收集重复订阅者和剔除无用订阅者 */
    /* newDeps、newDepIds，用来保存本次求值收集的订阅者
       deps、depIds，用来保存上一次求值收集的订阅者
    */
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    /* 被观察者的描述信息，用于提醒开发者错误 */
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      /* this.getter为空，说明parsePath解析失败，则在非生产环境下，发出警告 */
      if (!this.getter) {
        this.getter = noop
        /* expOrFn只能是以点分隔的简单字符串或者一个完整的js函数 */
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    /* 保存被观察目标的值 */
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  /* 求值，收集订阅者 */
  get () {
    pushTarget(this)
    let value
    const vm = this.vm
    try {
      value = this.getter.call(vm, vm)
    } catch (e) {
      if (this.user) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      } else {
        throw e
      }
    } finally {
      // "touch" every property so they are all tracked as
      // dependencies for deep watching
      if (this.deep) {
        traverse(value)
      }
      popTarget()
      /* 清空本次求值的收集的订阅者 */
      this.cleanupDeps()
    }
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    /* Dep实例对象的唯一标识 */
    const id = dep.id
    /* 添加并去重订阅器 */
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      /* 多次求值（数据发生变化重新求值的过程）中，
         避免重复收集订阅器 
      */
      if (!this.depIds.has(id)) {
        /* 当前订阅者被推入到消息订阅器 */
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  cleanupDeps () {
    let i = this.deps.length
    /* 遍历总deps， 总deps中的订阅者不在本次保存的订阅者中，
       说明这个订阅者与当前观察者实例不存在订阅者关系，
       解除订阅者与观察者实例的联系
    */
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }
    /* depIds、deps替换为newDepIds、newDeps
       newDepIds、newDeps被清空
    */
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      /* 同步更新 */
      this.run()
    } else {
      /* 异步更新 */
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      /* 触发setter函数，数值发生变化，需要重新渲染。
         因此，再次调用当前观察者实例的get方法，进而
         重新渲染。
      */
      const value = this.get()
      /* 渲染函数，this.get->updateComponent,返回值都是undefined，
        不会执行if语句；而非渲染函数，则会执行if语句
      */
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        /* 返回值为对象，value为相同的引用，但其内部属性值可能会发生变化 */
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        /* 执行cb回调函数 */
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}
