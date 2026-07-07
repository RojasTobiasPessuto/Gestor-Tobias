import { DollarSign } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { signInWithGoogle } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 360,
          width: '100%',
          padding: '2.5rem 2rem',
          background: '#1a1d27',
          border: '1px solid #2e3244',
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
          <DollarSign size={40} color="#6366f1" />
        </div>
        <h1 style={{ marginBottom: '0.5rem' }}>Gestor</h1>
        <p style={{ color: '#8b8d9e', marginBottom: '1.75rem' }}>
          Iniciá sesión para acceder a tus finanzas
        </p>
        <button type="button" onClick={() => signInWithGoogle()} style={{ width: '100%' }}>
          Iniciar sesión con Google
        </button>
      </div>
    </div>
  );
}
