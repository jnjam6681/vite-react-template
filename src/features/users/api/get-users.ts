import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { User } from '../types'
import { userKeys } from './keys'

type Filters = { search?: string }

function fetchUsers(filters: Filters): Promise<User[]> {
  const params = new URLSearchParams(
    filters.search ? { search: filters.search } : {},
  )
  return apiClient<User[]>(`/users?${params}`)
}

export function useUsers(filters: Filters = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: () => fetchUsers(filters),
  })
}
