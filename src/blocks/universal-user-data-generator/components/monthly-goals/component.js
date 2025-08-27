/**
 * Monthly Goals Block - Main View Component
 */
import React, { useState, useEffect, useMemo } from "react";
import { createRoot } from "react-dom/client";
import EditableTable, {
    createSimpleListConfig,
} from "@components/EditableTable";
import {
    calculateWorkingHours,
    formatWorkingHours,
} from "@shared/utils/WorkingHoursCalc";
import AccordionHeader from "@components/AccordionHeader";

export default function MonthlyGoalsComponent({ blockId,
	isLoggedIn,
	ajaxObject,
	componentName, }) {
    // Get configuration from data attributes
    const monthSelectionMode = "limited";

    // Component state
    const [selectedMonth, setSelectedMonth] = useState("");
    const [allGoalActions, setAllGoalActions] = useState([]);
    const [allGoalStages, setAllGoalStages] = useState({});
    const [allMonthlyGoals, setAllMonthlyGoals] = useState([]);
    const [currentMonthGoals, setCurrentMonthGoals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [allTCPreferences, setAllTCPreferences] = useState({});
    const [vacationDays, setVacationDays] = useState(2);
    const [hoursPerDay, setHoursPerDay] = useState(8);
    const [workingHoursDisplay, setWorkingHoursDisplay] = useState("");
    const [workingHours, setWorkingHours] = useState(0);
    const [allRoutineTasks, setAllRoutineTasks] = useState([]);
    const [routineTaskHours, setRoutineTaskHours] = useState(0);
    const [hasTimeForGoals, setHasTimeForGoals] = useState(false);
    const [maxHoursPerGoal, setMaxHoursPerGoal] = useState(40);
    const [showWorkingHoursSaveButton, setShowWorkingHoursSaveButton] =
        useState(false);

    const saveToMeta = {
        tc_preferences: "tc_calculator_preferences",
        monthly_goals: "monthly_goals",
        goal_actions: "goal_actions",
        routine_tasks: "routine_tasks",
        goal_stages: "goal_stages"
    }

    const getAvailableMonths = () => {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1; // 1-based
        const currentDay = currentDate.getDate();

        let monthNumbers = [];

        if (monthSelectionMode === "extended") {
            // All 12 months of current year
            monthNumbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        } else {
            // Limited mode: current or next quarter based on date
            const quarters = [
                { months: [1, 2, 3], name: "Q1" },
                { months: [4, 5, 6], name: "Q2" },
                { months: [7, 8, 9], name: "Q3" },
                { months: [10, 11, 12], name: "Q4" },
            ];

            // Find current quarter
            const currentQuarter = quarters.find((q) =>
                q.months.includes(currentMonth),
            );
            const currentQuarterIndex = quarters.indexOf(currentQuarter);

            // Determine which quarter to show
            let targetQuarter = currentQuarter;

            // If after 15th of last month in quarter, show next quarter
            if (currentMonth === currentQuarter.months[2] && currentDay > 15) {
                const nextQuarterIndex = (currentQuarterIndex + 1) % 4;
                targetQuarter = quarters[nextQuarterIndex];
            }

            monthNumbers = targetQuarter.months;
        }

        // Format all months once
        return monthNumbers.map((month) => {
            const monthStr = `${currentYear}-${month.toString().padStart(2, "0")}`;
            const monthName = new Date(currentYear, month - 1, 1).toLocaleDateString(
                "lt-LT",
                {
                    month: "long",
                    year: "numeric",
                },
            );
            return { value: monthStr, label: monthName };
        });
    };

    // Set default month on component mount
    useEffect(() => {
        if (!isLoggedIn) return;

        const availableMonths = getAvailableMonths();

        if (availableMonths.length > 0) {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const currentDay = currentDate.getDate();

            // Default to current month, or next month if after 15th
            let defaultMonth = currentMonth;
            if (currentDay > 15) {
                defaultMonth = currentMonth === 12 ? 1 : currentMonth + 1;
            }

            const defaultMonthStr = `${currentYear}-${defaultMonth
                .toString()
                .padStart(2, "0")}`;

            // Check if default month is in available months
            const isDefaultAvailable = availableMonths.some(
                (m) => m.value === defaultMonthStr,
            );

            if (isDefaultAvailable) {
                setSelectedMonth(defaultMonthStr);
            } else {
                // Use first available month
                setSelectedMonth(availableMonths[0].value);
            }
        }
    }, [isLoggedIn, monthSelectionMode]);

    // Calculate routine task hours when routine tasks change
    useEffect(() => {
        const totalHours = calculateRoutineTaskHours(allRoutineTasks);
        setRoutineTaskHours(totalHours);
    }, [allRoutineTasks]);

    // Load all data once when component mounts
    useEffect(() => {
        if (!isLoggedIn || dataLoaded) return;
        loadAllData();
    }, [isLoggedIn]);

    // Update current month goals when month or data changes
    useEffect(() => {
        if (selectedMonth && allMonthlyGoals.length >= 0) {
            const monthGoals = getMonthGoals(allMonthlyGoals, selectedMonth);
            setCurrentMonthGoals(monthGoals);
        }
    }, [selectedMonth, allMonthlyGoals]);

    // Update TC preferences ONLY when month or TC data changes (not when monthly goals change)
    useEffect(() => {
        if (selectedMonth) {
            const tcPrefs = getTCPreferencesForMonth(allTCPreferences, selectedMonth);
            setVacationDays(tcPrefs.vacationDays);
            setHoursPerDay(tcPrefs.hoursPerDay);
        }
    }, [selectedMonth, allTCPreferences]);

    // Calculate working hours when inputs change
    useEffect(() => {
        if (selectedMonth && vacationDays >= 0 && hoursPerDay > 0) {
            calculateWorkingHoursDisplay();
        }
        const hasTime =
            workingHours > 0 &&
            routineTaskHours > 0 &&
            workingHours > routineTaskHours;
        setHasTimeForGoals(hasTime);
    }, [selectedMonth, vacationDays, hoursPerDay]);

    const hasTime = useMemo(() => {
        return workingHours > 0 && routineTaskHours > 0 && workingHours > routineTaskHours;
    }, [workingHours, routineTaskHours]);

    // Load all data from backend once
    const loadAllData = async () => {
        setLoading(true);
        setError("");

        try {
            // Load monthly goals data
            const params = {
				action: "udg_load_saved_data",
				nonce: ajaxObject.nonce,
				meta_keys: JSON.stringify(saveToMeta),
			};
            const response = await fetch(ajaxObject.ajax_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams(params),
            });

            const result = await response.json();

            if (result.success && result.data.user_data) {
                const loadedUserData = result.data.user_data;
                setAllGoalActions(loadedUserData.goal_actions || []);
                setAllMonthlyGoals(loadedUserData.monthly_goals || []);
                setAllTCPreferences(loadedUserData.tc_preferences || {});
                setAllRoutineTasks(loadedUserData.routine_tasks || []);
                setAllGoalStages(loadedUserData.goal_stages || {});
                setDataLoaded(true);
                console.log("Loaded user monthly goal data:", loadedUserData);
            } else {
                setError(result.data || "Error loading monthly goals data");
            }
        } catch (err) {
            setError("Failed to load monthly goals data. Please try again.");
            console.error("Load error:", err);
        } finally {
            setLoading(false);
        }
    };

    // Get quarter title with stage information
    const getQuarterTitle = (quarter, goalStages) => {
        const quarterTitles = {
            Q1: "I ketv.",
            Q2: "II ketv.",
            Q3: "III ketv.",
            Q4: "IV ketv.",
        };

        if (goalStages && goalStages[quarter]) {
            const stageData = goalStages[quarter];
            const outcomes = stageData.outcomes ? stageData.outcomes.join(" | ") : "";
            return { title: quarterTitles[quarter], outcomes: outcomes };
        }

        return { title: quarter, outcomes: "" };
    };

    // Calculate total routine task hours
    const calculateRoutineTaskHours = (routineTasks) => {
        if (!Array.isArray(routineTasks) || routineTasks.length === 0) {
            return 0;
        }

        const totalHours = routineTasks.reduce((sum, task) => {
            const hours = task.typical_hours_per_month || 0;
            return sum + hours;
        }, 0);

        return Math.round(totalHours);
    };

    const getTCPreferencesForMonth = (tcPrefs, selectedMonth) => {
        const [year, month] = selectedMonth.split("-").map(Number);
        const monthKey = `${year}_${month}`;

        // Try monthly first
        if (tcPrefs?.monthly?.[monthKey]) {
            return {
                vacationDays: tcPrefs.monthly[monthKey].vacation_days || 2,
                hoursPerDay: tcPrefs.monthly[monthKey].working_hours || 8,
            };
        }

        // Fallback to yearly (divided)
        if (tcPrefs?.yearly) {
            return {
                vacationDays: Math.round((tcPrefs.yearly.vacation_days || 24) / 12),
                hoursPerDay: tcPrefs.yearly.working_hours || 8,
            };
        }

        return { vacationDays: 2, hoursPerDay: 8 };
    };

    // Get quarterly context for selected month
    const getQuarterlyContext = (goalActions, selectedMonth) => {
        if (!Array.isArray(goalActions) || !selectedMonth) {
            return { quarter: "", actions: [] };
        }

        // Determine quarter from month (e.g., "2025-08" -> "Q3")
        const monthNum = parseInt(selectedMonth.split("-")[1]);
        const quarter = getQuarterFromMonth(monthNum);

        // Filter actions by quarter - check both 'quarter' and 'area' fields
        const quarterlyActions = goalActions.filter((action) => {
            const actionQuarter = action.quarter || action.area || "";
            return actionQuarter === quarter;
        });

        return {
            quarter,
            actions: quarterlyActions,
        };
    };

    // Get goals for specific month
    const getMonthGoals = (monthlyGoals, selectedMonth) => {
        if (!Array.isArray(monthlyGoals) || !selectedMonth) {
            return [];
        }

        const monthEntry = monthlyGoals.find(
            (entry) => entry.month === selectedMonth,
        );
        return monthEntry ? monthEntry.goals || [] : [];
    };

    // Get quarter from month number
    const getQuarterFromMonth = (monthNum) => {
        if (monthNum >= 1 && monthNum <= 3) return "Q1";
        if (monthNum >= 4 && monthNum <= 6) return "Q2";
        if (monthNum >= 7 && monthNum <= 9) return "Q3";
        return "Q4";
    };

    // Calculate working hours using shared calculator
    const calculateWorkingHoursDisplay = () => {
        if (!selectedMonth) {
            setWorkingHoursDisplay("");
            return;
        }

        const [year, month] = selectedMonth.split("-").map(Number);

        try {
            const result = calculateWorkingHours({
                year,
                month,
                hoursPerDay,
                vacationDays,
            });

            setWorkingHours(result.totalWorkingHours);
            setWorkingHoursDisplay(formatWorkingHours(result));
        } catch (error) {
            console.error("Working hours calculation error:", error);
            setWorkingHoursDisplay("Ups... kalkuliatorius perkaito. Pabandyk vėliau");
        }
    };

    // Save monthly goals
    // Save monthly goals and TC preferences in one call
    const saveMonthlyGoals = async (goalsData) => {
        setSaving(true);
        setError("");

         // Update TC preferences with current values
        const [year, month] = selectedMonth.split("-").map(Number);
        const monthKey = `${year}_${month}`;

        const updatedTCPrefs = {
            ...allTCPreferences,
            monthly: {
                ...allTCPreferences.monthly,
                [monthKey]: {
                    vacation_days: vacationDays,
                    working_hours: hoursPerDay,
                },
            },
        };

        let foundEntry = false;
        const updatedMonthlyGoals = allMonthlyGoals.map((entry) => {
            if (entry.month === selectedMonth) {
                foundEntry = true;
                return {
                    month: selectedMonth,
                    goals: goalsData,
                };
            }
            return entry;
        });

        if (!foundEntry) {
            updatedMonthlyGoals.push({
                month: selectedMonth,
                goals: goalsData,
            });
        }

        try {

            // Prepare data to save
            setAllMonthlyGoals((prev) => {
                const updated = [...prev];
                const existingIndex = updated.findIndex(
                    (entry) => entry.month === selectedMonth,
                );

                if (existingIndex >= 0) {
                    updated[existingIndex] = {
                        month: selectedMonth,
                        goals: goalsData,
                    };
                } else {
                    updated.push({
                        month: selectedMonth,
                        goals: goalsData,
                    });
                }

                return updated;
            });

            const dataToSave = {
                monthly_goals: updatedMonthlyGoals,
                tc_preferences: updatedTCPrefs,
            };

            
            const response = await fetch(ajaxObject.ajax_url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    action: "udg_save_modified_data",
                    nonce: ajaxObject.nonce,
                    data: JSON.stringify(dataToSave),
                    save_to_meta: JSON.stringify(saveToMeta)
                }),
            });

            const result = await response.json();

            if (result.success) {
                // Update local states
                setCurrentMonthGoals(goalsData);
                setAllTCPreferences(updatedTCPrefs); // Update TC prefs state

            } else {
                setError(result.data.message || "Error saving monthly goals");
            }
        } catch (err) {
            setError("Failed to save monthly goals. Please try again.");
            console.error("Save error:", err);
        } finally {
            setSaving(false);
            setShowWorkingHoursSaveButton(false);
        }
    };

    // Handle month selection change
    const handleMonthChange = (month) => {
        setSelectedMonth(month);
    };

    // Handle table data changes
    const handleGoalsChange = (newGoalsData, changeInfo) => {
        setCurrentMonthGoals(newGoalsData);
        //calculate goals hours sum and compare it to working hours - routine tasks number
        if (changeInfo.field === "hours_allocated") {
            const totalAllocatedHours = newGoalsData.reduce(
                (sum, goal) => sum + (goal.hours_allocated || 0),
                0,
            );
            const current_goal_hours = changeInfo.newValue;

            const availableHours = workingHours - routineTaskHours;
            const remainingHours = Math.max(0, availableHours - totalAllocatedHours);

            // Set max for new/edited goals (current allocation + remaining)
            const maxForNewGoal = Math.max(0, remainingHours + current_goal_hours);
            setMaxHoursPerGoal(maxForNewGoal);
            const canAddMoreGoals = remainingHours > 0;
            setHasTimeForGoals(canAddMoreGoals);
        }
    };

    // Handle table save
    const handleGoalsSave = () => {
        saveMonthlyGoals(currentMonthGoals);
    };

    const getTableTitle = () => {
        const currentMonth = selectedMonth.split("-");
        const monthlyStrings = {
            "01": " sausio",
            "02": " vasario",
            "03": " kovo",
            "04": " balandžio",
            "05": " gegužės",
            "06": " birželio",
            "07": " liepos",
            "08": " rugpjūčio",
            "09": " rugsėjo",
            "10": " spalio",
            "11": " lapkričio",
            "12": " gruodžio",
        };
        return `${currentMonth[0] + monthlyStrings[currentMonth[1]]} tikslai`;
    };

    // Editable table configuration
    const tableConfig = {
        title: getTableTitle(),
        emptyStateText: "Šiam mėnesiui tikslų dar nėra",
        emptyStateSubtext: "Paspausk + ir užrašyk tikslus",
        saveButtonText: "Išsaugoti tikslus",
        allowAdd: hasTime,
        allowRemove: true,
        showCounter: false,
    };

    // Column definitions for goals table
    const goalColumns = [
        {
            key: "description",
            label: "Tikslas",
            type: "text",
            flex: "flex-1",
            placeholder: "Įvesk savo mėnesio tikslą...",
        },
        {
            key: "hours_allocated",
            label: "Planuojama d.h.",
            type: "number",
            flex: "flex-auto",
            min: 0,
            max: maxHoursPerGoal,
            defaultValue: 0,
        },
    ];

    const availableMonths = getAvailableMonths();

    const InfoCard = ({ children, hours, className = "" }) => {
        return (
            <div className={`quarterly-action-card sv-mb-sm ${className}`}>
                <div className="sv-flex sv-justify-between sv-items-center">
                    <div className="sv-text-sm sv-text-greenish sv-font-normal sv-flex-1">
                        {children}
                    </div>
                    {hours && (
                        <div className="sv-text-teal sv-px-sm sv-py-xs sv-rounded sv-text-sm sv-font-medium sv-ml-sm">
                            {hours} h
                        </div>
                    )}
                </div>
            </div>
        );
    };

    // InfoSection Component - Reusable section with title and cards container
    const InfoSection = ({
        title,
        children,
        className = "",
        hasBorder = false,
    }) => {
        return (
            <div
                className={`sv-mb-md ${
                    hasBorder ? "sv-border-t sv-border-teal sv-pt-md" : ""
                } ${className}`}
            >
                <div className="sv-text-md sv-font-medium sv-text-dark sv-mb-sm">
                    {title}
                </div>
                <div className="quarterly-actions-container">{children}</div>
            </div>
        );
    };

    if (!isLoggedIn) {
        return null; // Login notice shown in PHP
    }

    // Calculate quarterly context for current selection
    const quarterlyContext = getQuarterlyContext(allGoalActions, selectedMonth);

    return (
        <div className="sv-flex sv-flex-col sv-gap-lg">
            {/* Error Display */}
            {error && (
                <div className="sv-card sv-bg-primary-light sv-border sv-border-primary sv-text-primary">
                    <p className="sv-font-medium">{error}</p>
                </div>
            )}

            {/* Month Selector and Working Hours Inputs */}
            <div className="sv-card">
                {/* <div className="sv-card__header">
                    <h3 className="sv-text-xl sv-font-semibold sv-text-dark">
                        Mėnesio tikslai
                    </h3>
                </div> */}

                {/* Row 1: Inputs */}
                <div className="sv-grid sv-grid-cols-3 sv-gap-md sv-mb-md">
                    <div className="sv-form__group">
                        <label htmlFor="month-select" className="sv-form__label">
                            Mėnuo:
                        </label>
                        <select
                            id="month-select"
                            value={selectedMonth}
                            onChange={(e) => handleMonthChange(e.target.value)}
                            disabled={loading}
                            className="sv-form__select"
                        >
                            <option value="">Pasirink...</option>
                            {availableMonths.map((month) => (
                                <option key={month.value} value={month.value}>
                                    {month.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="sv-form__group">
                        <label htmlFor="vacation-days" className="sv-form__label">
                            Atostogų šį mėnesį (dienomis):
                        </label>
                        <input
                            id="vacation-days"
                            type="number"
                            min="0"
                            max="31"
                            value={vacationDays}
                            onChange={(e) => {
                                setVacationDays(parseInt(e.target.value) || 0);
                                setShowWorkingHoursSaveButton(true);
                            }}
                            className="sv-form__input"
                            disabled={loading}
                        />
                    </div>

                    <div className="sv-form__group">
                        <label htmlFor="hours-per-day" className="sv-form__label">
                            Darbo valandų per dieną šį mėnesį:
                        </label>
                        <input
                            id="hours-per-day"
                            type="number"
                            min="1"
                            max="8"
                            step="0.5"
                            value={hoursPerDay}
                            onChange={(e) => {
                                setHoursPerDay(parseFloat(e.target.value) || 8);
                                setShowWorkingHoursSaveButton(true);
                            }}
                            className="sv-form__input"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Row 2: Display calculated values with save button */}
                <div className="sv-flex sv-justify-between sv-items-center sv-text-sm sv-font-medium sv-py-sm sv-border-t sv-border-gray-200">
                    <div className="sv-flex sv-flex-col sv-gap-md">
                        <span className="sv-text-dark">
                            Darbo valandų šį mėnesį iš viso:{" "}
                            {workingHoursDisplay || "Calculating..."}
                        </span>
                        {routineTaskHours > 0 && (
                            <>
                                <span
                                    className={`${
                                        routineTaskHours > 0 &&
                                        workingHours > 0 &&
                                        routineTaskHours > workingHours
                                            ? "sv-text-danger"
                                            : "sv-text-dark"
                                    }`}
                                >
                                    Kasdiems užduotims: {routineTaskHours} h
                                </span>
                                <span className="sv-text-dark">
                                    Tikslams:{" "}
                                    {routineTaskHours > 0 &&
                                    workingHours > 0 &&
                                    routineTaskHours > workingHours
                                        ? "panašu, kad jiems laiko šį mėnesį neturėsi ;("
                                        : workingHours - routineTaskHours + " h"}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Save button for working hours */}
                    {showWorkingHoursSaveButton && (
                        <button
                            onClick={() => saveMonthlyGoals(currentMonthGoals)}
                            className="sv-btn sv-btn--outline sv-btn--sm"
                            disabled={saving || loading}
                            title="Išsaugoti darbo valandų nustatymus"
                        >
                            {saving ? "Saugoma..." : "Išsaugoti"}
                        </button>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {loading && (
                <div className="sv-card sv-text-center">
                    <p className="sv-text-base sv-opacity-75 sv-animate-pulse">
                        Kraunama...
                    </p>
                </div>
            )}

            {/* Main Content */}
            {!loading && selectedMonth && (
                <div className="sv-flex sv-flex-col sv-gap-lg">
                    {/* Quarterly Context */}
                    {quarterlyContext && quarterlyContext.actions.length > 0 && (
                        <AccordionHeader title="Papildoma informacija">
                            {/* Quarterly Outcomes */}
                            <InfoSection
                                title={`Siektini ${
                                    getQuarterTitle(quarterlyContext.quarter, allGoalStages).title
                                } rezultatai:`}
                            >
                                <InfoCard>
                                    {
                                        getQuarterTitle(quarterlyContext.quarter, allGoalStages)
                                            .outcomes
                                    }
                                </InfoCard>
                            </InfoSection>

                            {/* Main Actions from goal_actions */}
                            <InfoSection
                                title={`Pagrindiniai ${
                                    getQuarterTitle(quarterlyContext.quarter, allGoalStages).title
                                } veiksmai:`}
                            >
                                {quarterlyContext.actions.map((action, index) => (
                                    <InfoCard key={index} hours={action.hours_estimate}>
                                        {action.description || action.responsibility || "Užduotis"}
                                    </InfoCard>
                                ))}
                            </InfoSection>

                            {/* Monthly Goals in this quarter */}
                            {allMonthlyGoals.length > 0 && (
                                <InfoSection
                                    title={`${
                                        getQuarterTitle(quarterlyContext.quarter, allGoalStages)
                                            .title
                                    } mėnesiniai tikslai:`}
                                    hasBorder={true}
                                >
                                    {allMonthlyGoals
                                        .filter((monthEntry) => {
                                            // Filter to show only goals from current quarter
                                            const [year, month] = monthEntry.month
                                                .split("-")
                                                .map(Number);
                                            const entryQuarter = getQuarterFromMonth(month);
                                            return entryQuarter === quarterlyContext.quarter;
                                        })
                                        .flatMap((monthEntry) => monthEntry.goals || [])
                                        .map((goal, index) => (
                                            <InfoCard key={index} hours={goal.hours_allocated}>
                                                {goal.description}
                                            </InfoCard>
                                        ))}
                                </InfoSection>
                            )}
                        </AccordionHeader>
                    )}

                    {/* Monthly Goals Table */}
                    {routineTaskHours > 0 &&
                        workingHours > 0 &&
                        routineTaskHours < workingHours && (
                            <EditableTable
                                data={currentMonthGoals}
                                columns={goalColumns}
                                config={tableConfig}
                                onDataChange={handleGoalsChange}
                                onSave={handleGoalsSave}
                                blockAbbr="mg"
                                dataType="monthly_goals"
                                className="monthly-goals-editable-table"
                            />
                        )}

                    {/* Save Status */}
                    {saving && (
                        <div className="sv-card sv-bg-accent-light sv-border sv-border-accent sv-text-center">
                            <p className="sv-text-base sv-font-medium sv-animate-pulse">
                                Saving monthly goals...
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}