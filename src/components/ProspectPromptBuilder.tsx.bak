import * as React from "react"
import {
  ArrowUp,
  Briefcase,
  Building2,
  FileText,
  History,
  Mic,
  Paperclip,
  Search,
  Settings2,
  Shield,
  Users,
  Wand2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// ─── Types ────────────────────────────────────────────────────────────────────

type PromptMode = "Fast" | "Balanced" | "Deep"
type DeliverableType = "account_brief" | "discovery_prep" | "value_hypotheses" | "executive_summary"
type EnrichmentDepth = "light" | "standard" | "deep"
type SectionKey =
  | "company"
  | "buyingContext"
  | "stakeholders"
  | "businessPain"
  | "deliverable"
  | "compliance"
  | "researchFocus"
  | "notes"

type Stakeholders = {
  economicBuyer: string
  champion: string
  evaluator: string
  compliance: string
}

type ProspectSetupDraft = {
  companyName: string
  companyDomain: string
  industry: string
  buyingContext: string
  whyNow: string
  knownInitiative: string
  stakeholders: Stakeholders
  businessPain: string[]
  currentFriction: string[]
  desiredOutcomes: string[]
  desiredOutputs: DeliverableType[]
  compliance: {
    regulatedIndustry: string
    knownRequirements: string[]
    securityReviewExpected: string
  }
  researchFocus: string[]
  notes: string
}

type AttachmentItem = { id: string; name: string }
type CreateSetupResult = { accountId: string } | void

export type ProspectSetupPromptPayload = {
  companyName?: string
  companyDomain?: string
  industry?: string
  accountContext?: string
  buyingContext?: string
  whyNow?: string
  knownInitiative?: string
  businessPain?: string[]
  currentFriction?: string[]
  desiredOutcomes?: string[]
  stakeholders?: Partial<Stakeholders>
  sourceArtifacts?: AttachmentItem[]
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
}

export type CompanyOption = {
  id: string
  name: string
  domain?: string
  industry?: string
  accountId?: string
}

type ActivityItem = { id: string; title: string; updatedAt: string; prompt: string }
type AttachResult = void | null | AttachmentItem | AttachmentItem[]

export type ProspectPromptBuilderProps = {
  className?: string
  initialValue?: string
  initialCompany?: CompanyOption
  companyOptions?: CompanyOption[]
  recentActivities?: ActivityItem[]
  onCreateSetup?: (payload: ProspectSetupPromptPayload) => CreateSetupResult | Promise<CreateSetupResult>
  onAttachContent?: () => AttachResult | Promise<AttachResult>
  onOpenVoiceInput?: () => void
  onNavigateToWorkspace?: (path: string, accountId: string) => void
}

type BuilderState = {
  draft: ProspectSetupDraft
  promptText: string
  visibleSections: Record<SectionKey, boolean>
  mode: PromptMode
  primaryDeliverable: DeliverableType
  enrichmentDepth: EnrichmentDepth
  useUploadedFiles: boolean
  usePriorAccountContext: boolean
  runWebEnrichment: boolean
  complianceSensitive: boolean
  attachments: AttachmentItem[]
  selectedCompany?: CompanyOption
  isSubmitting: boolean
  isRecording: boolean
  searchOpen: boolean
  statusMessage: string
  successMessage: string
  errorMessage: string
}

type ParsedPrompt = { draft: ProspectSetupDraft; visibleSections: Record<SectionKey, boolean> }

type BuilderAction =
  | { type: "APPLY_PROMPT_TEXT"; promptText: string }
  | { type: "SELECT_COMPANY"; company: CompanyOption }
  | { type: "SYNC_SELECTED_COMPANY"; company?: CompanyOption }
  | { type: "ENABLE_SECTION"; section: SectionKey }
  | { type: "SET_MODE"; mode: PromptMode }
  | { type: "SET_PRIMARY_DELIVERABLE"; deliverable: DeliverableType }
  | { type: "SET_ENRICHMENT_DEPTH"; enrichmentDepth: EnrichmentDepth }
  | { type: "SET_FLAG"; key: "useUploadedFiles" | "usePriorAccountContext" | "runWebEnrichment" | "complianceSensitive"; value: boolean }
  | { type: "SET_SEARCH_OPEN"; open: boolean }
  | { type: "SET_RECORDING"; value: boolean }
  | { type: "ATTACHMENTS_ADDED"; attachments: AttachmentItem[]; statusMessage?: string }
  | { type: "STRENGTHEN_PROMPT" }
  | { type: "ENABLE_DEEP_RESEARCH" }
  | { type: "RESTORE_ACTIVITY"; activity: ActivityItem }
  | { type: "START_SUBMIT" }
  | { type: "SUBMIT_SUCCESS"; message: string }
  | { type: "SUBMIT_ERROR"; message: string }
  | { type: "CLEAR_MESSAGES" }

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_COMPANIES: CompanyOption[] = [
  { id: "1", name: "Medtronic", domain: "medtronic.com", industry: "Medical Devices" },
  { id: "2", name: "Stryker", domain: "stryker.com", industry: "Medical Devices" },
  { id: "3", name: "Baxter", domain: "baxter.com", industry: "Healthcare" },
  { id: "4", name: "Johnson & Johnson MedTech", domain: "jnjmedtech.com", industry: "Medical Devices" },
  { id: "5", name: "Finastra", domain: "finastra.com", industry: "Financial Services Technology" },
]

const DEFAULT_ACTIVITIES: ActivityItem[] = [
  {
    id: "a1",
    title: "Medtronic launch readiness setup",
    updatedAt: "2h ago",
    prompt:
      "Company: Medtronic\nWebsite: medtronic.com\nIndustry: Medical Devices\n\nBuying context: New product launch readiness across distributed field teams\nWhy this account now: Need stronger rep ramp, compliant messaging, and executive discovery prep\nKnown initiative or trigger: Field launch enablement refresh\n\nStakeholders:\n- Economic buyer: VP Sales\n- Business champion: Sales Enablement Leader\n- Technical evaluator: RevOps / IT\n- Compliance / legal: Regulatory and legal operations\n\nKnown or suspected business pains:\n- Rep onboarding is slow for complex offerings\n- Messaging consistency is difficult across field teams\n- Launch content is fragmented across systems\n\nCurrent friction:\n- Multiple systems create version confusion\n- Coaching quality varies by manager\n\nDesired business outcome:\n- Faster rep ramp time\n- More consistent compliant messaging\n- Better launch readiness\n\nDesired output:\n- Account brief\n- Discovery prep\n- Value hypotheses\n\nCompliance sensitivity:\n- Regulated industry: yes\n- Known requirements: FDA-related controls; auditability\n- Security / legal review expected: yes",
  },
  {
    id: "a2",
    title: "Financial services coaching setup",
    updatedAt: "Yesterday",
    prompt:
      "Company: Goldman Sachs\nWebsite: goldmansachs.com\nIndustry: Financial Services\n\nBuying context: Advisor enablement and coaching scale\nWhy this account now: Need consistent messaging and compliance-safe coaching motions\n\nDesired output:\n- Executive summary\n- Value hypotheses",
  },
]

const MODE_OPTIONS: PromptMode[] = ["Fast", "Balanced", "Deep"]

const DELIVERABLE_OPTIONS: { label: string; value: DeliverableType }[] = [
  { label: "Account brief", value: "account_brief" },
  { label: "Discovery prep", value: "discovery_prep" },
  { label: "Value hypotheses", value: "value_hypotheses" },
  { label: "Executive summary", value: "executive_summary" },
]

const ENRICHMENT_OPTIONS: { label: string; value: EnrichmentDepth }[] = [
  { label: "Light", value: "light" },
  { label: "Standard", value: "standard" },
  { label: "Deep", value: "deep" },
]

const S = {
  pill: "h-10 rounded-2xl border border-border/60 bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-foreground",
  icon: "h-10 w-10 rounded-2xl border border-transparent bg-transparent text-muted-foreground shadow-none transition-all hover:border-border/60 hover:bg-muted hover:text-foreground hover:shadow-sm",
  accentBtn: "gap-1.5 rounded-2xl border border-transparent bg-transparent text-blue-600 shadow-none transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
  option: "h-10 rounded-2xl border border-border/60 bg-background px-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-foreground",
  primary: "h-10 rounded-2xl bg-foreground px-5 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50",
  badge: "rounded-xl border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium",
} as const

const CORE_SECTIONS: SectionKey[] = ["company", "buyingContext", "stakeholders", "businessPain", "deliverable"]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createEmptyDraft(): ProspectSetupDraft {
  return {
    companyName: "",
    companyDomain: "",
    industry: "",
    buyingContext: "",
    whyNow: "",
    knownInitiative: "",
    stakeholders: { economicBuyer: "", champion: "", evaluator: "", compliance: "" },
    businessPain: [],
    currentFriction: [],
    desiredOutcomes: [],
    desiredOutputs: [],
    compliance: { regulatedIndustry: "", knownRequirements: [], securityReviewExpected: "" },
    researchFocus: [],
    notes: "",
  }
}

function createEmptyVisible(): Record<SectionKey, boolean> {
  return { company: false, buyingContext: false, stakeholders: false, businessPain: false, deliverable: false, compliance: false, researchFocus: false, notes: false }
}

function hasContent(value: string | string[]) {
  return Array.isArray(value) ? value.some((v) => v.trim().length > 0) : value.trim().length > 0
}

function dLabel(value: DeliverableType) {
  return DELIVERABLE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function dValueFromLabel(label: string): DeliverableType | undefined {
  const n = label.trim().toLowerCase()
  return DELIVERABLE_OPTIONS.find((o) => o.label.toLowerCase() === n)?.value
}

function bulletSection(title: string, items: string[], placeholder = "") {
  const filtered = items.filter((i) => i.trim())
  const lines = filtered.length > 0 ? filtered.map((i) => `- ${i}`) : placeholder ? [`- ${placeholder}`] : ["-"]
  return `${title}:\n${lines.join("\n")}`
}

function serializeDraft(draft: ProspectSetupDraft, vis: Record<SectionKey, boolean>, primary: DeliverableType) {
  const parts: string[] = []

  if (vis.company || hasContent(draft.companyName) || hasContent(draft.companyDomain) || hasContent(draft.industry)) {
    parts.push([`Company: ${draft.companyName}`, `Website: ${draft.companyDomain}`, `Industry: ${draft.industry}`].join("\n"))
  }
  if (vis.buyingContext || hasContent(draft.buyingContext) || hasContent(draft.whyNow) || hasContent(draft.knownInitiative)) {
    parts.push([`Buying context: ${draft.buyingContext}`, `Why this account now: ${draft.whyNow}`, `Known initiative or trigger: ${draft.knownInitiative}`].join("\n"))
  }
  if (vis.stakeholders || Object.values(draft.stakeholders).some((v) => v.trim())) {
    parts.push(["Stakeholders:", `- Economic buyer: ${draft.stakeholders.economicBuyer}`, `- Business champion: ${draft.stakeholders.champion}`, `- Technical evaluator: ${draft.stakeholders.evaluator}`, `- Compliance / legal: ${draft.stakeholders.compliance}`].join("\n"))
  }
  if (vis.businessPain || hasContent(draft.businessPain) || hasContent(draft.currentFriction) || hasContent(draft.desiredOutcomes)) {
    parts.push([bulletSection("Known or suspected business pains", draft.businessPain), bulletSection("Current friction", draft.currentFriction), bulletSection("Desired business outcome", draft.desiredOutcomes)].join("\n\n"))
  }
  const outputs = draft.desiredOutputs.length > 0 ? draft.desiredOutputs : vis.deliverable ? [primary] : []
  if (vis.deliverable || outputs.length > 0) {
    parts.push(bulletSection("Desired output", outputs.map(dLabel), dLabel(primary)))
  }
  if (vis.compliance || hasContent(draft.compliance.regulatedIndustry) || hasContent(draft.compliance.knownRequirements) || hasContent(draft.compliance.securityReviewExpected)) {
    parts.push(["Compliance sensitivity:", `- Regulated industry: ${draft.compliance.regulatedIndustry}`, `- Known requirements: ${draft.compliance.knownRequirements.join("; ")}`, `- Security / legal review expected: ${draft.compliance.securityReviewExpected}`].join("\n"))
  }
  if (vis.researchFocus || hasContent(draft.researchFocus)) {
    parts.push(bulletSection("Research focus", draft.researchFocus, "Company overview and current priorities"))
  }
  if (vis.notes || hasContent(draft.notes)) {
    parts.push(`Additional notes:\n${draft.notes}`.trim())
  }
  return parts.join("\n\n").trim()
}

function parsePromptText(text: string): ParsedPrompt {
  const draft = createEmptyDraft()
  const vis = createEmptyVisible()
  const lines = text.split(/\r?\n/)
  const used = new Array(lines.length).fill(false)

  const readLine = (label: string) => {
    const lo = `${label.toLowerCase()}:`
    const i = lines.findIndex((l) => l.trim().toLowerCase().startsWith(lo))
    if (i === -1) return ""
    used[i] = true
    return lines[i].split(":").slice(1).join(":").trim()
  }

  const readBullets = (label: string) => {
    const lo = `${label.toLowerCase()}:`
    const si = lines.findIndex((l) => l.trim().toLowerCase() === lo)
    if (si === -1) return [] as string[]
    used[si] = true
    const items: string[] = []
    for (let i = si + 1; i < lines.length; i++) {
      const t = lines[i].trim()
      if (!t) { used[i] = true; if (items.length) break; continue }
      if (!t.startsWith("-")) break
      used[i] = true
      const v = t.replace(/^-\s*/, "").trim()
      if (v) items.push(v)
    }
    return items
  }

  draft.companyName = readLine("Company")
  draft.companyDomain = readLine("Website")
  draft.industry = readLine("Industry")
  draft.buyingContext = readLine("Buying context")
  draft.whyNow = readLine("Why this account now")
  draft.knownInitiative = readLine("Known initiative or trigger")

  if (draft.companyName || draft.companyDomain || draft.industry) vis.company = true
  if (draft.buyingContext || draft.whyNow || draft.knownInitiative) vis.buyingContext = true

  const stakeholderItems = readBullets("Stakeholders")
  if (stakeholderItems.length || /(^|\n)Stakeholders:/i.test(text)) vis.stakeholders = true
  for (const item of stakeholderItems) {
    const [rk, ...rest] = item.split(":")
    const val = rest.join(":").trim()
    const k = rk.trim().toLowerCase()
    if (k.includes("economic")) draft.stakeholders.economicBuyer = val
    if (k.includes("champion")) draft.stakeholders.champion = val
    if (k.includes("technical") || k.includes("evaluator")) draft.stakeholders.evaluator = val
    if (k.includes("compliance") || k.includes("legal")) draft.stakeholders.compliance = val
  }

  draft.businessPain = readBullets("Known or suspected business pains")
  draft.currentFriction = readBullets("Current friction")
  draft.desiredOutcomes = readBullets("Desired business outcome")
  if (draft.businessPain.length || draft.currentFriction.length || draft.desiredOutcomes.length) vis.businessPain = true

  const outputs = readBullets("Desired output")
  if (outputs.length || /(^|\n)Desired output:/i.test(text)) vis.deliverable = true
  draft.desiredOutputs = outputs.map(dValueFromLabel).filter((v): v is DeliverableType => Boolean(v))

  const compItems = readBullets("Compliance sensitivity")
  if (compItems.length || /(^|\n)Compliance sensitivity:/i.test(text)) vis.compliance = true
  for (const item of compItems) {
    const [rk, ...rest] = item.split(":")
    const val = rest.join(":").trim()
    const k = rk.trim().toLowerCase()
    if (k.includes("regulated industry")) draft.compliance.regulatedIndustry = val
    if (k.includes("known requirements")) draft.compliance.knownRequirements = val ? val.split(/[;,]/).map((p) => p.trim()).filter(Boolean) : []
    if (k.includes("security") || k.includes("legal review")) draft.compliance.securityReviewExpected = val
  }

  draft.researchFocus = readBullets("Research focus")
  if (draft.researchFocus.length || /(^|\n)Research focus:/i.test(text)) vis.researchFocus = true

  const ni = lines.findIndex((l) => l.trim().toLowerCase() === "additional notes:")
  if (ni !== -1) {
    vis.notes = true
    used[ni] = true
    const noteLines: string[] = []
    for (let i = ni + 1; i < lines.length; i++) { used[i] = true; noteLines.push(lines[i]) }
    draft.notes = noteLines.join("\n").trim()
  }
  if (!draft.notes) {
    const leftover = lines.filter((l, i) => !used[i] && l.trim())
    if (leftover.length) { draft.notes = leftover.join("\n").trim(); vis.notes = true }
  }

  return { draft, visibleSections: vis }
}

function flagLabel(key: "useUploadedFiles" | "usePriorAccountContext" | "runWebEnrichment" | "complianceSensitive") {
  const map = { useUploadedFiles: "Uploaded files", usePriorAccountContext: "Prior account context", runWebEnrichment: "Web enrichment", complianceSensitive: "Compliance-sensitive mode" }
  return map[key] ?? key
}

function sectionTitle(s: SectionKey) {
  const map: Record<SectionKey, string> = { company: "Company details", buyingContext: "Buying context", stakeholders: "Stakeholders", businessPain: "Business pain", deliverable: "Deliverable", compliance: "Compliance sensitivity", researchFocus: "Research focus", notes: "Additional notes" }
  return map[s] ?? s
}

function cap(v: string) { return v.charAt(0).toUpperCase() + v.slice(1) }

// ─── Reducer ──────────────────────────────────────────────────────────────────

function buildStrengthenedState(state: BuilderState): BuilderState {
  const vis = { ...state.visibleSections }
  for (const s of CORE_SECTIONS) vis[s] = true
  const draft = state.draft.desiredOutputs.length === 0 ? { ...state.draft, desiredOutputs: [state.primaryDeliverable] } : state.draft
  return { ...state, draft, visibleSections: vis, promptText: serializeDraft(draft, vis, state.primaryDeliverable), statusMessage: "Prompt strengthened with missing value case sections.", successMessage: "", errorMessage: "" }
}

function enableDeepResearchState(state: BuilderState): BuilderState {
  const vis = { ...state.visibleSections, researchFocus: true }
  const draft: ProspectSetupDraft = {
    ...state.draft,
    researchFocus: state.draft.researchFocus.length > 0 ? state.draft.researchFocus : ["Company overview and current priorities", "Likely stakeholders and buying committee", "Business pain signals", "Industry and compliance considerations", "Initial value hypotheses"],
  }
  return { ...state, draft, visibleSections: vis, mode: "Deep", enrichmentDepth: "deep", promptText: serializeDraft(draft, vis, state.primaryDeliverable), statusMessage: "Deep research enabled. Research focus added to the analysis.", successMessage: "", errorMessage: "" }
}

function builderReducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case "APPLY_PROMPT_TEXT": {
      const p = parsePromptText(action.promptText)
      return { ...state, draft: p.draft, visibleSections: p.visibleSections, promptText: action.promptText, complianceSensitive: state.complianceSensitive || Boolean(p.visibleSections.compliance || p.draft.compliance.regulatedIndustry || p.draft.compliance.knownRequirements.length || p.draft.compliance.securityReviewExpected), successMessage: "", errorMessage: "" }
    }
    case "SELECT_COMPANY": {
      const draft = { ...state.draft, companyName: action.company.name, companyDomain: action.company.domain ?? state.draft.companyDomain, industry: action.company.industry ?? state.draft.industry }
      const vis = { ...state.visibleSections, company: true }
      return { ...state, draft, visibleSections: vis, selectedCompany: action.company, searchOpen: false, promptText: serializeDraft(draft, vis, state.primaryDeliverable), statusMessage: `${action.company.name} added to the value case.`, successMessage: "", errorMessage: "" }
    }
    case "SYNC_SELECTED_COMPANY": return { ...state, selectedCompany: action.company }
    case "ENABLE_SECTION": {
      const vis = { ...state.visibleSections, [action.section]: true }
      let draft = state.draft
      if (action.section === "deliverable" && draft.desiredOutputs.length === 0) draft = { ...draft, desiredOutputs: [state.primaryDeliverable] }
      return { ...state, draft, visibleSections: vis, promptText: serializeDraft(draft, vis, state.primaryDeliverable), statusMessage: `${sectionTitle(action.section)} added to the prompt.`, successMessage: "", errorMessage: "" }
    }
    case "SET_MODE": return { ...state, mode: action.mode, statusMessage: `${action.mode} analysis depth selected.`, successMessage: "", errorMessage: "" }
    case "SET_PRIMARY_DELIVERABLE": {
      const desiredOutputs = state.draft.desiredOutputs.includes(action.deliverable) ? state.draft.desiredOutputs : [action.deliverable, ...state.draft.desiredOutputs]
      const draft = { ...state.draft, desiredOutputs }
      const vis = { ...state.visibleSections, deliverable: true }
      return { ...state, primaryDeliverable: action.deliverable, draft, visibleSections: vis, promptText: serializeDraft(draft, vis, action.deliverable), statusMessage: `${dLabel(action.deliverable)} selected as the primary output.`, successMessage: "", errorMessage: "" }
    }
    case "SET_ENRICHMENT_DEPTH": return { ...state, enrichmentDepth: action.enrichmentDepth, statusMessage: `${cap(action.enrichmentDepth)} enrichment depth selected.`, successMessage: "", errorMessage: "" }
    case "SET_FLAG": return { ...state, [action.key]: action.value, statusMessage: `${flagLabel(action.key)} ${action.value ? "enabled" : "disabled"}.`, successMessage: "", errorMessage: "" }
    case "SET_SEARCH_OPEN": return { ...state, searchOpen: action.open }
    case "SET_RECORDING": return { ...state, isRecording: action.value, statusMessage: action.value ? "Voice input started." : "Voice input stopped.", successMessage: "", errorMessage: "" }
    case "ATTACHMENTS_ADDED": return { ...state, attachments: [...state.attachments, ...action.attachments], statusMessage: action.statusMessage ?? `${action.attachments.length} attachment${action.attachments.length > 1 ? "s" : ""} added.`, successMessage: "", errorMessage: "" }
    case "STRENGTHEN_PROMPT": return buildStrengthenedState(state)
    case "ENABLE_DEEP_RESEARCH": return enableDeepResearchState(state)
    case "RESTORE_ACTIVITY": {
      const p = parsePromptText(action.activity.prompt)
      return { ...state, draft: p.draft, visibleSections: p.visibleSections, promptText: action.activity.prompt, selectedCompany: undefined, statusMessage: `${action.activity.title} restored.`, successMessage: "", errorMessage: "" }
    }
    case "START_SUBMIT": return { ...state, isSubmitting: true, statusMessage: "Launching intelligence...", successMessage: "", errorMessage: "" }
    case "SUBMIT_SUCCESS": return { ...state, isSubmitting: false, statusMessage: "", successMessage: action.message, errorMessage: "" }
    case "SUBMIT_ERROR": return { ...state, isSubmitting: false, statusMessage: "", successMessage: "", errorMessage: action.message }
    case "CLEAR_MESSAGES": return { ...state, statusMessage: "", successMessage: "", errorMessage: "" }
    default: return state
  }
}

function getInitialState(initialValue: string, initialCompany?: CompanyOption): BuilderState {
  const hasVal = initialValue.trim().length > 0
  const parsed = hasVal ? parsePromptText(initialValue) : { draft: createEmptyDraft(), visibleSections: createEmptyVisible() }
  const draft = initialCompany ? { ...parsed.draft, companyName: parsed.draft.companyName || initialCompany.name, companyDomain: parsed.draft.companyDomain || initialCompany.domain || "", industry: parsed.draft.industry || initialCompany.industry || "" } : parsed.draft
  const vis = initialCompany ? { ...parsed.visibleSections, company: true } : parsed.visibleSections
  const primary = draft.desiredOutputs[0] ?? "account_brief"
  const promptText = hasVal ? initialValue.trim() : initialCompany ? serializeDraft(draft, vis, primary) : ""
  return {
    draft, promptText, visibleSections: vis, mode: "Balanced", primaryDeliverable: primary, enrichmentDepth: "standard",
    useUploadedFiles: true, usePriorAccountContext: true, runWebEnrichment: true,
    complianceSensitive: vis.compliance || Boolean(draft.compliance.regulatedIndustry || draft.compliance.knownRequirements.length || draft.compliance.securityReviewExpected),
    attachments: [], selectedCompany: initialCompany, isSubmitting: false, isRecording: false, searchOpen: false,
    statusMessage: "", successMessage: "", errorMessage: "",
  }
}

function buildPayload(state: BuilderState): ProspectSetupPromptPayload {
  const accountContext = [state.draft.buyingContext, state.draft.whyNow].filter(Boolean).join(" | ") || undefined
  const stakeholders = Object.fromEntries(Object.entries(state.draft.stakeholders).filter(([, v]) => v.trim())) as Partial<Stakeholders>
  return {
    companyName: state.draft.companyName || undefined,
    companyDomain: state.draft.companyDomain || undefined,
    industry: state.draft.industry || undefined,
    accountContext,
    buyingContext: state.draft.buyingContext || undefined,
    whyNow: state.draft.whyNow || undefined,
    knownInitiative: state.draft.knownInitiative || undefined,
    businessPain: state.draft.businessPain,
    currentFriction: state.draft.currentFriction,
    desiredOutcomes: state.draft.desiredOutcomes,
    stakeholders: Object.keys(stakeholders).length > 0 ? stakeholders : undefined,
    sourceArtifacts: state.attachments,
    outputType: state.primaryDeliverable,
    desiredOutputs: state.draft.desiredOutputs.length > 0 ? state.draft.desiredOutputs : [state.primaryDeliverable],
    mode: state.mode,
    enrichmentDepth: state.enrichmentDepth,
    useUploadedFiles: state.useUploadedFiles,
    usePriorAccountContext: state.usePriorAccountContext,
    runWebEnrichment: state.runWebEnrichment,
    complianceSensitive: state.complianceSensitive,
    deepResearch: state.mode === "Deep" || state.enrichmentDepth === "deep",
    freeformPrompt: state.promptText.trim(),
  }
}

function canSubmit(state: BuilderState) {
  return state.promptText.trim().length > 12 || Boolean(state.draft.companyName || state.draft.companyDomain || state.attachments.length > 0)
}

function resolveAccountId(result: CreateSetupResult, company?: CompanyOption) {
  if (result && typeof result === "object" && "accountId" in result && result.accountId) return result.accountId
  return company?.accountId
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const SettingsSwitch = React.memo(function SettingsSwitch({ id, label, checked, onCheckedChange }: { id: string; label: string; checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={id} className="cursor-pointer select-none text-sm font-normal">{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
})

const PromptSettingsPopover = React.memo(function PromptSettingsPopover({ state, dispatch }: { state: BuilderState; dispatch: React.Dispatch<BuilderAction> }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn(S.icon, "hover:bg-muted/80")} aria-label="Prompt settings">
              <Settings2 className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-lg">Open analysis settings</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 rounded-2xl border border-border/60 bg-popover p-4 shadow-lg">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Deliverable</p>
            <div className="grid grid-cols-2 gap-2">
              {DELIVERABLE_OPTIONS.map((o) => (
                <Button key={o.value} type="button" variant="outline" onClick={() => dispatch({ type: "SET_PRIMARY_DELIVERABLE", deliverable: o.value })}
                  className={cn(S.option, "justify-start text-left", state.primaryDeliverable === o.value && "border-foreground bg-accent text-foreground")}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrichment depth</p>
            <div className="grid grid-cols-3 gap-2">
              {ENRICHMENT_OPTIONS.map((o) => (
                <Button key={o.value} type="button" variant="outline" onClick={() => dispatch({ type: "SET_ENRICHMENT_DEPTH", enrichmentDepth: o.value })}
                  className={cn(S.option, state.enrichmentDepth === o.value && "border-foreground bg-accent text-foreground")}>
                  {o.label}
                </Button>
              ))}
            </div>
          </div>
          <Separator />
          <div className="space-y-3">
            <SettingsSwitch id="uploaded-files" label="Use uploaded files" checked={state.useUploadedFiles} onCheckedChange={(v) => dispatch({ type: "SET_FLAG", key: "useUploadedFiles", value: v })} />
            <SettingsSwitch id="prior-context" label="Use prior account context" checked={state.usePriorAccountContext} onCheckedChange={(v) => dispatch({ type: "SET_FLAG", key: "usePriorAccountContext", value: v })} />
            <SettingsSwitch id="web-enrichment" label="Run web enrichment" checked={state.runWebEnrichment} onCheckedChange={(v) => dispatch({ type: "SET_FLAG", key: "runWebEnrichment", value: v })} />
            <SettingsSwitch id="compliance" label="Compliance-sensitive mode" checked={state.complianceSensitive} onCheckedChange={(v) => dispatch({ type: "SET_FLAG", key: "complianceSensitive", value: v })} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
})

const RecentActivityMenu = React.memo(function RecentActivityMenu({ activities, onRestore }: { activities: ActivityItem[]; onRestore: (a: ActivityItem) => void }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={cn(S.icon, "hover:bg-muted/80")} aria-label="Recent value cases">
              <History className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-lg">Open recent value cases</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-80 rounded-2xl border border-border/60 bg-popover p-1 shadow-lg">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">Recent value cases</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {activities.map((a) => (
          <DropdownMenuItem key={a.id} onClick={() => onRestore(a)} className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5">
            <span className="text-sm font-medium">{a.title}</span>
            <span className="text-xs text-muted-foreground">{a.updatedAt}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
})

const StatusBanner = React.memo(function StatusBanner({ successMessage, statusMessage, errorMessage }: Pick<BuilderState, "successMessage" | "statusMessage" | "errorMessage">) {
  if (!successMessage && !statusMessage && !errorMessage) return null
  const tone = errorMessage ? "error" : successMessage ? "success" : "info"
  const msg = errorMessage || successMessage || statusMessage
  return (
    <div className={cn("mx-2 rounded-xl px-3 py-2 text-sm transition-all",
      tone === "error" && "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400",
      tone === "success" && "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400",
      tone === "info" && "bg-muted/60 text-muted-foreground")}>
      {msg}
    </div>
  )
})

const PromptHeader = React.memo(function PromptHeader({ mode, onModeChange, state, dispatch, recentActivities }: { mode: PromptMode; onModeChange: (m: PromptMode) => void; state: BuilderState; dispatch: React.Dispatch<BuilderAction>; recentActivities: ActivityItem[] }) {
  return (
    <div className="flex items-center justify-between gap-3 px-2">
      <div className="flex min-w-0 items-center gap-2">
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="sm" className={S.pill}>{mode}</Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent className="rounded-lg">Choose analysis depth</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" className="rounded-2xl border border-border/60 bg-popover p-1 shadow-lg">
            <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">Analysis depth</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {MODE_OPTIONS.map((o) => (
              <DropdownMenuItem key={o} onClick={() => onModeChange(o)} className="rounded-xl">{o}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Badge variant="secondary" className="h-10 rounded-2xl border border-border/60 bg-muted/60 px-4 text-sm font-medium text-foreground shadow-sm">
          <Wand2 className="mr-1.5 h-3.5 w-3.5" />
          New Value Case
        </Badge>
      </div>
      <div className="flex items-center gap-1.5">
        <PromptSettingsPopover state={state} dispatch={dispatch} />
        <RecentActivityMenu activities={recentActivities} onRestore={(a) => dispatch({ type: "RESTORE_ACTIVITY", activity: a })} />
      </div>
    </div>
  )
})

const CompanySearchPopover = React.memo(function CompanySearchPopover({ open, onOpenChange, companyOptions, onSelect }: { open: boolean; onOpenChange: (o: boolean) => void; companyOptions: CompanyOption[]; onSelect: (c: CompanyOption) => void }) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className={S.icon} aria-label="Search accounts">
              <Search className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent className="rounded-lg">Search accounts</TooltipContent>
      </Tooltip>
      <PopoverContent align="start" side="top" className="w-72 rounded-2xl border border-border/60 bg-popover p-0 shadow-lg">
        <Command className="rounded-2xl">
          <CommandInput placeholder="Search accounts..." className="h-10 rounded-t-2xl" />
          <CommandList className="max-h-56">
            <CommandEmpty className="py-4 text-center text-sm text-muted-foreground">No accounts found.</CommandEmpty>
            <CommandSeparator />
            {companyOptions.map((c) => (
              <CommandItem key={c.id} value={c.name} onSelect={() => onSelect(c)} className="flex flex-col items-start gap-0.5 rounded-xl px-3 py-2.5">
                <span className="font-medium">{c.name}</span>
                {c.industry && <span className="text-xs text-muted-foreground">{c.industry}</span>}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
})

const SectionIcon = ({ section }: { section: SectionKey }) => {
  switch (section) {
    case "company": return <Building2 className="h-3.5 w-3.5" />
    case "buyingContext": return <Briefcase className="h-3.5 w-3.5" />
    case "stakeholders": return <Users className="h-3.5 w-3.5" />
    case "businessPain": return <FileText className="h-3.5 w-3.5" />
    case "deliverable": return <Wand2 className="h-3.5 w-3.5" />
    case "compliance": return <Shield className="h-3.5 w-3.5" />
    case "researchFocus": return <Search className="h-3.5 w-3.5" />
    case "notes": return <FileText className="h-3.5 w-3.5" />
  }
}

const ContextChips = React.memo(function ContextChips({ state, dispatch }: { state: BuilderState; dispatch: React.Dispatch<BuilderAction> }) {
  const hidden = (Object.keys(state.visibleSections) as SectionKey[]).filter((k) => !state.visibleSections[k])
  if (hidden.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2 px-2">
      {hidden.map((section) => (
        <Button key={section} type="button" variant="outline" size="sm" onClick={() => dispatch({ type: "ENABLE_SECTION", section })}
          className="h-8 gap-1.5 rounded-xl border border-dashed border-border/60 bg-transparent px-3 text-xs font-medium text-muted-foreground shadow-none transition-all hover:border-border hover:bg-muted/40 hover:text-foreground">
          <SectionIcon section={section} />
          + {sectionTitle(section)}
        </Button>
      ))}
    </div>
  )
})

const AttachmentPills = React.memo(function AttachmentPills({ attachments }: { attachments: AttachmentItem[] }) {
  if (attachments.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1.5 px-2">
      {attachments.map((a) => (
        <span key={a.id} className={cn(S.badge, "flex items-center gap-1")}>
          <Paperclip className="h-3 w-3" />{a.name}
        </span>
      ))}
    </div>
  )
})

const PromptFooter = React.memo(function PromptFooter({ state, dispatch, companyOptions, onAttachContent, onOpenVoiceInput, onSubmit }: { state: BuilderState; dispatch: React.Dispatch<BuilderAction>; companyOptions: CompanyOption[]; onAttachContent?: () => AttachResult | Promise<AttachResult>; onOpenVoiceInput?: () => void; onSubmit: () => void }) {
  const handleAttach = async () => {
    const result = onAttachContent ? await onAttachContent() : null
    const items: AttachmentItem[] = result
      ? Array.isArray(result) ? result : [result]
      : [{ id: `attachment-${state.attachments.length + 1}`, name: `Attachment ${state.attachments.length + 1}` }]
    dispatch({ type: "ATTACHMENTS_ADDED", attachments: items })
  }

  const handleVoice = () => {
    onOpenVoiceInput?.()
    dispatch({ type: "SET_RECORDING", value: !state.isRecording })
  }

  return (
    <div className="flex items-center justify-between gap-2 px-2">
      <div className="flex items-center gap-1">
        <CompanySearchPopover open={state.searchOpen} onOpenChange={(o) => dispatch({ type: "SET_SEARCH_OPEN", open: o })} companyOptions={companyOptions} onSelect={(c) => dispatch({ type: "SELECT_COMPANY", company: c })} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={handleAttach} className={S.icon} aria-label="Attach content">
              <Paperclip className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="rounded-lg">Attach files or content</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" onClick={handleVoice}
              className={cn(S.icon, state.isRecording && "border-red-300 bg-red-50 text-red-600 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-400")}
              aria-label="Voice input">
              <Mic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="rounded-lg">{state.isRecording ? "Stop recording" : "Start voice input"}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: "STRENGTHEN_PROMPT" })} className={cn(S.accentBtn, "h-9 px-3 text-xs")}>
              <Wand2 className="h-3.5 w-3.5" />
              Strengthen
            </Button>
          </TooltipTrigger>
          <TooltipContent className="rounded-lg">Add missing value case sections</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" onClick={() => dispatch({ type: "ENABLE_DEEP_RESEARCH" })} className={cn(S.accentBtn, "h-9 px-3 text-xs")}>
              <Search className="h-3.5 w-3.5" />
              Deep research
            </Button>
          </TooltipTrigger>
          <TooltipContent className="rounded-lg">Enable deep research mode</TooltipContent>
        </Tooltip>
      </div>

      <Button type="button" onClick={onSubmit} disabled={!canSubmit(state) || state.isSubmitting} className={S.primary}>
        {state.isSubmitting ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-background border-t-transparent" />
            Launching...
          </span>
        ) : (
          <span className="flex items-center gap-2">
            Launch
            <ArrowUp className="h-3.5 w-3.5" />
          </span>
        )}
      </Button>
    </div>
  )
})

// ─── Main export ──────────────────────────────────────────────────────────────

export function ProspectPromptBuilder({
  className,
  initialValue = "",
  initialCompany,
  companyOptions = DEFAULT_COMPANIES,
  recentActivities = DEFAULT_ACTIVITIES,
  onCreateSetup,
  onAttachContent,
  onOpenVoiceInput,
  onNavigateToWorkspace,
}: ProspectPromptBuilderProps) {
  const [state, dispatch] = React.useReducer(builderReducer, undefined, () => getInitialState(initialValue, initialCompany))

  React.useEffect(() => {
    if (!state.draft.companyName) {
      if (state.selectedCompany) dispatch({ type: "SYNC_SELECTED_COMPANY", company: undefined })
      return
    }
    const matched = companyOptions.find((c) => c.name.toLowerCase() === state.draft.companyName.toLowerCase())
    if (matched?.id !== state.selectedCompany?.id) dispatch({ type: "SYNC_SELECTED_COMPANY", company: matched })
  }, [state.draft.companyName, companyOptions, state.selectedCompany])

  React.useEffect(() => {
    if (!state.statusMessage) return
    const t = setTimeout(() => dispatch({ type: "CLEAR_MESSAGES" }), 4000)
    return () => clearTimeout(t)
  }, [state.statusMessage])

  const handleSubmit = React.useCallback(async () => {
    if (!canSubmit(state) || state.isSubmitting) return
    dispatch({ type: "START_SUBMIT" })
    try {
      const payload = buildPayload(state)
      const result = onCreateSetup ? await onCreateSetup(payload) : undefined
      dispatch({ type: "SUBMIT_SUCCESS", message: "Intelligence launched successfully." })
      const accountId = resolveAccountId(result, state.selectedCompany)
      if (accountId && onNavigateToWorkspace) onNavigateToWorkspace("/workspace", accountId)
    } catch (err) {
      dispatch({ type: "SUBMIT_ERROR", message: err instanceof Error ? err.message : "Something went wrong. Please try again." })
    }
  }, [state, onCreateSetup, onNavigateToWorkspace])

  return (
    <TooltipProvider delayDuration={300}>
      <div className={cn("flex w-full flex-col gap-3 rounded-3xl border border-border/60 bg-background p-4 shadow-sm", className)}>
        <PromptHeader mode={state.mode} onModeChange={(m) => dispatch({ type: "SET_MODE", mode: m })} state={state} dispatch={dispatch} recentActivities={recentActivities} />

        <div className="relative flex flex-col gap-1 px-2">
          {state.selectedCompany && (
            <div className="mb-1 flex items-center gap-1.5">
              <span className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                <Building2 className="h-3 w-3 text-muted-foreground" />
                {state.selectedCompany.name}
                {state.selectedCompany.industry && <span className="text-muted-foreground"> · {state.selectedCompany.industry}</span>}
              </span>
            </div>
          )}
          <Textarea
            value={state.promptText}
            onChange={(e) => dispatch({ type: "APPLY_PROMPT_TEXT", promptText: e.target.value })}
            placeholder="Describe the account, buying context, pain points, and desired outcome — or use the controls below to build your value case..."
            className="min-h-[160px] resize-none rounded-2xl border-0 bg-transparent p-0 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
            aria-label="Prompt input"
          />
        </div>

        <AttachmentPills attachments={state.attachments} />
        <ContextChips state={state} dispatch={dispatch} />
        <StatusBanner successMessage={state.successMessage} statusMessage={state.statusMessage} errorMessage={state.errorMessage} />

        <Separator className="mx-2" />

        <PromptFooter state={state} dispatch={dispatch} companyOptions={companyOptions} onAttachContent={onAttachContent} onOpenVoiceInput={onOpenVoiceInput} onSubmit={handleSubmit} />
      </div>
    </TooltipProvider>
  )
}
