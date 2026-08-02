import './globals.css';
import { AuthProvider } from '../context/AuthContext';

export const metadata = {
  title: 'WhatsApp Food Station Admin Dashboard',
  description: 'Manage WhatsApp food orders, live status workflow, and catalog administration.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
