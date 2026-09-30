window.__ModuleLoader__.load({
  id: '@local/dsh-ui-enhancements',
  factory: (require) => {
    const module = { exports: {} }
    const React = require('react')
    const { createSnapshotStore } = require('@deepseek-ai/dsh-client-store')
    const h = React.createElement
    const CONTROL_NS = 'model-controls'
    const PI_NS = 'llm-pi-ai'
    const copy = {
      en: {
        enabled: 'Enable provider', reasoning: 'Reasoning', inherit: 'Default',
        off: 'Off', standard: 'Low / Medium / High', custom: 'Custom mapping',
        saving: 'Saving...', unavailable: 'Settings unavailable',
        reasoningEffort: 'Thinking mode', low: 'Low', medium: 'Medium', high: 'High',
      },
      zh: {
        enabled: '\u542f\u7528\u4f9b\u5e94\u5546', reasoning: '\u601d\u8003\u7a0b\u5ea6',
        inherit: '\u9ed8\u8ba4', off: '\u5173\u95ed',
        standard: '\u4f4e / \u4e2d / \u9ad8', custom: '\u81ea\u5b9a\u4e49\u6620\u5c04',
        saving: '\u4fdd\u5b58\u4e2d...', unavailable: '\u8bbe\u7f6e\u4e0d\u53ef\u7528',
        reasoningEffort: '\u601d\u8003\u6a21\u5f0f', low: '\u4f4e', medium: '\u4e2d', high: '\u9ad8',
      },
    }
    const rowStyle = { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '6px 0' }
    const labelStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }
    const fieldStyle = { padding: '5px 8px', borderRadius: 4, border: '1px solid var(--dsw-alias-border-l3)', background: 'transparent', color: 'inherit' }

    // 改进的切换开关样式
    const toggleStyle = {
      position: 'relative',
      display: 'inline-block',
      width: 44,
      height: 24,
    }
    const toggleInputStyle = {
      opacity: 0,
      width: 0,
      height: 0,
    }
    const sliderStyle = {
      position: 'absolute',
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--dsw-alias-border-l3)',
      transition: '0.3s',
      borderRadius: 24,
    }
    const sliderBeforeStyle = (checked) => ({
      position: 'absolute',
      content: '""',
      height: 18,
      width: 18,
      left: checked ? 23 : 3,
      bottom: 3,
      backgroundColor: 'white',
      transition: '0.3s',
      borderRadius: '50%',
    })

    function section(view, path) {
      let value = view?.value
      for (const part of path) value = value?.[part]
      return value
    }

    function reasoningMode(value) {
      if (value === undefined) return 'inherit'
      if (value === false) return 'off'
      if (value && value.low === 'low' && value.medium === 'medium' && value.high === 'high'
        && Object.keys(value).length === 3) return 'standard'
      return 'custom'
    }

    // 美化的切换开关组件
    function ToggleSwitch(props) {
      const { checked, disabled, onChange, ariaLabel } = props
      return h('label', { style: toggleStyle },
        h('input', {
          type: 'checkbox',
          checked,
          disabled,
          'aria-label': ariaLabel,
          onChange,
          style: toggleInputStyle,
        }),
        h('span', {
          style: {
            ...sliderStyle,
            backgroundColor: checked ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-border-l3)',
            opacity: disabled ? 0.5 : 1,
          },
        },
          h('span', {
            style: sliderBeforeStyle(checked),
          }),
        ),
      )
    }

    function ModelControls(props) {
      const snapshot = props.useSnapshot(state => state)
      const [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState('')
      const t = props.t
      const provider = props.provider
      if (!props.configured || snapshot.status !== 'ready') return null
      const controls = snapshot.namespaces.find(view => view.ns === CONTROL_NS)
      const owner = snapshot.namespaces.find(view => view.ns === provider.settingsNs)
      if (!controls || !owner) return null
      const disabled = controls.value?.disabledProviders ?? []
      const paused = disabled.includes(provider.provider)
      const models = provider.settingsNs === PI_NS
        ? section(owner, [...provider.settingsPath, 'models']) : undefined
      const write = async (view, ops) => {
        setBusy(true)
        setError('')
        try {
          const answer = await props.remote.settings.mutate(view.ns, ops, view.revision)
          if (!answer.ok) setError(answer.error.message)
          await props.reload()
        } catch (failure) {
          setError(String(failure))
        } finally {
          setBusy(false)
        }
      }
      const toggle = event => {
        const next = event.target.checked
          ? disabled.filter(id => id !== provider.provider)
          : [...new Set([...disabled, provider.provider])]
        void write(controls, [{ op: 'set', path: ['disabledProviders'], value: next }])
      }
      const modelFields = Array.isArray(models) ? models.map((model, index) => {
        if (typeof model?.id !== 'string') return null
        const mode = reasoningMode(model.reasoningEfforts)
        return h('label', { key: `${model.id}:${index}`, style: labelStyle },
          h('span', null, model.name || model.id),
          h('select', {
            style: fieldStyle,
            'aria-label': `${model.name || model.id} ${t('reasoning')}`,
            value: mode,
            disabled: busy || !snapshot.writable,
            onChange: event => {
              const choice = event.target.value
              const path = [...provider.settingsPath, 'models', String(index), 'reasoningEfforts']
              const op = choice === 'inherit'
                ? { op: 'unset', path }
                : { op: 'set', path, value: choice === 'off' ? false : {
                  low: 'low', medium: 'medium', high: 'high',
                } }
              void write(owner, [op])
            },
          },
          h('option', { value: 'inherit' }, t('inherit')),
          h('option', { value: 'off' }, t('off')),
          h('option', { value: 'standard' }, t('standard')),
          mode === 'custom' ? h('option', { value: 'custom', disabled: true }, t('custom')) : null,
          ),
        )
      }) : []
      return h('div', { style: { padding: '0 0 8px' } },
        h('div', { style: rowStyle },
          h('label', { style: { ...labelStyle, gap: 10 } },
            h(ToggleSwitch, {
              checked: !paused,
              disabled: busy || !snapshot.writable,
              ariaLabel: `${t('enabled')}: ${provider.displayName}`,
              onChange: toggle,
            }),
            h('span', null, t('enabled')),
          ),
          busy ? h('span', { role: 'status', style: { fontSize: 13, color: 'var(--dsw-alias-text-secondary)' } }, t('saving')) : null,
        ),
        modelFields.length > 0 ? h('div', { style: rowStyle },
          h('span', { style: { fontSize: 13 } }, t('reasoning')),
          ...modelFields,
        ) : null,
        error ? h('p', { role: 'alert', style: { color: 'var(--dsw-alias-state-error-primary)', margin: '4px 0' } }, error) : null,
      )
    }

    // 对话页面的思考模式选择器
    function ReasoningSelector(props) {
      const { currentModel, onReasoningChange, t } = props
      const [reasoning, setReasoning] = React.useState('medium')

      React.useEffect(() => {
        if (currentModel?.reasoningEffort) {
          setReasoning(currentModel.reasoningEffort)
        }
      }, [currentModel])

      const handleChange = (event) => {
        const value = event.target.value
        setReasoning(value)
        if (onReasoningChange) {
          onReasoningChange(value)
        }
      }

      if (!currentModel) return null

      return h('div', { style: { padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 } },
        h('label', { style: { fontSize: 13, color: 'var(--dsw-alias-text-secondary)' } },
          t('reasoningEffort'),
        ),
        h('select', {
          style: {
            ...fieldStyle,
            fontSize: 13,
            minWidth: 100,
          },
          value: reasoning,
          onChange: handleChange,
        },
          h('option', { value: 'low' }, t('low')),
          h('option', { value: 'medium' }, t('medium')),
          h('option', { value: 'high' }, t('high')),
        ),
      )
    }

    const inject = ['slots', 'locale', 'remote', 'remote.settings']
    function apply(ctx) {
      const store = createSnapshotStore({ status: 'loading', namespaces: [], writable: false })
      const reload = async () => {
        const response = await ctx.remote.settings.describe()
        if (response.ok) store.set({ status: 'ready', namespaces: response.value.namespaces, writable: response.value.writable })
        else store.set({ status: 'error', namespaces: [], writable: false })
      }
      ctx.effect(() => ctx.locale.register('reagent.modelControls', copy), 'model-controls: locale')
      ctx.effect(() => {
        const disposeSettings = ctx.remote.$on('settings/document-updated', () => { void reload() })
        const disposeConnection = ctx.on('connection/reset', () => { void reload() })
        void reload()
        return () => { disposeSettings(); disposeConnection() }
      }, 'model-controls: settings updates')
      const injected = () => ({
        hooks: { snapshot: store },
        remote: ctx.remote,
        reload,
        t: ctx.locale.bind('reagent.modelControls'),
      })

      // 注入到模型设置页面的提供商卡片
      // 支持所有提供商：llm-pi-ai (自定义提供商), llm-deepseek (官方)
      for (const key of ['llm-pi-ai', 'llm-deepseek']) {
        ctx.slots.inject('settings.models.provider-card', () => ctx.slots.register({
          name: 'settings.models.provider-card', key, inject: injected,
        }, ModelControls))
      }

      // 注入到对话页面的模型选择器下方
      ctx.slots.inject('conversation.model-selector.after', () => ctx.slots.register({
        name: 'conversation.model-selector.after',
        key: 'reasoning-selector',
        inject: () => ({
          t: ctx.locale.bind('reagent.modelControls'),
        }),
      }, ReasoningSelector))
    }
    module.exports = { inject, apply }
    return module.exports
  },
})
