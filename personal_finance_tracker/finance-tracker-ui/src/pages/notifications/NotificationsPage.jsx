import { useEffect, useState } from "react";
import DashboardLayout from "../../components/Layout/DashboardLayout";
import api from "../../api/axios"; // your axios wrapper

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/notifications/")
      .then((res) => {
        setNotifications(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch notifications", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <h2 className="text-2xl font-bold mb-4">Notifications</h2>
      <div className="bg-white p-4 rounded shadow">
        {loading ? (
          <p>Loading...</p>
        ) : notifications.length === 0 ? (
          <p>No notifications found.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className={`p-3 rounded border ${notif.read ? "bg-gray-100" : "bg-yellow-50"}`}
              >
                <div className="font-medium">{notif.message}</div>
                <div className="text-sm text-gray-500">{notif.date}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
};

export default NotificationsPage;
