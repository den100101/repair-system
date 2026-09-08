import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import client from "../api/client";
import logo from "../assets/logo.png";
import storeFront from "../assets/store-front.png";
import serviceTv from "../assets/services-tv.jpg";
import serviceKitchen from "../assets/services-kitchen.jpg";
import serviceLarge from "../assets/services-large.jpg";
import serviceAudio from "../assets/services-audio.jpg";
import map from "../assets/map.jpg";

const SERVICE_IMAGES = {
  "TV & Entertainment": serviceTv,
  "Kitchen Appliances": serviceKitchen,
  "Large Appliances": serviceLarge,
  "Audio Equipment": serviceAudio,
};

const WHY = [
  {
    title: "Certified Techs",
    desc: "All repairs are performed by licensed professionals with years of hands-on experience.",
  },
  {
    title: "Rapid Turnaround",
    desc: "Most repairs are completed within 48 hours. We value your time as much as you do.",
  },
  {
    title: "Transparent Pricing",
    desc: "No hidden fees. We provide clear estimates before any work begins. Free check-ups included.",
  },
];

export default function Home() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    client
      .get("/repairs/services")
      .then((res) => setServices(res.data))
      .catch(() => setServices([]));
  }, []);

  return (
    <div className="page">
      <Navbar />

      <main className="page-main">
        {/* Hero */}
        <section className="hero">
          <div className="hero-grid">
            <div>
              <span className="eyebrow">Serving Tapalla City Since 2005</span>
              <h1 className="hero-title">
                Expert Electronic <span className="accent">Repairs</span> You
                Can Trust.
              </h1>
              <p className="hero-desc">
                Fast, reliable, and professional repair services for your home
                appliances. Get your devices running like new again without the
                hassle.
              </p>
              <div className="hero-actions">
                <Link to="/book-repair" className="btn btn-primary">
                  Book Appointment
                </Link>
                <Link to="/login" className="btn btn-secondary">
                  Track My Repair
                </Link>
              </div>
              <div className="hero-notes">
                <span>Free Check-ups</span>
                <span>Genuine Spare Parts</span>
              </div>
            </div>
            <div className="hero-image-wrap">
              <img
                src={logo}
                alt="Tapalla Electronics Repair Shop"
                className="hero-image"
              />
            </div>
          </div>
        </section>

        {/* Services */}
        <section className="container section">
          <h2 className="section-heading">Our Repair Services</h2>
          <p className="section-subheading">
            We specialize in a wide range of household electronics and
            appliances. Our technicians are certified to handle top brands with
            precision.
          </p>
          <div className="grid grid-4 mt-lg">
            {services.length === 0 && (
              <p className="muted small text-center">Loading services...</p>
            )}
            {services.map((s) => (
              <div key={s.id} className="card service-card">
                {SERVICE_IMAGES[s.name] && (
                  <img
                    src={SERVICE_IMAGES[s.name]}
                    alt={s.name}
                    className="service-card-image"
                  />
                )}
                <div className="service-card-body">
                  <h3 className="service-card-title">{s.name}</h3>
                  <p className="service-card-desc">{s.description}</p>
                  {s.base_price != null && (
                    <p className="small muted mt-xs">
                      Starting at PHP {s.base_price.toLocaleString()}
                    </p>
                  )}
                  <Link to="/book-repair" className="service-card-link">
                    Book Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Why choose us */}
        <section className="why-section">
          <div className="why-grid">
            <div>
              <h2 className="section-heading" style={{ textAlign: "left" }}>
                Why Choose Tapalla&apos;s?
              </h2>
              <p className="muted mt-sm">
                With nearly two decades of experience, we have built a
                reputation for honesty and technical excellence. We don&apos;t
                just fix appliances; we provide peace of mind.
              </p>
              <ul className="why-list">
                {WHY.map((w, i) => (
                  <li key={w.title} className="why-item">
                    <span className="why-marker">{i + 1}</span>
                    <div>
                      <p className="why-item-title">{w.title}</p>
                      <p className="why-item-desc">{w.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="store-photo">
              <img
                src={storeFront}
                alt="Tapalla Electronics Repair Shop storefront"
              />
            </div>
          </div>
        </section>

        {/* Visit shop */}
        <section className="container section">
          <div className="grid grid-2">
            <div>
              <h2 className="section-heading" style={{ textAlign: "left" }}>
                Visit Our Shop
              </h2>
              <p className="muted mt-sm">
                Conveniently located in the heart of Tapalla City. Drop by for a
                free consultation or to drop off your device.
              </p>
              <div className="visit-info">
                <div>
                  <p className="visit-info-label">
                    Valley 1 San Antonio, Paranaque City
                  </p>
                  <p className="visit-info-detail">
                    Unit 1 Filinoli Bldg., Santa Cecilia St. San Antonio Valley
                    1
                  </p>
                </div>
                <div>
                  <p className="visit-info-label">+63 908 637 7627</p>
                  <p className="visit-info-detail">
                    Monday - Sunday: 8:00 AM - 7:00 PM
                  </p>
                </div>
                <div>
                  <p className="visit-info-label">help@tapalla-repair.com</p>
                  <p className="visit-info-detail">Response within 1 hour</p>
                </div>
              </div>
            </div>
            <div className="card map-placeholder">
              <img
                src={map}
                alt="Tapalla Electronics Repair Shop location map"
                className="map-image"
              />
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container section-tight">
          <div className="cta-banner">
            <h2>Don&apos;t Let Your Electronics Stay Broken.</h2>
            <p>
              Join 1,000+ satisfied customers who chose Tapalla&apos;s for their
              repair needs. Our experts are ready to diagnose and fix your
              problem today.
            </p>
            <div className="cta-actions">
              <Link to="/book-repair" className="btn cta-btn-light">
                Book Your Free Check-up
              </Link>
              <Link to="/login" className="btn cta-btn-outline">
                Customer Login
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
