import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect landing root directly to dashboard, which is guarded by our middleware.
  redirect('/dashboard');
}
