/**
 * src/shared/utils/working-hours-calculator/index.js
 * Reusable working hours calculator with Lithuanian holidays including Easter
 * 
 * Used by Time Calculator and Monthly Goals blocks for consistent calculations
 */

// Calculate Easter Sunday for given year (Western Easter algorithm)
const getEasterSunday = (year) => {
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
    return new Date(year, month - 1, day);
};

// Get all Lithuanian holidays for year
const getLithuanianHolidays = (year) => {
    const easter = getEasterSunday(year);
    const easterMonday = new Date(easter);
    easterMonday.setDate(easter.getDate() + 1);
    
    return [
        new Date(year, 0, 1),   // Naujieji metai (New Year's Day)
        new Date(year, 1, 16),  // Lietuvos Valstybės atkūrimo diena (Day of Restoration of the State of Lithuania)
        new Date(year, 2, 11),  // Lietuvos Nepriklausomybės atkūrimo diena (Day of Restoration of Independence of Lithuania)
        easter,                 // Velykos (Easter Sunday)
        easterMonday,          // Velykų pirmadienis (Easter Monday)
        new Date(year, 4, 1),   // Tarptautinė darbininkų diena (International Workers' Day)
        new Date(year, 5, 24),  // Joninės (Rasos) (St. John's Day / Midsummer Day)
        new Date(year, 6, 6),   // Valstybės diena (Statehood Day)
        new Date(year, 7, 15),  // Žolinė (Assumption of Mary)
        new Date(year, 10, 1),  // Visų šventųjų diena (All Saints' Day)
        new Date(year, 10, 2),  // Mirusiųjų atminimo diena (All Souls' Day)
        new Date(year, 11, 24), // Šv. Kūčios (Christmas Eve)
        new Date(year, 11, 25), // Šv. Kalėdos (Christmas Day)
        new Date(year, 11, 26)  // Šv. Kalėdos (antra diena) (Second day of Christmas)
    ];
};

// Check if date is weekend (Saturday or Sunday)
const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
};

// Check if date is a holiday
const isHoliday = (date, holidays) => {
    return holidays.some(holiday => 
        holiday.getFullYear() === date.getFullYear() &&
        holiday.getMonth() === date.getMonth() &&
        holiday.getDate() === date.getDate()
    );
};

/**
 * Calculate working hours for a given period
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.year - Year to calculate (required)
 * @param {number} params.month - Optional month (1-12), if null calculates whole year
 * @param {number} params.hoursPerDay - Working hours per day (default: 8)
 * @param {number} params.vacationDays - Vacation days to subtract (default: 0)
 * @param {number} params.bufferDays - Buffer days to subtract, if null calculates proportional (default: null)
 * 
 * @returns {Object} Detailed calculation results
 * @returns {string} return.period - Period identifier ("YYYY-MM" or "YYYY")
 * @returns {number} return.totalDays - Total days in period
 * @returns {number} return.workingDays - Days excluding weekends and holidays
 * @returns {number} return.weekendDays - Number of weekend days
 * @returns {number} return.holidayDays - Number of holiday days
 * @returns {number} return.vacationDays - User vacation days (input)
 * @returns {number} return.bufferDays - Buffer/sick days (calculated or provided)
 * @returns {number} return.availableWorkingDays - Final working days after all deductions
 * @returns {number} return.totalWorkingHours - Available working days × hours per day
 * @returns {number} return.hoursPerDay - Working hours per day (input)
 * 
 * @example
 * // Monthly calculation
 * const result = calculateWorkingHours({ year: 2025, month: 8, vacationDays: 3 });
 * console.log(result.totalWorkingHours); // e.g., 134
 * 
 * @example
 * // Yearly calculation with custom parameters
 * const result = calculateWorkingHours({ 
 *   year: 2025, 
 *   hoursPerDay: 6, 
 *   vacationDays: 20, 
 *   bufferDays: 10 
 * });
 */
export const calculateWorkingHours = ({
    year,
    month = null,
    hoursPerDay = 8,
    vacationDays = 0,
    bufferDays = null
}) => {
    // Validate inputs
    if (!year || year < 1900 || year > 2100) {
        throw new Error('Year must be between 1900 and 2100');
    }
    
    if (month !== null && (month < 1 || month > 12)) {
        throw new Error('Month must be between 1 and 12');
    }
    
    if (hoursPerDay <= 0 || hoursPerDay > 24) {
        throw new Error('Hours per day must be between 0 and 24');
    }
    
    if (vacationDays < 0) {
        throw new Error('Vacation days cannot be negative');
    }
    
    const holidays = getLithuanianHolidays(year);
    
    // Determine calculation period
    let startDate, endDate, isYearlyCalculation;
    
    if (month) {
        // Monthly calculation
        startDate = new Date(year, month - 1, 1);
        endDate = new Date(year, month, 0); // Last day of month
        isYearlyCalculation = false;
    } else {
        // Yearly calculation
        startDate = new Date(year, 0, 1);
        endDate = new Date(year, 11, 31);
        isYearlyCalculation = true;
    }
    
    // Count all types of days in the period
    let totalDays = 0;
    let workingDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        totalDays++;
        
        if (isWeekend(d)) {
            weekendDays++;
        } else if (isHoliday(d, holidays)) {
            holidayDays++;
        } else {
            workingDays++;
        }
    }
    
    // Calculate buffer days
    let calculatedBufferDays;
    if (bufferDays !== null) {
        // Use provided buffer days
        calculatedBufferDays = bufferDays;
    } else if (isYearlyCalculation) {
        // Default 14 buffer days for yearly calculation
        calculatedBufferDays = 14;
    } else {
        // Proportional buffer for monthly (based on 14 annual buffer days)
        const yearlyWorkingDays = calculateWorkingHours({ 
            year, 
            hoursPerDay: 8, 
            vacationDays: 0, 
            bufferDays: 0 
        }).workingDays;
        const monthProportion = workingDays / yearlyWorkingDays;
        calculatedBufferDays = 14 * monthProportion;
    }
    
    // Calculate final available working days and total hours
    const availableWorkingDays = Math.max(0, workingDays - vacationDays - calculatedBufferDays);
    const totalWorkingHours = Math.round(availableWorkingDays * hoursPerDay);
    
    // Return comprehensive results
    return {
        period: month ? `${year}-${month.toString().padStart(2, '0')}` : `${year}`,
        totalDays,
        workingDays,
        weekendDays,
        holidayDays,
        vacationDays,
        bufferDays: Math.round(calculatedBufferDays * 10) / 10,
        availableWorkingDays: Math.round(availableWorkingDays * 10) / 10,
        totalWorkingHours,
        hoursPerDay
    };
};

/**
 * Helper function for display formatting
 * 
 * @param {Object} result - Result object from calculateWorkingHours
 * @returns {string} Formatted display string
 * 
 * @example
 * const result = calculateWorkingHours({ year: 2025, month: 8 });
 * const display = formatWorkingHours(result);
 * console.log(display); // "168h (21 working days)"
 */
export const formatWorkingHours = (result) => {
    return `${result.totalWorkingHours} h (${Math.round(result.availableWorkingDays)} d.d.)`;
};

/**
 * Helper function to get detailed breakdown for display
 * 
 * @param {Object} result - Result object from calculateWorkingHours
 * @returns {Object} Formatted breakdown object
 * 
 * @example
 * const result = calculateWorkingHours({ year: 2025, month: 8, vacationDays: 3 });
 * const breakdown = getWorkingHoursBreakdown(result);
 * console.log(breakdown.summary); // "134h (16.8 working days)"
 */
export const getWorkingHoursBreakdown = (result) => {
    return {
        summary: formatWorkingHours(result),
        period: result.period,
        breakdown: {
            totalDays: `viso: ${result.totalDays}`,
            weekends: `- savaitgaliai: ${result.weekendDays}`,
            holidays: `- šventinės dienos: ${result.holidayDays}`,
            vacation: `- atostogų dienos: ${result.vacationDays}`,
            buffer: `- rezervas (nenumatyti pasikeitimai, liga ir pan.): ${result.bufferDays}`,
            available: `= ${result.availableWorkingDays} d.d.`,
            hours: `× ${result.hoursPerDay} h/d = ${result.totalWorkingHours} h`
        }
    };
};