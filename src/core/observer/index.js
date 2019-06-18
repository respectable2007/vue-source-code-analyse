/* 响应系统，包含数据观测的核心代码 */
/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    this.vmCount = 0
    /* 数据对象添加__ob__属性，其值为Observer实例对象 */
    def(value, '__ob__', this)
    /* 数组 */
    if (Array.isArray(value)) {
      /* value挂载被重写过的原型对象
         该原型对象指向Array原型，
         其数组变异方法被重写，触发依赖，
         供开发者获得数组发生改变的信息
      */
      if (hasProto) {
        /* 数据对象实例原型指向一个对象（包含Array原型） */
        protoAugment(value, arrayMethods)
      } else {
        /* 数据对象添加Array的原型属性和方法 */
        copyAugment(value, arrayMethods, arrayKeys)
      }
      /* 遍历观察数组项，观察对象或数组，不观察基本数据类型 */
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
/* 更改某个对象实例的原型 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  /* 不为对象或是VNode的实例，则不能被观测 */
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  /* 若一个数据对象包含__ob__属性，且该属性为Observer实例，那么说明这个数据对象已经被观测过 */
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue//避免Vue实例对象被观察
  ) {
    /* 将数据对象转为响应式数据 */
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
/* 数据对象的数据属性转为访问器属性 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  /* 创建当前对象属性的依赖 */
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  /* 排除不能配置的对象属性，是因为不可配置的对象属性，
     没必要使用Object.defineProperty，改变其特性
 */
  if (property && property.configurable === false) {
    return
  }

  /* 保存原有的访问器属性，在新建的getter/setter调用，
     保证对象属性原始的读写操作
  */
  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  /* 主要与深度观测有关，当当前字段是只读的，但其字段值为一个对象或数组，
     需要进行响应处理，就需要获取其字段值。
     如果shallow为false但val为undefined，不会深度观测。
     只有在shallow为false且val不为undefined时，才会深度观测。
     此时，未重写Object.defineProperty,读取字段值，不会触发依赖等操作
  */
  /* val是defineReactive的第三个参数，在walk函数中，
     未传入该参数，此时为undefined。
     但后期Object.defineProperty需要这个值。因此，
     在getter不存在或只存在setter，
     且函数传入2个参数时，获取key对应的属性值。
   */
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  /* 前提：val是否被读取，val是undefined，不会深度观测
     当出现嵌套对象（属性值为对象）时，是否需要深度观测，
     Vue默认为深度观测
     childOb可能值：undefined|observer实例
  */
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    /* 1、返回属性值；2、收集依赖 */
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      /* Dep.target要收集的依赖（观察者） */
      if (Dep.target) {
        dep.depend() //当前字段收集依赖
        /* 用来实现Vue.set或$set在嵌套对象上添加属性是响应的 */
        if (childOb) {
          /* 字段值的observer收集依赖 */
          childOb.dep.depend()
          /* 该属性为数组属性 */
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    /* 1、设置新属性值；2、触发依赖 */
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val

      /* eslint-disable no-self-compare */
      /* 值未变化
         newVal !== newVal && value !== value =》新值与旧值自身不相等，说明新值与旧值都是NaN
      */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      /* 输出辅助信息 */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      /* 只读属性 */
      if (getter && !setter) return
      /* 设置新属性值 */
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      /* 为新属性值添加观测 */
      childOb = !shallow && observe(newVal)
      /* 触发依赖 */
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  /* 非生产环境，target为undefined或null或基本数据类型，警告 */
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  /* 数组，使用splice方法（变异方法可触发依赖），触发依赖 */
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  /* 对象，通过setter函数，触发依赖 */
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__
  /* 不能在Vue实例、根级数据对象添加，否则在非生产环境，警告 */
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  /* 若target原本非响应，直接赋值，并返回值 */
  if (!ob) {
    target[key] = val
    return val
  }
  /* target被观测，新添加的属性转为响应式 */
  defineReactive(ob.value, key, val)
  /* 触发target依赖 */
  ob.dep.notify()
  /* 返回值 */
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  /* 在数组内，删除 */
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  const ob = (target: any).__ob__
  /* Vue实例和根级数据对象不可删除 */
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  /* 不在target里，直接返回 */
  if (!hasOwn(target, key)) {
    return
  }
  /* 对象删除 */
  delete target[key]
  /* target非响应，直接返回 */
  if (!ob) {
    return
  }
  /* target响应，触发依赖 */
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
/* 递归遍历数组及其内部数组项，收集依赖，保证集合与集合项行为一致，仅仅针对对象或数组 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
