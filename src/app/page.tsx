import { redirect } from 'next/navigation'

export default async function Home() {
  // Auth bypassed for local development
  redirect('/dashboard')
}
