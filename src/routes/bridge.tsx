import { createFileRoute } from '@tanstack/react-router'
import { BridgePage } from '@/pages/BridgePage'

export const Route = createFileRoute('/bridge')({
  component: BridgePage,
})
