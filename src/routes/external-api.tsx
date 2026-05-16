import { createFileRoute } from '@tanstack/react-router'
import { ExternalApiPage } from '@/pages/ExternalApiPage'

export const Route = createFileRoute('/external-api')({
  component: ExternalApiPage,
})
