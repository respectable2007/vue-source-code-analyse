/* Vue的静态属性 */

Vue.config
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
    keepAlive
  },
  directives,
  filters,
  _base: Vue
}

/* 安装vue插件 */
Vue.use
Vue.mixin
Vue.cid

/* 注册组件 */
Vue.component
/* 注册指令 */
Vue.directive
/* 注册过滤器 */
Vue.filter

Vue.FunctionalRenderContext = FunctionalRenderContext

Vue.version = '__VERSION__'

Vue.prototype.$isServer
Vue.prototype.$ssrContext

