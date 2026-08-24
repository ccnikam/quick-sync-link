import type { MenuItem } from "./types";

const raw: [string, [string, number, boolean?][]][] = [
  [
    "Shev Bhaji Special",
    [
      ["Shev Bhaji", 120],
      ["Lasun Shev Bhaji", 130],
      ["Tikhat Shev Bhaji", 130],
      ["Sev Tamatar", 140],
      ["Shev Masala", 150],
    ],
  ],
  [
    "Dal Special",
    [
      ["Dal Tadka", 130],
      ["Dal Fry", 120],
      ["Dal Makhani", 180],
      ["Dal Palak", 150],
    ],
  ],
  [
    "Paneer Special",
    [
      ["Shahi Paneer", 220],
      ["Paneer Angara", 240],
      ["Paneer Masala", 180],
      ["Kadai Paneer", 230],
      ["Paneer Tikka Masala", 250],
      ["Paneer Kolhapuri", 240],
      ["Paneer Handi", 250],
      ["Paneer Bhurji", 220],
      ["Paneer Lababdar", 250],
      ["Kaju Paneer Masala", 240],
      ["Paneer Butter Masala", 190],
    ],
  ],
  [
    "Kaju Special",
    [
      ["Kaju Masala", 180],
      ["Kaju Curry", 200],
    ],
  ],
  [
    "Green Delights",
    [
      ["Palak Paneer", 220],
      ["Mutter Masala", 170],
      ["Aloo Mutter", 160],
      ["Dum Aloo", 160],
    ],
  ],
  [
    "Soya Special",
    [
      ["Soya Chilli (Dry)", 120],
      ["Soya Chilli Gravy", 120],
      ["Soyabean Masala", 120],
    ],
  ],
  [
    "Veg Main Course",
    [
      ["Veg Maratha", 220],
      ["Veg Kolhapuri", 200],
      ["Veg Handi", 200],
      ["Veg Toofani", 210],
      ["Baingan Masala", 140],
      ["Bhindi Masala", 140],
      ["Bhindi Fry", 170],
      ["Curry Rice", 190],
      ["Methi Bhaji", 160],
      ["Shevga Masala", 150],
      ["Dry Shevga", 190],
      ["Matki Masala", 150],
      ["Patodi Bhaji", 140],
      ["Chana Masala", 150],
    ],
  ],
  [
    "Chinese & Snacks",
    [
      ["Hakka Noodles", 120, true],
      ["Finger Chips (Half)", 60, true],
      ["Finger Chips (Full)", 120, true],
    ],
  ],
  [
    "Rice & Biryani",
    [
      ["Steam Rice (Half)", 60],
      ["Steam Rice (Full)", 120],
      ["Jeera Rice (Half)", 80],
      ["Jeera Rice (Full)", 140],
      ["Veg Pulao (Half)", 100],
      ["Veg Pulao (Full)", 180],
      ["Masala Rice (Half)", 100],
      ["Masala Rice (Full)", 180],
      ["Dal Khichdi (Half)", 100],
      ["Dal Khichdi (Full)", 180],
      ["Veg Biryani (Half)", 130],
      ["Veg Biryani (Full)", 240],
      ["Paneer Biryani (Half)", 140],
      ["Paneer Biryani (Full)", 260],
    ],
  ],
  [
    "Indian Breads",
    [
      ["Chapati", 15, true],
      ["Tandoor Roti", 15, true],
      ["Butter Roti", 20, true],
      ["Bhakar", 20, true],
      ["Masala Papad", 40, true],
      ["Nagli/Udid Roast Papad", 20, true],
    ],
  ],
  [
    "Nashta / Breakfast",
    [
      ["Misal Pav", 80, true],
      ["Pohe", 60, true],
    ],
  ],
  [
    "Beverages",
    [
      ["Buttermilk", 30, true],
      ["Sweet Lassi", 60, true],
      ["Salted Lassi", 50, true],
      ["Tea", 20, true],
      ["Coffee", 30, true],
      ["Mineral Water", 20, true],
      ["Soft Drink", 40, true],
    ],
  ],
  [
    "Ice Cream",
    [
      ["Chocolate (Small)", 30, true],
      ["Chocolate (Big)", 50, true],
      ["Vanilla (Small)", 30, true],
      ["Vanilla (Big)", 50, true],
      ["Butterscotch (Small)", 30, true],
      ["Butterscotch (Big)", 50, true],
    ],
  ],
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const MENU: MenuItem[] = raw.flatMap(([category, items]) =>
  items.map(([name, price, tracked]) => ({
    id: slug(name),
    name,
    category,
    price,
    tracked: !!tracked,
  })),
);

export const CATEGORIES = raw.map(([c]) => c);

export const rupees = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
