import { useEffect, useState } from 'react'
import type { Project } from './types'
import { fetchProject, tailorPlan } from './api'
import { Inline, parsePlan, phaseLabel, repoName, stepLabel } from './plan'
import type { PlanPhase } from './plan'

const pad = (n: number) => String(n).padStart(2, '0')
const slug = (d: string) => d.toLowerCase()

interface Props {
  id: number
  project: Project | null
  listLoading: boolean
  prev: Project | null
  next: Project | null
  catalogue: Project[]
}

function RailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rail-sec">
      <h3 className="sec-label">{label}</h3>
      {children}
    </section>
  )
}

function PlanPhases({ phases }: { phases: PlanPhase[] }) {
  return (
    <>
      {phases.map((phase, i) => {
        const { numeral, label } = phaseLabel(phase.heading, i)
        return (
          <section className="phase" key={i}>
            <header className="phase-head">
              <span className="phase-numeral" aria-hidden="true">
                {numeral}
              </span>
              <h3 className="phase-title">
                <span className="phase-kicker">Phase {i + 1}</span>
                {label || `Phase ${i + 1}`}
              </h3>
            </header>
            <ol className="steps">
              {phase.steps.map((step, j) => {
                const lead = step.lead ? stepLabel(step.lead) : null
                return (
                  <li className="step" key={j}>
                    {lead && (
                      <p className="step-lead">
                        {lead.n && <span className="step-n">Step {lead.n}</span>}
                        <Inline text={lead.text} />
                      </p>
                    )}
                    {step.body && (
                      <p className="step-body">
                        <Inline text={step.body} />
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </>
  )
}

function shared(left: string[], right: string[]) {
  return left.filter((item) => right.includes(item))
}

function ComparisonDesk({
  current,
  catalogue,
  initial,
}: {
  current: Project
  catalogue: Project[]
  initial: Project | null
}) {
  const alternatives = catalogue.filter((candidate) => candidate.id !== current.id)
  const [comparisonId, setComparisonId] = useState(initial?.id ?? alternatives[0]?.id ?? 0)
  const comparison = alternatives.find((candidate) => candidate.id === comparisonId) ?? alternatives[0]
  if (!comparison) return null

  const sharedTags = shared(current.tags, comparison.tags)
  const sharedStack = shared(current.tech_stack, comparison.tech_stack)
  const currentPhases = parsePlan(current.build_plan).length
  const comparisonPhases = parsePlan(comparison.build_plan).length

  return (
    <section className="comparison-desk" aria-labelledby="comparison-title">
      <div className="comparison-head">
        <div>
          <span className="comparison-kicker">Decision plate</span>
          <h2 id="comparison-title">Compare specimens</h2>
        </div>
        <label className="comparison-picker">
          <span>Set beside № {pad(current.id)}</span>
          <select
            value={comparison.id}
            onChange={(event) => setComparisonId(Number(event.target.value))}
            aria-label="Comparison specimen"
          >
            {alternatives.map((candidate) => (
              <option value={candidate.id} key={candidate.id}>
                № {pad(candidate.id)} — {candidate.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="comparison-grid">
        {[current, comparison].map((candidate) => (
          <article className="comparison-column" key={candidate.id}>
            <span className="comparison-no">№ {pad(candidate.id)}</span>
            <h3>{candidate.title}</h3>
            <span className="stamp" data-diff={slug(candidate.difficulty)}>{candidate.difficulty}</span>
            <dl>
              <div><dt>Build plan</dt><dd>{candidate.id === current.id ? currentPhases : comparisonPhases} phases</dd></div>
              <div><dt>Stack</dt><dd>{candidate.tech_stack.slice(0, 5).join(' · ')}</dd></div>
              <div><dt>Architecture</dt><dd>{candidate.architectures_used.slice(0, 3).join(' · ')}</dd></div>
              <div><dt>Career signal</dt><dd>{candidate.resume_gap_filled}</dd></div>
            </dl>
          </article>
        ))}
      </div>

      <div className="comparison-overlap">
        <span>Shared ground</span>
        <strong>{sharedTags.length} taxonomies · {sharedStack.length} stack choices</strong>
        <p>
          {sharedTags.length ? sharedTags.join(' · ') : 'Distinct problem domains'}
          {sharedStack.length ? ` / ${sharedStack.join(' · ')}` : ''}
        </p>
        <a href={`#/p/${comparison.id}`}>Open specimen № {pad(comparison.id)} →</a>
      </div>
    </section>
  )
}

/** Ask the archivist to redraft the plan for the visitor's constraint. */
function TailorPlan({ projectId }: { projectId: number }) {
  const [constraint, setConstraint] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [result, setResult] = useState<PlanPhase[] | null>(null)

  useEffect(() => {
    setConstraint('')
    setBusy(false)
    setFailed(false)
    setResult(null)
  }, [projectId])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!constraint.trim() || busy) return
    setBusy(true)
    setFailed(false)
    const plan = await tailorPlan(projectId, constraint.trim())
    setBusy(false)
    if (plan) setResult(parsePlan(plan))
    else setFailed(true)
  }

  return (
    <section className="tailor">
      <h2 className="sec-label plan-label">Tailor this plan</h2>
      <form onSubmit={submit} className="tailor-form">
        <label htmlFor="tailor-input" className="tailor-hint">
          Tell the archivist your constraint — it redrafts the plan with Gemini.
        </label>
        <div className="tailor-row">
          <input
            id="tailor-input"
            type="text"
            value={constraint}
            onChange={(e) => setConstraint(e.target.value)}
            placeholder='e.g. "I only know Python" or "one weekend, no cloud"'
            maxLength={300}
            disabled={busy}
          />
          <button type="submit" className="tailor-btn" disabled={busy || !constraint.trim()}>
            {busy ? 'Drafting…' : 'Redraft →'}
          </button>
        </div>
      </form>
      {busy && <p className="consulting">The archivist is drafting…</p>}
      {failed && !busy && (
        <p className="tailor-note">The archivist is unavailable right now — try again shortly.</p>
      )}
      {result && !busy && <PlanPhases phases={result} />}
    </section>
  )
}

export function Detail({ id, project, listLoading, prev, next, catalogue }: Props) {
  const [fetched, setFetched] = useState<Project | null>(null)
  const [missing, setMissing] = useState(false)

  // Deep-link fallback: if the current list doesn't contain the id, fetch it.
  useEffect(() => {
    setFetched(null)
    setMissing(false)
  }, [id])

  useEffect(() => {
    if (project || listLoading || fetched?.id === id) return
    let live = true
    fetchProject(id)
      .then((p) => {
        if (!live) return
        if (p && typeof p.id === 'number') setFetched(p)
        else setMissing(true)
      })
      .catch(() => live && setMissing(true))
    return () => {
      live = false
    }
  }, [id, project, listLoading, fetched])

  const p = project ?? fetched

  if (!p) {
    return (
      <main className="dossier">
        <div className="dossier-bar">
          <a className="crumb" href="#/">
            ← Index
          </a>
        </div>
        {missing ? (
          <div className="notice">
            <p className="notice-big">No specimen filed under № {pad(id)}.</p>
            <a className="clear" href="#/">
              Return to the index →
            </a>
          </div>
        ) : (
          <p className="consulting">Retrieving specimen…</p>
        )}
      </main>
    )
  }

  const phases = parsePlan(p.build_plan)
  const d = slug(p.difficulty)
  const related = catalogue
    .filter((candidate) => candidate.id !== p.id)
    .map((candidate) => ({
      project: candidate,
      shared: candidate.tags.filter((tag) => p.tags.includes(tag)).length,
      sameGrade: candidate.difficulty === p.difficulty ? 1 : 0,
      distance: Math.abs(candidate.id - p.id),
    }))
    .sort((left, right) =>
      right.shared - left.shared ||
      right.sameGrade - left.sameGrade ||
      left.distance - right.distance ||
      left.project.id - right.project.id
    )
    .slice(0, 3)

  return (
    <main className="dossier" data-diff={d}>
      <div className="dossier-bar">
        <a className="crumb" href="#/">
          ← Index
        </a>
        <span className="topbar-rule" aria-hidden="true" />
        <span className="dossier-no">Specimen № {pad(p.id)}</span>
      </div>

      <header className="dossier-head">
        <div className="dossier-marks">
          <span className="stamp big" data-diff={d}>
            {p.difficulty}
          </span>
          <span className="dossier-tags">{p.tags.join(' · ')}</span>
        </div>
        <h1 className="dossier-title">{p.title}</h1>
        <p className="dossier-sub">{p.subtitle}</p>
      </header>

      <blockquote className="problem">
        <span className="sec-label">The problem</span>
        <p>{p.problem_statement}</p>
      </blockquote>

      <p className="dossier-desc">{p.description}</p>

      <div className="dossier-grid">
        <div className="dossier-main">
          <h2 className="sec-label plan-label">Build plan</h2>
          <PlanPhases phases={phases} />

          <TailorPlan projectId={p.id} />

          <div className="twin-lists">
            <section>
              <h2 className="sec-label">Key features</h2>
              <ul className="flat-list">
                {p.key_features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
            <section>
              <h2 className="sec-label">You will learn</h2>
              <ul className="flat-list">
                {p.learning_outcomes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </section>
          </div>
        </div>

        <aside className="dossier-rail">
          <RailSection label="Tech stack">
            <ul className="chip-list">
              {p.tech_stack.map((t) => (
                <li className="chip static" key={t}>
                  {t}
                </li>
              ))}
            </ul>
          </RailSection>
          <RailSection label="Architectures">
            <ul className="rail-list">
              {p.architectures_used.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </RailSection>
          <RailSection label="Libraries">
            <ul className="rail-list">
              {p.libraries_used.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </RailSection>
          <RailSection label="UI components">
            <ul className="rail-list">
              {p.ui_components.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </RailSection>
          {p.repo_inspiration.length > 0 && (
            <RailSection label="Inspiration">
              <ul className="rail-list">
                {p.repo_inspiration.map((r) => (
                  <li key={r}>
                    <a className="repo-link" href={r} target="_blank" rel="noreferrer">
                      {repoName(r)} ↗
                    </a>
                  </li>
                ))}
              </ul>
            </RailSection>
          )}
          <RailSection label="Résumé gap filled">
            <p className="rail-note">{p.resume_gap_filled}</p>
          </RailSection>
        </aside>
      </div>

      <ComparisonDesk
        key={p.id}
        current={p}
        catalogue={catalogue}
        initial={related[0]?.project ?? null}
      />

      {related.length > 0 && (
        <section className="related-specimens" aria-labelledby="related-specimens-title">
          <h2 className="sec-label" id="related-specimens-title">Related specimens</h2>
          <div className="related-grid">
            {related.map(({ project: candidate, shared }) => (
              <a className="related-card" href={`#/p/${candidate.id}`} key={candidate.id}>
                <span className="related-no">№ {pad(candidate.id)}</span>
                <strong>{candidate.title}</strong>
                <span className="stamp" data-diff={slug(candidate.difficulty)}>{candidate.difficulty}</span>
                <span className="related-tags">{candidate.tags.join(' · ')}</span>
                <span className="related-reason">
                  {shared > 0 ? `${shared} shared ${shared === 1 ? 'taxonomy' : 'taxonomies'}` : 'adjacent in the catalogue'}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}

      <nav className="dossier-nav" aria-label="Adjacent specimens">
        {prev ? (
          <a className="adj" href={`#/p/${prev.id}`}>
            <span className="adj-dir">← № {pad(prev.id)}</span>
            <span className="adj-title">{prev.title}</span>
          </a>
        ) : (
          <span />
        )}
        {next ? (
          <a className="adj adj-next" href={`#/p/${next.id}`}>
            <span className="adj-dir">№ {pad(next.id)} →</span>
            <span className="adj-title">{next.title}</span>
          </a>
        ) : (
          <span />
        )}
      </nav>
    </main>
  )
}
