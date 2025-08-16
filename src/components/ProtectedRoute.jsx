import { useAuth } from '../providers/AuthProvider';
import { LoadingSpinner } from '../components/ErrorComponents';
import LoginPage from '../pages/LoginPage';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return children;
}
