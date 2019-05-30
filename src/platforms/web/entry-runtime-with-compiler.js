/* 独立构建版本的入口，它在entry-runtime的基础上
   添加了模板（template）到render函数的编译器
*/
/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf'

/* 运行时入口文件 */
import Vue from './runtime/index'
import { query } from './util/index'
/* 编译器 */
import { compileToFunctions } from './compiler/index'
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

/* 类似于柯里化，实现缓存功能，调用idToTemplate，返回具有指定id属性值DOM元素的innerHTML */
const idToTemplate = cached(id => {
  const el = query(id)
  /* &&短路 */
  return el && el.innerHTML
})

/* 缓存Vue.$mount实例方法 */
const mount = Vue.prototype.$mount

/* 重写Vue.$mount方法,是为了给$mount函数添加编译模板的能力
   其核心是模板编译成渲染函数，将渲染函数挂载在vm.options上，
   调用mountComponent方法，挂载组件
*/
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  /* 挂载点不能是body、html元素，否则在非生产环境下，发出警告 */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  /* 解析模板，转为渲染函数 */
  /* 若无自定义render函数，使用template、el构建渲染函数 */
  if (!options.render) {
    let template = options.template
    /* 获取合适的内容作为template选项 */
    if (template) {
      /* template存在，只能是必须以‘#’为开头的字符串或DOM元素，
         否则在非生产环境下，发出警告
      */
      if (typeof template === 'string') {
        /* template为字符串，必须以‘#’为开头 */
        if (template.charAt(0) === '#') {
          /* 认为是某个DOM元素的id，根据id，
             获取这个DOM元素所有子节点的HTML标记，
             作为template选项
          */
          template = idToTemplate(template)
          /* istanbul ignore if */
          /* template为空，则在非生产环境，发出警告 */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        /* 取节点的子节点HTML标记，作为template */
        template = template.innerHTML
      } else {
        /* template不是字符串和dom元素，则在非生产环境下，发出警告 */
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    if (template) {
      /* istanbul ignore if */
      /* 非生产环境，计算性能 */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      /* 根据模板template，编译为渲染函数render */
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  /* 调用缓存的$mount函数 */
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
/* 获取el的HTML标记 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

/* Vue添加compile全局API，compileToFunctions来自于compiler/index */
Vue.compile = compileToFunctions

export default Vue
