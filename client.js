window.__ModuleLoader__.load({
  id: 'dsh-compaction-counter',

  factory(require) {
    const React = require('react')

    const SLOT = 'conversation.composer.dock'

    /**
     * The dock is a centered flex row. The shipped activity pill (order 0) and
     * usage pill (order 1) occupy the platform's own list order, and the
     * platform renders the standard context ring after the whole slot, so a
     * slot entry alone always lands LEFT of the ring.
     *
     * The slot order therefore cannot place this reading on the ring's right,
     * which is where it belongs. CSS `order` on the flex items does: the ring
     * carries no `order` (the default 0), so this entry's `order: 1` moves it
     * past the ring while the pills keep theirs. Visual order then differs
     * from DOM order, which is the intended trade for a non-interactive
     * reading.
     */
    const ORDER = 2
    const CSS_ORDER = 1

    const COPY = {
      en: {
        text: count => `Compacted ${count}×`,
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
        STRINGS.text(count)
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
            CompactionCountBadge
          )
        )
      },
    }
  },
})
