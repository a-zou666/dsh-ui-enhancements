import z from '@deepseek-ai/schemastery'

export const name = 'dsh-ui-enhancements'
export const inject = ['llm']

export const Config = z.object({
  disabledProviders: z.array(z.string()).default([]).volatile(),
})

export function isProviderEnabled(disabledProviders, provider) {
  return !disabledProviders.includes(provider)
}

export function apply(ctx, config) {
  ctx.inject(['settings'], child => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber))
  })

  const isEnabled = provider => isProviderEnabled(config.disabledProviders.get(), provider)
  ctx.provide('dshUiEnhancements', { isEnabled })

  // 拦截已暂停提供商的流请求
  ctx.on('llm/stream', (options, next) => {
    if (isEnabled(options.provider)) return next()
    return (async function* () {
      yield {
        type: 'finish',
        reason: {
          kind: 'error',
          failure: {
            code: 'PROVIDER_DISABLED',
            message: `Provider "${options.provider}" is paused in DSH settings.`,
          },
        },
      }
    })()
  }, { global: true, prepend: true })
}
