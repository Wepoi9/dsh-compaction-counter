window.__ModuleLoader__.load({
  id: 'dsh-compaction-counter',

  factory(require) {
    const React = require('react')

    const SLOT = 'conversation.composer.dock'

    /**
     * The dock is a centered flex row: the shipped activity and usage pills
     * (list order 0 and 1) render before the standard context ring, so this
     * entry's list order alone lands it to the ring's left. The entry also
     * sets CSS `order: 1` on its element: the ring carries the default order
     * 0, so the reading moves past the ring while the pills keep theirs.
     * Visual order then differs from DOM order — the accepted trade for a
     * non-interactive reading.
     */
    const ORDER = 2
    const CSS_ORDER = 1

    const COPY = {
      en: {
        text: count => `Compactions: ${count}`,
        title: count =>
          `This session completed ${count} context compaction${count === 1 ? '' : 's'}.`,
      },
      zh: {
        text: count => `压缩 ${count} 次`,
        title: count => `本会话已完成 ${count} 次上下文压缩。`,
      },
    }

    /**
     * Pick the copy language from the browser's ordered language tags. A `zh`
     * primary subtag selects Chinese; anything else selects English. Evaluated
     * once at load; the plugin does not consult the DSH Language setting.
     */
    function pickCopy() {
      const tags = [...(globalThis.navigator?.languages ?? []), globalThis.navigator?.language]
      for (const tag of tags) {
        if (typeof tag !== 'string') continue
        const primary = tag.toLowerCase().split('-')[0]
        if (!primary) continue
        return primary === 'zh' ? COPY.zh : COPY.en
      }
      return COPY.en
    }

    const STRINGS = pickCopy()

    /**
     * The compaction-count reading. The host publishes the count as the
     * `compactionCount` projection; an absent value means the unit is not
     * mounted in this composition, and the entry then renders nothing.
     */
    function CompactionCountBadge({ useProjection }) {
      const count = useProjection('compactionCount', value =>
        value === undefined ? undefined : value.count)
      if (count === undefined) return null
      return React.createElement(
        'span',
        {
          'data-compaction-count': count,
          title: STRINGS.title(count),
          style: {
            order: CSS_ORDER,
            display: 'inline-flex',
            alignItems: 'center',
            whiteSpace: 'nowrap',
            color: 'var(--dsw-alias-label-tertiary)',
            fontSize: 'var(--dsh-content-font-size-secondary, 13px)',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 'calc(20px + var(--dsh-content-font-delta-secondary, 0px))',
          },
        },
        STRINGS.text(count),
      )
    }

    return {
      inject: ['slots'],

      apply(ctx) {
        ctx.slots.inject(SLOT, () =>
          ctx.slots.register(
            {
              name: SLOT,
              id: 'compaction-count',
              order: ORDER,
            },
            CompactionCountBadge,
          )
        )
      },
    }
  },
})
