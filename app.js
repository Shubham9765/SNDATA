// Utility function to format date as DD-MM-YYYY
function formatDate(dateStr) {
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

// Utility function to parse DD-MM-YYYY to YYYY-MM-DD for storage
function parseDateToISO(dateStr) {
    const [day, month, year] = dateStr.split('-');
    return `${year}-${month}-${day}`;
}

// Validate DD-MM-YYYY format and ensure it's a valid date
function isValidDateDDMMYYYY(dateStr) {
    if (!/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) return false;
    const [day, month, year] = dateStr.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getDate() === day && date.getMonth() + 1 === month && date.getFullYear() === year;
}

document.getElementById("loanForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const dateDDMMYYYY = document.getElementById("date").value;
    if (!isValidDateDDMMYYYY(dateDDMMYYYY)) {
        alert("Please enter a valid date in DD-MM-YYYY format (e.g., 01-03-2025).");
        return;
    }
    const loan = {
        type: document.getElementById("type").value,
        date: parseDateToISO(dateDDMMYYYY),
        customerName: document.getElementById("customerName").value,
        customerAddress: document.getElementById("customerAddress").value,
        customerPhone: document.getElementById("customerPhone").value,
        items: document.getElementById("items").value,
        amount: parseFloat(document.getElementById("amount").value),
        history: []
    };
    addLoan(loan);
    e.target.reset();
    loadLoans();
});

// Export Database (JSON)
document.getElementById("exportBtn").addEventListener("click", () => {
    Promise.all([
        new Promise(resolve => getAllLoans("activeLoans", resolve)),
        new Promise(resolve => getAllLoans("settledLoans", resolve))
    ]).then(([activeLoans, settledLoans]) => {
        const data = { activeLoans, settledLoans };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "gold_loan_db.json";
        a.click();
        URL.revokeObjectURL(url);
    });
});

// Import Database
document.getElementById("importBtn").addEventListener("click", () => {
    document.getElementById("importFile").click();
});

document.getElementById("importFile").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            const tx = db.transaction(["activeLoans", "settledLoans"], "readwrite");
            tx.objectStore("activeLoans").clear();
            tx.objectStore("settledLoans").clear();
            data.activeLoans.forEach(loan => addLoan(loan, "activeLoans"));
            data.settledLoans.forEach(loan => addLoan(loan, "settledLoans"));
            tx.oncomplete = () => loadLoans();
        };
        reader.readAsText(file);
    }
});

// Export to Excel
document.getElementById("exportExcelBtn").addEventListener("click", () => {
    Promise.all([
        new Promise(resolve => getAllLoans("activeLoans", resolve)),
        new Promise(resolve => getAllLoans("settledLoans", resolve))
    ]).then(([activeLoans, settledLoans]) => {
        const activeData = activeLoans.map(loan => ({
            "Type": loan.type,
            "Date": formatDate(loan.date),
            "Customer Name": loan.customerName,
            "Address": loan.customerAddress,
            "Phone": loan.customerPhone,
            "Items": loan.items,
            "Amount": loan.amount,
            "History 1": loan.history[0] ? `${loan.history[0].type} - \u20B9${loan.history[0].amount} on ${formatDate(loan.history[0].date)}` : "",
            "History 2": loan.history[1] ? `${loan.history[1].type} - \u20B9${loan.history[1].amount} on ${formatDate(loan.history[1].date)}` : "",
            "History 3": loan.history[2] ? `${loan.history[2].type} - \u20B9${loan.history[2].amount} on ${formatDate(loan.history[2].date)}` : ""
        }));

        const settledData = settledLoans.map(loan => ({
            "Type": loan.type,
            "Date": formatDate(loan.date),
            "Customer Name": loan.customerName,
            "Address": loan.customerAddress,
            "Phone": loan.customerPhone,
            "Items": loan.items,
            "Amount": loan.amount,
            "History 1": loan.history[0] ? `${loan.history[0].type} - \u20B9${loan.history[0].amount} on ${formatDate(loan.history[0].date)}` : "",
            "History 2": loan.history[1] ? `${loan.history[1].type} - \u20B9${loan.history[1].amount} on ${formatDate(loan.history[1].date)}` : "",
            "History 3": loan.history[2] ? `${loan.history[2].type} - \u20B9${loan.history[2].amount} on ${formatDate(loan.history[2].date)}` : ""
        }));

        const wb = XLSX.utils.book_new();
        const wsActive = XLSX.utils.json_to_sheet(activeData);
        const wsSettled = XLSX.utils.json_to_sheet(settledData);
        XLSX.utils.book_append_sheet(wb, wsActive, "Active Loans");
        XLSX.utils.book_append_sheet(wb, wsSettled, "Settled Loans");
        XLSX.writeFile(wb, "gold_loan_data.xlsx");
    });
});

// View Reports Redirect
document.getElementById("viewReportsBtn").addEventListener("click", () => {
    window.location.href = "reports.html";
});

// Search Functionality
document.getElementById("searchActive").addEventListener("input", (e) => searchLoans("activeLoans", e.target.value));
document.getElementById("searchSettled").addEventListener("input", (e) => searchLoans("settledLoans", e.target.value));

function loadLoans(filter = "", storeName = "activeLoans") {
    getAllLoans("activeLoans", (loans) => {
        const list = document.getElementById("activeLoans");
        list.innerHTML = "";
        loans.filter(loan => matchesFilter(loan, filter)).forEach(loan => {
            list.appendChild(createLoanElement(loan, true));
        });
    });

    getAllLoans("settledLoans", (loans) => {
        const list = document.getElementById("settledLoans");
        list.innerHTML = "";
        loans.filter(loan => matchesFilter(loan, filter)).forEach(loan => {
            list.appendChild(createLoanElement(loan, false));
        });
    });
}

function searchLoans(storeName, query) {
    getAllLoans(storeName, (loans) => {
        const list = document.getElementById(storeName === "activeLoans" ? "activeLoans" : "settledLoans");
        list.innerHTML = "";
        loans.filter(loan => matchesFilter(loan, query)).forEach(loan => {
            list.appendChild(createLoanElement(loan, storeName === "activeLoans"));
        });
    });
}

function matchesFilter(loan, query) {
    query = query.toLowerCase();
    return (
        loan.type.toLowerCase().includes(query) ||
        loan.customerName.toLowerCase().includes(query) ||
        loan.customerAddress.toLowerCase().includes(query) ||
        loan.customerPhone.includes(query) ||
        loan.items.toLowerCase().includes(query) ||
        formatDate(loan.date).toLowerCase().includes(query)
    );
}

function createLoanElement(loan, isActive) {
    const li = document.createElement("li");
    li.innerHTML = `
        <div class="loan-header">
            <span>${formatDate(loan.date)} - ${loan.customerName}</span>
            <span class="type">${loan.type}</span>
        </div>
        <div class="loan-details">
            <div><span>Address:</span> ${loan.customerAddress}</div>
            <div><span>Phone:</span> ${loan.customerPhone}</div>
            <div><span>Items:</span> ${loan.items}</div>
            <div><span>Amount:</span> \u20B9${loan.amount}</div>
            ${loan.history.length ? `
                <div class="history">
                    <strong>History:</strong><br>
                    ${loan.history.map(h => `${h.type} - \u20B9${h.amount} on ${formatDate(h.date)}`).join('<br>')}
                </div>
            ` : ''}
        </div>
    `;
    
    const actions = document.createElement("div");
    actions.style.marginTop = "10px";

    if (isActive) {
        const settleBtn = document.createElement("button");
        settleBtn.textContent = "Settle";
        settleBtn.className = "action-btn";
        settleBtn.onclick = () => settleLoan(loan);
        
        const renewBtn = document.createElement("button");
        renewBtn.textContent = "Renew";
        renewBtn.className = "action-btn";
        renewBtn.onclick = () => renewLoan(loan);
        
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "Delete";
        deleteBtn.className = "action-btn delete-btn";
        deleteBtn.onclick = () => deleteLoanEntry(loan.id);

        actions.appendChild(settleBtn);
        actions.appendChild(renewBtn);
        actions.appendChild(deleteBtn);

        // Add Revoke Last Renewal button if there’s a renewal
        if (loan.history.length > 0 && loan.history[loan.history.length - 1].type === "Renewed") {
            const revokeRenewBtn = document.createElement("button");
            revokeRenewBtn.textContent = "Revoke Last Renewal";
            revokeRenewBtn.className = "action-btn revoke-btn";
            revokeRenewBtn.onclick = () => revokeLastRenewal(loan);
            actions.appendChild(revokeRenewBtn);
        }
    } else {
        // Add Revoke button for settled loans
        if (loan.history.length > 0 && loan.history[loan.history.length - 1].type === "Settled") {
            const revokeBtn = document.createElement("button");
            revokeBtn.textContent = "Revoke Settlement";
            revokeBtn.className = "action-btn revoke-btn";
            revokeBtn.onclick = () => revokeSettlement(loan);
            actions.appendChild(revokeBtn);
        }
    }

    li.appendChild(actions);
    return li;
}

function settleLoan(loan) {
    const amountTaken = prompt("Enter amount taken:");
    if (amountTaken) {
        const settleDateDDMMYYYY = prompt("Enter settlement date (DD-MM-YYYY):", formatDate(new Date()));
        if (settleDateDDMMYYYY && isValidDateDDMMYYYY(settleDateDDMMYYYY)) {
            const settleDateISO = parseDateToISO(settleDateDDMMYYYY);
            loan.history.push({
                type: "Settled",
                amount: parseFloat(amountTaken),
                date: settleDateISO
            });
            deleteLoan(loan.id, "activeLoans");
            addLoan(loan, "settledLoans");
            loadLoans();
        } else {
            alert("Please enter a valid date in DD-MM-YYYY format (e.g., 01-03-2025).");
        }
    }
}

function renewLoan(loan) {
    const newAmount = prompt("Enter new loan amount:");
    if (newAmount) {
        const renewDateDDMMYYYY = prompt("Enter renewal date (DD-MM-YYYY):", formatDate(new Date()));
        if (renewDateDDMMYYYY && isValidDateDDMMYYYY(renewDateDDMMYYYY)) {
            const renewDateISO = parseDateToISO(renewDateDDMMYYYY);
            const previousAmount = loan.amount;
            loan.history.push({
                type: "Renewed",
                amount: previousAmount,
                date: renewDateISO
            });
            loan.amount = parseFloat(newAmount);
            loan.date = renewDateISO;
            updateLoan(loan.id, loan, "activeLoans");
            loadLoans();
        } else {
            alert("Please enter a valid date in DD-MM-YYYY format (e.g., 01-03-2025).");
        }
    }
}

function deleteLoanEntry(id) {
    if (confirm("Are you sure you want to delete this loan entry?")) {
        deleteLoan(id, "activeLoans");
        loadLoans();
    }
}

function revokeSettlement(loan) {
    if (confirm("Are you sure you want to revoke the settlement? This will move the loan back to active status.")) {
        const lastHistory = loan.history.pop(); // Remove the "Settled" entry
        if (lastHistory && lastHistory.type === "Settled") {
            deleteLoan(loan.id, "settledLoans");
            const previousAmount = loan.history.length > 0 ? loan.history[loan.history.length - 1].amount : loan.amount;
            loan.amount = previousAmount; // Restore the amount before settlement
            addLoan(loan, "activeLoans");
            loadLoans();
        }
    }
}

function revokeLastRenewal(loan) {
    if (confirm("Are you sure you want to revoke the last renewal? This will restore the previous amount.")) {
        const lastHistory = loan.history.pop(); // Remove the last "Renewed" entry
        if (lastHistory && lastHistory.type === "Renewed") {
            loan.amount = lastHistory.amount; // Restore the previous amount
            loan.date = loan.history.length > 0 ? loan.history[loan.history.length - 1].date : loan.date; // Restore date if applicable
            updateLoan(loan.id, loan, "activeLoans");
            loadLoans();
        }
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered:', reg))
            .catch(err => console.log('SW registration failed:', err));
    });
}