import { useState } from "react";
import { Search, Filter, SlidersHorizontal, ArrowUpDown, Clock, Star, BookOpen } from "lucide-react";
import { Course } from "../types";
import { Language, getTranslation } from "../utils/translate";

interface CoursesProps {
  courses: Course[];
  lang: Language;
  onSelectCourse: (id: string) => void;
  theme: "light" | "dark";
}

export default function Courses({ courses, lang, onSelectCourse, theme }: CoursesProps) {
  const t = (key: any) => getTranslation(lang, key);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("popular"); // popular, priceAsc, priceDesc

  // Extract unique categories safely
  const categories = ["All", ...Array.from(new Set(courses.map(c => c.category)))];

  // Dynamic filter matching
  const filteredCourses = courses.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All" || c.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Sort calculations
  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === "priceAsc") {
      const pA = a.price * (1 - a.discount / 100);
      const pB = b.price * (1 - b.discount / 100);
      return pA - pB;
    }
    if (sortBy === "priceDesc") {
      const pA = a.price * (1 - a.discount / 100);
      const pB = b.price * (1 - b.discount / 100);
      return pB - pA;
    }
    return b.rating - a.rating; // default: popular (high rating)
  });

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Page Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {lang === "en" ? "Explore Skills Classrooms" : "វគ្គសិក្សាជំនាញបច្ចេកវិទ្យាសរុប"}
        </h1>
        <p className="text-slate-500">
          {lang === "en" ? "Refine. Level up. Advance your technical abilities with high-quality syllabus materials." : "ស្វែងយល់ពីវគ្គសិក្សាជំនាញជាច្រើនប្រភេទដែលបង្រៀនដោយផ្ទាល់ជាភាសាខ្មែរ និងអង់គ្លេស"}
        </p>
      </div>

      {/* Controls: Search, Filter, Sort Row */}
      <div className={`flex flex-col md:flex-row gap-4 p-4 rounded-2xl ${
        theme === 'dark' ? 'glass-card text-white border-white/10' : 'glass-card-light'
      }`}>
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm transition-all ${
              theme === 'dark' ? 'glass-input' : 'glass-input-light'
            }`}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Category Dropdown */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all ${
            theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light bg-white font-medium'
          }`}>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-slate-800 dark:text-slate-100"
            >
              {categories.map((cat, i) => (
                <option key={i} value={cat} className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">
                  {cat === "All" ? t("allCategories") : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sorters Dropdown */}
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm transition-all ${
            theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light bg-white font-medium'
          }`}>
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer text-slate-800 dark:text-slate-100"
            >
              <option value="popular" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{t("popular")}</option>
              <option value="priceAsc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{t("priceLowHigh")}</option>
              <option value="priceDesc" className="bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100">{t("priceHighLow")}</option>
            </select>
          </div>

        </div>

      </div>

      {/* Grid List */}
      {sortedCourses.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCourses.map((c) => {
            const finalPrice = c.price * (1 - c.discount / 100);
            return (
              <div
                key={c.id}
                onClick={() => onSelectCourse(c.id)}
                className={`group flex flex-col justify-between overflow-hidden rounded-xl cursor-pointer hover:-translate-y-1 shadow-sm hover:shadow-md transition-all ${
                  theme === 'dark' ? 'glass-card border-white/10 text-white' : 'glass-card-light'
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video w-full bg-slate-50 overflow-hidden">
                  <img
                    referrerPolicy="no-referrer"
                    src={c.thumbnail}
                    alt={c.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-lg px-2 py-0.5 text-2xs font-extrabold uppercase text-white bg-indigo-600 shadow">
                    {c.category}
                  </span>
                  {c.discount > 0 && (
                    <span className="absolute top-3 right-3 rounded-lg px-1.5 py-0.5 text-2xs font-bold text-white bg-rose-600 shadow animate-pulse">
                      -{c.discount}% OFF
                    </span>
                  )}
                </div>

                {/* Info block */}
                <div className="flex-1 p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center text-2xs font-mono text-slate-400 justify-between">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {c.duration}
                      </span>
                      <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                        <Star className="w-3 h-3 fill-current" />
                        {c.rating}
                      </span>
                    </div>

                    <h3 className="font-bold text-base tracking-tight line-clamp-1 group-hover:text-indigo-500 transition-colors">
                      {c.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {c.description}
                    </p>
                  </div>

                  <div className="flex items-baseline justify-between pt-3 border-t border-slate-150 dark:border-white/10">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-black text-indigo-500">
                        ${finalPrice.toFixed(2)}
                      </span>
                      {c.discount > 0 && (
                        <span className="text-xs text-slate-400 line-through">
                          ${c.price.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <span className="text-2xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform flex items-center gap-0.5">
                      {lang === 'en' ? 'Learn' : 'ចូលរៀន'} →
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`p-12 text-center rounded-2xl ${theme === 'dark' ? 'glass-card border-white/10' : 'glass-card-light'}`}>
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-lg">{lang === "en" ? "No courses match your query" : "រកមិនឃើញវគ្គសិក្សាម្ល៉ោះទេ"}</h3>
          <p className="text-sm text-slate-500 mt-1">{lang === "en" ? "Try adjusting filters or typing an alternative query." : "សូមព្យាយាមស្វែងរកជាមួយពាក្យគន្លឹះផ្សេងទៀត។"}</p>
        </div>
      )}

    </div>
  );
}
