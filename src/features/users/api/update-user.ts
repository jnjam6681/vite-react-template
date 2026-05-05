import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { User } from '../types'
import { userKeys } from './keys'

type UpdateUserInput = { id: string; name: string }

function updateUser(input: UpdateUserInput): Promise<User> {
  return apiClient<User>(`/users/${input.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: input.name }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateUser,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: userKeys.detail(variables.id) })
      qc.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
