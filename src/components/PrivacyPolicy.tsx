import React from 'react';
import { motion } from 'framer-motion';
import { FiShield, FiLock, FiEye, FiDatabase, FiUserCheck } from 'react-icons/fi';
import './css/styles.css';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="privacy-policy scrollable-page">
      <div className="policy-container">
        {/* Header */}
        <motion.div 
          className="policy-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="policy-icon">
            <FiShield />
          </div>
          <h1>Privacy Policy</h1>
          <p className="policy-subtitle">Last updated: January 15, 2026</p>
          <p className="policy-description">
            This Privacy Policy describes how Raj Communication Service Center collects, uses, 
            and protects your information when you use our service management system.
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="policy-content">
          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h2>
              <FiDatabase /> Information We Collect
            </h2>
            <div className="info-cards">
              <div className="info-card">
                <h3>Personal Information</h3>
                <ul>
                  <li>Name and contact details</li>
                  <li>Email address</li>
                  <li>Phone number</li>
                  <li>Address information</li>
                </ul>
              </div>
              <div className="info-card">
                <h3>Service Information</h3>
                <ul>
                  <li>Device/service details</li>
                  <li>Repair history</li>
                  <li>Warranty information</li>
                  <li>Payment details</li>
                </ul>
              </div>
              <div className="info-card">
                <h3>System Information</h3>
                <ul>
                  <li>Login credentials</li>
                  <li>Usage patterns</li>
                  <li>IP address</li>
                  <li>Browser information</li>
                </ul>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2>
              <FiEye /> How We Use Your Information
            </h2>
            <div className="usage-grid">
              <div className="usage-item">
                <div className="usage-icon">
                  <FiUserCheck />
                </div>
                <div className="usage-content">
                  <h3>Service Delivery</h3>
                  <p>To process and track your service requests, communicate about repairs, and provide updates.</p>
                </div>
              </div>
              <div className="usage-item">
                <div className="usage-icon">
                  <FiLock />
                </div>
                <div className="usage-content">
                  <h3>Account Management</h3>
                  <p>To create and manage your account, authenticate users, and provide customer support.</p>
                </div>
              </div>
              <div className="usage-item">
                <div className="usage-icon">
                  <FiShield />
                </div>
                <div className="usage-content">
                  <h3>Security & Compliance</h3>
                  <p>To protect our systems, detect fraud, and comply with legal obligations.</p>
                </div>
              </div>
              <div className="usage-item">
                <div className="usage-icon">
                  <FiDatabase />
                </div>
                <div className="usage-content">
                  <h3>System Improvement</h3>
                  <p>To analyze usage patterns and improve our service management system.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2>
              <FiLock /> Data Security
            </h2>
            <div className="security-grid">
              <div className="security-card">
                <h3>Encryption</h3>
                <p>All sensitive data is encrypted using industry-standard protocols (SSL/TLS).</p>
              </div>
              <div className="security-card">
                <h3>Access Control</h3>
                <p>Strict access controls limit data access to authorized personnel only.</p>
              </div>
              <div className="security-card">
                <h3>Regular Audits</h3>
                <p>Regular security audits and vulnerability assessments are conducted.</p>
              </div>
              <div className="security-card">
                <h3>Backup & Recovery</h3>
                <p>Regular backups ensure data integrity and availability.</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2>Your Rights</h2>
            <div className="rights-list">
              <div className="right-item">
                <span className="right-number">01</span>
                <div className="right-content">
                  <h3>Access Your Data</h3>
                  <p>Request access to the personal data we hold about you.</p>
                </div>
              </div>
              <div className="right-item">
                <span className="right-number">02</span>
                <div className="right-content">
                  <h3>Data Correction</h3>
                  <p>Request corrections to inaccurate or incomplete data.</p>
                </div>
              </div>
              <div className="right-item">
                <span className="right-number">03</span>
                <div className="right-content">
                  <h3>Data Deletion</h3>
                  <p>Request deletion of your personal data under certain circumstances.</p>
                </div>
              </div>
              <div className="right-item">
                <span className="right-number">04</span>
                <div className="right-content">
                  <h3>Opt-Out</h3>
                  <p>Opt-out of marketing communications at any time.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2>Data Retention</h2>
            <div className="retention-info">
              <div className="retention-card">
                <h3>Active Accounts</h3>
                <p className="retention-period">Until account closure + 3 years</p>
                <p>Service history and account data</p>
              </div>
              <div className="retention-card">
                <h3>Financial Records</h3>
                <p className="retention-period">7 years</p>
                <p>As required by tax and accounting laws</p>
              </div>
              <div className="retention-card">
                <h3>Inactive Accounts</h3>
                <p className="retention-period">5 years</p>
                <p>After last activity, then anonymized</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2>Third-Party Services</h2>
            <div className="third-party-info">
              <p>We use trusted third-party services for:</p>
              <ul className="service-list">
                <li>
                  <strong>Payment Processing:</strong> Secure payment gateways (no card data stored)
                </li>
                <li>
                  <strong>Hosting Services:</strong> Secure cloud infrastructure providers
                </li>
                <li>
                  <strong>Analytics:</strong> Anonymous usage analytics for system improvement
                </li>
                <li>
                  <strong>Communication:</strong> Email and SMS service providers
                </li>
              </ul>
              <p className="disclaimer">
                All third-party providers are GDPR-compliant and maintain strict data protection standards.
              </p>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section contact-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <h2>Contact Information</h2>
            <div className="contact-grid">
              <div className="contact-card">
                <h3>Data Protection Officer</h3>
                <p>Email: dpo@rajcommunication.com</p>
                <p>Phone: +91 98765 43210</p>
              </div>
              <div className="contact-card">
                <h3>Privacy Concerns</h3>
                <p>Email: privacy@rajcommunication.com</p>
                <p>Response time: 48 hours</p>
              </div>
              <div className="contact-card">
                <h3>Office Address</h3>
                <p>123 Service Lane</p>
                <p>Tech City, IN 560001</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="policy-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <div className="policy-updates">
              <h2>Policy Updates</h2>
              <p>
                We may update this Privacy Policy periodically. Significant changes will be 
                notified via email or system notification. Continued use of our services 
                after changes constitutes acceptance of the updated policy.
              </p>
              <div className="update-timeline">
                <div className="timeline-item">
                  <div className="timeline-date">Jan 2026</div>
                  <div className="timeline-content">Current version</div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-date">Jul 2025</div>
                  <div className="timeline-content">Enhanced data rights section</div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-date">Jan 2025</div>
                  <div className="timeline-content">Initial policy implementation</div>
                </div>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.footer 
          className="policy-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <div className="footer-content">
            <p>Â© 2026 Raj Communication Service Center. All rights reserved.</p>
            <p className="footer-note">
              This Privacy Policy is effective from January 15, 2026. For any questions 
              or concerns about your privacy, please contact our Data Protection Officer.
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
