import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiFileText, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiDollarSign,
  FiTerminal,
  FiUserX,
  FiClock,
  FiTool
} from 'react-icons/fi';
import './css/styles.css';


const TermsOfService: React.FC = () => {
  return (
    <div className="terms-of-service scrollable-page">
      <div className="terms-container">
        {/* Header */}
        <motion.div 
          className="terms-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="terms-icon">
            <FiFileText />
          </div>
          <h1>Terms of Service</h1>
          <p className="terms-subtitle">Effective: January 15, 2026</p>
          <p className="terms-description">
            Please read these Terms of Service carefully before using the Sun Computers 
            Service Center management system. By accessing or using our services, you 
            agree to be bound by these terms.
          </p>
        </motion.div>

        {/* Quick Navigation */}
        <motion.div 
          className="terms-navigation"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3>Quick Links</h3>
          <div className="nav-links">
            <a href="#acceptance">Acceptance</a>
            <a href="#accounts">Accounts</a>
            <a href="#services">Services</a>
            <a href="#payments">Payments</a>
            <a href="#liability">Liability</a>
            <a href="#termination">Termination</a>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="terms-content">
          <motion.section 
            id="acceptance"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2>
              <FiCheckCircle /> Acceptance of Terms
            </h2>
            <div className="terms-grid">
              <div className="term-card">
                <h3>Agreement</h3>
                <p>By accessing our service management system, you agree to these Terms of Service.</p>
              </div>
              <div className="term-card">
                <h3>Eligibility</h3>
                <p>You must be at least 18 years old and have legal capacity to enter into agreements.</p>
              </div>
              <div className="term-card">
                <h3>Modifications</h3>
                <p>We reserve the right to modify these terms at any time. Continued use constitutes acceptance.</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="accounts"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <h2>
              <FiTerminal /> User Accounts
            </h2>
            <div className="account-rules">
              <div className="rule-item">
                <div className="rule-icon">
                  <FiAlertCircle />
                </div>
                <div className="rule-content">
                  <h3>Account Security</h3>
                  <p>You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.</p>
                </div>
              </div>
              <div className="rule-item">
                <div className="rule-icon">
                  <FiUserX />
                </div>
                <div className="rule-content">
                  <h3>Accurate Information</h3>
                  <p>You must provide accurate and complete information when creating an account and keep it updated.</p>
                </div>
              </div>
              <div className="rule-item">
                <div className="rule-icon">
                  <FiTool />
                </div>
                <div className="rule-content">
                  <h3>Account Termination</h3>
                  <p>We reserve the right to suspend or terminate accounts that violate these terms or engage in fraudulent activities.</p>
                </div>
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="services"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <h2>Service Management</h2>
            <div className="service-details">
              <div className="service-card">
                <h3>Service Requests</h3>
                <ul>
                  <li>All service requests must be submitted through the official system</li>
                  <li>Provide accurate device and issue information</li>
                  <li>Agree to diagnostic procedures and cost estimates</li>
                </ul>
              </div>
              <div className="service-card">
                <h3>Warranty & Repairs</h3>
                <ul>
                  <li>Original manufacturer warranties may apply</li>
                  <li>Service warranty: 90 days on repairs</li>
                  <li>Warranty void if device is tampered with externally</li>
                </ul>
              </div>
              <div className="service-card">
                <h3>Turnaround Time</h3>
                <ul>
                  <li>Standard repairs: 3-5 business days</li>
                  <li>Complex repairs: 7-10 business days</li>
                  <li>Express service available at additional cost</li>
                </ul>
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="payments"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <h2>
              <FiDollarSign /> Payments & Pricing
            </h2>
            <div className="payment-grid">
              <div className="payment-card">
                <h3>Cost Estimates</h3>
                <p className="payment-note">All estimates are preliminary. Final cost may vary based on actual repair requirements.</p>
              </div>
              <div className="payment-card">
                <h3>Payment Terms</h3>
                <ul>
                  <li>50% deposit required for all repairs</li>
                  <li>Balance due upon service completion</li>
                  <li>Accepted: Cash, Cards, UPI, Bank Transfer</li>
                </ul>
              </div>
              <div className="payment-card">
                <h3>Refund Policy</h3>
                <ul>
                  <li>Deposits refundable if service cancelled before work begins</li>
                  <li>No refunds after repair work has started</li>
                  <li>Refunds processed in 7-10 business days</li>
                </ul>
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="liability"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h2>Limitation of Liability</h2>
            <div className="liability-info">
              <div className="liability-card warning">
                <h3>Data Loss</h3>
                <p>
                  We are not liable for data loss during repairs. Customers are responsible for 
                  backing up their data before submitting devices for service.
                </p>
              </div>
              <div className="liability-card warning">
                <h3>Device Damage</h3>
                <p>
                  While we take utmost care, we are not liable for pre-existing conditions or 
                  damages that occur during normal repair procedures.
                </p>
              </div>
              <div className="liability-card">
                <h3>Maximum Liability</h3>
                <p>
                  Our maximum liability for any claim shall not exceed the total amount paid 
                  for the specific service in question.
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            id="termination"
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <h2>
              <FiClock /> Termination
            </h2>
            <div className="termination-details">
              <div className="termination-card">
                <h3>By User</h3>
                <p>You may terminate your account at any time by contacting customer support.</p>
              </div>
              <div className="termination-card">
                <h3>By Company</h3>
                <p>We may terminate or suspend access immediately for violations of these terms.</p>
              </div>
              <div className="termination-card">
                <h3>Effect of Termination</h3>
                <p>Upon termination, your right to use the service will cease immediately.</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <h2>Intellectual Property</h2>
            <div className="ip-info">
              <div className="ip-card">
                <h3>Our Content</h3>
                <p>
                  All content, features, and functionality of our service management system 
                  are owned by Sun Computers and are protected by copyright and other 
                  intellectual property laws.
                </p>
              </div>
              <div className="ip-card">
                <h3>Your Content</h3>
                <p>
                  You retain ownership of any data you submit through our system. By submitting 
                  data, you grant us a license to use it for service delivery purposes.
                </p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="terms-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
          >
            <h2>Governing Law</h2>
            <div className="law-info">
              <div className="law-card">
                <h3>Jurisdiction</h3>
                <p>These Terms shall be governed by the laws of India.</p>
              </div>
              <div className="law-card">
                <h3>Dispute Resolution</h3>
                <p>Any disputes shall be resolved through arbitration in Tech City, India.</p>
              </div>
              <div className="law-card">
                <h3>Severability</h3>
                <p>If any provision is found invalid, the remaining provisions remain in effect.</p>
              </div>
            </div>
          </motion.section>

          <motion.section 
            className="terms-section acceptance-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <div className="acceptance-box">
              <h3>Acceptance of Terms</h3>
              <p>
                By using the Sun Computers Service Center management system, you acknowledge 
                that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <div className="acceptance-actions">
                <button className="btn-primary">I Accept Terms</button>
                <button className="btn-outline">Download PDF Version</button>
              </div>
            </div>
          </motion.section>
        </div>

        {/* Footer */}
        <motion.footer 
          className="terms-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
        >
          <div className="footer-content">
            <p>© 2026 Sun Computers Service Center. All rights reserved.</p>
            <p className="footer-note">
              For questions about these Terms of Service, please contact: 
              <a href="mailto:legal@suncomputers.com"> legal@suncomputers.com</a>
            </p>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default TermsOfService;