import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

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
  name: string;
  price: number;
  description: string;
  category: string;
  isVeg: boolean;
}

function Icon({ name, className = "" }: { name: string; className?: string }) {
  return <span className={`material-symbols-outlined select-none ${className}`}>{name}</span>;
}

export default function RestaurantMenuFront() {
  const { id } = useParams<{ id: string }>();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="h-12 w-12 border-4 border-[#002045] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#002045] font-semibold text-lg animate-pulse">Loading Restaurant Menu...</p>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
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

  return (
    <div className="bg-[#f8fafc] min-h-screen text-[#0f172a] font-sans pb-20">
      
      {/* Premium Header/Banner */}
      <div className="relative bg-gradient-to-br from-[#002045] to-[#01356e] text-white overflow-hidden py-16 px-6 md:px-20 border-b border-slate-100 shadow-md">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] rounded-full bg-white/5 blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />
        <div className="max-w-[1280px] mx-auto relative z-10">
          
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-semibold mb-8 group"
          >
            <Icon name="arrow_back" className="text-lg group-hover:-translate-x-1 transition-transform" />
            Back to Flavor Home
          </Link>

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-white/10 backdrop-blur-md text-white text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider border border-white/10 flex items-center gap-1.5">
                  <Icon name="restaurant" className="text-sm" /> Restaurant
                </span>
                {restaurant.isPureVeg ? (
                  <span className="bg-green-500/20 text-green-300 text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider border border-green-500/30 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-400" /> Pure Veg
                  </span>
                ) : (
                  <span className="bg-orange-500/20 text-orange-300 text-xs px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider border border-orange-500/30 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-orange-400" /> Veg & Non-Veg
                  </span>
                )}
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{restaurant.name}</h1>
              <div className="flex flex-wrap items-center gap-y-2 gap-x-6 text-sm text-white/80">
                <div className="flex items-center gap-1.5">
                  <Icon name="map_pin" className="text-base text-white/60" />
                  <span>{restaurant.address}</span>
                </div>
                {restaurant.phone && (
                  <div className="flex items-center gap-1.5">
                    <Icon name="call" className="text-base text-white/60" />
                    <span>{restaurant.phone}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shrink-0">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-400">
                  <Icon name="star" className="fill-current text-xl" />
                  <span className="text-xl font-black">{restaurant.rating || "4.0"}</span>
                </div>
                <span className="text-xs text-white/60 font-medium">Rating</span>
              </div>
              <div className="w-[1px] h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-black text-white">{restaurant.reviews || "100+"}</div>
                <span className="text-xs text-white/60 font-medium">Reviews</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-[1280px] mx-auto px-6 md:px-20 mt-10 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters and Search - Sticky Left Side */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6 sticky top-28">
            <h2 className="font-bold text-lg text-[#002045] flex items-center gap-2">
              <Icon name="filter_alt" /> Filters
            </h2>
            
            {/* Search */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Menu</label>
              <div className="flex items-center gap-2 border border-slate-200 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors">
                <Icon name="search" className="text-slate-400 text-lg" />
                <input
                  type="text"
                  placeholder="Search dish..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-sm w-full"
                />
              </div>
            </div>

            {/* Veg Switch */}
            <div className="flex items-center justify-between p-3 border border-green-200/50 bg-green-50/30 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-green-500 border border-green-600 inline-block" />
                <span className="text-sm font-semibold text-green-800">Vegetarian Only</span>
              </div>
              <input
                type="checkbox"
                checked={vegOnly}
                onChange={(e) => setVegOnly(e.target.checked)}
                className="h-4.5 w-4.5 accent-green-600 cursor-pointer"
              />
            </div>

            {/* Categories list */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Categories</label>
              <div className="flex flex-col gap-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                      selectedCategory === cat
                        ? "bg-[#002045]/5 text-[#002045]"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Icon name="chevron_right" className="text-base" />}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Menu Items List - Right Side */}
        <div className="lg:col-span-3 space-y-8">
          
          {filteredMenu.length === 0 ? (
            <div className="bg-white py-20 text-center border border-dashed rounded-2xl space-y-3">
              <Icon name="search_off" className="text-slate-300 text-5xl" />
              <h3 className="text-lg font-bold text-slate-700">No Dishes Found</h3>
              <p className="text-slate-400 text-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : (
            // Group and render
            Object.entries(
              filteredMenu.reduce((acc, item) => {
                const cat = item.category || "General";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
              }, {} as Record<string, MenuItem[]>)
            ).map(([category, items]) => (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-[#002045] uppercase tracking-wide">
                    {category}
                  </h3>
                  <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? "item" : "items"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-100 rounded-2xl p-5 flex justify-between gap-4 shadow-sm hover:shadow-md transition-all duration-300 group"
                    >
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-full inline-block border shrink-0 ${
                              item.isVeg ? "bg-green-500 border-green-600" : "bg-red-500 border-red-600"
                            }`}
                          />
                          <h4 className="font-extrabold text-slate-800 text-base group-hover:text-[#002045] transition-colors">
                            {item.name}
                          </h4>
                        </div>
                        {item.description && (
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col justify-between items-end shrink-0">
                        <span className="text-lg font-black text-[#002045]">₹{item.price}</span>
                        <button className="mt-4 bg-[#002045]/5 hover:bg-[#002045] text-[#002045] hover:text-white px-4 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border border-[#002045]/10 hover:border-transparent">
                          ADD
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

        </div>

      </div>

    </div>
  );
}
