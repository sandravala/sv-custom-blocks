document.addEventListener('DOMContentLoaded', function() {
  // Configuration
  const workingHoursStart = 9; // 9 AM
  const workingHoursEnd = 17;  // 5 PM
  const workingDays = [1, 2, 3, 4, 5]; // Monday to Friday (0 = Sunday, 6 = Saturday)
  const annualVacationDays = 20;
  const annualSickDays = 14;

  // Lithuanian holidays
  const holidays = [
      "1,1",   // Naujieji metai
      "2,16",  // Lietuvos Valstybės atkūrimo diena
      "3,11",  // Lietuvos Nepriklausomybės atkūrimo diena
      "5,1",   // Tarptautinė darbininkų diena
      "6,24",  // Joninės (Rasos)
      "7,6",   // Valstybės diena
      "8,15",  // Žolinė
      "11,1",  // Visų šventųjų diena
      "11,2",  // Mirusiųjų atminimo diena
      "12,24", // Šv. Kūčios
      "12,25", // Kalėdos
      "12,26"  // Kalėdos (antra diena)
  ];

  // Add Easter Monday (calculated for current year)
  const calculateEasterMonday = year => {
      const a = year % 19;
      const b = Math.floor(year / 100);
      const c = year % 100;
      const d = Math.floor(b / 4);
      const e = b % 4;
      const f = Math.floor((b + 8) / 25);
      const g = Math.floor((b - f + 1) / 3);
      const h = (19 * a + b - d - g + 15) % 30;
      const i = Math.floor(c / 4);
      const k = c % 4;
      const l = (32 + 2 * e + 2 * i - h - k) % 7;
      const m = Math.floor((a + 11 * h + 22 * l) / 451);
      const month = Math.floor((h + l - 7 * m + 114) / 31);
      const day = ((h + l - 7 * m + 114) % 31) + 1;
      
      const easterSunday = new Date(year, month - 1, day);
      const easterMonday = new Date(easterSunday);
      easterMonday.setDate(easterSunday.getDate() + 1);
      
      return `${easterMonday.getMonth() + 1},${easterMonday.getDate()}`;
  };
  holidays.push(calculateEasterMonday(new Date().getFullYear()));

  // Helper function to check if a date is a holiday
  function isHoliday(date) {
    return holidays.includes(`${date.getMonth() + 1},${date.getDate()}`);
  }

  // Helper function to count working days between two dates
  function countWorkingDaysBetween(startDate, endDate) {
    let count = 0;
    const currentDate = new Date(startDate);
    
    // Adjust to start of day
    currentDate.setHours(0, 0, 0, 0);
    
    // Create end date copy and set to end of day
    const endDateTime = new Date(endDate);
    endDateTime.setHours(23, 59, 59, 999);
    
    // Loop through each day
    while (currentDate <= endDateTime) {
      // Check if it's a working day and not a holiday
      if (workingDays.includes(currentDate.getDay()) && !isHoliday(currentDate)) {
        count++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return count;
  }

  // Calculate working hours for a given number of full working days
  function calculateHoursForDays(days) {
    return days * (workingHoursEnd - workingHoursStart);
  }

  // Format hours with seconds
  function formatHoursWithSeconds(totalHours) {
    const hours = Math.floor(totalHours);
    const minutes = Math.floor((totalHours * 60) % 60);
    const seconds = Math.floor((totalHours * 3600) % 60);
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  function updateCounters() {
    const now = new Date();
    
    // Is today a working day?
    const isTodayWorkingDay = workingDays.includes(now.getDay());
    const isTodayHoliday = isHoliday(now);
    
    // TODAY: Calculate remaining hours
    let todayHours = 0;
    if (isTodayWorkingDay && !isTodayHoliday) {
      if (now.getHours() < workingHoursStart) {
        // Before working hours
        todayHours = workingHoursEnd - workingHoursStart;
      } else if (now.getHours() < workingHoursEnd) {
        // During working hours
        todayHours = workingHoursEnd - now.getHours() - (now.getMinutes() / 60) - (now.getSeconds() / 3600);
      }
    }
    
    // Set up date ranges
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (6 - now.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);
    
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const endOfQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
    
    const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    
    // Count working days in each period (excluding today)
    const workingDaysInWeek = countWorkingDaysBetween(tomorrow, endOfWeek);
    const workingDaysInMonth = countWorkingDaysBetween(tomorrow, endOfMonth);
    const workingDaysInQuarter = countWorkingDaysBetween(tomorrow, endOfQuarter);
    const workingDaysInYear = countWorkingDaysBetween(tomorrow, endOfYear);
    
    // Apply absence adjustments
    const daysInYear = now.getFullYear() % 4 === 0 ? 366 : 365;
    
    // Calculate remaining days in each period
    const daysLeftInWeek = Math.ceil((endOfWeek - now) / (1000 * 60 * 60 * 24));
    const daysLeftInMonth = Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
    const daysLeftInQuarter = Math.ceil((endOfQuarter - now) / (1000 * 60 * 60 * 24));
    const daysLeftInYear = Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24));
    
    // Calculate absence rates for each period
    const weekAbsenceRate = (annualVacationDays + annualSickDays) * (daysLeftInWeek / daysInYear);
    const monthAbsenceRate = (annualVacationDays + annualSickDays) * (daysLeftInMonth / daysInYear);
    const quarterAbsenceRate = (annualVacationDays + annualSickDays) * (daysLeftInQuarter / daysInYear);
    const yearAbsenceRate = (annualVacationDays + annualSickDays) * (daysLeftInYear / daysInYear);
    
    // Proportion of absences on working days
    const workdayRatio = 5/7; // Assuming 5-day work week
    
    // Apply absences to working days
    const adjustedWorkingDaysInWeek = Math.max(0, workingDaysInWeek - (weekAbsenceRate * workdayRatio));
    const adjustedWorkingDaysInMonth = Math.max(0, workingDaysInMonth - (monthAbsenceRate * workdayRatio));
    const adjustedWorkingDaysInQuarter = Math.max(0, workingDaysInQuarter - (quarterAbsenceRate * workdayRatio));
    const adjustedWorkingDaysInYear = Math.max(0, workingDaysInYear - (yearAbsenceRate * workdayRatio));
    
    // Calculate hours
    const weekHours = todayHours + calculateHoursForDays(adjustedWorkingDaysInWeek);
    const monthHours = todayHours + calculateHoursForDays(adjustedWorkingDaysInMonth);
    const quarterHours = todayHours + calculateHoursForDays(adjustedWorkingDaysInQuarter);
    const yearHours = todayHours + calculateHoursForDays(adjustedWorkingDaysInYear);
    
    // Update display
    document.getElementById("today-counter").innerHTML = formatHoursWithSeconds(todayHours);
    
    // Format with working days in parentheses
    document.getElementById("week-counter").innerHTML = 
        formatHoursWithSeconds(weekHours) + 
        ` <span style="font-size: 18px; color: #555;">(${Math.ceil(adjustedWorkingDaysInWeek)} d.d.)</span>`;
    
    document.getElementById("month-counter").innerHTML = 
        formatHoursWithSeconds(monthHours) + 
        ` <span style="font-size: 18px; color: #555;">(${Math.ceil(adjustedWorkingDaysInMonth)} d.d.)</span>`;
    
    document.getElementById("quarter-counter").innerHTML = 
        formatHoursWithSeconds(quarterHours) + 
        ` <span style="font-size: 18px; color: #555;">(${Math.ceil(adjustedWorkingDaysInQuarter)} d.d.)</span>`;
    
    document.getElementById("year-counter").innerHTML = 
        formatHoursWithSeconds(yearHours) + 
        ` <span style="font-size: 18px; color: #555;">(${Math.ceil(adjustedWorkingDaysInYear)} d.d.)</span>`;
  }

  // Run immediately
  updateCounters();
  
  // Then update every second
  setInterval(updateCounters, 1000);
});

// Fallback initialization in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(function() {
    // Check if counters are still showing "Calculating..."
    if (document.getElementById("today-counter").innerHTML === "Calculating...") {
      // Force direct script execution
      const event = new Event('DOMContentLoaded');
      document.dispatchEvent(event);
    }
  }, 100);
}
