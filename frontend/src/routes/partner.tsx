import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

const benefits = [
  {
    icon: "trending_up",
    title: "Boost Your Revenue",
    desc: "Join 500K+ partners and tap into a city-wide customer base hungry for your offerings.",
  },
  {
    icon: "insights",
    title: "Real-Time Analytics",
    desc: "Get powerful insights on orders, peak hours, and customer preferences to grow your business.",
  },
  {
    icon: "rocket_launch",
    title: "Fast Onboarding",
    desc: "Go from sign-up to live in under 48 hours with our dedicated partner support team.",
  },
  {
    icon: "local_shipping",
    title: "Delivery Infrastructure",
    desc: "Leverage our fleet of verified drivers to deliver faster and farther than ever before.",
  },
];

const steps = [
  {
    step: "01",
    title: "Register Your Business",
    desc: "Fill out a quick form with your business details, location, and service type.",
  },
  {
    step: "02",
    title: "Verify & Setup",
    desc: "Our team verifies your documents and helps you set up your menu or service listings.",
  },
  {
    step: "03",
    title: "Go Live",
    desc: "Start receiving orders and ride requests within 48 hours. Track everything in real time.",
  },
  {
    step: "04",
    title: "Grow & Earn",
    desc: "Access analytics, promotional tools, and dedicated support to scale your business.",
  },
];

const faqs = [
  {
    q: "What documents do I need to register?",
    a: "You'll need your business license, FSSAI certificate (for restaurants), GST registration, and valid ID proof.",
  },
  {
    q: "How long does the onboarding process take?",
    a: "Most partners go live within 24-48 hours after submitting all required documents.",
  },
  {
    q: "What commission does Hybrid charge?",
    a: "Our commission structure starts at 15% and varies based on location, service type, and volume. Contact our team for a personalized quote.",
  },
  {
    q: "Can I offer both food delivery and ride services?",
    a: "Absolutely! Many of our partners operate multiple services. We provide a unified dashboard to manage everything.",
  },
  {
    q: "Is there a minimum commitment period?",
    a: "No long-term contracts. We believe in earning your partnership every day with transparent terms.",
  },
];

export default function PartnerPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showPartnerTypeDialog, setShowPartnerTypeDialog] = useState(false);
  const navigate = useNavigate();

  const startOnboarding = (type: "food" | "meat") => {
    setShowPartnerTypeDialog(false);
    navigate(`/partner/onboarding?type=${type}`);
  };

  return (
    <div className="bg-white text-on-surface overflow-x-hidden">
      {/* Simple Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl border-b border-surface-container py-4">
        <div className="flex justify-between items-center px-6 max-w-[1280px] mx-auto">
          <Link to="/" className="font-display text-2xl font-extrabold text-brand-kinetic tracking-tighter">
            HYBRID
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-secondary-app hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <Icon name="arrow_back" className="text-base" />
            Back to Home
          </Link>
        </div>
      </nav>

      <main>
        {/* Hero Banner */}
        <section className="relative pt-24 pb-20 lg:pb-28 bg-gradient-to-br from-on-surface via-[#0d2844] to-[#162d4a] overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-10 left-10 w-72 h-72 bg-brand-kinetic rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-brand-kinetic/50 rounded-full blur-3xl" />
          </div>
          <div className="container max-w-[1280px] mx-auto px-6 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-kinetic/10 text-brand-kinetic rounded-full mb-8 text-sm font-semibold border border-brand-kinetic/20">
                <Icon name="handshake" className="text-lg" />
                Partner with Hybrid
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.1] mb-6 tracking-tight text-white font-extrabold">
                Grow Your Business with{" "}
                <span className="text-brand-kinetic">Hybrid</span>
              </h1>
              <p className="text-lg text-white/70 max-w-xl mx-auto mb-10 leading-relaxed">
                Join India's fastest-growing urban platform. Whether you run a restaurant, a fleet, or a service — we help you reach more customers and earn more.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  type="button"
                  onClick={() => setShowPartnerTypeDialog(true)}
                  className="bg-brand-kinetic text-white px-8 py-3.5 rounded-full font-semibold shadow-lg shadow-brand-kinetic/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Get Started Today
                </button>
                <a
                  href="#how-it-works"
                  className="bg-white/10 backdrop-blur-md text-white px-8 py-3.5 rounded-full font-semibold border border-white/20 hover:bg-white/20 transition-all"
                >
                  See How It Works
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-12 bg-surface-container-low/30 border-b border-surface-container">
          <div className="container max-w-[1280px] mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                ["500K+", "Registered Partners"],
                ["120+", "Cities Covered"],
                ["50M+", "Orders Processed"],
                ["4.8★", "Partner Rating"],
              ].map(([value, label]) => (
                <div key={label}>
                  <p className="font-display text-3xl lg:text-4xl font-extrabold text-brand-kinetic">{value}</p>
                  <p className="text-sm text-secondary-app font-medium mt-1">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Partner */}
        <section className="py-20 lg:py-28">
          <div className="container max-w-[1280px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Why Partner with Hybrid?</h2>
              <p className="text-secondary-app max-w-lg mx-auto">
                Everything you need to grow your business and delight your customers.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit) => (
                <div
                  key={benefit.title}
                  className="group p-8 rounded-2xl border border-surface-container bg-white hover:border-brand-kinetic/20 hover:shadow-lg hover:shadow-brand-kinetic/5 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-kinetic/10 flex items-center justify-center mb-6 group-hover:bg-brand-kinetic group-hover:text-white transition-all duration-300">
                    <Icon name={benefit.icon} className="text-2xl text-brand-kinetic group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-3">{benefit.title}</h3>
                  <p className="text-sm text-secondary-app leading-relaxed">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="py-20 lg:py-28 bg-surface-container-low/30">
          <div className="container max-w-[900px] mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
              <p className="text-secondary-app max-w-lg mx-auto">
                Get your business on Hybrid in four simple steps.
              </p>
            </div>
            <div className="space-y-8">
              {steps.map((step, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <div className="flex flex-col items-center">
                    <div className="w-14 h-14 rounded-2xl bg-brand-kinetic text-white flex items-center justify-center font-display font-extrabold text-lg shrink-0">
                      {step.step}
                    </div>
                    {i < steps.length - 1 && (
                      <div className="w-px h-8 bg-surface-container mt-2" />
                    )}
                  </div>
                  <div className="pt-3">
                    <h3 className="font-display text-lg font-bold mb-2">{step.title}</h3>
                    <p className="text-secondary-app text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section className="py-20 lg:py-28 bg-surface-container-low/30">
          <div className="container max-w-[800px] mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
              <p className="text-secondary-app max-w-md mx-auto">
                Everything you need to know about partnering with Hybrid.
              </p>
            </div>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-surface-container bg-white overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left font-semibold hover:bg-surface-container-low/50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    <Icon
                      name={openFaq === i ? "remove" : "add"}
                      className={`text-xl transition-all duration-300 ${openFaq === i ? "text-brand-kinetic" : "text-secondary-app"}`}
                    />
                  </button>
                  {openFaq === i && (
                    <div className="px-6 pb-5 text-sm text-secondary-app leading-relaxed border-t border-surface-container pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gradient-to-br from-brand-kinetic via-[#ff5733] to-brand-kinetic">
          <div className="container max-w-[700px] mx-auto px-6 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Grow with Us?
            </h2>
            <p className="text-white/80 mb-8 max-w-md mx-auto">
              Join 500K+ partners and start reaching more customers today.
            </p>
            <button
              type="button"
              onClick={() => setShowPartnerTypeDialog(true)}
              className="inline-block bg-white text-brand-kinetic px-8 py-3.5 rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Get Started Now
            </button>
          </div>
        </section>
      </main>

      {showPartnerTypeDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-on-surface/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-kinetic">Start onboarding</p>
                <h2 className="mt-1 font-display text-2xl font-bold text-on-surface">Choose your partner type</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPartnerTypeDialog(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-secondary-app transition-colors hover:text-on-surface"
                aria-label="Close"
              >
                <Icon name="close" className="text-lg" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => startOnboarding("food")}
                className="group rounded-xl border border-gray-200 p-5 text-left transition-all hover:border-brand-kinetic hover:bg-brand-kinetic/5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-kinetic/10 text-brand-kinetic transition-colors group-hover:bg-brand-kinetic group-hover:text-white">
                  <Icon name="restaurant" className="text-2xl" />
                </div>
                <p className="font-display text-lg font-bold text-on-surface">Food Restaurant</p>
                <p className="mt-2 text-sm text-secondary-app">Restaurant details, menu, food license, and payout setup.</p>
              </button>

              <button
                type="button"
                onClick={() => startOnboarding("meat")}
                className="group rounded-xl border border-gray-200 p-5 text-left transition-all hover:border-brand-kinetic hover:bg-brand-kinetic/5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-kinetic/10 text-brand-kinetic transition-colors group-hover:bg-brand-kinetic group-hover:text-white">
                  <Icon name="set_meal" className="text-2xl" />
                </div>
                <p className="font-display text-lg font-bold text-on-surface">Meat Center</p>
                <p className="mt-2 text-sm text-secondary-app">Meat center details, product list, FSSAI, and payout setup.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-on-surface text-white pt-16 pb-10">
        <div className="container max-w-[1280px] mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
            <Link to="/" className="font-display text-2xl font-extrabold text-brand-kinetic tracking-tighter">
              HYBRID
            </Link>
            <div className="flex gap-6 text-sm text-white/60">
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Contact Support</a>
            </div>
          </div>
          <div className="pt-6 border-t border-white/10 text-center">
            <p className="text-white/40 text-xs">© 2024 Hybrid Technologies Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
