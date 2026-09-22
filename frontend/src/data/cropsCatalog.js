// ==========================================
// CROP CATALOG
// ==========================================
//
// A curated list of crops commonly grown in
// India. Used by the Crops page and the
// CropForm picker so farmers can choose a
// crop from a list instead of typing a
// free-form name.
//
// `name` (lowercase) is matched against the
// live mandi market-prices feed to show the
// current modal price on each crop.

const CROPS_CATALOG = [
  // ---------- Cereals ----------
  { name: 'Rice', category: 'cereals', emoji: '🌾', seasons: ['Kharif', 'Rabi'] },
  { name: 'Wheat', category: 'cereals', emoji: '🌾', seasons: ['Rabi'] },
  { name: 'Maize', category: 'cereals', emoji: '🌽', seasons: ['Kharif', 'Rabi'] },
  { name: 'Bajra', category: 'cereals', emoji: '🌾', seasons: ['Kharif'] },
  { name: 'Jowar', category: 'cereals', emoji: '🌾', seasons: ['Kharif', 'Rabi'] },
  { name: 'Ragi', category: 'cereals', emoji: '🌾', seasons: ['Kharif'] },
  { name: 'Barley', category: 'cereals', emoji: '🌾', seasons: ['Rabi'] },

  // ---------- Pulses ----------
  { name: 'Gram', category: 'pulses', emoji: '🫘', seasons: ['Rabi'] },
  { name: 'Tur', category: 'pulses', emoji: '🫘', seasons: ['Kharif'] },
  { name: 'Green Gram', category: 'pulses', emoji: '🫘', seasons: ['Kharif', 'Zaid'] },
  { name: 'Black Gram', category: 'pulses', emoji: '🫘', seasons: ['Kharif'] },
  { name: 'Lentil', category: 'pulses', emoji: '🫘', seasons: ['Rabi'] },
  { name: 'Peas', category: 'pulses', emoji: '🫛', seasons: ['Rabi'] },
  { name: 'Horse Gram', category: 'pulses', emoji: '🫘', seasons: ['Kharif'] },

  // ---------- Oilseeds ----------
  { name: 'Groundnut', category: 'oilseeds', emoji: '🥜', seasons: ['Kharif', 'Rabi'] },
  { name: 'Soybean', category: 'oilseeds', emoji: '🌱', seasons: ['Kharif'] },
  { name: 'Mustard', category: 'oilseeds', emoji: '🌼', seasons: ['Rabi'] },
  { name: 'Sunflower', category: 'oilseeds', emoji: '🌻', seasons: ['Kharif', 'Rabi'] },
  { name: 'Sesame', category: 'oilseeds', emoji: '🌾', seasons: ['Kharif'] },
  { name: 'Castor', category: 'oilseeds', emoji: '🌿', seasons: ['Kharif'] },
  { name: 'Safflower', category: 'oilseeds', emoji: '🌺', seasons: ['Rabi'] },

  // ---------- Vegetables ----------
  { name: 'Potato', category: 'vegetables', emoji: '🥔', seasons: ['Rabi', 'Kharif'] },
  { name: 'Onion', category: 'vegetables', emoji: '🧅', seasons: ['Rabi', 'Kharif'] },
  { name: 'Tomato', category: 'vegetables', emoji: '🍅', seasons: ['All'] },
  { name: 'Cauliflower', category: 'vegetables', emoji: '🥦', seasons: ['Rabi'] },
  { name: 'Cabbage', category: 'vegetables', emoji: '🥬', seasons: ['Rabi'] },
  { name: 'Brinjal', category: 'vegetables', emoji: '🍆', seasons: ['Kharif'] },
  { name: 'Okra', category: 'vegetables', emoji: '🌿', seasons: ['Kharif'] },
  { name: 'Chilli', category: 'vegetables', emoji: '🌶️', seasons: ['Kharif'] },
  { name: 'Capsicum', category: 'vegetables', emoji: '🫑', seasons: ['Kharif'] },
  { name: 'Carrot', category: 'vegetables', emoji: '🥕', seasons: ['Rabi'] },
  { name: 'Radish', category: 'vegetables', emoji: '🌶️', seasons: ['Rabi', 'Zaid'] },
  { name: 'Spinach', category: 'vegetables', emoji: '🥬', seasons: ['Rabi'] },
  { name: 'Fenugreek', category: 'vegetables', emoji: '🌿', seasons: ['Rabi'] },
  { name: 'Cucumber', category: 'vegetables', emoji: '🥒', seasons: ['Zaid'] },
  { name: 'Bitter Gourd', category: 'vegetables', emoji: '🥒', seasons: ['Kharif'] },
  { name: 'Bottle Gourd', category: 'vegetables', emoji: '🥒', seasons: ['Kharif', 'Zaid'] },
  { name: 'Ridge Gourd', category: 'vegetables', emoji: '🥒', seasons: ['Kharif'] },
  { name: 'Pumpkin', category: 'vegetables', emoji: '🎃', seasons: ['Kharif'] },
  { name: 'Sweet Potato', category: 'vegetables', emoji: '🍠', seasons: ['Kharif'] },
  { name: 'Garlic', category: 'vegetables', emoji: '🧄', seasons: ['Rabi'] },
  { name: 'Ginger', category: 'vegetables', emoji: '🫚', seasons: ['Kharif'] },
  { name: 'Green Peas', category: 'vegetables', emoji: '🫛', seasons: ['Rabi'] },

  // ---------- Fruits ----------
  { name: 'Apple', category: 'fruits', emoji: '🍎', seasons: ['Rabi'] },
  { name: 'Banana', category: 'fruits', emoji: '🍌', seasons: ['All'] },
  { name: 'Orange', category: 'fruits', emoji: '🍊', seasons: ['Rabi'] },
  { name: 'Papaya', category: 'fruits', emoji: '🍈', seasons: ['All'] },
  { name: 'Pomegranate', category: 'fruits', emoji: '🍒', seasons: ['Rabi'] },
  { name: 'Mango', category: 'fruits', emoji: '🥭', seasons: ['Zaid'] },
  { name: 'Grapes', category: 'fruits', emoji: '🍇', seasons: ['Rabi'] },
  { name: 'Guava', category: 'fruits', emoji: '🍐', seasons: ['All'] },
  { name: 'Watermelon', category: 'fruits', emoji: '🍉', seasons: ['Zaid'] },
  { name: 'Muskmelon', category: 'fruits', emoji: '🍈', seasons: ['Zaid'] },
  { name: 'Lemon', category: 'fruits', emoji: '🍋', seasons: ['All'] },
  { name: 'Sapota', category: 'fruits', emoji: '🍮', seasons: ['All'] },
  { name: 'Custard Apple', category: 'fruits', emoji: '🍏', seasons: ['Kharif'] },
  { name: 'Pineapple', category: 'fruits', emoji: '🍍', seasons: ['All'] },
  { name: 'Litchi', category: 'fruits', emoji: '🍓', seasons: ['Zaid'] },
  { name: 'Strawberry', category: 'fruits', emoji: '🍓', seasons: ['Rabi'] },

  // ---------- Cash & other ----------
  { name: 'Sugarcane', category: 'other', emoji: '🎋', seasons: ['All'] },
  { name: 'Cotton', category: 'other', emoji: '🌿', seasons: ['Kharif'] },
  { name: 'Turmeric', category: 'other', emoji: '🟡', seasons: ['Kharif'] },
  { name: 'Tea', category: 'other', emoji: '🍃', seasons: ['All'] },
  { name: 'Coffee', category: 'other', emoji: '☕', seasons: ['All'] },
  { name: 'Coconut', category: 'other', emoji: '🥥', seasons: ['All'] },
  { name: 'Arecanut', category: 'other', emoji: '🌴', seasons: ['All'] },
  { name: 'Jute', category: 'other', emoji: '🌾', seasons: ['Kharif'] },
];

// ==========================================
// Categories (for chips + labels)
// ==========================================

const CROP_CATEGORIES = {
  all: { label: 'All crops', emoji: '📚' },
  cereals: { label: 'Cereals', emoji: '🌾' },
  pulses: { label: 'Pulses', emoji: '🫘' },
  oilseeds: { label: 'Oilseeds', emoji: '🌻' },
  vegetables: { label: 'Vegetables', emoji: '🥕' },
  fruits: { label: 'Fruits', emoji: '🍎' },
  other: { label: 'Cash & others', emoji: '🌿' },
};

export { CROPS_CATALOG, CROP_CATEGORIES };