import { 
  Bell, 
  UserCircle, 
  LogOut, 
  Menu, 
  ChevronDown, 
  Sun, 
  Moon, 
  Settings, 
  CreditCard,
  DollarSign,
  TrendingDown,
  FileText,
  PiggyBank
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Navbar = ({ onMenuClick, title = "Personal Finance Tracker", darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);

  const [notifications, setNotifications] = useState([
    { id: 1, message: "Your monthly budget has been updated", read: false, time: "2 hours ago", type: "budget" },
    { id: 2, message: "New transaction recorded: $25.99 at Amazon", read: false, time: "1 day ago", type: "expense" },
    { id: 3, message: "Weekly spending report is ready", read: true, time: "3 days ago", type: "report" },
    { id: 4, message: "Savings goal reached: Vacation Fund", read: false, time: "1 week ago", type: "savings" },
  ]);

  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifications]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = () => {
    setShowNotifications(!showNotifications);
    setShowProfileMenu(false);
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
    setShowNotifications(false);
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'budget': return <DollarSign size={16} className="text-blue-500" />;
      case 'expense': return <TrendingDown size={16} className="text-red-500" />;
      case 'report': return <FileText size={16} className="text-purple-500" />;
      case 'savings': return <PiggyBank size={16} className="text-green-500" />;
      default: return <Bell size={16} className="text-yellow-500" />;
    }
  };

  return (
    <nav className={`sticky top-0 z-50 px-4 py-3 flex items-center justify-between shadow-sm transition-colors duration-300 ${
      darkMode ? 'bg-gray-800 text-gray-100 border-b border-gray-700' : 'bg-white text-gray-800 border-b border-gray-200'
    }`}>
      <div className="flex items-center">
        <button 
          onClick={onMenuClick}
          className="mr-4 p-1 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 lg:hidden transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={24} className={darkMode ? 'text-gray-300' : 'text-gray-600'} />
        </button>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
      </div>
      
      <div className="flex items-center gap-4 md:gap-6">
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
          aria-label={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
        >
          {darkMode ? (
            <Sun className="text-yellow-300" size={20} />
          ) : (
            <Moon className="text-gray-600" size={20} />
          )}
        </button>

        <div 
          ref={notificationsRef}
          className="relative"
        >
          <button
            onClick={handleNotificationClick}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className={darkMode ? 'text-gray-300' : 'text-gray-600'} size={20} />
            {unreadCount > 0 && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-0 right-0 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full"
              >
                {unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`absolute right-0 mt-2 w-80 rounded-lg shadow-xl py-1 ${
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                } z-50`}
              >
                <div className="px-4 py-3 border-b dark:border-gray-600 flex justify-between items-center">
                  <h3 className="font-semibold">Notifications</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button 
                        onClick={markAllAsRead}
                        className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Mark all as read
                      </button>
                    )}
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Close
                    </button>
                  </div>
                </div>
                {notifications.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div 
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors ${
                          !notification.read ? 'bg-blue-50 dark:bg-gray-800' : ''
                        }`}
                        onClick={() => {
                          markAsRead(notification.id);
                          setShowNotifications(false);
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm">{notification.message}</p>
                            <p className="text-xs mt-1 text-gray-500 dark:text-gray-400">
                              {notification.time}
                            </p>
                          </div>
                          {!notification.read && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No new notifications
                  </div>
                )}
                <div className="px-4 py-2 border-t dark:border-gray-600 text-center">
                  <button 
                    onClick={() => navigate('/notifications')}
                    className="text-sm text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View all notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div 
          ref={profileRef}
          className="relative"
        >
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="User profile"
          >
            <div className="relative">
              <UserCircle className={darkMode ? 'text-gray-300' : 'text-gray-600'} size={24} />
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-500 rounded-full border border-white dark:border-gray-800"></div>
            </div>
            <ChevronDown 
              size={16} 
              className={`transition-transform duration-200 ${
                showProfileMenu ? 'rotate-180' : ''
              } ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
            />
          </button>

          <AnimatePresence>
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={`absolute right-0 mt-2 w-56 rounded-lg shadow-xl py-1 ${
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                } z-50`}
              >
                <div className="px-4 py-3 border-b dark:border-gray-600">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">john@example.com</p>
                </div>
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <UserCircle className="mr-3" size={16} />
                  Profile
                </button>
                <button
                  onClick={() => {
                    navigate("/settings");
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <Settings className="mr-3" size={16} />
                  Settings
                </button>
                <button
                  onClick={() => {
                    navigate("/billing");
                    setShowProfileMenu(false);
                  }}
                  className="flex items-center w-full text-left px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <CreditCard className="mr-3" size={16} />
                  Billing
                </button>
                <div className="border-t border-gray-200 dark:border-gray-600"></div>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <LogOut className="mr-3" size={16} />
                  Logout
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
