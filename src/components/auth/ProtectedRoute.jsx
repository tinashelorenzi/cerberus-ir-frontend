import { useAuth } from '../../contexts/AuthContext';
import LoginForm from './LoginForm';
import LoadingSpinner from '../common/LoadingSpinner';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <LoginForm />;
  }

  // Check role-based access if required
  if (requiredRole && user) {
    const userRole = user.role;
    const roleHierarchy = {
      'analyst': 1,
      'senior_analyst': 2,
      'manager': 3,
      'admin': 4
    };

    const requiredLevel = roleHierarchy[requiredRole] || 1;
    const userLevel = roleHierarchy[userRole] || 1;

    if (userLevel < requiredLevel) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-cerberus-dark">
          <div className="card-glass max-w-md mx-auto text-center">
            <div className="text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You don't have permission to access this page. Required role: {requiredRole}
            </p>
            <p className="text-sm text-gray-500">
              Your current role: {userRole}
            </p>
          </div>
        </div>
      );
    }
  }

  // Render protected content
  return children;
};

export default ProtectedRoute;