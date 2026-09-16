'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Plus, Trash2 } from 'lucide-react'

import { updateProjectSections } from '@/app/actions/content'
import { useRouter } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FormMessage } from '@/components/ui/form-controls'
import { LocalizedListField, LocalizedTextField, LocalizedTextareaField, emptyLocalized } from '@/components/admin/content/localized-fields'
import type { DecisionRecord, Project } from '@/types/content'
import type { ProjectSectionsInput } from '@/types/cms'

function toInput(project: Project): ProjectSectionsInput {
  return {
    context: project.context ?? null,
    problemAndGoals: project.problemAndGoals ?? null,
    constraints: project.constraints ?? [],
    architecture: project.architecture ?? null,
    keyDecisions: project.keyDecisions ?? [],
    engineeringHighlight: project.engineeringHighlight ?? null,
    dataIntegrityAndSecurity: project.dataIntegrityAndSecurity ?? null,
    responsiveAndRtl: project.responsiveAndRtl ?? null,
    quality: project.quality ?? null,
    currentStatusAndNext: project.currentStatusAndNext ?? null,
    lessonsLearned: project.lessonsLearned ?? null,
  }
}

function emptyDecision(): DecisionRecord {
  return { context: emptyLocalized(), decision: emptyLocalized(), tradeoff: emptyLocalized() }
}

/**
 * § 6.1's case-study body — every field optional, "empty means hidden"
 * (same rule the public `CaseStudy` template follows). One project has
 * one case study, so — unlike packages/add-ons/FAQs — this is a single
 * form submitted whole, not a set of independently-saved rows.
 */
export function ProjectSectionsForm({ projectId, project }: { projectId: string; project: Project }) {
  const t = useTranslations('Admin')
  const router = useRouter()
  const [form, setForm] = useState<ProjectSectionsInput>(() => toInput(project))
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)

  function setField<K extends keyof ProjectSectionsInput>(key: K, value: ProjectSectionsInput[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function updateDecision(index: number, next: DecisionRecord) {
    setField('keyDecisions', form.keyDecisions.map((d, i) => (i === index ? next : d)))
  }
  function removeDecision(index: number) {
    setField('keyDecisions', form.keyDecisions.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(false)
    const result = await updateProjectSections(projectId, form)
    if (!result.ok) {
      setError(true)
      setPending(false)
      return
    }
    setPending(false)
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <LocalizedTextareaField id="section-context" label={t('cmsFieldContext')} value={form.context ?? emptyLocalized()} onChange={(v) => setField('context', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-problem" label={t('cmsFieldProblemAndGoals')} value={form.problemAndGoals ?? emptyLocalized()} onChange={(v) => setField('problemAndGoals', v)} disabled={pending} rows={2} />
          <LocalizedListField id="section-constraints" label={t('cmsFieldConstraints')} items={form.constraints} onChange={(v) => setField('constraints', v)} disabled={pending} addLabel={t('cmsAddItem')} />
          <LocalizedTextareaField id="section-architecture" label={t('cmsFieldArchitecture')} value={form.architecture ?? emptyLocalized()} onChange={(v) => setField('architecture', v)} disabled={pending} rows={3} />
          <LocalizedTextareaField id="section-engineering-highlight" label={t('cmsFieldEngineeringHighlight')} value={form.engineeringHighlight ?? emptyLocalized()} onChange={(v) => setField('engineeringHighlight', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-data-integrity" label={t('cmsFieldDataIntegrityAndSecurity')} value={form.dataIntegrityAndSecurity ?? emptyLocalized()} onChange={(v) => setField('dataIntegrityAndSecurity', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-responsive-rtl" label={t('cmsFieldResponsiveAndRtl')} value={form.responsiveAndRtl ?? emptyLocalized()} onChange={(v) => setField('responsiveAndRtl', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-quality" label={t('cmsFieldQuality')} value={form.quality ?? emptyLocalized()} onChange={(v) => setField('quality', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-current-status" label={t('cmsFieldCurrentStatusAndNext')} value={form.currentStatusAndNext ?? emptyLocalized()} onChange={(v) => setField('currentStatusAndNext', v)} disabled={pending} rows={2} />
          <LocalizedTextareaField id="section-lessons-learned" label={t('cmsFieldLessonsLearned')} value={form.lessonsLearned ?? emptyLocalized()} onChange={(v) => setField('lessonsLearned', v)} disabled={pending} rows={2} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <p className="text-sm font-medium text-foreground">{t('cmsFieldKeyDecisions')}</p>
          {form.keyDecisions.map((decision, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <LocalizedTextField id={`decision-${index}-context`} label={t('cmsFieldDecisionContext')} value={decision.context} disabled={pending} onChange={(context) => updateDecision(index, { ...decision, context })} />
              <LocalizedTextField id={`decision-${index}-decision`} label={t('cmsFieldDecisionDecision')} value={decision.decision} disabled={pending} onChange={(d) => updateDecision(index, { ...decision, decision: d })} />
              <LocalizedTextField id={`decision-${index}-tradeoff`} label={t('cmsFieldDecisionTradeoff')} value={decision.tradeoff} disabled={pending} onChange={(tradeoff) => updateDecision(index, { ...decision, tradeoff })} />
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => removeDecision(index)} className="self-start text-destructive-text">
                <Trash2 aria-hidden="true" data-icon="inline-start" />
                {t('cmsDelete')}
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => setField('keyDecisions', [...form.keyDecisions, emptyDecision()])} className="self-start">
            <Plus aria-hidden="true" data-icon="inline-start" />
            {t('cmsAddDecision')}
          </Button>
        </CardContent>
      </Card>

      {error ? <FormMessage variant="destructive">{t('errorForbidden')}</FormMessage> : null}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? t('cmsSaving') : t('cmsSaveChanges')}
      </Button>
    </form>
  )
}
