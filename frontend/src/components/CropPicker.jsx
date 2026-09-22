import {
  useEffect,
  useState,
} from 'react';

import {
  Search,
  Plus,
  X,
} from 'lucide-react';

import {
  CROPS_CATALOG,
  CROP_CATEGORIES,
} from '../data/cropsCatalog';

import { useLanguage } from '../context/LanguageContext';

import './CropPicker.css';

// ==========================================
// CropPicker
// ==========================================
//
// Two usages:
//  - Form mode (onSelect + value): the search
//    box doubles as the crop-name field.
//    Picking a chip fills the name; typing a
//    custom name that matches nothing is also
//    accepted (saved as-is).
//  - Catalog mode (onAdd): a browsable list of
//    every crop with an "+ Add" action on each
//    card.
//
// Live mandi prices (priceMap) are shown as a
// small "₹X/quintal" tag when available.

function CropPicker({
  value = '',
  onValueChange,
  onSelect,
  onAdd,
  priceMap = {},
  compact = false,
}) {
  const { t } = useLanguage();

  const [query, setQuery] = useState(value || '');
  const [category, setCategory] = useState('all');
  const [showAll, setShowAll] = useState(false);

  // keep the search box in sync with the
  // selected crop name coming from the parent
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  const handleQuery = (text) => {
    setQuery(text);
    setShowAll(false);

    if (onValueChange) {
      onValueChange(text);
    }
  };

  const handlePick = (name) => {
    setQuery(name);
    setShowAll(false);

    if (onSelect) {
      onSelect(name);
    }
  };

  // ---------- filters ----------

  const q = query.trim().toLowerCase();

  const normalized = (str) =>
    str.toLowerCase();

  const filtered = CROPS_CATALOG.filter((crop) => {
    const matchesCategory =
      category === 'all' ||
      crop.category === category;

    const matchesQuery =
      !q ||
      normalized(crop.name).includes(q);

    return matchesCategory && matchesQuery;
  }).sort((a, b) => a.name.localeCompare(b.name));

  const shown = showAll
    ? filtered
    : filtered.slice(0, compact ? 8 : 12);

  const priceFor = (name) => {
    const key = normalized(name);
    return priceMap[key];
  };

  const isEmptyResult =
    q.length > 0 && filtered.length === 0;

  return (
    <div className={`crop-picker ${compact ? 'crop-picker-compact' : ''}`}>

      {/* ---------- search ---------- */}

      <div className="crop-picker-search">
        <Search size={15} className="crop-picker-search-icon" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQuery(e.target.value)}
          placeholder={
            onSelect
              ? t('Type or choose a crop...')
              : t('Search crops...')
          }
        />
        {query && (
          <button
            type="button"
            className="crop-picker-clear"
            onClick={() => handleQuery('')}
            aria-label={t('Clear search')}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ---------- category chips ---------- */}

      <div className="crop-picker-chips">
        {Object.entries(CROP_CATEGORIES).map(
          ([key, meta]) => (
            <button
              type="button"
              key={key}
              className={`crop-picker-chip ${
                category === key ? 'is-active' : ''
              }`}
              onClick={() => {
                setCategory(key);
                setShowAll(false);
              }}
            >
              <span>{meta.emoji}</span>
              {t(meta.label)}
            </button>
          ),
        )}
      </div>

      {/* ---------- empty / no match ---------- */}

      {isEmptyResult && (
        <div className="crop-picker-empty">
          {onSelect ? (
            <p>
              {t('No crop in the list matches “{0}”.', query)}
              <br />
              {t('It will be saved as your crop name.')}
            </p>
          ) : (
            <p>
              {t('No crops found for “{0}”.', query)}
            </p>
          )}
        </div>
      )}

      {/* ---------- grid ---------- */}

      {filtered.length > 0 && (
        <>
          <div className="crop-picker-grid">
            {shown.map((crop) => {
              const selected =
                onSelect &&
                normalized(value) ===
                  normalized(crop.name);

              const price = priceFor(crop.name);

              return (
                <button
                  type="button"
                  key={crop.name}
                  className={`crop-pick-card ${
                    selected ? 'is-selected' : ''
                  }`}
                  onClick={() => handlePick(crop.name)}
                >
                  <span className="crop-pick-emoji">
                    {crop.emoji}
                  </span>

                  <span className="crop-pick-info">
                    <strong>{crop.name}</strong>

                    <small>
                      {t(
                        CROP_CATEGORIES[crop.category]
                          .label,
                      )}
                      {crop.seasons &&
                        crop.seasons.length > 0 &&
                        ` · ${crop.seasons.join('/')}`}
                    </small>

                    {price && (
                      <em className="crop-pick-price">
                        {t('Mandi ₹{0}/{1}', price.price, price.unit)}
                      </em>
                    )}
                  </span>

                  {onAdd ? (
                    <span className="crop-pick-add" aria-hidden>
                      <Plus size={15} />
                    </span>
                  ) : selected ? (
                    <span className="crop-pick-check" aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* ---------- show more ---------- */}

          {filtered.length > shown.length && (
            <button
              type="button"
              className="crop-picker-more"
              onClick={() => setShowAll(true)}
            >
              {t('Show all {0} crops', filtered.length)}
            </button>
          )}
        </>
      )}

      {/* ---------- add action (catalog mode) ---------- */}

      {onAdd && filtered.length === 0 && !q && (
        <div className="crop-picker-empty">
          <p>{t('No crops to show.')}</p>
        </div>
      )}
    </div>
  );
}

export default CropPicker;