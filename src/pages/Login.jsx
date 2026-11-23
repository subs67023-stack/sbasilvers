import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AuthForm from '../components/auth/AuthForm';

const Login = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-purple-600"></div>
      </div>
    );
  }

  // If user is already authenticated, redirect them accordingly
  if (user) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/under-progress'} replace />;
  }

  return <AuthForm />;
};

export default Login;