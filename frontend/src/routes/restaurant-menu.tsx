import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

interface Restaurant {
  _id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isPureVeg: boolean;
  rating: number;
  reviews: string;
}

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
  images?: string[];
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined select-none ${className}`}>{name}</span>;
}

export default function RestaurantMenuFront() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const highlightedItemId = searchParams.get("item");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [vegOnly, setVegOnly] = useState(false);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

  useEffect(() => {
    const fetchRestaurantData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE_URL}/food/restaurant-menu/restaurants/${id}`);
        if (!res.ok) {
          throw new Error("Restaurant not found or database error");
        }
        const data = await res.json();
        setRestaurant(data.restaurant);
        setMenu(data.menu || []);
      } catch (err: any) {
        setError(err.message || "Failed to load restaurant menu");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchRestaurantData();
    }
  }, [id, API_BASE_URL]);

  // Shared via a "share this dish" link — scroll straight to it once the menu has loaded.
  useEffect(() => {
    if (loading || !highlightedItemId) return;
    const el = document.getElementById(`menu-item-${highlightedItemId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [loading, highlightedItemId]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center gap-4">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, ease: "linear", duration: 1 }}
          className="h-12 w-12 border-4 border-[#002045] border-t-transparent rounded-full" 
        />
        <motion.p 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#002045] font-semibold text-lg"
        >
          Loading Menu...
        </motion.p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <Icon name="error" className="text-red-500 text-6xl mb-4" />
        <h1 className="text-2xl font-bold text-[#002045]">Oops! Something went wrong</h1>
        <p className="text-slate-500 mt-2 max-w-md">{error || "We couldn't find the restaurant you were looking for."}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 bg-[#002045] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#002045]/90 transition-all shadow-md"
        >
          <Icon name="arrow_back" /> Back to Home
        </Link>
      </div>
    );
  }

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(menu.map((item) => item.category || "General")))];

  // Filter menu items
  const filteredMenu = menu.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesVeg = !vegOnly || item.isVeg;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  const groupedMenu = Object.entries(
    filteredMenu.reduce((acc, item) => {
      const cat = item.category || "General";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, MenuItem[]>)
  );

  return (
    <div className="bg-[#f4f6f8] min-h-[100dvh] text-[#0f172a] font-sans pb-24 relative selection:bg-[#002045] selection:text-white">
      
      {/* Mobile Top App Bar (Sticky) */}
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-white/20 shadow-sm px-4 py-3 flex items-center justify-between md:hidden"
      >
        <Link to="/" className="p-2 -ml-2 rounded-full hover:bg-slate-100/50 text-[#002045] transition-colors">
          <Icon name="arrow_back" />
        </Link>
        <h1 className="font-bold text-[#002045] truncate px-2">{restaurant.name}</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </motion.div>

      {/* Premium Hero Header */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative bg-gradient-to-b from-[#002045] to-[#01356e] text-white overflow-hidden py-10 md:py-16 px-6 md:px-20 md:border-b border-slate-100 md:shadow-md rounded-b-[2.5rem] md:rounded-none"
      >
        {/* Animated Background Blob */}
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 right-0 w-72 md:w-[400px] h-72 md:h-[400px] rounded-full bg-[#3b82f6]/20 blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" 
        />
        
        <div className="max-w-[1280px] mx-auto relative z-10">
          <Link
            to="/"
            className="hidden md:inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-semibold mb-8 group"
          >
            <Icon name="arrow_back" className="text-lg group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="space-y-3 md:space-y-4 text-center md:text-left"
            >
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="bg-white/10 backdrop-blur-md text-white text-[10px] md:text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1">
                  <Icon name="restaurant" className="text-xs md:text-sm" /> Restaurant
                </span>
                {restaurant.isPureVeg ? (
                  <span className="bg-green-500/20 text-green-300 text-[10px] md:text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-green-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-green-400 animate-pulse" /> Pure Veg
                  </span>
                ) : (
                  <span className="bg-orange-500/20 text-orange-300 text-[10px] md:text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider border border-orange-500/30 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-orange-400" /> Veg & Non-Veg
                  </span>
                )}
              </div>
              
              <h1 className="text-3xl md:text-5xl font-black tracking-tight">{restaurant.name}</h1>
              
              <div className="flex flex-col md:flex-row md:flex-wrap items-center justify-center md:justify-start gap-y-1.5 gap-x-6 text-xs md:text-sm text-white/80">
                <div className="flex items-center gap-1">
                  <Icon name="map_pin" className="text-sm md:text-base text-white/60" />
                  <span className="truncate max-w-[250px]">{restaurant.address}</span>
                </div>
                {restaurant.phone && (
                  <div className="flex items-center gap-1">
                    <Icon name="call" className="text-sm md:text-base text-white/60" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-6 bg-white/10 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl mx-auto md:mx-0 shrink-0"
            >
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Icon name="star" className="fill-current text-lg md:text-xl" />
                  <span className="text-lg md:text-xl font-black">{restaurant.rating || "4.0"}</span>
                </div>
                <span className="text-[10px] md:text-xs text-white/60 font-medium uppercase tracking-widest">Rating</span>
              </div>
              <div className="w-[1px] h-10 bg-white/20" />
              <div className="text-center px-2">
                <div className="text-lg md:text-xl font-black text-white">{restaurant.reviews || "100+"}</div>
                <span className="text-[10px] md:text-xs text-white/60 font-medium uppercase tracking-widest">Reviews</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content Area */}
      <div className="max-w-[1280px] mx-auto px-4 md:px-20 mt-6 grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
        
        {/* Mobile-Only Horizontal Category & Filters Nav */}
        <div className="lg:hidden sticky top-[53px] z-40 bg-[#f4f6f8] pt-2 pb-3 -mx-4 px-4 space-y-3">
          
          {/* Mobile Search & Veg Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
              <Icon name="search" className="text-slate-400 text-lg" />
              <input
                type="text"
                placeholder="Search dish..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-full font-medium placeholder:font-normal"
              />
            </div>
            <button 
              onClick={() => setVegOnly(!vegOnly)}
              className={`shrink-0 flex items-center justify-center h-10 w-10 rounded-xl transition-all shadow-sm ${vegOnly ? 'bg-green-100 border-green-200 text-green-700' : 'bg-white border-slate-100 text-slate-400'}`}
            >
              <div className={`h-4 w-4 rounded-sm border-2 flex items-center justify-center ${vegOnly ? 'border-green-600' : 'border-slate-400'}`}>
                <div className={`h-2 w-2 rounded-full ${vegOnly ? 'bg-green-600' : 'bg-transparent'}`} />
              </div>
            </button>
          </motion.div>

          {/* Horizontally Scrollable Categories */}
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide snap-x">
            {categories.map((cat, idx) => (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`snap-start shrink-0 px-5 py-2 rounded-full text-sm font-bold transition-all shadow-sm ${
                  selectedCategory === cat
                    ? "bg-[#002045] text-white"
                    : "bg-white text-slate-500 hover:bg-slate-50"
                }`}
              >
                {cat}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Desktop Sidebar Filters */}
        <div className="hidden lg:block lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 sticky top-28">
            <h2 className="font-black text-xl text-[#002045] flex items-center gap-2">
              <Icon name="tune" /> Filter
            </h2>
            
            {/* Search */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 border-2 border-slate-100 focus-within:border-[#002045] p-3 rounded-2xl bg-slate-50 transition-colors">
                <Icon name="search" className="text-slate-400 text-lg" />
                <input
                  type="text"
                  placeholder="Search your craving..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full font-medium"
                />
              </div>
            </div>

            {/* Veg Switch */}
            <div 
              onClick={() => setVegOnly(!vegOnly)}
              className="flex items-center justify-between p-4 border-2 border-slate-100 rounded-2xl cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-sm border-2 border-green-600 flex items-center justify-center bg-green-50">
                   <div className="h-2.5 w-2.5 rounded-full bg-green-600" />
                </div>
                <span className="text-sm font-bold text-slate-700">Veg Only</span>
              </div>
              <div className={`w-10 h-6 rounded-full p-1 transition-colors ${vegOnly ? 'bg-green-500' : 'bg-slate-200'}`}>
                <motion.div 
                  layout
                  className={`bg-white w-4 h-4 rounded-full shadow-sm ${vegOnly ? 'ml-auto' : 'mr-auto'}`}
                />
              </div>
            </div>

            <div className="h-px bg-slate-100 w-full" />

            {/* Categories list */}
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-300 uppercase tracking-widest block">Categories</label>
              <div className="flex flex-col gap-1.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left px-4 py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-between group ${
                      selectedCategory === cat
                        ? "bg-[#002045] text-white shadow-md"
                        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Icon name="check" className="text-base" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Menu Items List - Right Side */}
        <div className="lg:col-span-3 space-y-8 md:space-y-12">
          
          <AnimatePresence mode="wait">
            {filteredMenu.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white py-20 text-center border-2 border-dashed border-slate-200 rounded-[2rem] space-y-4 shadow-sm"
              >
                <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Icon name="search_off" className="text-slate-300 text-4xl" />
                </div>
                <h3 className="text-xl font-black text-slate-700">No Dishes Found</h3>
                <p className="text-slate-400 text-sm font-medium">Try adjusting your filters or search query.</p>
                <button 
                  onClick={() => { setSearchQuery(""); setVegOnly(false); setSelectedCategory("All"); }}
                  className="mt-4 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full text-sm font-bold transition-colors"
                >
                  Clear Filters
                </button>
              </motion.div>
            ) : (
              // Group and render
              groupedMenu.map(([category, items], categoryIndex) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5 }}
                  key={category} 
                  className="space-y-4 md:space-y-6"
                >
                  <div className="flex items-center gap-3 sticky top-[125px] md:static bg-[#f4f6f8] md:bg-transparent py-2 z-30">
                    <h3 className="text-xl md:text-2xl font-black text-[#002045] capitalize tracking-tight">
                      {category}
                    </h3>
                    <div className="h-px bg-slate-200 flex-1 hidden md:block" />
                    <span className="text-xs font-black bg-white border border-slate-200 text-slate-500 px-3 py-1 rounded-full shadow-sm">
                      {items.length} {items.length === 1 ? "item" : "items"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
                    {items.map((item, idx) => (
                      <motion.div
                        id={`menu-item-${item._id}`}
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: idx * 0.05, duration: 0.3 }}
                        key={item._id || idx}
                        className={`bg-white border-2 rounded-[1.5rem] p-3 md:p-4 flex justify-between gap-3 md:gap-4 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.15)] transition-all duration-300 group ${
                          item._id === highlightedItemId ? "border-[#0651ED] ring-4 ring-[#0651ED]/15" : "border-transparent hover:border-slate-100"
                        }`}
                      >
                        <div className="space-y-1.5 flex-1 py-1 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start gap-2 mb-1.5">
                              <div className={`mt-1 h-3.5 w-3.5 rounded-sm border-[1.5px] shrink-0 flex items-center justify-center ${
                                item.isVeg ? "border-green-600 bg-green-50" : "border-red-600 bg-red-50"
                              }`}>
                                <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-600"}`} />
                              </div>
                              <h4 className="font-bold text-slate-800 text-base md:text-lg leading-snug group-hover:text-[#002045] transition-colors line-clamp-2">
                                {item.name}
                              </h4>
                            </div>
                            <span className="text-base md:text-lg font-black text-[#002045] block pb-1">₹{item.price}</span>
                          </div>
                          
                          {item.description && (
                            <p className="text-[11px] md:text-xs text-slate-400 font-medium leading-relaxed line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex flex-col items-center justify-center shrink-0 relative w-28 md:w-32">
                          {item.images && item.images.length > 0 && (
                            <div className="w-28 h-28 md:w-32 md:h-32 bg-slate-100 rounded-2xl overflow-hidden shadow-inner relative">
                              <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>

        </div>

      </div>



      <style dangerouslySetInnerHTML={{__html: `
        .scrollbar-hide::-webkit-scrollbar {
            display: none;
        }
        .scrollbar-hide {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
