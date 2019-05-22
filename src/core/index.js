/* 存放核心代码，与平台无关 */
import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

/* 将Vue构造函数作为参数，传入initGlobalAPI方法，该方法来自于global-api/index */
/* 在Vue构造函数上，添加一系列静态属性，即全局API */
initGlobalAPI(Vue)

/* 在Vue构造函数原型上，添加$isServer只读属性，该属性代理了位于core/util/env中的isServerRendering方法 */
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

/* 在Vue构造函数原型上，添加$ssrContext属性 */
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

/* 静态属性 */

/* 在Vue构造函数上，添加FunctionalRenderContext属性 */
// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

/* 在Vue构造函数上，添加version属性，代表当前Vue的版本号 */
Vue.version = '__VERSION__'

export default Vue
