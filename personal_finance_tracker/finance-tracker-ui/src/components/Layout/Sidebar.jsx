import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Handshake, 
  Repeat, 
  PiggyBank, 
  FileText,
  Bell as BellIcon,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const Sidebar = ({ isOpen, onClose, darkMode = false }) => {
  const [openMenu, setOpenMenu] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const location = useLocation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleMenu = (menu) => {
    setOpenMenu(openMenu === menu ? null : menu);
  };

  // Auto-close menu on mobile when clicking a link
  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <Home size={18} className="flex-shrink-0" />,
    },
    {
      name: "Income",
      subItems: [
        { name: "Add Income", path: "/income/add" },
        { name: "View Income", path: "/income" },
      ],
      icon: <TrendingUp size={18} className="flex-shrink-0" />,
    },
    {
      name: "Expense",
      subItems: [
        { name: "Add Expense", path: "/expense/add" },
        { name: "View Expense", path: "/expense" },
      ],
      icon: <TrendingDown size={18} className="flex-shrink-0" />,
    },
    {
      name: "Borrow",
      subItems: [
        { name: "Add Borrow", path: "/borrow/add" },
        { name: "View Borrow", path: "/borrow/view" },
      ],
      icon: <DollarSign size={18} className="flex-shrink-0" />,
    },
    {
      name: "Lend",
      subItems: [
        { name: "Add Lend", path: "/lend/add" },
        { name: "View Lend", path: "/lend/view" },
      ],
      icon: <Handshake size={18} className="flex-shrink-0" />,
    },
    {
      name: "Repayment",
      subItems: [
        { name: "View Repayments", path: "/repayment/view" },
      ],
      icon: <Repeat size={18} className="flex-shrink-0" />,
    },
    {
      name: "Savings",
      subItems: [
        { name: "Add Savings", path: "/savings/addsavings" },
        { name: "Spend Savings", path: "/savings/spendsavings" },
        { name: "View Savings", path: "/savings" },
      ],
      icon: <PiggyBank size={18} className="flex-shrink-0" />,
    },
    {
      name: "Reports",
      subItems: [
        { name: "View Reports", path: "/reports" },
        { name: "Generate Report", path: "/reports/generate" },
      ],
      icon: <FileText size={18} className="flex-shrink-0" />,
    },
    {
      name: "Notifications",
      path: "/notifications",
      icon: <BellIcon size={18} className="flex-shrink-0" />,
    }
  ];

  // Determine active path including sub-items
  const isActive = (path, subItems) => {
    if (path) return location.pathname === path;
    if (subItems) return subItems.some(subItem => location.pathname === subItem.path);
    return false;
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-64 h-screen p-4 z-30 transform transition-all duration-300 ease-in-out
          ${darkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800 shadow-md'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <h2 className={`text-xl font-bold mb-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          Finance Tracker
        </h2>
        
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <div key={item.name}>
              {item.path ? (
                <Link 
                  to={item.path} 
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors 
                    ${darkMode ? 
                      (location.pathname === item.path ? 'bg-blue-900 text-blue-100' : 'hover:bg-gray-700') : 
                      (location.pathname === item.path ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50')}
                    ${darkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ) : (
                <>
                  <button
                    onClick={() => toggleMenu(item.name)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors 
                      ${darkMode ? 
                        (isActive(item.path, item.subItems) ? 'bg-blue-900 text-blue-100' : 'hover:bg-gray-700') : 
                        (isActive(item.path, item.subItems) ? 'bg-blue-50 text-blue-600' : 'hover:bg-blue-50')}
                      ${darkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}
                  >
                    <div className="flex items-center">
                      <span className="mr-3">{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <span>
                      {openMenu === item.name ? 
                        <ChevronUp size={16} /> : 
                        <ChevronDown size={16} />}
                    </span>
                  </button>
                  {openMenu === item.name && (
                    <div className={`ml-8 mt-1 space-y-1 ${darkMode ? 'border-l border-gray-600' : 'border-l border-gray-200'}`}>
                      {item.subItems.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          onClick={handleLinkClick}
                          className={`block px-4 py-2 rounded-lg transition-colors 
                            ${darkMode ? 
                              (location.pathname === subItem.path ? 'bg-blue-800 text-blue-100' : 'hover:bg-gray-700') : 
                              (location.pathname === subItem.path ? 'bg-blue-100 text-blue-600' : 'hover:bg-blue-50')}
                            ${darkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;