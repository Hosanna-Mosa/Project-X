import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";

const heroImg =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBgR0FfV9N40FDS1OAC3AhwmY2WxrLtLpeOuzj0Etsnti8SWt3cbGIllPAypkL1a9jax6dr2gNEoWKUcPdlRfA1mYqQmPTy1hKvubVAPoRZDY-1bG4sL_9103m9P483UGNBHedWHheuLEZD1AIQ3VwL9xzkXGIQRtqwGbjBRboZOK_rs6ZycjYX1aDUHJWE-JdqGx_orDdqZXjira7VrMwAbeYQXQyVp01bFBqt8bP-SX_IfM8_JmpSIV-nUk-PQqEXLmZezNryXsg";
const foodImg =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuA8gl16iPOhgporYFwsX5TTqXMTYgd2rILrvkGnmOErDjxjJp_DK_qJXfVGkgcPK3AMp6ICG1aPbLrqnVs3ER5d-CYpr4mw5nSq1GaEOjZZie2BdAbsLhjJh-h9E9Q8fniN5bh9SlYXHAVsPWYUQ_bfDbdggAQnrK-U05Q09Q7RGZzqBLtWF60-K45nE806ozzMjTLOKYIx36PYgOReJrCFcvpBFHTANsy40mOcHTN7GZQ8ysZ8RKWLGmY-P4N6CJbePLZk6UC2RxU";
const rideImg =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBWllrPmxhmWS9b0rTz1Y9l0jxS3yMDsheAGFlDFpnmkw37yi0-qMMagaVtv-lMTAw8Tp2jvCZB0VKi0GPFJEkvZs3EcbAgot41KG3RxWv_CzdKSjVuuWTTn72rUoBD2KmFS7C-mEe0EnPOy1juHh6Sr8ah0C0kjFUTebrG-nQUWSGHCChDj2IqvwqSQB9Blz0ih1DIx5eSMHvX5oYb-ek4YkK1tjfLXgbaUau7HN_9X92zNMM-lEmSr1hiwM6OgKwyaaOu8bpzRAg";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeService, setActiveService] = useState<"food" | "ride">("food");
  const [location, setLocation] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-white text-on-surface overflow-x-hidden">
      {/* TopNavBar */}
      <nav
        className={`fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-surface-container transition-all duration-300 ${
          scrolled ? "py-2 shadow-xl shadow-black/5" : "py-4"
        }`}
      >
        <div className="flex justify-between items-center px-6 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-12">
            <a
              href="#"
              className="font-display text-2xl font-extrabold text-brand-kinetic tracking-tighter"
            >
              HYBRID
            </a>
            <div className="hidden md:flex items-center gap-8">
              <a href="#" className="text-sm font-semibold text-on-surface border-b-2 border-brand-kinetic pb-1">Home</a>
              <Link to="/partner" className="text-sm font-medium text-secondary-app hover:text-on-surface transition-colors">Partner with Us</Link>
            </div>
          </div>
          <button className="text-on-surface p-2" aria-label="Menu">
            <Icon name="menu" />
          </button>
        </div>
      </nav>

      <main className="relative">
        {/* Hero */}
        <section className="relative min-h-[90vh] lg:min-h-screen flex items-center pt-20 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/70 via-black/50 to-black/60" />
            <img
              alt="Urban cityscape"
              className="w-full h-full object-cover scale-105"
              src={heroImg}
            />
          </div>

          <div className="container max-w-[1280px] mx-auto px-6 relative z-20 w-full">
            <div className="max-w-3xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md text-white rounded-full mb-8 text-sm font-medium border border-white/10">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                Available in 120+ cities
              </div>

              {/* Headline */}
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.08] mb-6 tracking-tight text-white font-extrabold">
                Your City,{" "}
                <span className="text-brand-kinetic">Delivered</span> &amp;{" "}
                <span className="text-brand-kinetic">Driven</span>
              </h1>
              <p className="text-lg lg:text-xl mb-10 max-w-xl mx-auto leading-relaxed text-white/80">
                One app for your favorite meals and fastest rides. Order food or book a ride — get both delivered to your doorstep.
              </p>

              {/* Service Tabs */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <button
                  onClick={() => setActiveService("food")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all ${
                    activeService === "food"
                      ? "bg-brand-kinetic text-white shadow-lg shadow-brand-kinetic/30"
                      : "bg-white/10 backdrop-blur-md text-white/80 hover:bg-white/20 border border-white/10"
                  }`}
                >
                  <Icon name="restaurant" className="text-lg" />
                  Food Delivery
                </button>
                <button
                  onClick={() => setActiveService("ride")}
                  className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all ${
                    activeService === "ride"
                      ? "bg-brand-kinetic text-white shadow-lg shadow-brand-kinetic/30"
                      : "bg-white/10 backdrop-blur-md text-white/80 hover:bg-white/20 border border-white/10"
                  }`}
                >
                  <Icon name="directions_car" className="text-lg" />
                  Ride Hailing
                </button>
              </div>

              {/* Search / Input Area */}
              <div className="bg-white rounded-2xl p-2 shadow-2xl shadow-black/20 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 max-w-xl mx-auto mb-8">
                <div className="flex items-center gap-3 flex-1 px-4 py-2">
                  <span className="text-brand-kinetic">
                    <Icon name={activeService === "food" ? "search" : "my_location"} className="text-xl" />
                  </span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder={activeService === "food" ? "Search for restaurants or cuisines..." : "Where are you going?"}
                    className="w-full bg-transparent text-on-surface placeholder:text-secondary-app/60 text-sm font-medium outline-none"
                  />
                </div>
                <button className="bg-brand-kinetic text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-brand-kinetic/90 transition-colors whitespace-nowrap">
                  {activeService === "food" ? "Search" : "Go"}
                </button>
              </div>

              {/* Download Buttons */}
              <div className="flex flex-wrap justify-center gap-4">
                <a href="#" className="flex items-center gap-3 bg-black text-white px-5 py-2.5 rounded-xl transition-all hover:bg-zinc-900 hover:scale-105 active:scale-95 border border-white/20">
                  <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2.5 3.5L14 12.5L2.5 20.5V3.5Z" fill="#4285F4"/>
                    <path d="M2.5 3.5L19 10.5L14 12.5L2.5 3.5Z" fill="#EA4335"/>
                    <path d="M2.5 20.5L14 12.5L19 14.5L2.5 20.5Z" fill="#34A853"/>
                    <path d="M14 12.5L19 10.5L22.5 12.5L19 14.5L14 12.5Z" fill="#FBBC04"/>
                  </svg>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] uppercase font-bold tracking-widest mb-1">Get it on</span>
                    <span className="text-lg font-bold tracking-tight">Google Play</span>
                  </div>
                </a>
                <a href="#" className="flex items-center gap-3 bg-black text-white px-5 py-2.5 rounded-xl transition-all hover:bg-zinc-900 hover:scale-105 active:scale-95 border border-white/20">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/31/Apple_logo_white.svg" alt="Apple" className="w-7 h-7 object-contain mb-1" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-medium tracking-wide mb-1">Download on the</span>
                    <span className="text-lg font-bold tracking-tight">App Store</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Service Cards */}
        <section className="py-20 bg-surface-container-low/50">
          <div className="container max-w-[1280px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">What would you like to do?</h2>
              <div className="w-16 h-1.5 bg-brand-kinetic mx-auto rounded-full" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Food */}
              <div className="group bg-white rounded-[32px] overflow-hidden kinetic-shadow kinetic-shadow-hover transition-all duration-500">
                <div className="h-64 overflow-hidden relative">
                  <img alt="Premium Food Delivery" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={foodImg} />
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                    <Icon name="restaurant" className="text-brand-kinetic text-lg fill-icon" />
                    <span className="text-xs font-bold uppercase tracking-wide">Food</span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="font-display text-2xl font-bold mb-3">Cravings, Satisfied</h3>
                  <p className="text-secondary-app mb-8">From fine dining to street side gems, delivered fresh to your door.</p>
                  <button className="w-full py-4 rounded-2xl bg-brand-kinetic text-white font-semibold flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                    Order Food
                    <Icon name="arrow_forward" className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Ride */}
              <div className="group bg-white rounded-[32px] overflow-hidden kinetic-shadow kinetic-shadow-hover transition-all duration-500">
                <div className="h-64 overflow-hidden relative">
                  <img alt="Reliable Ride Hailing" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={rideImg} />
                  <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                    <Icon name="commute" className="text-brand-kinetic text-lg fill-icon" />
                    <span className="text-xs font-bold uppercase tracking-wide">Rides</span>
                  </div>
                </div>
                <div className="p-8">
                  <h3 className="font-display text-2xl font-bold mb-3">Swift Commutes</h3>
                  <p className="text-secondary-app mb-8">Arrive in style and on time with our top-rated local drivers.</p>
                  <button className="w-full py-4 rounded-2xl bg-on-surface text-white font-semibold flex items-center justify-center gap-2 group-hover:gap-4 transition-all">
                    Book a Ride
                    <Icon name="arrow_forward" className="text-xl" />
                  </button>
                </div>
              </div>

              {/* Logistics */}
              <div className="group bg-brand-kinetic text-white rounded-[32px] overflow-hidden kinetic-shadow kinetic-shadow-hover transition-all duration-500 lg:col-span-1 md:col-span-2">
                <div className="p-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                      <Icon name="local_shipping" className="text-3xl fill-icon" />
                    </div>
                    <h3 className="font-display text-2xl font-bold mb-4">Express Logistics</h3>
                    <p className="text-white/80 mb-8 leading-relaxed">
                      Send packages, documents, or groceries across the city in minutes. Safe, tracked, and insured.
                    </p>
                  </div>
                  <div className="space-y-4 pt-6 border-t border-white/10">
                    <div className="flex items-center gap-3">
                      <Icon name="track_changes" className="text-xl" />
                      <span className="text-sm font-semibold">Real-time GPS Tracking</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Icon name="verified_user" className="text-xl" />
                      <span className="text-sm font-semibold">Verified Professional Couriers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-24 bg-white">
          <div className="container max-w-[1280px] mx-auto px-6">
            <div className="flex flex-wrap justify-between items-center gap-12 border-y border-surface-container py-16">
              {[
                ["15M+", "Active Users"],
                ["4.9/5", "App Rating"],
                ["120+", "Cities Covered"],
                ["500k+", "Partners"],
              ].map(([value, label], i, arr) => (
                <Fragment key={label}>
                  <div className="flex flex-col">
                    <span className="text-5xl font-extrabold text-on-surface tracking-tighter">{value}</span>
                    <span className="text-secondary-app font-medium mt-2">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="hidden md:block w-px h-16 bg-surface-container" />
                  )}
                </Fragment>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-on-surface text-white pt-24 pb-12">
        <div className="container max-w-[1280px] mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-1">
              <h2 className="text-3xl font-black text-brand-kinetic mb-6 tracking-tighter">HYBRID</h2>
              <p className="text-secondary-fixed-dim mb-8 leading-relaxed">
                Redefining urban mobility through a single, unified platform built for speed and reliability.
              </p>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-brand-kinetic hover:border-brand-kinetic transition-all">
                  <Icon name="public" className="text-lg" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-brand-kinetic hover:border-brand-kinetic transition-all">
                  <Icon name="alternate_email" className="text-lg" />
                </a>
              </div>
            </div>

            {[
              { title: "Services", items: ["Ride Hailing", "Food Delivery", "Grocery", "Package Delivery"] },
              { title: "Company", items: ["About Us", "Careers", "Newsroom", "Contact"] },
              { title: "Support", items: ["Help Center", "Safety", "Terms of Service", "Privacy Policy"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs uppercase tracking-widest font-bold mb-8 text-white/40">{col.title}</h4>
                <ul className="space-y-4 text-sm font-medium">
                  {col.items.map((item) => (
                    <li key={item}>
                      <a className="text-secondary-fixed-dim hover:text-brand-kinetic transition-colors" href="#">{item}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-white/40 text-xs">© 2024 Hybrid Technologies Inc. All rights reserved.</p>
            <div className="flex gap-8 text-xs font-bold text-white/40 uppercase tracking-widest">
              <a className="hover:text-white" href="#">Privacy</a>
              <a className="hover:text-white" href="#">Terms</a>
              <a className="hover:text-white" href="#">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
