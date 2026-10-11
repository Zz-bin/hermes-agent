import {
  Button,
  Codicon,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Loader,
  useMutation,
  useQuery
} from '@hermes/plugin-sdk'
import { useState } from 'react'

import { profilesKey, type TaskActions, useKanbanScope } from './api'
import { Avatar, errText, useKanban } from './ui'

export function AssigneeMenu({
  current,
  running,
  actions,
  onSaved
}: {
  current?: string | null
  running: boolean
  actions: TaskActions
  onSaved: () => void
}) {
  const k = useKanban()
  const scope = useKanbanScope()

  const roster = useQuery({
    queryKey: [...profilesKey(scope), actions.sourceKey],
    queryFn: actions.profiles,
    staleTime: 60_000
  })

  const [confirm, setConfirm] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async (profile: string) => {
      await actions.reassign(profile)
      await actions.read()
    },
    onSuccess: onSaved
  })

  const choose = (profile: string) => {
    if (profile === current || mutation.isPending) {
      return
    }

    if (running) {
      setConfirm(profile)
    } else {
      mutation.mutate(profile)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label={k.assignee} className="h-6" disabled={mutation.isPending} size="xs" variant="ghost">
            {current && <Avatar name={current} size="0.875rem" />}
            <span className="max-w-32 truncate">{current || k.unassigned}</span>
            <Codicon name="chevron-down" size="0.65rem" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {roster.isPending && <Loader type="lemniscate-bloom" />}
          {roster.error ? (
            <DropdownMenuItem onSelect={() => void roster.refetch()}>{k.retryRoster}</DropdownMenuItem>
          ) : (
            !roster.isPending &&
            !roster.data?.profiles.length && (
              <>
                <DropdownMenuItem disabled>{k.rosterEmpty}</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void roster.refetch()}>{k.retryRoster}</DropdownMenuItem>
              </>
            )
          )}
          {roster.data?.profiles.map(profile => (
            <DropdownMenuItem
              disabled={profile.name === current || mutation.isPending}
              key={profile.name}
              onSelect={() => choose(profile.name)}
            >
              <Avatar name={profile.name} size="0.875rem" />
              {profile.name}
              {profile.name === current && <Codicon name="check" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {mutation.error && (
        <span className="text-xs text-destructive" role="alert">
          {errText(mutation.error)}
        </span>
      )}
      <ConfirmDialog
        description={confirm ?? ''}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          mutation.mutate(confirm!)
          setConfirm(null)
        }}
        open={confirm !== null}
        title={k.reassignRunning}
      />
    </>
  )
}
