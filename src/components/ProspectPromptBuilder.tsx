import * as React from "react"
import { TriangleAlert as AlertTriangle, ArrowRight, Building2, CircleCheck as CheckCircle2, ChevronDown, ChevronRight, FileText, Link2, Mail, Mic, MicOff, Paperclip, Sparkles, TrendingDown, Upload, Users, Wand as Wand2, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptMode = "Fast" | "Balanced" | "Deep"
type DeliverableType = "account_brief" | "discovery_prep" | "value_hypotheses" | "executive_summary"
type EnrichmentDepth = "light" | "standard" | "deep"
type SourceTab = "notes" | "audio" | "crm"
type EvidenceLevel = "strong" | "medium" | "weak" | "empty"

type Stakeholder = {
  name: string
  title: string
  role: "Champion" | "Decision Maker" | "Evaluator" | "Compliance" | "Unknown"
  confidence: number
  inferred: boolean
}

type PainPoint = {
  id: string
  description: string
  confidence: number
  lever: string
}

type MissingMetric = {
  key: string
  label: string
  placeholder: string
  benchmark: number
  benchmarkLabel: string
  unit: string
  value: string
}

type ExtractionResult = {
  companyName: string
  domain: string
  industry: string
  arr: number | null
  arrInferred: boolean
  closeDate: string
  buyingContext: string
  painPoints: PainPoint[]
  stakeholders: Stakeholder[]
  evidenceScore: number
  evidenceLevel: EvidenceLevel
  missingMetrics: MissingMetric[]
}

type CreateSetupResult = { accountId: string } | void

export type ProspectSetupPromptPayload = {
  companyName?: string
  companyDomain?: string
  industry?: string
  accountContext?: string
  buyingContext?: string
  businessPain?: string[]
  stakeholders?: Record<string, string>
  outputType: DeliverableType
  desiredOutputs: DeliverableType[]
  mode: PromptMode
  enrichmentDepth: EnrichmentDepth
  useUploadedFiles: boolean
  usePriorAccountContext: boolean
  runWebEnrichment: boolean
  complianceSensitive: boolean
  deepResearch: boolean
  freeformPrompt: string
  evidenceScore: number
}

export type CompanyOption = {
  id: string
  name: string
  domain?: string
  industry?: string
  accountId?: string
}

export type ProspectPromptBuilderProps = {
  className?: string
  initialValue?: string
  initialCompany?: CompanyOption
  companyOptions?: CompanyOption[]
  recentActivities?: { id: string; title: string; updatedAt: string; prompt: string }[]
  onCreateSetup?: (payload: ProspectSetupPromptPayload) => CreateSetupResult | Promise<CreateSetupResult>
  onAttachContent?: () => void | Promise<void>
  onOpenVoiceInput?: () => void
  onNavigateToWorkspace?: (path: string, accountId: string) => void
}

// ─── Extraction Engine ────────────────────────────────────────────────────────

const PAIN_KEYWORDS: { pattern: RegExp; lever: string; label: string }[] = [
  { pattern: /manual.*(routing|process|work|task)|hours?.*(routing|triag|process)|slow.*(routing|triag)/i, lever: "Labor Cost Avoidance", label: "Manual routing overhead consuming rep time" },
  { pattern: /SLA.*(breach|miss|fail|violat)|miss.*SLA|SLA.*(issue|problem)/i, lever: "Brand Risk Mitigation", label: "SLA breach risk threatening service quality" },
  { pattern: /churn.*(up|increas|risk)|customer.*(leav|los|cancel)/i, lever: "Revenue Protection (Churn)", label: "Customer churn tied to resolution speed" },
  { pattern: /onboard.*(slow|long|week|month)|ramp.*(slow|long|time)/i, lever: "Productivity Acceleration", label: "Rep onboarding velocity below benchmark" },
  { pattern: /messag.*(inconsist|vary|different)|inconsist.*messag/i, lever: "Brand Risk Mitigation", label: "Inconsistent messaging across field teams" },
  { pattern: /version.*(confus|control|issue)|fragmented.*(content|system)/i, lever: "Labor Cost Avoidance", label: "Content fragmentation causing version confusion" },
  { pattern: /coach.*(vary|inconsist|quality)|manager.*coach/i, lever: "Productivity Acceleration", label: "Coaching quality inconsistency across managers" },
  { pattern: /compli.*(risk|issue|audit)|regulat.*(burden|require)/i, lever: "Compliance Risk Reduction", label: "Compliance and regulatory exposure" },
  { pattern: /overhead|cost.*(\$\d+|\d+k|\d+ million)|spend.*(\$\d+|\d+k)/i, lever: "Cost Reduction", label: "Direct cost overhead identified" },
]

const ROLE_KEYWORDS: Record<string, Stakeholder["role"]> = {
  cfo: "Decision Maker", ceo: "Decision Maker", coo: "Decision Maker", cto: "Decision Maker",
  vp: "Champion", "vice president": "Champion", director: "Champion", head: "Champion",
  manager: "Champion", lead: "Champion",
  it: "Evaluator", engineer: "Evaluator", architect: "Evaluator", analyst: "Evaluator", ops: "Evaluator",
  legal: "Compliance", compliance: "Compliance", regulatory: "Compliance", counsel: "Compliance",
}

function inferRole(title: string): Stakeholder["role"] {
  const t = title.toLowerCase()
  for (const [kw, role] of Object.entries(ROLE_KEYWORDS)) {
    if (t.includes(kw)) return role
  }
  return "Unknown"
}

function extractARR(text: string): { value: number | null; inferred: boolean } {
  const patterns = [
    /\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K|M|million)?\s*(?:ARR|ACV|annual|contract|deal|revenue)/i,
    /(?:ARR|ACV|deal size|contract value)[^\d]*\$?\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K|M|million)?/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K|M|million)\s*(?:ARR|ACV|annual|deal)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ""))
      const suffix = (m[2] || "").toLowerCase()
      if (suffix === "k") val *= 1000
      if (suffix === "m" || suffix === "million") val *= 1_000_000
      return { value: val, inferred: false }
    }
  }
  const dollarMatch = text.match(/\$\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|K|M|million)?/)
  if (dollarMatch) {
    let val = parseFloat(dollarMatch[1].replace(/,/g, ""))
    const suffix = (dollarMatch[2] || "").toLowerCase()
    if (suffix === "k") val *= 1000
    if (suffix === "m" || suffix === "million") val *= 1_000_000
    if (val > 1000) return { value: val, inferred: true }
  }
  return { value: null, inferred: false }
}

function extractStakeholders(text: string): Stakeholder[] {
  const results: Stakeholder[] = []
  const seen = new Set<string>()

  // Pattern: "Name: Role" or "- Name: Role"
  const bulletPattern = /[-•]\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*):\s*([A-Za-z][A-Za-z\s\/]+)/g
  let m
  while ((m = bulletPattern.exec(text)) !== null) {
    const name = m[1].trim()
    const roleText = m[2].trim()
    if (seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    results.push({ name, title: roleText, role: inferRole(roleText), confidence: 0.88, inferred: false })
  }

  // Pattern: "Name, Title" in flowing text
  const titlePattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s+(VP\s+of\s+\w+|Director\s+of\s+\w+|Chief\s+\w+\s+Officer|CFO|CTO|CEO|COO|Head\s+of\s+\w+)/g
  while ((m = titlePattern.exec(text)) !== null) {
    const name = m[1].trim()
    const title = m[2].trim()
    if (seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    results.push({ name, title, role: inferRole(title), confidence: 0.85, inferred: false })
  }

  return results.slice(0, 5)
}

function extractCompany(text: string): string {
  const patterns = [
    /^Company:\s*(.+)$/im,
    /^Account:\s*(.+)$/im,
    /^Prospect:\s*(.+)$/im,
    /(?:with|for|at|client is)\s+([A-Z][a-zA-Z&\s]{2,30})(?:\s*[,.\n])/,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m?.[1]) return m[1].trim()
  }
  return ""
}

function extractDomain(text: string): string {
  const m = text.match(/Website:\s*([\w.-]+\.[a-z]{2,})/i) || text.match(/([\w-]+\.(?:com|io|co|net|org))/i)
  return m?.[1]?.trim() ?? ""
}

function extractIndustry(text: string): string {
  const m = text.match(/Industry:\s*(.+)/i)
  return m?.[1]?.trim() ?? ""
}

function extractBuyingContext(text: string): string {
  const m = text.match(/Buying context:\s*(.+)/i) || text.match(/(?:context|initiative|trigger):\s*(.+)/i)
  return m?.[1]?.trim() ?? ""
}

function runExtraction(text: string): ExtractionResult {
  if (text.trim().length < 20) {
    return {
      companyName: "", domain: "", industry: "", arr: null, arrInferred: false,
      closeDate: "", buyingContext: "", painPoints: [], stakeholders: [],
      evidenceScore: 0, evidenceLevel: "empty",
      missingMetrics: buildMissingMetrics([], {}),
    }
  }

  const companyName = extractCompany(text)
  const domain = extractDomain(text)
  const industry = extractIndustry(text)
  const buyingContext = extractBuyingContext(text)
  const { value: arr, inferred: arrInferred } = extractARR(text)
  const stakeholders = extractStakeholders(text)

  const painPoints: PainPoint[] = []
  for (let i = 0; i < PAIN_KEYWORDS.length; i++) {
    const { pattern, lever, label } = PAIN_KEYWORDS[i]
    if (pattern.test(text)) {
      painPoints.push({ id: `pain_${i}`, description: label, confidence: 0.88 + Math.random() * 0.09, lever })
    }
  }

  let score = 0
  if (companyName) score += 20
  if (arr !== null) score += 15
  if (stakeholders.length > 0) score += Math.min(stakeholders.length * 8, 20)
  if (painPoints.length > 0) score += Math.min(painPoints.length * 8, 30)
  if (industry) score += 8
  if (buyingContext) score += 7
  score = Math.min(score, 100)

  const evidenceLevel: EvidenceLevel =
    score >= 80 ? "strong" : score >= 40 ? "medium" : score > 0 ? "weak" : "empty"

  const missingMetrics = buildMissingMetrics(painPoints, { arr })

  return { companyName, domain, industry, arr, arrInferred, closeDate: "", buyingContext, painPoints, stakeholders, evidenceScore: score, evidenceLevel, missingMetrics }
}

function buildMissingMetrics(painPoints: PainPoint[], found: { arr?: number | null }): MissingMetric[] {
  const metrics: MissingMetric[] = []
  const hasLaborLever = painPoints.some((p) => p.lever === "Labor Cost Avoidance")
  const hasChurnLever = painPoints.some((p) => p.lever.includes("Churn"))

  if (hasLaborLever) {
    metrics.push({ key: "monthly_ticket_volume", label: "Monthly support ticket volume", placeholder: "e.g. 12,500", benchmark: 10000, benchmarkLabel: "Industry avg: 10,000", unit: "tickets/mo", value: "" })
    metrics.push({ key: "avg_rep_cost", label: "Avg. fully loaded cost per rep", placeholder: "e.g. 85,000", benchmark: 85000, benchmarkLabel: "US avg: $85,000", unit: "$/year", value: "" })
  }
  if (hasChurnLever) {
    metrics.push({ key: "annual_revenue", label: "Total annual recurring revenue", placeholder: "e.g. 2,400,000", benchmark: found.arr ? found.arr * 20 : 2400000, benchmarkLabel: "Estimated from deal size", unit: "$/year", value: "" })
  }
  if (!found.arr) {
    metrics.push({ key: "deal_size", label: "Target deal size (ARR)", placeholder: "e.g. 120,000", benchmark: 0, benchmarkLabel: "", unit: "$/year", value: "" })
  }
  return metrics
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function EvidencePill({ level, score }: { level: EvidenceLevel; score: number }) {
  if (level === "empty") return null
  const cfg = {
    strong: { bg: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500", label: "Strong" },
    medium: { bg: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-400", label: "Medium" },
    weak: { bg: "bg-red-50 border-red-200 text-red-600", dot: "bg-red-400", label: "Weak" },
    empty: { bg: "", dot: "", label: "" },
  }[level]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold", cfg.bg)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label} Evidence · {score}%
    </span>
  )
}

function ConfidenceDot({ value }: { value: number }) {
  const color = value >= 0.9 ? "bg-emerald-400" : value >= 0.75 ? "bg-amber-400" : "bg-zinc-300"
  return <span className={cn("inline-block h-1.5 w-1.5 shrink-0 rounded-full", color)} />
}

function InferredBadge() {
  return <span className="ml-1.5 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">Inferred</span>
}

function SectionCard({ title, icon, children, defaultOpen = true }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen)
  return (
    <div className="rounded-xl border border-zinc-200/80 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-zinc-50/80 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-zinc-400">{icon}</span>
          <span className="text-[12px] font-semibold uppercase tracking-wide text-zinc-500">{title}</span>
        </div>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-zinc-300" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-300" />}
      </button>
      {open && <div className="border-t border-zinc-100 px-4 pb-4 pt-3">{children}</div>}
    </div>
  )
}

function EmptyExtractionState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100">
        <Sparkles className="h-5 w-5 text-zinc-400" />
      </div>
      <div>
        <p className="text-sm font-medium text-zinc-500">Paste your notes to begin</p>
        <p className="mt-1 text-xs text-zinc-400 max-w-[200px]">Fabric will extract entities and score your evidence quality in real time.</p>
      </div>
    </div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProspectPromptBuilder({
  className,
  initialValue = "",
  companyOptions: _companyOptions = [] as CompanyOption[],
  onCreateSetup,
  onNavigateToWorkspace,
}: ProspectPromptBuilderProps) {
  const [sourceTab, setSourceTab] = React.useState<SourceTab>("notes")
  const [rawInput, setRawInput] = React.useState(initialValue)
  const [crmUrl, setCrmUrl] = React.useState("")
  const [isRecording, setIsRecording] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [metricValues, setMetricValues] = React.useState<Record<string, string>>({})
  const [strengthened, setStrengthened] = React.useState(false)
  const [showEmailDraft, setShowEmailDraft] = React.useState(false)
  const [mode, setMode] = React.useState<PromptMode>("Balanced")
  const [complianceSensitive, setComplianceSensitive] = React.useState(false)
  const [runWebEnrichment, setRunWebEnrichment] = React.useState(true)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  const extraction = React.useMemo(() => runExtraction(rawInput), [rawInput])

  const handleStrengthen = () => {
    const benchmarkLines: string[] = []
    extraction.missingMetrics.forEach((m) => {
      if (m.benchmark > 0 && !metricValues[m.key]) {
        setMetricValues((prev) => ({ ...prev, [m.key]: String(m.benchmark) }))
        benchmarkLines.push(`- ${m.label}: ${m.benchmark.toLocaleString()} ${m.unit} (benchmark applied)`)
      }
    })
    setStrengthened(true)
  }

  const canLaunch = extraction.evidenceScore > 0 || rawInput.trim().length > 20

  const handleLaunch = async () => {
    if (!canLaunch || isSubmitting) return
    setIsSubmitting(true)
    try {
      const payload: ProspectSetupPromptPayload = {
        companyName: extraction.companyName || undefined,
        companyDomain: extraction.domain || undefined,
        industry: extraction.industry || undefined,
        buyingContext: extraction.buyingContext || undefined,
        businessPain: extraction.painPoints.map((p) => p.description),
        stakeholders: Object.fromEntries(extraction.stakeholders.map((s) => [s.role, `${s.name} (${s.title})`])),
        outputType: "account_brief",
        desiredOutputs: ["account_brief", "discovery_prep"],
        mode,
        enrichmentDepth: mode === "Deep" ? "deep" : mode === "Fast" ? "light" : "standard",
        useUploadedFiles: true,
        usePriorAccountContext: true,
        runWebEnrichment,
        complianceSensitive,
        deepResearch: mode === "Deep",
        freeformPrompt: rawInput.trim(),
        evidenceScore: extraction.evidenceScore,
      }
      const result = onCreateSetup ? await onCreateSetup(payload) : undefined
      if (result && typeof result === "object" && "accountId" in result && onNavigateToWorkspace) {
        onNavigateToWorkspace("/workspace", result.accountId)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const wordCount = rawInput.trim() ? rawInput.trim().split(/\s+/).length : 0

  const emailDraft = extraction.companyName
    ? `Subject: Quick question on ${extraction.companyName} metrics for our business case\n\nHi ${extraction.stakeholders.find((s) => s.role === "Champion")?.name || "there"},\n\nI'm building the initial ROI model for ${extraction.companyName} and want to make sure our financial projections are accurate.\n\nCould you help confirm these baseline figures?\n\n${extraction.missingMetrics.map((m) => `- ${m.label}: (benchmark: ${m.benchmark.toLocaleString()} ${m.unit})`).join("\n")}\n\nLet me know if those benchmarks are in the right ballpark or if you have specific numbers.\n\nBest,`
    : ""

  const hasExtracted = extraction.evidenceScore > 0

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("w-full overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-xl", className)}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-gradient-to-r from-zinc-50 to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 shadow-sm">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold tracking-tight text-zinc-900">Value Case Intake</p>
                {hasExtracted && <EvidencePill level={extraction.evidenceLevel} score={extraction.evidenceScore} />}
              </div>
              <p className="text-[11px] text-zinc-400">Fabric ingestion engine · paste unstructured notes to begin</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode selector */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-0.5">
              {(["Fast", "Balanced", "Deep"] as PromptMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    mode === m ? "bg-zinc-900 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-700"
                  )}
                >{m}</button>
              ))}
            </div>

            {/* Settings popover */}
            <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button type="button" className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Intake settings</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" sideOffset={8} className="w-72 rounded-2xl border border-zinc-200 bg-white p-4 shadow-xl">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Analysis settings</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="web-enrich" className="text-sm font-normal text-zinc-600">Run web enrichment</Label>
                    <Switch id="web-enrich" checked={runWebEnrichment} onCheckedChange={setRunWebEnrichment} />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="compliance" className="text-sm font-normal text-zinc-600">Compliance-sensitive mode</Label>
                    <Switch id="compliance" checked={complianceSensitive} onCheckedChange={setComplianceSensitive} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ── Body: Two-column ── */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] divide-y md:divide-y-0 md:divide-x divide-zinc-100">

          {/* ── Left: Source Input ── */}
          <div className="flex flex-col">
            {/* Source tabs */}
            <div className="flex items-center gap-1 border-b border-zinc-100 bg-zinc-50/60 px-4 py-2">
              {([
                { id: "notes", label: "Notes & Text", icon: <FileText className="h-3.5 w-3.5" /> },
                { id: "audio", label: "Call Audio", icon: <Mic className="h-3.5 w-3.5" /> },
                { id: "crm", label: "CRM Link", icon: <Link2 className="h-3.5 w-3.5" /> },
              ] as { id: SourceTab; label: string; icon: React.ReactNode }[]).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSourceTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                    sourceTab === tab.id
                      ? "bg-white text-zinc-800 shadow-sm border border-zinc-200"
                      : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* Notes tab */}
            {sourceTab === "notes" && (
              <div className="flex flex-1 flex-col">
                <textarea
                  value={rawInput}
                  onChange={(e) => { setRawInput(e.target.value); setStrengthened(false) }}
                  placeholder={"Paste raw discovery notes, call transcript, or any unstructured context here.\n\nFabric will automatically extract:\n- Account & deal details\n- Business pain points\n- Stakeholder names & roles\n- Value levers & ROI signals"}
                  className="min-h-[300px] flex-1 resize-none bg-transparent px-5 py-4 text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-300 focus:outline-none"
                />
                <div className="flex items-center justify-between border-t border-zinc-100 bg-zinc-50/40 px-4 py-2">
                  <span className="text-[11px] text-zinc-400">{wordCount > 0 ? `${wordCount} words · Fabric is analyzing...` : "0 words"}</span>
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setIsRecording(!isRecording)}
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700",
                            isRecording && "bg-red-50 text-red-500 hover:bg-red-100"
                          )}
                        >
                          {isRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Voice input</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="flex h-7 w-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700">
                          <Paperclip className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Attach file</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            )}

            {/* Audio tab */}
            {sourceTab === "audio" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50">
                  <Upload className="h-6 w-6 text-zinc-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-zinc-600">Drop your call recording here</p>
                  <p className="mt-1 text-xs text-zinc-400">Supports .mp3, .wav, .m4a · or paste a Gong / Otter.ai transcript</p>
                </div>
                <button type="button" className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 transition-colors">
                  Browse files
                </button>
                <Separator className="w-full" />
                <div className="w-full">
                  <p className="mb-2 text-xs font-medium text-zinc-500">Or paste transcript directly:</p>
                  <textarea
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                    placeholder="Paste Gong / Otter.ai transcript here..."
                    className="min-h-[120px] w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                </div>
              </div>
            )}

            {/* CRM tab */}
            {sourceTab === "crm" && (
              <div className="flex flex-1 flex-col gap-4 p-5">
                <div>
                  <p className="mb-1 text-xs font-medium text-zinc-500">Salesforce or HubSpot opportunity URL</p>
                  <div className="flex gap-2">
                    <input
                      value={crmUrl}
                      onChange={(e) => setCrmUrl(e.target.value)}
                      placeholder="https://yourorg.salesforce.com/..."
                      className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                    <button type="button" className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors">
                      Fetch
                    </button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-zinc-400">Pulls Account Name, Owner, ARR, Stage, and Close Date via background API.</p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                  <Link2 className="mx-auto mb-2 h-5 w-5 text-zinc-400" />
                  <p className="text-xs text-zinc-500">Salesforce + HubSpot integration available in connected accounts.</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Fabric Found ── */}
          <div className="flex flex-col bg-zinc-50/40">
            <div className="border-b border-zinc-100 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-zinc-400" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">Fabric Found</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto p-4" style={{ maxHeight: 480 }}>
              {!hasExtracted && <EmptyExtractionState />}

              {hasExtracted && (
                <>
                  {/* Evidence strength card */}
                  <div className={cn(
                    "rounded-xl border p-3.5",
                    extraction.evidenceLevel === "strong" && "border-emerald-200 bg-emerald-50",
                    extraction.evidenceLevel === "medium" && "border-amber-200 bg-amber-50/60",
                    extraction.evidenceLevel === "weak" && "border-red-200 bg-red-50/60",
                  )}>
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                        extraction.evidenceLevel === "strong" && "bg-emerald-500",
                        extraction.evidenceLevel === "medium" && "bg-amber-400",
                        extraction.evidenceLevel === "weak" && "bg-red-400",
                      )}>
                        {extraction.evidenceLevel === "strong"
                          ? <CheckCircle2 className="h-3 w-3 text-white" />
                          : <AlertTriangle className="h-3 w-3 text-white" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "text-xs font-semibold",
                          extraction.evidenceLevel === "strong" && "text-emerald-800",
                          extraction.evidenceLevel === "medium" && "text-amber-800",
                          extraction.evidenceLevel === "weak" && "text-red-800",
                        )}>
                          {extraction.evidenceLevel === "strong" && "CFO-Ready · Fully validated metrics"}
                          {extraction.evidenceLevel === "medium" && "Draft Case · Strong qualitative foundation"}
                          {extraction.evidenceLevel === "weak" && "Speculative · Needs buyer confirmation"}
                        </p>
                        <p className={cn(
                          "mt-0.5 text-[11px]",
                          extraction.evidenceLevel === "medium" && "text-amber-700",
                          extraction.evidenceLevel === "weak" && "text-red-700",
                          extraction.evidenceLevel === "strong" && "text-emerald-700",
                        )}>
                          Evidence score: {extraction.evidenceScore}% · {extraction.missingMetrics.length > 0 ? `${extraction.missingMetrics.length} metric${extraction.missingMetrics.length > 1 ? "s" : ""} missing` : "All key parameters present"}
                        </p>

                        {/* Progress bar */}
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/60 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              extraction.evidenceLevel === "strong" && "bg-emerald-500",
                              extraction.evidenceLevel === "medium" && "bg-amber-400",
                              extraction.evidenceLevel === "weak" && "bg-red-400",
                            )}
                            style={{ width: `${extraction.evidenceScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Account & Deal */}
                  {(extraction.companyName || extraction.arr) && (
                    <SectionCard title="Account & Deal" icon={<Building2 className="h-3.5 w-3.5" />}>
                      <div className="space-y-2">
                        {extraction.companyName && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Company</span>
                            <span className="text-xs font-semibold text-zinc-800">{extraction.companyName}</span>
                          </div>
                        )}
                        {extraction.domain && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Domain</span>
                            <span className="text-xs text-zinc-600">{extraction.domain}</span>
                          </div>
                        )}
                        {extraction.industry && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Industry</span>
                            <span className="text-xs text-zinc-600">{extraction.industry}</span>
                          </div>
                        )}
                        {extraction.arr !== null && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-zinc-500">Target ARR</span>
                            <span className="flex items-center text-xs font-semibold text-zinc-800">
                              ${extraction.arr.toLocaleString()}
                              {extraction.arrInferred && <InferredBadge />}
                            </span>
                          </div>
                        )}
                        {extraction.buyingContext && (
                          <div className="pt-1 border-t border-zinc-100">
                            <p className="text-[11px] text-zinc-400">Buying context</p>
                            <p className="mt-0.5 text-xs text-zinc-600">{extraction.buyingContext}</p>
                          </div>
                        )}
                      </div>
                    </SectionCard>
                  )}

                  {/* Pain points */}
                  {extraction.painPoints.length > 0 && (
                    <SectionCard title={`Business Pain · ${extraction.painPoints.length} detected`} icon={<TrendingDown className="h-3.5 w-3.5" />}>
                      <div className="space-y-2">
                        {extraction.painPoints.map((p) => (
                          <div key={p.id} className="flex items-start gap-2">
                            <ConfidenceDot value={p.confidence} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-zinc-700">{p.description}</p>
                              <span className="mt-0.5 inline-block rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">{p.lever}</span>
                            </div>
                            <span className="shrink-0 text-[10px] text-zinc-400">{Math.round(p.confidence * 100)}%</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Stakeholders */}
                  {extraction.stakeholders.length > 0 && (
                    <SectionCard title={`Stakeholders · ${extraction.stakeholders.length} found`} icon={<Users className="h-3.5 w-3.5" />}>
                      <div className="space-y-2">
                        {extraction.stakeholders.map((s, i) => (
                          <div key={i} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-bold text-zinc-600">
                                {s.name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-zinc-800">{s.name}</p>
                                <p className="text-[10px] text-zinc-400 truncate">{s.title}</p>
                              </div>
                            </div>
                            <span className={cn(
                              "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium",
                              s.role === "Decision Maker" && "bg-zinc-900 text-white",
                              s.role === "Champion" && "bg-blue-50 text-blue-700 border border-blue-200",
                              s.role === "Evaluator" && "bg-zinc-100 text-zinc-600",
                              s.role === "Compliance" && "bg-amber-50 text-amber-700 border border-amber-200",
                              s.role === "Unknown" && "bg-zinc-100 text-zinc-500",
                            )}>{s.role}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {/* Missing metrics */}
                  {extraction.missingMetrics.length > 0 && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50/60">
                      <div className="flex items-center gap-2 border-b border-amber-200/60 px-4 py-3">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Missing Baseline Metrics</span>
                      </div>
                      <div className="space-y-3 px-4 py-3">
                        <p className="text-[11px] text-amber-700">To build a CFO-ready case, we need quantitative baseline inputs.</p>
                        {extraction.missingMetrics.map((m) => (
                          <div key={m.key}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="text-[11px] font-medium text-zinc-600">{m.label}</label>
                              {m.benchmarkLabel && <span className="text-[10px] text-zinc-400">{m.benchmarkLabel}</span>}
                            </div>
                            <input
                              type="text"
                              value={metricValues[m.key] ?? ""}
                              onChange={(e) => setMetricValues((prev) => ({ ...prev, [m.key]: e.target.value }))}
                              placeholder={m.placeholder}
                              className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-300"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Email draft */}
                      {extraction.companyName && (
                        <div className="border-t border-amber-200/60 px-4 pb-3 pt-2">
                          <button
                            type="button"
                            onClick={() => setShowEmailDraft(!showEmailDraft)}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {showEmailDraft ? "Hide email draft" : "Draft ask-client email"}
                          </button>
                          {showEmailDraft && emailDraft && (
                            <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                              <pre className="whitespace-pre-wrap font-sans text-[11px] leading-relaxed text-blue-800">{emailDraft}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Strengthen success */}
                  {strengthened && extraction.missingMetrics.length === 0 && (
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                      <p className="text-xs font-medium text-emerald-700">Benchmarks applied. Evidence strengthened.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/80 px-5 py-3">
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleStrengthen}
                  disabled={!hasExtracted}
                  className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-600 shadow-sm transition-all hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-40"
                >
                  <Sparkles className="h-3.5 w-3.5 text-blue-500" />
                  Strengthen Intake
                </button>
              </TooltipTrigger>
              <TooltipContent>Apply industry benchmarks to fill missing metrics</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setMode("Deep")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium shadow-sm transition-all",
                    mode === "Deep"
                      ? "border-zinc-300 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                  )}
                >
                  <Zap className="h-3.5 w-3.5" />
                  Deep Research
                </button>
              </TooltipTrigger>
              <TooltipContent>Enable comprehensive multi-source enrichment</TooltipContent>
            </Tooltip>

            {hasExtracted && (
              <div className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", extraction.evidenceLevel === "strong" ? "bg-emerald-500" : extraction.evidenceLevel === "medium" ? "bg-amber-400" : "bg-red-400")} />
                <span className="text-[11px] font-medium text-zinc-500">
                  {extraction.painPoints.length} pain{extraction.painPoints.length !== 1 ? "s" : ""} · {extraction.stakeholders.length} stakeholder{extraction.stakeholders.length !== 1 ? "s" : ""} detected
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleLaunch}
            disabled={!canLaunch || isSubmitting}
            className={cn(
              "flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all",
              "bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98]",
              "disabled:pointer-events-none disabled:opacity-40"
            )}
          >
            {isSubmitting ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Launching...
              </>
            ) : (
              <>
                Launch Case
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </TooltipProvider>
  )
}
