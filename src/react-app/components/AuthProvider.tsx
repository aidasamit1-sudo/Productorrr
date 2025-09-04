import { AuthProvider } from '@getmocha/users-service/react';
import { ReactNode } from 'react';

interface MochaAuthProviderProps {
  children: ReactNode;
}

export default function MochaAuthProvider({ children }: MochaAuthProviderProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
