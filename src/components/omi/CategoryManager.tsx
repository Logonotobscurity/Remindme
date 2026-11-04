/**
 * Simple category manager for the Omi shell.
 */
import { useState } from "react";
import { loadCategories, persistCategories, type Category, DEFAULT_CATEGORIES } from "@/lib/remind";

export function CategoryManager({ scope }: { scope: string }) {
  const [cats, setCats] = useState<Category[]>(() => loadCategories(scope));
  const [name, setName] = useState("");

  const add = () => {
    if (!name.trim()) return;
    const next = [...cats, { id: Date.now().toString(), name: name.trim(), icon: "📌" }];
    setCats(next);
    persistCategories(next, scope);
    setName("");
  };

  return (
    <div className="rounded-2xl bg-[#1C1C1E] p-4">
      <div className="mb-3 text-[15px] font-medium text-white">Categories</div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(cats.length ? cats : DEFAULT_CATEGORIES).map((c) => (
          <span key={c.id} className="rounded-full bg-[#2C2C2E] px-3 py-1 text-[12px] text-white">
            {c.icon} {c.name}
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New category"
          className="flex-1 rounded-lg bg-[#2C2C2E] px-3 py-2 text-[13px] text-white outline-none"
        />
        <button type="button" onClick={add} className="rounded-lg bg-white px-3 py-2 text-[13px] font-semibold text-black">
          Add
        </button>
      </div>
    </div>
  );
}
