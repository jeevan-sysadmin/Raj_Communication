import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiMapPin, 
  FiPhone, 
  FiMail, 
  FiClock,
  FiMessageSquare,
  FiSend,
  FiCheckCircle,
  FiAlertCircle,
  FiFacebook,
  FiTwitter,
  FiLinkedin,
  FiInstagram
} from 'react-icons/fi';
import './css/Contact.css';

const ContactUs: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
    department: 'general'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const departments = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'billing', label: 'Billing & Payments' },
    { value: 'sales', label: 'Sales & Business' },
    { value: 'feedback', label: 'Feedback & Suggestions' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsSubmitting(false);
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: '',
        department: 'general'
      });
    }, 3000);
  };

  const contactInfo = [
    {
      icon: <FiMapPin />,
      title: 'Our Location',
      details: ['123 Service Lane', 'Tech City, IN 560001', 'India'],
      color: '#3B82F6'
    },
    {
      icon: <FiPhone />,
      title: 'Contact Numbers',
      details: ['Support: +91 98765 43210', 'Sales: +91 98765 43211', 'Emergency: +91 98765 43212'],
      color: '#10B981'
    },
    {
      icon: <FiMail />,
      title: 'Email Addresses',
      details: ['Support: support@rajcommunication.com', 'Sales: sales@rajcommunication.com', 'General: info@rajcommunication.com'],
      color: '#8B5CF6'
    },
    {
      icon: <FiClock />,
      title: 'Business Hours',
      details: ['Monday - Friday: 9AM - 6PM', 'Saturday: 10AM - 4PM', 'Sunday: Closed (Emergency only)'],
      color: '#F59E0B'
    }
  ];

  return (
    <div className="contact-us scrollable-page">
      <div className="contact-container">
        {/* Header */}
        <motion.div 
          className="contact-header"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-content">
            <h1>Contact Us</h1>
            <p className="header-subtitle">Get in touch with Raj Communication Service Center</p>
            <p className="header-description">
              We're here to help with any questions about our service management system, 
              technical support, or business inquiries.
            </p>
          </div>
        </motion.div>

        {/* Contact Info Grid */}
        <motion.div 
          className="contact-info-grid"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {contactInfo.map((info, index) => (
            <motion.div 
              key={index}
              className="contact-info-card"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="info-icon" style={{ backgroundColor: `${info.color}20`, color: info.color }}>
                {info.icon}
              </div>
              <h3>{info.title}</h3>
              <div className="info-details">
                {info.details.map((detail, idx) => (
                  <p key={idx}>{detail}</p>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main Content */}
        <div className="contact-main">
          {/* Left Side - Contact Form */}
          <motion.div 
            className="contact-form-section"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="section-header">
              <h2>
                <FiMessageSquare /> Send us a Message
              </h2>
              <p>We typically respond within 24 hours</p>
            </div>

            {isSubmitted ? (
              <motion.div 
                className="success-message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <FiCheckCircle className="success-icon" />
                <h3>Message Sent Successfully!</h3>
                <p>Thank you for contacting us. We'll get back to you soon.</p>
              </motion.div>
            ) : (
              <form autoComplete="off" onSubmit={handleSubmit} className="contact-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name *</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address *</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="department">Department *</label>
                    <select
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      required
                    >
                      {departments.map(dept => (
                        <option key={dept.value} value={dept.value}>
                          {dept.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="subject">Subject *</label>
                    <input
                      type="text"
                      id="subject"
                      name="subject"
                      value={formData.subject}
                      onChange={handleInputChange}
                      placeholder="Enter subject"
                      required
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="message">Message *</label>
                    <textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Describe your inquiry in detail..."
                      rows={6}
                      required
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <motion.button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="spinner"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <FiSend />
                        Send Message
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>

          {/* Right Side - Map & Social */}
          <motion.div 
            className="contact-sidebar"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            {/* Map Section */}
            <div className="map-section">
              <h3>Find Us</h3>
              <div className="map-container">
                {/* Simple Map Placeholder */}
                <div className="map-placeholder">
                  <div className="map-marker">
                    <FiMapPin />
                  </div>
                  <div className="map-overlay">
                    <p>123 Service Lane, Tech City</p>
                    <button className="directions-btn">Get Directions</button>
                  </div>
                </div>
                <div className="map-address">
                  <h4>Raj Communication Service Center</h4>
                  <p>123 Service Lane, Tech City</p>
                  <p>IN 560001, India</p>
                  <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">
                    View on Google Maps →
                  </a>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="emergency-contact">
              <div className="emergency-header">
                <FiAlertCircle className="emergency-icon" />
                <h3>Emergency Support</h3>
              </div>
              <p>For critical system issues outside business hours</p>
              <div className="emergency-info">
                <div className="emergency-item">
                  <FiPhone />
                  <div>
                    <span>24/7 Hotline</span>
                    <strong>+91 98765 43212</strong>
                  </div>
                </div>
                <div className="emergency-item">
                  <FiMail />
                  <div>
                    <span>Emergency Email</span>
                    <strong>emergency@rajcommunication.com</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="social-section">
              <h3>Connect With Us</h3>
              <div className="social-links">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link facebook">
                  <FiFacebook />
                  <span>Facebook</span>
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link twitter">
                  <FiTwitter />
                  <span>Twitter</span>
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                  <FiLinkedin />
                  <span>LinkedIn</span>
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link instagram">
                  <FiInstagram />
                  <span>Instagram</span>
                </a>
              </div>
            </div>
          </motion.div>
        </div>

        {/* FAQ Preview */}
        <motion.div 
          className="faq-preview"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="faq-header">
            <h3>Frequently Asked Questions</h3>
            <a href="/support" className="view-all">View All FAQs →</a>
          </div>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>What are your response times?</h4>
              <p>Email: Within 24 hours | Phone: Immediate during business hours | Chat: Instant</p>
            </div>
            <div className="faq-item">
              <h4>Do you offer on-site support?</h4>
              <p>Yes, for enterprise clients within our service area. Contact sales for details.</p>
            </div>
            <div className="faq-item">
              <h4>Can I schedule a demo?</h4>
              <p>Absolutely! Book a personalized demo session through our sales team.</p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.footer 
          className="contact-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <div className="footer-content">
            <p>© 2026 Raj Communication Service Center. All rights reserved.</p>
            <div className="footer-links">
              <a href="/privacy">Privacy Policy</a>
              <a href="/terms">Terms of Service</a>
              <a href="/support">Support Center</a>
              <a href="/careers">Careers</a>
            </div>
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default ContactUs;
