import { useLanguage } from '../context/LanguageContext';

import './GreetingCard.css';

function GreetingCard() {
  const { t } = useLanguage();

  const hour = new Date().getHours();

  let greeting = t('Good morning');

  if (hour >= 12 && hour < 17) {
    greeting = t('Good afternoon');
  } else if (hour >= 17) {
    greeting = t('Good evening');
  }

  return (
    <section className="greeting-card">

      <div className="greeting-content">
        <p className="greeting-label">
          {greeting}
        </p>

        <h2>
          {t('Welcome to KrishiBandhu')}
        </h2>

        <span>
          {t('Everything you need to make better farming decisions.')}
        </span>
      </div>

    </section>
  );
}

export default GreetingCard;