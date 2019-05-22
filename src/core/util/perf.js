import { inBrowser } from './env'

export let mark
export let measure
/* 在非生产浏览器环境，且浏览器支持window.performance，才导出mark和measure */
if (process.env.NODE_ENV !== 'production') {
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    /* 封装window.performance.mark、window.performance.measure */
    mark = tag => perf.mark(tag)
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
