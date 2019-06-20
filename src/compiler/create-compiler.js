/* @flow */

import { extend } from 'shared/util'
import { detectErrors } from './error-detector'
import { createCompileToFunctionFn } from './to-function'

export function createCompilerCreator (baseCompile: Function): Function {
  return function createCompiler (baseOptions: CompilerOptions) {
    function compile (
      template: string,
      options?: CompilerOptions
    ): CompiledResult {
      /* 创建新对象，包含baseOptions属性，为了防止篡改baseOptions对象 */
      const finalOptions = Object.create(baseOptions)
      /* 数组，保存错误信息 */
      const errors = []
      /* 数组，保存提示信息 */
      const tips = []
      
      /* 警告函数，保存检测到的错误，添加到errors数组内 */
      let warn = (msg, range, tip) => {
        (tip ? tips : errors).push(msg)
      }

      if (options) {
        /* 非生产环境 */
        if (process.env.NODE_ENV !== 'production' && options.outputSourceRange) {
          // $flow-disable-line
          /* 模板字符串是否以空白符为开头 */
          const leadingSpaceLength = template.match(/^\s*/)[0].length
          /* 重写warn函数 */
          warn = (msg, range, tip) => {
            const data: WarningMessage = { msg }
            if (range) {
              if (range.start != null) {
                data.start = range.start + leadingSpaceLength
              }
              if (range.end != null) {
                data.end = range.end + leadingSpaceLength
              }
            }
            (tip ? tips : errors).push(data)
          }
        }
        /* 合并模块、指令和其他选项 */
        // merge custom modules
        if (options.modules) {
          finalOptions.modules =
            (baseOptions.modules || []).concat(options.modules)
        }
        // merge custom directives
        if (options.directives) {
          finalOptions.directives = extend(
            Object.create(baseOptions.directives || null),
            options.directives
          )
        }
        // copy other options
        for (const key in options) {
          if (key !== 'modules' && key !== 'directives') {
            finalOptions[key] = options[key]
          }
        }
      }

      /* finalOptions添加warn */
      finalOptions.warn = warn
      
      /* 编译 */
      const compiled = baseCompile(template.trim(), finalOptions)
      /* 非生产环境，检测错误 */
      if (process.env.NODE_ENV !== 'production') {
        detectErrors(compiled.ast, warn)
      }
      /* compiled添加errors、tips */
      compiled.errors = errors
      compiled.tips = tips
      /* 返回compiled */
      return compiled
    }

    return {
      compile,
      compileToFunctions: createCompileToFunctionFn(compile)
    }
  }
}
