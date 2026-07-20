import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Project } from './types'
import { fetchDifficulties, fetchProjects, fetchTags } from './api'
import { Detail } from './Detail'

const pad = (n: number) => String(n).padStart(2, '0')

export const diffSlug = (d: string) => d.toLowerCase()

function parseHash(): number | null {
  const m = window.location.hash.match(/^#\/p\/(\d+)/)
  return m ? parseInt(m[1], 10) : null
}

export default function App() {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [diffs, setDiffs] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [allDiffs, setAllDiffs] = useState<string[]>([])
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [catalogue, setCatalogue] = useState<Project[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [taxOpen, setTaxOpen] = useState(false)
  const [route, setRoute] = useState<number | null>(() => parseHash())
  const [retry, setRetry] = useState(0)

  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const scrollMemo = useRef(0)
  const seq = useRef(0)
  const firstLoad = useRef(true)

  /* ------------------------------- routing ------------------------------ */
  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (route !== null) {
      window.scrollTo(0, 0)
    } else {
      requestAnimationFrame(() => window.scrollTo(0, scrollMemo.current))
    }
  }, [route])

  /* ------------------------------ vocabulary ---------------------------- */
  useEffect(() => {
    fetchTags().then(setAllTags).catch(() => {})
    fetchDifficulties().then(setAllDiffs).catch(() => {})
  }, [])

  /* -------------------------------- search ------------------------------ */
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query), 220)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    const id = ++seq.current
    setLoading(true)
    fetchProjects({
      query: debounced || undefined,
      tags: tags.length ? tags.join(',') : undefined,
      difficulty: diffs.length ? diffs.join(',') : undefined,
    })
      .then((data) => {
        if (seq.current !== id) return
        setProjects(data)
        if (!debounced && !tags.length && !diffs.length) setCatalogue(data)
        setError(false)
        setLoading(false)
        if (firstLoad.current && !debounced && !tags.length && !diffs.length) {
          setTotal(data.length)
          firstLoad.current = false
        }
      })
      .catch(() => {
        if (seq.current !== id) return
        setError(true)
        setLoading(false)
      })
  }, [debounced, tags, diffs, retry])

  /* ------------------------------ keyboard ------------------------------ */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement
      const typing =
        el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
      if (e.key === '/' && route === null && !typing) {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape' && route !== null) {
        window.location.hash = '#/'
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [route])

  const onListKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const rows = Array.from(
      listRef.current?.querySelectorAll<HTMLAnchorElement>('a.row') ?? [],
    )
    if (!rows.length) return
    const i = rows.indexOf(document.activeElement as HTMLAnchorElement)
    e.preventDefault()
    const next =
      e.key === 'ArrowDown' ? Math.min(i + 1, rows.length - 1) : Math.max(i - 1, 0)
    rows[i === -1 ? 0 : next]?.focus()
  }, [])

  /* ------------------------------- filters ------------------------------ */
  const toggleDiff = (d: string) =>
    setDiffs((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]))
  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]))
  const hasFilters = query !== '' || diffs.length > 0 || tags.length > 0
  const clearAll = () => {
    setQuery('')
    setDiffs([])
    setTags([])
  }

  const filterKey = useMemo(
    () => `${debounced}|${diffs.join()}|${tags.join()}`,
    [debounced, diffs, tags],
  )

  const detail = route !== null ? (projects?.find((p) => p.id === route) ?? null) : null
  const detailIdx = detail && projects ? projects.indexOf(detail) : -1

  const rememberScroll = () => {
    scrollMemo.current = window.scrollY
  }

  const drawSpecimen = () => {
    if (!projects?.length) return
    const project = projects[Math.floor(Math.random() * projects.length)]
    rememberScroll()
    window.location.hash = `#/p/${project.id}`
  }

  /* -------------------------------- render ------------------------------ */
  return (
    <div className="press">
      <header className="topbar">
        <a className="topbar-link" href="https://tejas-live-demos.vercel.app">
          ← Back to demos
        </a>
        <span className="topbar-rule" aria-hidden="true" />
        <span className="topbar-ed">Field catalogue · MMXXVI</span>
      </header>

      {route !== null ? (
        <Detail
          id={route}
          project={detail}
          listLoading={loading}
          prev={detailIdx > 0 && projects ? projects[detailIdx - 1] : null}
          next={
            detailIdx !== -1 && projects && detailIdx < projects.length - 1
              ? projects[detailIdx + 1]
              : null
          }
          catalogue={catalogue.length ? catalogue : projects ?? []}
        />
      ) : (
        <main>
          <section className="masthead">
            <h1 className="brand">
              Neuron
              <svg className="brand-glyph" viewBox="0 0 32 32" aria-hidden="true">
                <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <line x1="16" y1="16" x2="16" y2="4" />
                  <line x1="16" y1="16" x2="26.4" y2="10" />
                  <line x1="16" y1="16" x2="26.4" y2="22" />
                  <line x1="16" y1="16" x2="16" y2="28" />
                  <line x1="16" y1="16" x2="5.6" y2="22" />
                  <line x1="16" y1="16" x2="5.6" y2="10" />
                </g>
                <circle cx="16" cy="16" r="5" fill="currentColor" stroke="none" />
              </svg>
            </h1>
            <p className="tagline">
              A catalogue of <em>{total ?? 24} computer-science projects</em> worth
              building — each specimen filed with its stack, taxonomy&nbsp;and a
              complete build&nbsp;plan.
            </p>

            <div className="searchbox">
              <label className="visually-hidden" htmlFor="q">
                Search the catalogue
              </label>
              <input
                id="q"
                ref={searchRef}
                type="search"
                autoComplete="off"
                spellCheck={false}
                placeholder="Search the catalogue…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="search-count" aria-live="polite">
                {loading
                  ? '· · ·'
                  : `${pad(projects?.length ?? 0)} / ${pad(total ?? 24)}`}
              </span>
            </div>
            <button
              type="button"
              className="draw-specimen"
              onClick={drawSpecimen}
              disabled={!projects?.length || loading}
            >
              <span aria-hidden="true">✦</span> Draw a specimen from the archive
            </button>
          </section>

          <section className="filters" aria-label="Filters">
            <div className="filter-row">
              <span className="filter-label">Grade</span>
              {allDiffs.map((d) => (
                <button
                  key={d}
                  type="button"
                  className="pill"
                  data-diff={diffSlug(d)}
                  aria-pressed={diffs.includes(d)}
                  onClick={() => toggleDiff(d)}
                >
                  <i className="dot" aria-hidden="true" />
                  {d}
                </button>
              ))}
              <button
                type="button"
                className="pill pill-tax"
                aria-expanded={taxOpen}
                onClick={() => setTaxOpen((o) => !o)}
              >
                Taxonomy{tags.length > 0 && <b>&nbsp;{tags.length}</b>}
                <span className="tax-caret" aria-hidden="true">
                  {taxOpen ? '−' : '+'}
                </span>
              </button>
              {hasFilters && (
                <button type="button" className="clear" onClick={clearAll}>
                  Clear all ×
                </button>
              )}
            </div>
            {taxOpen && (
              <div className="tax-cloud">
                {allTags.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="chip"
                    aria-pressed={tags.includes(t)}
                    onClick={() => toggleTag(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </section>

          <div className="ledger" ref={listRef} onKeyDown={onListKeyDown}>
            {error ? (
              <div className="notice">
                <p className="notice-big">The archive is unreachable.</p>
                <button
                  type="button"
                  className="clear"
                  onClick={() => setRetry((r) => r + 1)}
                >
                  Try again →
                </button>
              </div>
            ) : projects === null ? (
              <p className="consulting">Consulting the archive…</p>
            ) : projects.length === 0 ? (
              <div className="notice">
                <p className="notice-big">Nothing filed under that heading.</p>
                <button type="button" className="clear" onClick={clearAll}>
                  Clear the filters →
                </button>
              </div>
            ) : (
              <ol className="rows" key={filterKey} data-loading={loading || undefined}>
                {projects.map((p, i) => (
                  <li key={p.id} style={{ '--i': i } as React.CSSProperties}>
                    <a
                      className="row"
                      href={`#/p/${p.id}`}
                      data-diff={diffSlug(p.difficulty)}
                      onClick={rememberScroll}
                    >
                      <span className="row-no">№ {pad(p.id)}</span>
                      <span className="row-main">
                        <span className="row-title">{p.title}</span>
                        <span className="row-sub">{p.subtitle}</span>
                      </span>
                      <span className="row-meta">
                        <span className="stamp" data-diff={diffSlug(p.difficulty)}>
                          {p.difficulty}
                        </span>
                        <span className="row-tags">{p.tags.slice(0, 2).join(' · ')}</span>
                        <span className="row-arrow" aria-hidden="true">
                          →
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="keys" aria-hidden="true">
            <kbd>/</kbd> search&ensp;·&ensp;<kbd>↑</kbd>
            <kbd>↓</kbd> browse&ensp;·&ensp;<kbd>⏎</kbd> open&ensp;·&ensp;
            <kbd>esc</kbd> back
          </p>
        </main>
      )}

      <footer className="colophon">
        <span>Neuron — set in Instrument Serif, Archivo &amp; Space Mono</span>
        <span className="topbar-rule" aria-hidden="true" />
        <a href="https://tejas-live-demos.vercel.app">← Back to demos</a>
      </footer>
    </div>
  )
}
