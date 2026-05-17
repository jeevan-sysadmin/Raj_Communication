import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  FiCalendar,
  FiCheckCircle,
  FiEdit,
  FiPackage,
  FiPieChart,
  FiPrinter,
  FiSearch,
  FiTrendingUp,
} from "react-icons/fi";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { Activity, Order } from "../types";
import { formatCurrency, formatDisplayDate } from "../utils";

interface StatCard {
  id: number;
  title: string;
  value: string;
  change: string;
  icon: ReactNode;
  color: string;
  filter: () => void;
}

interface ChartDatum {
  [key: string]: string | number;
  name: string;
  value: number;
  color: string;
}

interface DashboardOverviewTabProps {
  statsData: StatCard[];
  orders: Order[];
  activities: Activity[];
  searchTerm: string;
  dashboardSearchResults: Order[];
  onSetActiveTab: (tab: string) => void;
  onSetFilterStatus: (status: string) => void;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onPrintReceipt: (order: Order) => void;
  getPriorityColor: (priority: string) => string;
}

const renderCustomLabel = (props: { name?: string; percent?: number }) =>
  `${props.name || ""}: ${((props.percent || 0) * 100).toFixed(0)}%`;

const DashboardOverviewTab = ({
  statsData,
  orders,
  activities,
  searchTerm,
  dashboardSearchResults,
  onSetActiveTab,
  onSetFilterStatus,
  onViewOrder,
  onEditOrder,
  onPrintReceipt,
  getPriorityColor,
}: DashboardOverviewTabProps) => {
  const statusData: ChartDatum[] = [
    { name: "Delivered", value: orders.filter((o) => o.status === "delivered").length, color: "#8B5CF6" },
    { name: "Ready", value: orders.filter((o) => o.status === "ready").length, color: "#F59E0B" },
    { name: "Completed", value: orders.filter((o) => o.status === "completed").length, color: "#06B6D4" },
    { name: "Process", value: orders.filter((o) => o.status === "process").length, color: "#8B5CF6" },
    { name: "Pending", value: orders.filter((o) => o.status === "pending").length, color: "#6B7280" },
    { name: "Scheduled", value: orders.filter((o) => o.status === "scheduled").length, color: "#EC4899" },
    { name: "Cancelled", value: orders.filter((o) => o.status === "cancelled").length, color: "#DC2626" },
  ];

  const priorityChartData: ChartDatum[] = [
    { name: "High", value: orders.filter((o) => o.priority === "high").length, color: "#EF4444" },
    { name: "Medium", value: orders.filter((o) => o.priority === "medium").length, color: "#F59E0B" },
    { name: "Low", value: orders.filter((o) => o.priority === "low").length, color: "#10B981" },
    { name: "Urgent", value: orders.filter((o) => o.priority === "urgent").length, color: "#DC2626" },
  ];

  const rows = searchTerm ? dashboardSearchResults.slice(0, 10) : orders.filter((order) => order.status === "pending").slice(0, 5);

  return (
    <>
      <div className="stats-grid">
        {statsData.map((stat, index) => (
          <motion.div key={stat.id} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} whileHover={{ y: -5, cursor: "pointer" }} onClick={stat.filter}>
            <div className="stat-icon-container" style={{ backgroundColor: stat.color }}>{stat.icon}</div>
            <div className="stat-content">
              <p className="stat-title">{stat.title}</p>
              <h3 className="stat-value">{stat.value}</h3>
              <div className="stat-change"><FiTrendingUp /><span>{stat.change}</span></div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="charts-section">
        {[{ title: "Order Status Distribution", description: "Current order status overview", data: statusData }, { title: "Priority Distribution", description: "Order priority levels overview", data: priorityChartData }].map((chart) => (
          <div className="chart-card" key={chart.title}>
            <div className="chart-header"><h3>{chart.title}</h3><p>{chart.description}</p></div>
            <div className="chart-container">
              {orders.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={chart.data.filter((item) => item.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value" label={renderCustomLabel}>
                      {chart.data.filter((item) => item.value > 0).map((entry, index) => <Cell key={`${chart.title}-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} orders`, "Count"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-chart"><FiPieChart className="empty-icon" /><p>No orders data available</p></div>
              )}
            </div>
          </div>
        ))}
      </div>

      {activities.length > 0 && (
        <div className="activities-section">
          <div className="section-header"><div className="section-title"><h2>Recent Activities</h2><p>Latest system activities</p></div></div>
          <div className="activities-list">
            {activities.slice(0, 5).map((activity, index) => (
              <motion.div key={`${activity.timestamp}-${index}`} className="activity-item" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                <div className="activity-icon"><FiCheckCircle /></div>
                <div className="activity-content"><p>{activity.activity}</p><span className="activity-time">{activity.timestamp}</span></div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="orders-section">
        <div className="section-header">
          <div className="section-title">
            <h2>{searchTerm ? "Search Results" : "Pending Orders"}</h2>
            <p>{searchTerm ? `Found ${dashboardSearchResults.length} orders matching "${searchTerm}"` : "Orders requiring immediate attention"}</p>
          </div>
          {!searchTerm && <button className="btn outline" onClick={() => { onSetActiveTab("orders"); onSetFilterStatus("pending"); }}>View All Pending Orders</button>}
        </div>

        <div className="table-container">
          {rows.length > 0 ? (
            <table className="orders-table">
              <thead><tr><th>Order Code</th><th>Product</th><th>Client</th><th>Staff</th><th>Priority</th><th>Est. Delivery</th><th>Price</th><th>Actions</th></tr></thead>
              <tbody>
                {rows.map((order, index) => (
                  <motion.tr key={order.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} whileHover={{ backgroundColor: "#f8fafc", cursor: "pointer" }} onClick={() => onViewOrder(order)}>
                    <td><div className="order-id-cell"><span className="order-id">{order.order_code}</span></div></td>
                    <td><div className="product-cell"><FiPackage className="product-icon" /><span>{order.product_name}</span></div></td>
                    <td><div className="client-cell"><div className="client-avatar-placeholder">{order.client_name?.charAt(0) || "C"}</div><div className="client-info"><span className="client-name">{order.client_name}</span><span className="client-phone">{order.client_phone}</span></div></div></td>
                    <td><span className="staff-name">{order.staff_name || "Not assigned"}{order.staff_email && <small className="staff-email">{order.staff_email}</small>}</span></td>
                    <td><div className="priority-cell"><div className="priority-dot" style={{ backgroundColor: getPriorityColor(order.priority) }}></div><span className="priority-label">{order.priority}</span></div></td>
                    <td><div className="date-cell"><FiCalendar /><span>{formatDisplayDate(order.estimated_delivery_date)}</span></div></td>
                    <td><div className="price-cell"><span className="price">Rs. {formatCurrency(order.final_cost || order.estimated_cost)}</span></div></td>
                    <td><div className="action-buttons"><motion.button className="action-btn edit" onClick={(e) => { e.stopPropagation(); onEditOrder(order); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Edit Order"><FiEdit /></motion.button><motion.button className="action-btn print" onClick={(e) => { e.stopPropagation(); onPrintReceipt(order); }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} title="Receipt Options"><FiPrinter /></motion.button></div></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><FiSearch className="empty-icon" /><h3>{searchTerm ? "No results found" : "No pending orders"}</h3><p>{searchTerm ? "Try searching with different keywords" : "All orders are up to date"}</p></div>
          )}
        </div>
      </div>
    </>
  );
};

export default DashboardOverviewTab;

