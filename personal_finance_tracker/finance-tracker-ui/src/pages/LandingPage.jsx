// LandingPage.jsx
import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 to-purple-800 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-3xl space-y-8 animate-fade-in">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white">
            Take Control of Your <span className="text-indigo-300">Finances</span>
          </h1>
          <p className="text-xl text-indigo-100 opacity-90 max-w-2xl mx-auto">
            Track expenses, visualize spending, and achieve your financial goals with our intuitive personal finance tracker.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            to="/login" 
            className="px-8 py-3 bg-white text-indigo-900 font-medium rounded-lg hover:bg-indigo-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
          >
            Get Started
          </Link>
          <Link 
            to="/signup" 
            className="px-8 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:bg-opacity-10 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Create Account
          </Link>
        </div>
        
        <div className="pt-12 grid grid-cols-3 gap-8 opacity-80">
          {['Expense Tracking', 'Budget Planning', 'Financial Insights'].map((feature) => (
            <div key={feature} className="text-indigo-100">
              <div className="h-1 w-12 bg-indigo-400 mx-auto mb-3"></div>
              <p>{feature}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
