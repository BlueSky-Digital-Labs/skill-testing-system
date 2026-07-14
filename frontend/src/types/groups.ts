export interface GroupMember {
  id: number
  email: string
  first_name: string
  last_name: string
}

export interface Group {
  id: string
  name: string
  description: string
  is_active: boolean
  member_count: number
  created_at: string
  updated_at: string
}

export interface GroupDetail extends Group {
  members: GroupMember[]
  created_by_id: number | null
}

export interface MembershipNotFound {
  user_ids: number[]
  emails: string[]
}

export interface MembershipResult {
  group: GroupDetail
  added?: GroupMember[]
  removed?: GroupMember[]
  already_members?: GroupMember[]
  not_members?: GroupMember[]
  invalid_users?: GroupMember[]
  not_found: MembershipNotFound
}

export interface PaginatedGroups {
  count: number
  next: string | null
  previous: string | null
  results: Group[]
}
