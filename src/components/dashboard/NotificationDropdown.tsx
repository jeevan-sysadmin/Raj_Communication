import { FiAlertCircle, FiCreditCard, FiPackage } from "react-icons/fi";
import type { Notification } from "./types";

interface NotificationDropdownProps {
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onMarkAllRead?: () => void;
  onClearAll?: () => void;
}

const NotificationDropdown = ({
  notifications,
  onNotificationClick,
  onMarkAllRead,
  onClearAll,
}: NotificationDropdownProps) => {
  const unreadNotifications = notifications.filter((notification) => !notification.is_read);

  return (
    <div className="notification-dropdown-content">
      <div className="notification-header">
        <h4>Notifications ({unreadNotifications.length})</h4>
        <div className="notification-actions">
          <button
            type="button"
            className="notification-action-btn"
            onClick={onMarkAllRead}
            disabled={notifications.length === 0 || !onMarkAllRead}
          >
            Mark all read
          </button>
          <button
            type="button"
            className="notification-action-btn danger"
            onClick={onClearAll}
            disabled={notifications.length === 0 || !onClearAll}
          >
            Clear all
          </button>
        </div>
      </div>
      {unreadNotifications.length === 0 ? (
        <p className="no-notifications">No new notifications</p>
      ) : (
        unreadNotifications.map((notification) => (
          <div
            key={notification.id}
            className="notification-item"
            onClick={() => onNotificationClick(notification)}
          >
            <div className="notification-icon">
              {notification.type === "order" && <FiPackage />}
              {notification.type === "payment" && <FiCreditCard />}
              {notification.type === "alert" && <FiAlertCircle />}
            </div>
            <div className="notification-content">
              <h5>{notification.title}</h5>
              <p>{notification.message}</p>
              <span className="notification-time">
                {new Date(notification.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default NotificationDropdown;
