import { useAuth } from '../providers/AuthProvider';
import { LoadingSpinner } from '../components/ErrorComponents';
import LoginPage from '../pages/LoginPage';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user, token } = useAuth();

  console.log('ProtectedRoute status:', { 
    isAuthenticated, 
    loading, 
    hasUser: !!user, 
    hasToken: !!token 
  });

  if (loading) {
    console.log('ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Not authenticated, showing login');
    return <LoginPage />;
  }

  console.log('ProtectedRoute: Authenticated, showing app');
  return children;
}
