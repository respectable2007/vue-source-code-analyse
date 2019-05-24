/* @flow */

import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import { unicodeRegExp } from './lang'
import { nativeWatch, hasSymbol } from './env'

import {
  ASSET_TYPES,
  LIFECYCLE_HOOKS
} from 'shared/constants'

import {
  extend,
  hasOwn,
  camelize,
  toRawType,
  capitalize,
  isBuiltInTag,
  isPlainObject
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
/* 一个空对象，相当于strats为Vue.config.optionMergeStrategies，
   开发者可以重新改参数，默认值为Object.create(null)，
   是合并选项策略的对象，包含任意函数，开发者可为某个选项，自定义
   合并选项函数，只需要在Vue.config.optionMergeStrategies添加
*/
const strats = config.optionMergeStrategies

/* 某些选项合并策略 */
/**
 * Options with restrictions
 */
/* 非生产环境，el/propsData选项合并策略，使用默认策略 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    /* vm是否存在，可判断Vue是否为new创建的Vue实例 
       ---》判断是否为子组件，是因为Vue.extend（子类）中调用mergeOptions未传入vm
    */
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
/* 返回一个对象，以to对象原始数据为主，to没有，from有，则并入to中 */
function mergeData (to: Object, from: ?Object): Object {
  if (!from) return to
  let key, toVal, fromVal

  const keys = hasSymbol
    ? Reflect.ownKeys(from)
    : Object.keys(from)

  for (let i = 0; i < keys.length; i++) {
    key = keys[i]
    // in case the object is already observed...
    if (key === '__ob__') continue
    toVal = to[key]
    fromVal = from[key]
    /* 合并 */
    if (!hasOwn(to, key)) {
      set(to, key, fromVal)
    } else if (
      toVal !== fromVal &&
      isPlainObject(toVal) &&
      isPlainObject(fromVal)
    ) {
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
/* 返回值情况如下：
   子组件：data本身；父类的data选项；mergedDataFn
   new实例：mergedInstanceDataFn */
export function mergeDataOrFn (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  /* 子组件 -> Vue.extend -> mergeOptions(p,c) */
  if (!vm) {
    /* 子组件使用Vue.extend进行选项合并，父子data选项都必须是函数 */
    // in a Vue.extend merge, both should be functions
    /* 在子组件时，调用strats.data，那么parentVal、childVal二者必存在其一，
       且二者都是函数
    */
    if (!childVal) {
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    /* 二者均存在，则返回mergeDataFn*/
    return function mergedDataFn () {
      return mergeData(
        typeof childVal === 'function' ? childVal.call(this, this) : childVal,
        typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal
      )
    }
  } else {
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm, vm)
        : childVal
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm, vm)
        : parentVal
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

/* 调用data选项合并策略，子组件和new创建实例的情况下，均返回一个函数；
   这些函数执行后，最终返回值为一个对象
*/
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  /* 子组件 */
  if (!vm) {
    /* 子组件传入data，但data不是函数类型，则警告，并返回parentVal（函数） */
    if (childVal && typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
     
      return parentVal
    }
    /* 未传入，或传入且data是函数类型，则返回mergeDataOrFn返回值 */
    return mergeDataOrFn(parentVal, childVal)
  }
  /* new创建的实例，则返回mergeDataOrFn返回值 */
  return mergeDataOrFn(parentVal, childVal, vm)
}

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  const res = childVal
    ? parentVal
      ? parentVal.concat(childVal)
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
  return res
    ? dedupeHooks(res)
    : res
}

function dedupeHooks (hooks) {
  const res = []
  for (let i = 0; i < hooks.length; i++) {
    if (res.indexOf(hooks[i]) === -1) {
      res.push(hooks[i])
    }
  }
  return res
}

LIFECYCLE_HOOKS.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): Object {
  const res = Object.create(parentVal || null)
  if (childVal) {
    process.env.NODE_ENV !== 'production' && assertObjectType(key, childVal, vm)
    return extend(res, childVal)
  } else {
    return res
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  // work around Firefox's Object.prototype.watch...
  if (parentVal === nativeWatch) parentVal = undefined
  if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null)
  if (process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : Array.isArray(child) ? child : [child]
  }
  return ret
}

/**
 * Other object hashes.
 */
strats.props =
strats.methods =
strats.inject =
strats.computed = function (
  parentVal: ?Object,
  childVal: ?Object,
  vm?: Component,
  key: string
): ?Object {
  if (childVal && process.env.NODE_ENV !== 'production') {
    assertObjectType(key, childVal, vm)
  }
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  if (childVal) extend(ret, childVal)
  return ret
}
strats.provide = mergeDataOrFn

/**
 * Default strategy.
 */
/* 默认合并选项策略函数
   childVal不为undefined，则返回childVal；
   为undefined，则返回parentVal。
   即最终以child属性值为主
*/
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Validate component names
 */
function checkComponents (options: Object) {
  for (const key in options.components) {
    validateComponentName(key)
  }
}

export function validateComponentName (name: string) {
  if (!new RegExp(`^[a-zA-Z][\\-\\.0-9_${unicodeRegExp.source}]*$`).test(name)) {
    warn(
      'Invalid component name: "' + name + '". Component names ' +
      'should conform to valid custom element name in html5 specification.'
    )
  }
  /* isBuiltInTag：判断注册组件是否为Vue的内置标签（slot、component）
     config.isReservedTag：判断注册组件是否为HTML标签、SVG标签
  */
  if (isBuiltInTag(name) || config.isReservedTag(name)) {
    warn(
      'Do not use built-in or reserved HTML elements as component ' +
      'id: ' + name
    )
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
/* 将Props选项格式化为对象形式，如下：
   驼峰式属性名:{type: ...}
*/
function normalizeProps (options: Object, vm: ?Component) {
  const props = options.props
  if (!props) return
  /* 声明一个空对象，用于保存格式化的结果 */
  const res = {}
  /* 索引、属性值、驼峰后属性名 */
  let i, val, name
  /* 字符串数组 */
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  /* 对象 */
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      name = camelize(key)
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  /* 不是以上两种类型，非生产环境下报错，生产环境忽视 */
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "props": expected an Array or an Object, ` +
      `but got ${toRawType(props)}.`,
      vm
    )
  }
  /* 重写options的props */
  options.props = res
}

/**
 * Normalize all injections into Object-based format
 */
/* inject选项格式化为一个对象，如下：
   {
     'name': {
       from: x
     }
   }
   字符串数组：x为数组项
   对象：对象属性值不为纯对象，x为对象属性值；
        对象属性值为纯对象，x为对象值与{from: 属性名}和属性值合并结果
*/
function normalizeInject (options: Object, vm: ?Component) {
  const inject = options.inject
  if (!inject) return
  /* 重写options.inject,与normalize指向同一个对象 */
  const normalized = options.inject = {}
  /* 字符串数组 */
  if (Array.isArray(inject)) {
    for (let i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] }
    }
  /* 纯对象 */
  } else if (isPlainObject(inject)) {
    for (const key in inject) {
      const val = inject[key]
      normalized[key] = isPlainObject(val)
        ? extend({ from: key }, val)
        : { from: val }
    }
  /* 即不是纯对象，也不是字符串数组，非生产环境警告 */
  } else if (process.env.NODE_ENV !== 'production') {
    warn(
      `Invalid value for option "inject": expected an Array or an Object, ` +
      `but got ${toRawType(inject)}.`,
      vm
    )
  }
}

/**
 * Normalize raw function directives into object format.
 */
/* directives格式化为一个对象，如下：
   directives：{
     key1: {
       bind: fn,
       update: fn
     }
   }
*/
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]

      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

function assertObjectType (name: string, value: any, vm: ?Component) {
  if (!isPlainObject(value)) {
    warn(
      `Invalid value for option "${name}": expected an Object, ` +
      `but got ${toRawType(value)}.`,
      vm
    )
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
/* 合并传参对象到一个新对象上 */
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  if (process.env.NODE_ENV !== 'production') {
    /* 验证子组件名称是否合法 */
    checkComponents(child)
  }
  
  /* 合并另一种Vue实例构造函数的选项
   */
  if (typeof child === 'function') {
    child = child.options
  }
  
  /* 选项允许多种形式写法，但会在内部格式化为同一种写法，以便之后统一处理 */

  /* 格式化child的props属性 */
  normalizeProps(child, vm)
  /* 格式化child的inject属性 */
  normalizeInject(child, vm)
  /* 格式化child的Directives属性 */
  normalizeDirectives(child)

  // Apply extends and mixins on the child options,
  // but only if it is a raw options object that isn't
  // the result of another mergeOptions call.
  // Only merged options has the _base property.
  if (!child._base) {
    /* extends：对象 */
    if (child.extends) {
      parent = mergeOptions(parent, child.extends, vm)
    }
    /* mixins：对象数组 */
    if (child.mixins) {
      for (let i = 0, l = child.mixins.length; i < l; i++) {
        parent = mergeOptions(parent, child.mixins[i], vm)
      }
    }
  }
  
  /* 声明一个空对象，用于保存对象合并结果 */
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    /* 合并child有，parent没有的属性，避免重复调用 */
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  /* parent和child中，相同的key，值取child，parent实例不存在的key，取child */
  function mergeField (key) {
    /* 若key有特定的合并选项函数，则使用它，若无，则使用默认合并选项函数 
       el/propsData生产环境，为undefiend，使用默认合并策略，
    */
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  const assets = options[type]
  // check local registration variations first
  if (hasOwn(assets, id)) return assets[id]
  const camelizedId = camelize(id)
  if (hasOwn(assets, camelizedId)) return assets[camelizedId]
  const PascalCaseId = capitalize(camelizedId)
  if (hasOwn(assets, PascalCaseId)) return assets[PascalCaseId]
  // fallback to prototype chain
  const res = assets[id] || assets[camelizedId] || assets[PascalCaseId]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
