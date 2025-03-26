document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.wheel-of-life-widget').forEach(widget => {
    const canvas = widget.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    const maxRings = 10; // Number of concentric circles
    const fillColors = ['#8CC9C5', '#8CC9C5', '#8CC9C5', '#8CC9C5', '#8CC9C5', '#8CC9C5'];

    // Load stored data from localStorage and pre-populate inputs
    function loadStoredData() {
      const storedData = localStorage.getItem('pieOfLifeData');
      if (storedData) {
        try {
          const areas = JSON.parse(storedData);
          widget.querySelectorAll('.area').forEach((areaElement, index) => {
            if (areas[index]) {
              areaElement.querySelector('input[name="current"]').value = areas[index].current;
              areaElement.querySelector('input[name="desired"]').value = areas[index].desired;
              areaElement.querySelector('input[name="rating"]').value = areas[index].rating;
            }
          });
        } catch (error) {
          console.error('Error parsing stored data: ', error);
        }
      }
    }

    function updateChart() {

      // Use a more specific selector that includes the table and tbody:
      const areas = Array.from(widget.querySelectorAll('table.wheel-inputs tbody .area')).map(area => ({
        name: area.querySelector('.area-name').textContent,
        current: Number(area.querySelector('input[name="current"]').value),
        desired: Number(area.querySelector('input[name="desired"]').value),
        rating: Number(area.querySelector('input[name="rating"]').value)
      }));

      // Save data to localStorage
      localStorage.setItem('pieOfLifeData', JSON.stringify(areas));

// Compute average satisfaction
const totalRating = areas.reduce((sum, area) => sum + area.rating, 0);
const avgRating = totalRating / areas.length;
const goodEnoughInput = document.querySelector('input[name="goodEnough"]');
const goodEnoughValue = goodEnoughInput.value;


// Update the div with id "result" if it exists within the widget
const resultDiv = widget.querySelector('#result #averageScore');
if (resultDiv) {
  let message = "";
  
  if (goodEnoughValue > avgRating) {
    message += "<p>Jūsų vidurkis < pakankamai geras balas. Akivaizdu, kad stoka vienose srityse mažina pasitenkinimą tomis, kurių rezultatai džiugina. Verta paieškoti būdų perskirstyti skiriamą dėmesį, laiką ir pastangas.</p>";
    message += "<p>Vidurkis: " + avgRating.toFixed(2) + "</p>";
  } else {
    message += "<p>Jūsų vidurkis >= pakankamai geras balas. Valio! Tikėtina, kad atradusi savo gyvenimo balansą. Galbūt gali pasidalinti, kaip tau tai pavyksta? Žinoma, visuomet gali būti ir geriau, tad jei nori pagerinti ir taip neblogą situaciją – gali atsižvelgti į toliau pateiktas rekomendacijas.</p>";
    message += "<p>Vidurkis: " + avgRating.toFixed(2) + "</p>";
  }
  
  message += "<p>Vidurkį išsivedėme ne tam, kad kažką labai išskaičiuotume, o tam, kad pamatytume, kiek svarbu yra tinkamai valdyti ir gyventi gyvenimą visose srityse. Nes juk tai, kaip jaučiamės darbe, bent maža dalimi parsinešame namo. Tai, kaip jaučiamės namuose – norom nenorom atkeliauja kartu į darbą, susitikimus su draugais ir t.t.</p>";
  
  message += "<p>Kuo labiau apleista viena ar keletas gyvenimo sričių, tuo labiau esame linkę “pasinešti” į kitas. Taip mėginame užmaskuoti, net ir nuo savęs nuslėpti tam tikrus trūkumus. Dažnas pavyzdys – žmonės, save išdidžiai vadinantys darboholikais. Dėl vienų ar kitų priežasčių kitose savo gyvenimo srityse darboholikai jaučia stoką, todėl visas (ar beveik) visas pastangas, dėmesį ir laiką nukreipia į tą vieną, kuri sąlyginai patogiai viską sugeria. Kol neužpiktinau veiklių ir veržlių žmonių, skubu patikslinti: daug dėmesio skirti vienai sričiai (kad ir darbui) nėra blogai, kol bendras balas, t.y. savijauta, pojūtis ir pasitenkinimas nenukrenta žemiau pakankamai gero.</p>";
  
  resultDiv.innerHTML = message;
}

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Determine center and maximum radius (leave some padding)
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      //const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
      // Define extra padding for outer elements
      const outerPadding = 50; // adjust as needed
      // Maximum radius such that satisfaction circles are not cut off:
      const radius = Math.min(canvas.width, canvas.height) / 2 - outerPadding;

      // Calculate the angle for each equal slice
      const sliceAngle = (2 * Math.PI) / areas.length;

      // Draw the concentric circle grid (for the entire pie)
      for (let i = 1; i <= maxRings; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (radius * i) / maxRings, 0, 2 * Math.PI);
        ctx.strokeStyle = 'white solid 1px';
        ctx.stroke();
      }

      // For each area, draw its wedge with discrete filled rings
      areas.forEach((area, index) => {
        const startAngle = -Math.PI / 2 + index * sliceAngle;
        const endAngle = startAngle + sliceAngle;

        // Optionally, draw the entire wedge outline (background)
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = '#f0f0f0';
        ctx.fill();
        ctx.strokeStyle = '#ddd';
        ctx.stroke();

        // Determine how many rings to fill (clamp between 0 and maxRings)
        const fillRings = Math.min(maxRings, Math.max(0, Math.round(area.current)));
        const ringThickness = radius / maxRings;

        // // For each ring from the center up to fillRings, fill that wedge segment
        // for (let i = 0; i < fillRings; i++) {
        //   const innerRadius = i * ringThickness;
        //   const outerRadius = (i + 1) * ringThickness;
        //   ctx.beginPath();
        //   // Draw outer arc (from startAngle to endAngle)
        //   ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle, false);
        //   // Draw inner arc in reverse
        //   ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        //   ctx.closePath();
        //   ctx.fillStyle = fillColors[index % fillColors.length];
        //   ctx.fill();
        // }

        // Calculate the filled radius based on the number of rings filled
const fillRadius = fillRings * ringThickness;

// Calculate the mid-angle for the wedge
const midAngleFill = (startAngle + endAngle) / 2;

// Create the wedge path from the center to fillRadius
ctx.beginPath();
ctx.moveTo(centerX, centerY);
ctx.arc(centerX, centerY, fillRadius, startAngle, endAngle, false);
ctx.closePath();

// Create a linear gradient as if it spanned the entire radius of the pie
// (even though the fill only goes out to fillRadius)
const gradient = ctx.createLinearGradient(
  centerX + 0 * Math.cos(midAngleFill), // start at the center
  centerY + 0 * Math.sin(midAngleFill),
  centerX + radius * Math.cos(midAngleFill), // end at the outer edge of the entire pie
  centerY + radius * Math.sin(midAngleFill)
);
gradient.addColorStop(0, '#8CC9C5');
gradient.addColorStop(0.5, '#8CC9C5'); // Extend the first color to 70% of the gradient
gradient.addColorStop(1, '#C0A9E2');

// Fill the wedge with the gradient
ctx.fillStyle = gradient;
ctx.fill();

// Now draw the concentric circle grid on top
// --- Draw the concentric grid lines (barely visible) ---
for (let i = 1; i <= maxRings; i++) {
  ctx.beginPath();
  ctx.arc(centerX, centerY, (radius * i) / maxRings, 0, 2 * Math.PI);
  // Use a very light gray with low opacity
  ctx.strokeStyle = 'rgba(221, 221, 221, 0.13)';  
  ctx.lineWidth = 0.5;
  ctx.stroke();
}

        // *** Desired Marker as the Outer Line of the Desired Ring ***
        // Round the desired value and clamp it between 1 and maxRings.
        let desiredRing = Math.round(area.desired);
        if (desiredRing < 1) desiredRing = 1;
        if (desiredRing > maxRings) desiredRing = maxRings;

        // Compute the outer boundary of the desired ring.
        const desiredRadius = desiredRing * ringThickness;

        ctx.beginPath();
        ctx.arc(centerX, centerY, desiredRadius, startAngle, endAngle, false);
        ctx.strokeStyle = '#ff5e31';  // Red color for the desired marker.
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw area name just outside the outer circle but before the satisfaction ring.
        // Calculate the mid‑angle for the wedge for text placement.
        const midAngleTxt = (startAngle + endAngle) / 2;

        // Determine the position for the text—just outside the outer circle.
        const textRadius = radius + 10; // Adjust as needed.
        const textX = centerX + textRadius * Math.cos(midAngleTxt);
        const textY = centerY + textRadius * Math.sin(midAngleTxt);

        ctx.save();
        ctx.translate(textX, textY);

        // Compute a default rotation so the text is tangential.
        let rotation = midAngleTxt + Math.PI / 2;
        // Normalize rotation to be within 0 to 2π.
        rotation = (rotation + 2 * Math.PI) % (2 * Math.PI);

        // If the rotation is in the "upside down" quadrant, flip it.
        if (rotation > Math.PI / 2 && rotation < 3 * Math.PI / 2) {
          rotation += Math.PI;
        }
        // Normalize again to keep the value between 0 and 2π.
        rotation = rotation % (2 * Math.PI);

        ctx.rotate(rotation);
        ctx.fillStyle = '#000';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(area.name, 0, 0);
        ctx.restore();


        // Now draw the satisfaction circle further out.
        const satisfactionOffset = 40; // Increased offset to move the circle further out
        const circleRadius = 12;
        const midAngle = (startAngle + endAngle) / 2;
        const cx = centerX + (radius + satisfactionOffset) * Math.cos(midAngle);
        const cy = centerY + (radius + satisfactionOffset) * Math.sin(midAngle);

        ctx.beginPath();
        ctx.arc(cx, cy, circleRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(area.rating, cx, cy);

      });
    
    

    
    }



     // Function to resize the canvas based on its container
     function resizeCanvas() {
      // Use widget's width as canvas width (and maintain square aspect ratio)
      const containerWidth = widget.clientWidth < 500 ? widget.clientWidth : widget.clientWidth * 0.8 ;
      console.log(containerWidth);
      canvas.width = containerWidth;
      canvas.height = containerWidth;
      updateChart();
    }

    // Listen to window resize events
    window.addEventListener('resize', resizeCanvas);

    widget.querySelector('.update-chart').addEventListener('click', updateChart);

    // Load stored data and render chart on load
    loadStoredData();
    resizeCanvas();
  });
});
