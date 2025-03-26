import { useBlockProps } from '@wordpress/block-editor';

const Save = () => {
  const blockProps = useBlockProps.save();
  // Hardcoded area names
  const areaNames = ['ŠEIMA', 'DRAUGAI', 'LAISVALAIKIS', 'TOBULĖJIMAS', 'DARBAS / VERSLAS', 'NAMAI / BUITIS'];

  return (
    <div {...blockProps} className="countdown-workdays-widget">

      <div class="counter-container" style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
        <div class="counter-box" style="background-color: #f5f5f5; border-radius: 8px; padding: 20px; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h3 style="font-size: 18px; margin-bottom: 10px;">KIEK LAIKO* TURI DARBO REIKALAMS?</h3>
          <h3 style="font-size: 18px; margin-bottom: 10px;">Šiandien:</h3>
          <p id="today-counter" style="font-size: 24px; font-weight: bold; color: #0073aa;">Skaičiuojama...</p>
          <h3 style="font-size: 18px; margin-bottom: 10px;">Šią savaitę:</h3>
          <p id="week-counter" style="font-size: 24px; font-weight: bold; color: #0073aa;">Skaičiuojama...</p>
          <h3 style="font-size: 18px; margin-bottom: 10px;">Šį mėnesį:</h3>
          <p id="month-counter" style="font-size: 24px; font-weight: bold; color: #0073aa;">Skaičiuojama...</p>
          <h3 style="font-size: 18px; margin-bottom: 10px;">Šį ketvirtį:</h3>
          <p id="quarter-counter" style="font-size: 24px; font-weight: bold; color: #0073aa;">Skaičiuojama...</p>
          <h3 style="font-size: 18px; margin-bottom: 10px;">Šiais metais:</h3>
          <p id="year-counter" style="font-size: 24px; font-weight: bold; color: #0073aa;">Skaičiuojama...</p>
        </div>
      </div>

    </div>
  );
};

export default Save;
