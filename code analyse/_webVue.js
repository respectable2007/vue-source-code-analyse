/* Web平台化后Vue属性和方法 */
import { compileToFunctions } from "../src/platforms/web/compiler";

/* Vue的静态属性 */

/* 重写Vue.config,均来自于core/platforms/web/util/index */
Vue.config = {
 //...
 mustUseProp: mustUseProp,
 isReservedTag: isReservedTag,  //core/platforms/web/util/element
 isReservedAttr: isReservedAttr,
 getTagNamespace: getTagNamespace,
 isUnknownElement: isUnknownElement
 //...
}
Vue.util = {
  warn,
  extend,
  mergeOptions,
  defineReactive
}

Vue.set = set
Vue.delete = del
Vue.nextTick = nextTick

Vue.observable

Vue.options = {
  components: {
    KeepAlive,
    Transitions,
    TransitionGroup
  },
  directives: {
    /* Vue内置指令 */
    model,
    show
  },
  filters: Object.create(null),
  _base: Vue
}

/* 安装vue插件 */
Vue.use
Vue.mixin
Vue.cid
Vue.extend

/* 注册全局组件 */
Vue.component
/* 注册全局指令 */
Vue.directive
/* 注册全局过滤器 */
Vue.filter

Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'

Vue.compile = compileToFunctions

/* Vue实例属性，新增__patch__和$mount */
Vue.prototype.__patch__
Vue.prototype.$mount