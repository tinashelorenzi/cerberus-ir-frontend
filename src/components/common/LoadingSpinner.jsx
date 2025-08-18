const LoadingSpinner = ({ message = "Loading..." }) => {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cerberus-dark">
        <div className="text-center">
          {/* Cerberus Logo */}
          <div className="cerberus-logo text-3xl mb-6 animate-pulse">
            <span className="text-white">Cerberus</span>{' '}
            <span className="text-brand">IR</span>
          </div>
          
          {/* Spinner */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto mb-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cerberus-green"></div>
            </div>
            
            {/* Loading message */}
            <p className="text-gray-400 text-sm animate-pulse">{message}</p>
          </div>
          
          {/* Additional loading dots */}
          <div className="flex justify-center space-x-1 mt-4">
            <div className="w-2 h-2 bg-cerberus-green rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-cerberus-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-cerberus-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    );
  };
  
  export default LoadingSpinner;