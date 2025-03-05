// Utility function to format date as DD-MM-YYYY
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Validate DD-MM-YYYY format and ensure it's a valid date
function isValidDateDDMMYYYY(dateStr) {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return false;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() + 1 === month && date.getFullYear() === year;
}

// Parse DD-MM-YYYY to components
function parseDateDDMMYYYY(dateStr) {
    const [day, month, year] = dateStr.split('-').map(Number);
    return { day, month, year };
}

// Filter and aggregate loans by period and selected date
function aggregateLoans(loans, period, selectedDate) {
    if (!selectedDate || !isValidDateDDMMYYYY(selectedDate)) {
        alert("Please enter a valid date in DD-MM-YYYY format (e.g., 01-03-2025).");
        return null;
    }
    const { day, month, year } = parseDateDDMMYYYY(selectedDate);
    const aggregated = {};
    let activeCount = 0;
    let settledCount = 0;
    let renewCount = 0;
    let activeAmount = 0;
    let settledAmount = 0;
    let renewAmount = 0;
    let earnedAmount = 0;
    let investedAmount = 0;
    const typeCounts = { NR: 0, R: 0, Vyapari: 0 };

    loans.forEach(loan => {
        const loanDate = new Date(loan.date);
        let key;
        let matches = false;

        if (period === 'daily') {
            key = formatDate(loan.date);
            matches = key === selectedDate;
        } else if (period === 'monthly') {
            key = `${String(loanDate.getMonth() + 1).padStart(2, '0')}-${loanDate.getFullYear()}`;
            matches = key === `${String(month).padStart(2, '0')}-${year}`;
        } else if (period === 'yearly') {
            key = loanDate.getFullYear().toString();
            matches = key === year.toString();
        }

        if (matches) {
            if (!aggregated[key]) {
                aggregated[key] = { totalAmount: 0, loans: [] };
            }
            aggregated[key].totalAmount += loan.amount;
            aggregated[key].loans.push(loan);

            // Calculate counts and amounts
            if (loan.history.some(h => h.type === "Settled")) {
                settledCount++;
                settledAmount += loan.amount;
                const settleEntry = loan.history.find(h => h.type === "Settled");
                if (settleEntry) {
                    const previousAmount = loan.history.length > 1 ? loan.history[loan.history.length - 2].amount : loan.amount;
                    earnedAmount += settleEntry.amount - previousAmount;
                }
            } else {
                activeCount++;
                activeAmount += loan.amount;
            }
            renewCount += loan.history.filter(h => h.type === "Renewed").length;
            renewAmount += loan.history.filter(h => h.type === "Renewed").reduce((sum, h) => sum + h.amount, 0);

            // Count loan types
            typeCounts[loan.type]++;

            // Calculate invested amount (original amount before renewals)
            const originalAmount = loan.history.length > 0 ? loan.history[0].amount : loan.amount;
            investedAmount += originalAmount;
        }
    });

    return { aggregated, activeCount, settledCount, renewCount, activeAmount, settledAmount, renewAmount, earnedAmount, typeCounts, investedAmount };
}

// Display report
function displayReport(period) {
    const selectedDate = document.getElementById("reportDate").value;
    Promise.all([
        new Promise(resolve => getAllLoans("activeLoans", resolve)),
        new Promise(resolve => getAllLoans("settledLoans", resolve))
    ]).then(([activeLoans, settledLoans]) => {
        const allLoans = [...activeLoans, ...settledLoans];
        const result = aggregateLoans(allLoans, period, selectedDate);

        if (!result) return;

        const { aggregated, activeCount, settledCount, renewCount, activeAmount, settledAmount, renewAmount, earnedAmount, typeCounts, investedAmount } = result;

        const reportTitle = document.getElementById("reportTitle");
        const reportSummary = document.getElementById("reportSummary");
        const reportContent = document.getElementById("reportContent");
        reportTitle.textContent = `${period.charAt(0).toUpperCase() + period.slice(1)} Report for ${selectedDate}`;
        reportSummary.innerHTML = `
            <span>Active Loans: ${activeCount} (\u20B9${activeAmount.toFixed(2)})</span>
            <span>Settled Loans: ${settledCount} (\u20B9${settledAmount.toFixed(2)})</span>
            <span>Renewals: ${renewCount} (\u20B9${renewAmount.toFixed(2)})</span>
            <span>NR Loans: ${typeCounts.NR}</span>
            <span>R Loans: ${typeCounts.R}</span>
            <span>Vyapari Loans: ${typeCounts.Vyapari}</span>
            <span>Earned: \u20B9${earnedAmount.toFixed(2)}</span>
            <span>Invested: \u20B9${investedAmount.toFixed(2)}</span>
        `;
        reportContent.innerHTML = "";

        if (Object.keys(aggregated).length === 0) {
            reportContent.innerHTML = "<p>No loans found for this period.</p>";
            return;
        }

        Object.keys(aggregated).sort().forEach(key => {
            const { totalAmount, loans } = aggregated[key];
            const section = document.createElement("div");
            section.className = "report-item";
            section.innerHTML = `
                <div class="report-header">
                    <span>${key}</span>
                    <span class="report-total">Total: \u20B9${totalAmount.toFixed(2)}</span>
                </div>
                <ul class="report-loan-list">
                    ${loans.map(loan => `
                        <li>
                            ${formatDate(loan.date)} - ${loan.customerName} (Type: ${loan.type}) - \u20B9${loan.amount}
                            ${loan.history.length ? `<br><small>History: ${loan.history.map(h => `${h.type} - \u20B9${h.amount} on ${formatDate(h.date)}`).join(', ')}</small>` : ''}
                        </li>
                    `).join('')}
                </ul>
            `;
            reportContent.appendChild(section);
        });
    });
}

// Initialize Flatpickr
flatpickr("#reportDate", {
    dateFormat: "d-m-Y", // DD-MM-YYYY
    allowInput: true,
    defaultDate: new Date()
});

// Event listeners for report buttons
document.getElementById("dailyReportBtn").addEventListener("click", () => displayReport("daily"));
document.getElementById("monthlyReportBtn").addEventListener("click", () => displayReport("monthly"));
document.getElementById("yearlyReportBtn").addEventListener("click", () => displayReport("yearly"));

// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg))
            .catch(err => console.log('SW registration failed:', err));
    });
}