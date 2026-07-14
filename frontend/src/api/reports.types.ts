export interface IndividualQuestionRow {
  question_id: string
  question_version: number
  question_type: string
  awarded_points: string
  max_points: string
  is_correct: boolean
  topic: string
}

export interface IndividualReport {
  attempt_id: string
  test_id: string
  candidate_id: number
  status: string
  started_at: string
  submitted_at: string | null
  total_awarded: string | null
  total_max: string | null
  passed: boolean | null
  by_topic: Record<string, { awarded?: string; max?: string }>
  questions: IndividualQuestionRow[]
}

export interface TestSummaryReport {
  test_id: string
  attempt_count: number
  completed_count: number
  completion_rate: string
  result_count: number
  passed_count: number
  pass_rate: string
  average_awarded: string
  average_max: string
  average_percent: string
}

export interface QuestionPerformanceRow {
  question_id: string
  question_version: number
  attempts: number
  correct_count: number
  correctness_rate: string
  average_awarded: string
}

export interface QuestionPerformanceReport {
  test_id: string
  questions: QuestionPerformanceRow[]
}

export interface GroupComparisonRow {
  group_id: string
  group_name: string
  member_count: number
  attempt_count: number
  completed_count: number
  completion_rate: string
  result_count: number
  passed_count: number
  pass_rate: string
  average_awarded: string
  average_max: string
  average_percent: string
}

export interface GroupComparisonReport {
  test_id: string
  groups: GroupComparisonRow[]
}

export interface ProgressBucket {
  period_start: string
  period_end: string
  completion_count: number
  average_percent: string
}

export interface ProgressReport {
  group_id: string
  group_name: string
  topic: string | null
  from_dt: string | null
  to_dt: string | null
  buckets: ProgressBucket[]
}

export type ReportExportType =
  | 'individual'
  | 'test_summary'
  | 'question_performance'
  | 'group_comparison'
  | 'progress'

export interface ExportReportResponse {
  download_url: string
  s3_key: string
  expires_in: number
}

export interface ReportExportParameters {
  attempt_id?: string
  test_id?: string
  group_id?: string
  topic?: string
  from_dt?: string
  to_dt?: string
}
