import { Fragment, useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Premium high-resolution Unsplash images
const burgerHeroImg =
  "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80";
const carHeroImg = "/bike_taxi_hero.png";
const mockupBurgerImg =
  "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80";

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined select-none ${className}`}>{name}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [activeMode, setActiveMode] = useState<"food" | "ride">("food");

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="bg-[#f8f9fa] text-[#0a1128] min-h-screen flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
      {/* Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
          scrolled
            ? "bg-white/95 backdrop-blur-md py-3 shadow-[0_10px_30px_rgba(0,0,0,0.02)] border-[#edeeef]"
            : "bg-transparent py-5 border-transparent"
        }`}
      >
        <div className="max-w-[1440px] mx-auto px-10 md:px-20 flex justify-between items-center w-full">
          <div className="flex items-center gap-16">
            <Link
              to="/"
              className="text-[28px] font-black tracking-tight text-[#002045] font-display"
            >
              Flavor
            </Link>
            
            {/* Navigation links */}
            <div className="hidden lg:flex items-center gap-10">
              <a href="#services" className="text-sm font-semibold text-[#002045] relative after:content-[''] after:absolute after:bottom-[-6px] after:left-0 after:w-full after:h-[2px] after:bg-[#002045] transition-all">
                Services
              </a>
              <a href="#experience" className="text-sm font-medium text-[#4a5568] hover:text-[#002045] transition-colors">
                Experience
              </a>
              <a href="#logistics" className="text-sm font-medium text-[#4a5568] hover:text-[#002045] transition-colors">
                Logistics
              </a>
              <Link to="/partner" className="text-sm font-medium text-[#4a5568] hover:text-[#002045] transition-colors">
                Partners
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <a
              href="#download"
              className="text-sm font-semibold px-6 py-2.5 rounded transition-all duration-300 bg-[#002045] text-white hover:bg-[#002045]/90 hover:shadow-lg hover:shadow-[#002045]/10"
            >
              Download App
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-white">

        {/* Desktop-only full-bleed shaded background images */}
        <div className="hidden lg:block absolute inset-x-0 bottom-0 top-[100px] z-0 pointer-events-none">
          {/* Food background on the right */}
          <div
            className={`absolute top-0 right-0 w-1/2 h-full transition-all duration-1000 transform ${
              activeMode === "food"
                ? "opacity-100 translate-x-0"
                : "opacity-0 translate-x-12"
            }`}
          >
            <img
              src={burgerHeroImg}
              alt="Refined Hamburger Taste"
              className="w-full h-full object-cover"
            />
            {/* Smooth transition from the left (white) to transparent */}
            <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
          </div>

          {/* Rides background on the left */}
          <div
            className={`absolute top-0 left-0 w-1/2 h-full transition-all duration-1000 transform ${
              activeMode === "ride"
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-12"
            }`}
          >
            <img
              src={carHeroImg}
              alt="Executive Mobility Vehicle"
              className="w-full h-full object-cover"
            />
            {/* Smooth transition from the right (white) to transparent */}
            <div className="absolute inset-0 bg-gradient-to-l from-white via-white/20 to-transparent" />
          </div>
        </div>


        {/* State Toggle Buttons */}
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-30">
          <div className="bg-[#edeeef] p-1 rounded-lg flex items-center gap-1 shadow-sm border border-[#e1e3e4]">
            <button
              onClick={() => setActiveMode("food")}
              className={`px-8 py-2.5 rounded font-semibold text-xs uppercase tracking-wider transition-all duration-300 ${
                activeMode === "food"
                  ? "bg-[#002045] text-white shadow-md"
                  : "text-[#4a5568] hover:text-[#002045]"
              }`}
            >
              Food
            </button>
            <button
              onClick={() => setActiveMode("ride")}
              className={`px-8 py-2.5 rounded font-semibold text-xs uppercase tracking-wider transition-all duration-300 ${
                activeMode === "ride"
                  ? "bg-[#c5a47e] text-[#0a1128] shadow-md"
                  : "text-[#4a5568] hover:text-[#002045]"
              }`}
            >
              Rides
            </button>
          </div>
        </div>

        {/* Hero Content Container (Flips columns layout with transitions) */}
        <div className="max-w-[1440px] mx-auto w-full px-10 md:px-20 grid grid-cols-1 lg:grid-cols-2 items-center gap-16 relative z-10 min-h-[80vh] lg:min-h-screen pt-32 lg:pt-0">
          
          {/* Column 1 (Left) - Displays Food Text in Food mode, Rides Image in Ride mode */}
          <div className="relative h-[420px] lg:h-[550px] flex flex-col justify-center">
            {/* Food Mode Left Content: Text Block */}
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-all duration-700 transform ${
                activeMode === "food"
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 -translate-x-12 pointer-events-none"
              }`}
            >
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#c5a47e] mb-4 block font-display text-left">
                A Lifestyle Ecosystem
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#002045] leading-[1.1] mb-6 font-display tracking-tight text-left">
                Flavor: Movement <br />
                and Taste, Refined.
              </h1>
              <p className="text-[#4a5568] text-base md:text-lg mb-8 max-w-lg leading-relaxed font-body text-left">
                Navigate your day with executive-level precision. From world-class dining to seamless transportation and expert logistics, your world is now delivered and driven.
              </p>
              
              {/* App Store Badges */}
              <div className="flex gap-4">
                <a
                  href="#download"
                  className="flex items-center gap-3 bg-[#0a1128] text-white px-5 py-2.5 rounded hover:bg-[#002045] transition-all"
                >
                  <Icon name="grid_view" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Download on the</span>
                    <span className="text-[15px] font-bold mt-0.5">App Store</span>
                  </div>
                </a>
                <a
                  href="#download"
                  className="flex items-center gap-3 bg-[#0a1128] text-white px-5 py-2.5 rounded hover:bg-[#002045] transition-all"
                >
                  <Icon name="play_arrow" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Get it on</span>
                    <span className="text-[15px] font-bold mt-0.5">Google Play</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Rides Mode Left Content: Image Block (Sleek Car on Left) */}
            <div
              className={`absolute inset-0 rounded-2xl shadow-xl overflow-hidden transition-all duration-700 transform lg:hidden ${
                activeMode === "ride"
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 -translate-x-12 pointer-events-none"
              }`}
            >
              <img
                src={carHeroImg}
                alt="Executive Mobility Vehicle"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>
          </div>

          {/* Column 2 (Right) - Displays Food Image in Food mode, Rides Text in Ride mode */}
          <div className="relative h-[420px] lg:h-[550px] flex flex-col justify-center">
            {/* Food Mode Right Content: Image Block (Premium Burger on Right) */}
            <div
              className={`absolute inset-0 rounded-2xl shadow-xl overflow-hidden transition-all duration-700 transform lg:hidden ${
                activeMode === "food"
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 translate-x-12 pointer-events-none"
              }`}
            >
              <img
                src={burgerHeroImg}
                alt="Refined Hamburger Taste"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            </div>

            {/* Rides Mode Right Content: Text Block */}
            <div
              className={`absolute inset-0 flex flex-col justify-center transition-all duration-700 transform ${
                activeMode === "ride"
                  ? "opacity-100 translate-x-0 pointer-events-auto"
                  : "opacity-0 translate-x-12 pointer-events-none"
              }`}
            >
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#c5a47e] mb-4 block font-display text-left">
                Executive Mobility
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-[#002045] leading-[1.1] mb-6 font-display tracking-tight text-left">
                Executive Motion, <br />
                Redefined.
              </h1>
              <p className="text-[#4a5568] text-base md:text-lg mb-8 max-w-lg leading-relaxed font-body text-left">
                Professional transportation at your command. From airport transfers to city commutes, experience the gold standard of travel.
              </p>
              
              {/* App Store Badges */}
              <div className="flex gap-4">
                <a
                  href="#download"
                  className="flex items-center gap-3 bg-[#0a1128] text-white px-5 py-2.5 rounded hover:bg-[#002045] transition-all"
                >
                  <Icon name="grid_view" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Download on the</span>
                    <span className="text-[15px] font-bold mt-0.5">App Store</span>
                  </div>
                </a>
                <a
                  href="#download"
                  className="flex items-center gap-3 bg-[#0a1128] text-white px-5 py-2.5 rounded hover:bg-[#002045] transition-all"
                >
                  <Icon name="play_arrow" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Get it on</span>
                    <span className="text-[15px] font-bold mt-0.5">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Grid Features Section */}
      <section id="services" className="py-24 bg-white border-y border-[#edeeef]">
        <div className="max-w-[1440px] mx-auto px-10 md:px-20">
          {/* Header text container */}
          <div className="text-center mb-16 max-w-2xl mx-auto h-[120px] relative">
            {/* Food text header */}
            <div
              className={`absolute inset-x-0 top-0 transition-all duration-700 transform ${
                activeMode === "food"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#002045] font-display mb-4">
                One Platform, Refined Life
              </h2>
              <p className="text-[#4a5568] text-sm md:text-base leading-relaxed font-body">
                Flavor integrates three essential pillars of the modern lifestyle into a single, seamless executive experience.
              </p>
            </div>

            {/* Rides text header */}
            <div
              className={`absolute inset-x-0 top-0 transition-all duration-700 transform ${
                activeMode === "ride"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-[#002045] font-display mb-4">
                Movement, Restructured
              </h2>
              <p className="text-[#4a5568] text-sm md:text-base leading-relaxed font-body">
                Our custom mobility workflows ensure you travel with max efficiency and zero friction.
              </p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="relative min-h-[250px]">
            {/* Food Cards */}
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 transform ${
                activeMode === "food"
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none absolute inset-0"
              }`}
            >
              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="restaurant" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">Culinary Excellence</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Access a curated selection of the city's finest kitchens. Every meal is handled with white-glove care from chef to table.
                </p>
              </div>

              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="directions_car" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">Executive Motion</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Premium transportation for the discerning professional. Professional chauffeurs and high-end vehicles at your command.
                </p>
              </div>

              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="local_shipping" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">Swift Logistics</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Secure, real-time parcel delivery and personal tasks managed by our elite logistics network with total discretion.
                </p>
              </div>
            </div>

            {/* Rides Cards */}
            <div
              className={`grid grid-cols-1 md:grid-cols-3 gap-8 transition-all duration-700 transform ${
                activeMode === "ride"
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none absolute inset-0"
              }`}
            >
              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="flight" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">Airport Transfers</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Punctual, stress-free transit to and from major hubs. Real-time flight tracking ensures we're always there before you land.
                </p>
              </div>

              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="apartment" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">City Commutes</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Reliable point-to-point travel within the metropolitan core. Turn transit time into productive working minutes.
                </p>
              </div>

              <div className="bg-[#f8f9fa] p-8 rounded border border-[#edeeef] hover:border-[#c5a47e]/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.01)] transition-all duration-300 text-left">
                <div className="w-12 h-12 bg-[#002045]/5 text-[#002045] flex items-center justify-center rounded mb-6">
                  <Icon name="schedule" className="text-2xl" />
                </div>
                <h3 className="text-xl font-semibold text-[#002045] font-display mb-3">Hourly Hire</h3>
                <p className="text-[#4a5568] text-sm leading-relaxed font-body">
                  Dedicated vehicle and chauffeur at your disposal for multi-stop meetings or full-day itineraries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Command & Control Product Showcase */}
      <section id="experience" className="py-24 bg-[#f8f9fa]">
        <div className="max-w-[1440px] mx-auto px-10 md:px-20">
          <div className="relative min-h-[550px]">
            {/* FOOD SHOWCASE */}
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 items-center gap-16 transition-all duration-700 transform ${
                activeMode === "food"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none absolute inset-0"
              }`}
            >
              {/* Left Side CSS Phone Mockup */}
              <div className="flex justify-center">
                <div className="relative w-[290px] h-[580px] rounded-[48px] bg-black p-3.5 shadow-2xl border-4 border-neutral-800 ring-8 ring-neutral-900 ring-opacity-20 flex-shrink-0">
                  {/* Speaker Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
                    <div className="w-12 h-1 bg-neutral-800 rounded-full" />
                  </div>
                  
                  {/* Mock Screen Content */}
                  <div className="w-full h-full bg-[#f8f9fa] rounded-[34px] overflow-hidden flex flex-col font-sans relative border border-neutral-900/10 text-left pt-6 pb-2">
                    {/* Address Selection */}
                    <div className="px-4 py-2 border-b border-[#edeeef] bg-white flex justify-between items-center">
                      <div>
                        <span className="text-[8px] uppercase tracking-wider text-[#4a5568] block">DELIVERY ADDRESS</span>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-[#002045]">Executive Suite 402</span>
                          <Icon name="keyboard_arrow_down" className="text-xs text-[#002045]" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                          <Icon name="search" className="text-xs text-neutral-500" />
                        </div>
                        <div className="w-6 h-6 rounded-full bg-[#002045]/5 flex items-center justify-center">
                          <Icon name="person" className="text-xs text-[#002045]" />
                        </div>
                      </div>
                    </div>

                    {/* App Tabs Selection */}
                    <div className="grid grid-cols-4 gap-2 p-3 bg-white border-b border-[#edeeef] text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                          <Icon name="assignment" className="text-xs text-neutral-600" />
                        </div>
                        <span className="text-[8px] font-bold text-[#4a5568] mt-1">Tasks</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                          <Icon name="directions_car" className="text-xs text-neutral-600" />
                        </div>
                        <span className="text-[8px] font-bold text-[#4a5568] mt-1">Rides</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#002045] flex items-center justify-center">
                          <Icon name="restaurant" className="text-xs text-white" />
                        </div>
                        <span className="text-[8px] font-bold text-[#002045] mt-1">Food</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center">
                          <Icon name="heart_plus" className="text-xs text-neutral-600" />
                        </div>
                        <span className="text-[8px] font-bold text-[#4a5568] mt-1">Health</span>
                      </div>
                    </div>

                    {/* Greeting & Custom Pills */}
                    <div className="p-4 bg-white">
                      <h4 className="text-sm font-bold text-[#002045] mb-2 font-display">Good Evening, Julian</h4>
                      <div className="flex gap-1.5 overflow-x-hidden">
                        <span className="text-[8px] font-extrabold px-2.5 py-1 bg-[#002045] text-white rounded-full">All Food</span>
                        <span className="text-[8px] font-bold px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full">Michelin</span>
                        <span className="text-[8px] font-bold px-2.5 py-1 bg-neutral-100 text-neutral-600 rounded-full">Artisan</span>
                      </div>
                    </div>

                    {/* Restaurant card item */}
                    <div className="mx-3 mt-3 bg-white border border-[#edeeef] rounded-lg overflow-hidden shadow-sm flex flex-col">
                      <div className="h-28 bg-neutral-200 relative">
                        <img src={mockupBurgerImg} alt="Burger" className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 bg-green-600 text-white text-[7px] font-bold px-1.5 py-0.5 rounded">PURE VEG</span>
                      </div>
                      <div className="p-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-[#002045] font-display">The Burger Club</span>
                          <Icon name="favorite" className="text-xs text-neutral-300" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 text-[8px] text-[#4a5568] font-medium">
                          <span className="text-amber-500 font-bold flex items-center">4.9 ★</span>
                          <span>(1.2k+ reviews)</span>
                          <span>•</span>
                          <span>15-20 min</span>
                        </div>
                      </div>
                    </div>

                    {/* Sticky search floating box */}
                    <div className="absolute bottom-4 left-3 right-3 bg-white p-2.5 rounded-lg border border-[#e1e3e4] shadow-md flex items-center gap-2">
                      <Icon name="search" className="text-[#002045] text-sm" />
                      <span className="text-[9px] text-[#4a5568] font-medium">Order, book, or ship anything</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Text Block */}
              <div className="text-left">
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#002045] font-display mb-6 tracking-tight">
                  Command Your Lifestyle
                </h2>
                <p className="text-[#4a5568] text-base mb-8 leading-relaxed font-body">
                  Unlock the full power of Flavor with our unified mobile interface. Switch effortlessly between services—book a black car for your evening, order a gourmet meal for your arrival, or have documents delivered across town—all within a single, secure ecosystem.
                </p>
                
                {/* Feature Bullet Points */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#c5a47e]/15 flex items-center justify-center text-[#c5a47e] shrink-0 mt-1">
                      <Icon name="check" className="text-sm font-bold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Unified Service Hub</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        One app for all your movement, culinary, and logistical needs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#c5a47e]/15 flex items-center justify-center text-[#c5a47e] shrink-0 mt-1">
                      <Icon name="check" className="text-sm font-bold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Global Priority Access</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        Elite status across all service tiers for consistent excellence.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-[#c5a47e]/15 flex items-center justify-center text-[#c5a47e] shrink-0 mt-1">
                      <Icon name="check" className="text-sm font-bold" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Intelligent Routing</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        Predictive scheduling that anticipates your next move.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIDES SHOWCASE */}
            <div
              className={`grid grid-cols-1 lg:grid-cols-2 items-center gap-16 transition-all duration-700 transform ${
                activeMode === "ride"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none absolute inset-0"
              }`}
            >
              {/* Left Side Text Block */}
              <div className="text-left order-2 lg:order-1">
                <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#c5a47e] mb-4 block font-display">
                  The Experience
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold text-[#002045] font-display mb-6 tracking-tight">
                  Your Private Fleet, <br />One Tap Away.
                </h2>
                
                {/* Feature Bullet Points */}
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-[#edeeef] text-[#002045] shrink-0 shadow-sm">
                      <Icon name="hub" className="text-lg" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Unified Service Hub</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        One elite app for all your executive movement and transit needs.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-[#edeeef] text-[#002045] shrink-0 shadow-sm">
                      <Icon name="star" className="text-lg" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Global Priority Standards</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        Experience a consistent standard of chauffeur excellence across all service tiers.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded bg-white flex items-center justify-center border border-[#edeeef] text-[#002045] shrink-0 shadow-sm">
                      <Icon name="insights" className="text-lg" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-[#002045] font-display mb-1">Intelligent Predictive Routing</h4>
                      <p className="text-sm text-[#4a5568] leading-relaxed font-body">
                        Our AI anticipates your schedule, suggesting airport transfers or city commutes when you need them most.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side Phone Mockup (Map interface) */}
              <div className="flex justify-center order-1 lg:order-2">
                <div className="relative w-[290px] h-[580px] rounded-[48px] bg-black p-3.5 shadow-2xl border-4 border-neutral-800 ring-8 ring-neutral-900 ring-opacity-20 flex-shrink-0">
                  {/* Speaker Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-black rounded-b-2xl z-50 flex items-center justify-center">
                    <div className="w-12 h-1 bg-neutral-800 rounded-full" />
                  </div>
                  
                  {/* Mock Screen Content (Map View) */}
                  <div className="w-full h-full bg-[#e5e7eb] rounded-[34px] overflow-hidden flex flex-col font-sans relative border border-neutral-900/10 text-left pt-6 pb-2">
                    {/* Simulated Map Background */}
                    <div className="absolute inset-0 z-0 bg-[#e4e9f0]">
                      {/* Map lines */}
                      <svg className="w-full h-full stroke-white stroke-2 opacity-60" fill="none">
                        <line x1="0" y1="100" x2="300" y2="150" />
                        <line x1="150" y1="0" x2="100" y2="600" />
                        <line x1="50" y1="200" x2="250" y2="400" />
                        <path d="M 0 350 Q 150 300 300 450" />
                        <path d="M 50 100 Q 200 400 300 500" stroke="#002045" strokeWidth="3" className="opacity-90" />
                      </svg>
                      
                      {/* Source Pin */}
                      <div className="absolute top-[160px] left-[70px] w-3 h-3 bg-green-500 rounded-full border border-white shadow flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full" />
                      </div>
                      {/* Destination Pin */}
                      <div className="absolute top-[410px] left-[220px] w-5 h-5 bg-[#002045] rounded-full border-2 border-white shadow flex items-center justify-center text-white">
                        <Icon name="location_on" className="text-[10px]" />
                      </div>
                    </div>

                    {/* Floating Map Search Details */}
                    <div className="absolute top-8 left-3 right-3 bg-white p-3 rounded-lg border border-[#e1e3e4] shadow-lg z-10 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
                        <span className="text-[10px] font-bold text-[#002045] truncate">Guindy National Park</span>
                      </div>
                      <div className="h-px bg-[#edeeef]" />
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 bg-[#c5a47e] rounded-full shrink-0" />
                        <span className="text-[10px] font-bold text-[#002045] truncate">Taj Coromandel</span>
                      </div>
                    </div>

                    {/* Bottom Sheet Select Car */}
                    <div className="absolute bottom-3 left-3 right-3 bg-white p-3 rounded-xl border border-[#e1e3e4] shadow-2xl z-10 flex flex-col">
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[10px] font-bold text-[#002045] uppercase tracking-wider">Select Vehicle</span>
                        <span className="text-[8px] font-bold text-[#4a5568]">3 cars available</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="p-2 border border-[#c5a47e]/40 bg-[#c5a47e]/5 rounded flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <Icon name="directions_car" className="text-sm text-[#002045]" />
                            <div className="leading-none">
                              <span className="text-[9px] font-bold text-[#002045] block">Executive Sedan</span>
                              <span className="text-[7px] text-[#4a5568]">BMW 5-Series or Mercedes E-Class</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-[#002045]">$45.00</span>
                        </div>
                      </div>
                      <button className="w-full mt-3 bg-[#002045] text-white text-[10px] font-bold py-2.5 rounded hover:bg-[#002045]/90 transition-all text-center">
                        Confirm Elite Ride
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="download" className="py-24 bg-white border-t border-[#edeeef] relative">
        <div className="max-w-[1440px] mx-auto px-10 md:px-20">
          <div className="relative min-h-[350px]">
            {/* FOOD CTA */}
            <div
              className={`absolute inset-0 bg-[#f3f4f5] border border-[#edeeef] rounded-lg p-10 md:p-16 flex flex-col justify-center items-center text-center transition-all duration-700 transform ${
                activeMode === "food"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#002045] font-display mb-4">
                Step Into the World of Flavor
              </h2>
              <p className="text-[#4a5568] text-base max-w-lg mb-8 leading-relaxed font-body">
                Elevate your standards. Join a community of discerning individuals who value time, quality, and the art of living well.
              </p>
              
              {/* App Store Badges */}
              <div className="flex gap-4 mb-6">
                <a href="#download" className="flex items-center gap-3 bg-[#0a1128] text-white px-6 py-3 rounded hover:bg-[#002045] transition-all">
                  <Icon name="grid_view" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Download on the</span>
                    <span className="text-[15px] font-bold mt-0.5">App Store</span>
                  </div>
                </a>
                <a href="#download" className="flex items-center gap-3 bg-[#0a1128] text-white px-6 py-3 rounded hover:bg-[#002045] transition-all">
                  <Icon name="play_arrow" className="text-xl" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[9px] uppercase tracking-wider text-neutral-400 font-medium">Get it on</span>
                    <span className="text-[15px] font-bold mt-0.5">Google Play</span>
                  </div>
                </a>
              </div>
              <span className="text-xs text-[#4a5568] font-medium font-body">
                Serving major global hubs. Movement, Taste, and Logistics, Refined.
              </span>
            </div>

            {/* RIDES CTA */}
            <div
              className={`absolute inset-0 bg-[#002045] rounded-lg p-10 md:p-16 flex flex-col justify-center items-center text-center transition-all duration-700 transform overflow-hidden ${
                activeMode === "ride"
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              {/* Dot Grid Background Effect */}
              <div className="absolute inset-0 opacity-15 pointer-events-none z-0">
                <div
                  className="w-full h-full"
                  style={{
                    backgroundImage: "radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
              </div>

              <div className="relative z-10 flex flex-col items-center">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white font-display mb-4">
                  Ready for the Next Level?
                </h2>
                <p className="text-white/70 text-base max-w-lg mb-8 leading-relaxed font-body">
                  Join the exclusive circle of executives who trust Flavor for their daily mobility and culinary needs.
                </p>
                
                {/* Custom CTA Action Buttons */}
                <div className="flex gap-4">
                  <a
                    href="#download"
                    className="bg-[#c5a47e] text-[#0a1128] font-semibold text-sm px-8 py-3.5 rounded hover:bg-[#c5a47e]/90 hover:scale-105 active:scale-95 transition-all shadow-md"
                  >
                    Get Started
                  </a>
                  <a
                    href="#sales"
                    className="border border-white/20 text-white font-semibold text-sm px-8 py-3.5 rounded hover:bg-white/5 hover:scale-105 active:scale-95 transition-all"
                  >
                    Contact Sales
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a1128] text-white pt-20 pb-10 border-t border-white/10">
        <div className="max-w-[1440px] mx-auto px-10 md:px-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 text-left">
              <h2 className="text-[28px] font-black text-white mb-6 tracking-tight font-display">Flavor</h2>
              <p className="text-neutral-400 text-sm leading-relaxed mb-6 font-body">
                High-end culinary and mobility logistics for the modern professional.
              </p>
              <div className="flex gap-4">
                <a href="#social" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-all">
                  <Icon name="public" className="text-base" />
                </a>
                <a href="#social" className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:border-white transition-all">
                  <Icon name="alternate_email" className="text-base" />
                </a>
              </div>
            </div>

            <div className="text-left">
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6 text-white/40 font-display">Solutions</h4>
              <ul className="space-y-3.5 text-sm text-neutral-300 font-body">
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#food">Executive Food</a></li>
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#rides">Executive Motion</a></li>
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#corporate">Corporate Accounts</a></li>
                <li><Link className="hover:text-[#c5a47e] transition-colors" to="/partner">Partner with Us</Link></li>
              </ul>
            </div>

            <div className="text-left">
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6 text-white/40 font-display">Support</h4>
              <ul className="space-y-3.5 text-sm text-neutral-300 font-body">
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#help">Help Center</a></li>
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#safety">Safety Protocols</a></li>
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#privacy">Privacy Policy</a></li>
                <li><a className="hover:text-[#c5a47e] transition-colors" href="#terms">Terms of Service</a></li>
              </ul>
            </div>

            {/* Stacked Monochrome Store Badges */}
            <div className="text-left">
              <h4 className="text-xs uppercase tracking-widest font-bold mb-6 text-white/40 font-display">Download</h4>
              <div className="flex flex-col gap-3">
                <a href="#download" className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded hover:bg-white/10 transition-all max-w-[170px]">
                  <Icon name="grid_view" className="text-lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase tracking-wider text-neutral-400">Download on the</span>
                    <span className="text-[13px] font-bold mt-0.5">App Store</span>
                  </div>
                </a>
                <a href="#download" className="flex items-center gap-3 bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded hover:bg-white/10 transition-all max-w-[170px]">
                  <Icon name="play_arrow" className="text-lg" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[8px] uppercase tracking-wider text-neutral-400">Get it on</span>
                    <span className="text-[13px] font-bold mt-0.5">Google Play</span>
                  </div>
                </a>
              </div>
            </div>
          </div>
          
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-white/40 text-xs font-body">© 2026 Flavor Technologies Inc. All rights reserved.</p>
            <div className="flex gap-8 text-xs font-bold text-white/40 uppercase tracking-widest font-display">
              <a className="hover:text-white" href="#privacy">Privacy</a>
              <a className="hover:text-white" href="#terms">Terms</a>
              <a className="hover:text-white" href="#security">Security</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
