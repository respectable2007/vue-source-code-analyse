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
    KeepAlive
  },
  directives: Object.create(null),
  filters: Object.create(null),
  _base: Vue
}

/* 安装vue插件 */
Vue.use
Vue.mixin
Vue.cid
Vue.extend

/* 注册组件 */
Vue.component
/* 注册指令 */
Vue.directive
/* 注册过滤器 */
Vue.filter

Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

Vue.version = '__VERSION__'
