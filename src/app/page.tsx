import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Venture Deck',
}


export default async function Home() {
  // Auth bypassed for local development
  redirect('/dashboard')
}
