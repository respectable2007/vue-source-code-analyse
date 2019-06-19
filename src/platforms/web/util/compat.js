/* @flow */

import { inBrowser } from 'core/util/index'

// check whether current browser encodes a char inside attribute values
let div
function getShouldDecode (href: boolean): boolean {
  div = div || document.createElement('div')
  div.innerHTML = href ? `<a href="\n"/>` : `<div a="\n"/>`
  return div.innerHTML.indexOf('&#10;') > 0
}

// #3663: IE encodes newlines inside attribute values while other browsers don't
export const shouldDecodeNewlines = inBrowser ? getShouldDecode(false) : false
// #6828: chrome encodes content in a[href]
export const shouldDecodeNewlinesForHref = inBrowser ? getShouldDecode(true) : false

/* 当在IE的html所有标记或chromea标签的href属性值有换行或tab有换行或tab时，
   在获取innerHTML时会被转换成&#10;和&#9;，
   这会影响Vue模板字符串编译结果。因此，需要做兼容处理。
   shouldDecodeNewlines为true时，表示标记的属性值在模板编译时需要做兼容处理
   shouldDecodeNewlinesForHref为true时，表示a标签的href属性值在模板编译时需要做兼容处理
*/