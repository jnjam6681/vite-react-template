import { useUsers } from '@/features/users/api/get-users'
import { useAuthStore } from '@/stores/auth-store'

export function UsersList() {
  const currentUserId = useAuthStore((s) => s.user?.id)
  const { data, isPending, isError } = useUsers()

  if (isPending) return <div>Loading...</div>
  if (isError) return <div>Failed to load users</div>

  return (
    <ul>
      {data.map((u) => (
        <li key={u.id}>
          {u.name} {u.id === currentUserId && '(you)'}
        </li>
      ))}
    </ul>
  )
}
