import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiHelpCircle, 
  FiMessageSquare, 
  FiPhone, 
  FiMail, 
  FiClock,
  FiChevronDown,
  FiChevronUp,
  FiSearch,
  FiVideo,
  FiBook,
  FiUsers,
  FiDownload,
  FiTerminal
} from 'react-icons/fi';
import './css//SupportCenter.css';

const SupportCenter: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact' | 'resources'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // FAQ Data
  const faqs = [
    {
      id: 1,
      question: "How do I create a new service order?",
      answer: "Navigate to the Orders tab and click 'New Order'. Fill in the required details including client information, device details, and service requirements. The system will generate an order code automatically."
    },
    {
      id: 2,
      question: "How can I track my repair status?",
      answer: "Use the order code provided in your receipt to track status in the Orders section. You can also enable notifications for status updates via email or SMS."
    },
    {
      id: 3,
      question: "What payment methods are accepted?",
      answer: "We accept cash, credit/debit cards, UPI payments, and bank transfers. A 50% deposit is required for all repairs, with balance due upon completion."
    },
    {
      id: 4,
      question: "How long do repairs usually take?",
      answer: "Standard repairs: 3-5 business days. Complex repairs: 7-10 business days. Express service (additional charge): 24-48 hours."
    },
    {
      id: 5,
      question: "What is your warranty policy?",
      answer: "We provide a 90-day warranty on all repairs. This covers the specific repair work done. Original manufacturer warranties may also apply."
    },
    {
      id: 6,
      question: "How do I reset my password?",
      answer: "Click 'Forgot Password' on the login page. You'll receive an email with a reset link. Follow the instructions to set a new password."
    },
    {
      id: 7,
      question: "Can I cancel a service order?",
      answer: "Yes, you can cancel before repair work begins for a full deposit refund. Once work has started, cancellation may incur diagnostic charges."
    },
    {
      id: 8,
      question: "How do I download a receipt PDF?",
      answer: "In the Orders section, click the receipt icon next to any order. The system will generate and download a PDF receipt with all service details."
    }
  ];

  // Support Resources
  const resources = [
    {
      id: 1,
      title: "User Manual",
      description: "Complete guide to using the service management system",
      icon: <FiBook />,
      type: "PDF",
      size: "2.4 MB"
    },
    {
      id: 2,
      title: "Video Tutorials",
      description: "Step-by-step video guides for common tasks",
      icon: <FiVideo />,
      type: "Video",
      duration: "15 min"
    },
    {
      id: 3,
      title: "API Documentation",
      description: "Technical documentation for system integration",
      icon: <FiTerminal />,
      type: "Developer",
      pages: "45"
    },
    {
      id: 4,
      title: "Training Materials",
      description: "Staff training presentations and materials",
      icon: <FiUsers />,
      type: "Presentation",
      slides: "28"
    }
  ];

  const handleFaqToggle = (id: number) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const filteredFaqs = faqs.filter(faq => 
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="support-center scrollable-page">
      <div className="support-container">
        {/* Header */}
        <motion.div 
          className="support-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-content">
            <div className="header-icon">
              <FiHelpCircle />
            </div>
            <div className="header-text">
              <h1>Support Center</h1>
              <p className="header-subtitle">Get help with Sun Computers Service Management System</p>
            </div>
          </div>
          
          <div className="support-stats">
            <div className="stat-item">
              <FiClock />
              <span>24/7 Support</span>
            </div>
            <div className="stat-item">
              <FiMessageSquare />
              <span>Live Chat Available</span>
            </div>
            <div className="stat-item">
              <FiUsers />
              <span>Expert Team</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Help Cards */}
        <motion.div 
          className="quick-help"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="help-card urgent">
            <div className="help-icon">
              <FiPhone />
            </div>
            <div className="help-content">
              <h3>Emergency Support</h3>
              <p>Critical system issues</p>
              <a href="tel:+919876543210">+91 98765 43210</a>
            </div>
          </div>
          <div className="help-card">
            <div className="help-icon">
              <FiMail />
            </div>
            <div className="help-content">
              <h3>Email Support</h3>
              <p>General inquiries</p>
              <a href="mailto:support@suncomputers.com">support@suncomputers.com</a>
            </div>
          </div>
          <div className="help-card">
            <div className="help-icon">
              <FiMessageSquare />
            </div>
            <div className="help-content">
              <h3>Live Chat</h3>
              <p>Instant assistance</p>
              <button className="chat-btn">Start Chat</button>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="support-tabs"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'faq' ? 'active' : ''}`}
              onClick={() => setActiveTab('faq')}
            >
              <FiHelpCircle /> FAQ
            </button>
            <button 
              className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
              onClick={() => setActiveTab('contact')}
            >
              <FiPhone /> Contact
            </button>
            <button 
              className={`tab-btn ${activeTab === 'resources' ? 'active' : ''}`}
              onClick={() => setActiveTab('resources')}
            >
              <FiBook /> Resources
            </button>
          </div>

          {/* FAQ Tab */}
          <AnimatePresence mode="wait">
            {activeTab === 'faq' && (
              <motion.div 
                className="tab-content"
                key="faq"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="faq-search">
                  <FiSearch />
                  <input 
                    type="text" 
                    placeholder="Search FAQs..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <div className="faq-list">
                  {filteredFaqs.map((faq, index) => (
                    <motion.div 
                      key={faq.id}
                      className={`faq-item ${expandedFaq === faq.id ? 'expanded' : ''}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div 
                        className="faq-question"
                        onClick={() => handleFaqToggle(faq.id)}
                      >
                        <h3>{faq.question}</h3>
                        <span className="faq-toggle">
                          {expandedFaq === faq.id ? <FiChevronUp /> : <FiChevronDown />}
                        </span>
                      </div>
                      <AnimatePresence>
                        {expandedFaq === faq.id && (
                          <motion.div 
                            className="faq-answer"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <p>{faq.answer}</p>
                            <div className="faq-helpful">
                              <span>Was this helpful?</span>
                              <button className="helpful-btn">Yes</button>
                              <button className="helpful-btn">No</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
                
                {filteredFaqs.length === 0 && (
                  <div className="no-results">
                    <p>No FAQs found matching your search. Try different keywords or contact support.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Contact Tab */}
            {activeTab === 'contact' && (
              <motion.div 
                className="tab-content"
                key="contact"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="contact-grid">
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FiPhone />
                    </div>
                    <h3>Phone Support</h3>
                    <p className="contact-hours">Mon-Fri: 9AM-6PM</p>
                    <p className="contact-number">+91 98765 43210</p>
                    <p className="contact-note">For urgent technical issues</p>
                  </div>
                  
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FiMail />
                    </div>
                    <h3>Email Support</h3>
                    <p className="contact-email">support@suncomputers.com</p>
                    <p className="contact-response">Response time: 24 hours</p>
                    <p className="contact-note">For general inquiries and non-urgent matters</p>
                  </div>
                  
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FiMessageSquare />
                    </div>
                    <h3>Live Chat</h3>
                    <p className="chat-hours">Available: 9AM-8PM</p>
                    <button className="start-chat-btn">Start Live Chat</button>
                    <p className="contact-note">Instant help for quick questions</p>
                  </div>
                  
                  <div className="contact-card">
                    <div className="contact-icon">
                      <FiUsers />
                    </div>
                    <h3>On-site Support</h3>
                    <p className="onsite-hours">By appointment only</p>
                    <p className="onsite-note">Available for enterprise clients</p>
                    <button className="request-btn">Request On-site Visit</button>
                  </div>
                </div>
                
                <div className="contact-form-section">
                  <h3>Send us a Message</h3>
                  <form className="contact-form">
                    <div className="form-group">
                      <input type="text" placeholder="Your Name" required />
                    </div>
                    <div className="form-group">
                      <input type="email" placeholder="Email Address" required />
                    </div>
                    <div className="form-group">
                      <select required>
                        <option value="">Select Issue Type</option>
                        <option value="technical">Technical Issue</option>
                        <option value="billing">Billing Question</option>
                        <option value="feature">Feature Request</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <textarea placeholder="Describe your issue..." rows={4} required></textarea>
                    </div>
                    <button type="submit" className="submit-btn">Send Message</button>
                  </form>
                </div>
              </motion.div>
            )}

            {/* Resources Tab */}
            {activeTab === 'resources' && (
              <motion.div 
                className="tab-content"
                key="resources"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="resources-header">
                  <h3>Support Resources</h3>
                  <p>Download helpful materials and documentation</p>
                </div>
                
                <div className="resources-grid">
                  {resources.map((resource, index) => (
                    <motion.div 
                      key={resource.id}
                      className="resource-card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div className="resource-icon">
                        {resource.icon}
                      </div>
                      <div className="resource-content">
                        <h4>{resource.title}</h4>
                        <p>{resource.description}</p>
                        <div className="resource-meta">
                          <span className="resource-type">{resource.type}</span>
                          <span className="resource-size">
                            {resource.size || resource.duration || `${resource.pages} pages`}
                          </span>
                        </div>
                      </div>
                      <button className="download-btn">
                        <FiDownload />
                      </button>
                    </motion.div>
                  ))}
                </div>
                
                <div className="knowledge-base">
                  <h3>Knowledge Base</h3>
                  <div className="knowledge-grid">
                    <div className="knowledge-card">
                      <h4>Troubleshooting Guides</h4>
                      <ul>
                        <li>Common login issues</li>
                        <li>Order creation errors</li>
                        <li>Report generation problems</li>
                      </ul>
                    </div>
                    <div className="knowledge-card">
                      <h4>Best Practices</h4>
                      <ul>
                        <li>Data backup procedures</li>
                        <li>System maintenance tips</li>
                        <li>Security guidelines</li>
                      </ul>
                    </div>
                    <div className="knowledge-card">
                      <h4>Release Notes</h4>
                      <ul>
                        <li>Latest updates & features</li>
                        <li>Bug fixes and patches</li>
                        <li>Upcoming changes</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Support Status */}
        <motion.div 
          className="support-status"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="status-header">
            <h3>System Status</h3>
            <span className="status-indicator active">All Systems Operational</span>
          </div>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-dot operational"></span>
              <span>Service Management</span>
            </div>
            <div className="status-item">
              <span className="status-dot operational"></span>
              <span>Payment Processing</span>
            </div>
            <div className="status-item">
              <span className="status-dot operational"></span>
              <span>Notification System</span>
            </div>
            <div className="status-item">
              <span className="status-dot maintenance"></span>
              <span>API Services</span>
              <span className="status-note">Scheduled maintenance</span>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer 
          className="support-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="footer-content">
            <p>© 2026 Sun Computers Service Center. All support requests are handled with priority.</p>
            <div className="footer-links">
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
              <a href="#sla">Service Level Agreement</a>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default SupportCenter;
