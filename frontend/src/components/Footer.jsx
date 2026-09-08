import { Link } from 'react-router-dom'
import logo from '../assets/logo.png'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="footer-brand">
            <img src={logo} alt="logo" className="footer-logo" />
            <span className="navbar-brand-text">Tapalla&apos;s Electronic Repair</span>
          </div>
          <p className="muted">Professional electronic repair services. Trust us with your home appliances.</p>
        </div>
        <div>
          <h4 className="footer-heading">Services</h4>
          <ul className="footer-list">
            <li>TV and Audio Repair</li>
            <li>Kitchen Appliances</li>
            <li>Washing Machines</li>
            <li>Microwave and Ovens</li>
          </ul>
        </div>
        <div>
          <h4 className="footer-heading">Contact Us</h4>
          <ul className="footer-list">
            <li>Tapalla Electronics Repair Shop</li>
            <li>+63 908 637 7627</li>
            <li>tapallabro@gmail.com</li>
            <li>Monday - Sunday</li>
          </ul>
        </div>
        <div>
          <h4 className="footer-heading">Account Access</h4>
          <Link to="/login" className="btn btn-secondary btn-sm btn-block" style={{ marginBottom: 10 }}>
            Customer Portal
          </Link>
          <Link to="/admin-login" className="muted small">
            Staff / Admin Login
          </Link>
        </div>
      </div>
      <div className="footer-bottom">
        Copyright 2018 Tapalla&apos;s Electronic Repair. All rights reserved.
      </div>
    </footer>
  )
}
