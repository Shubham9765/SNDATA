const dbName = "GoldLoanDB";
let db;

const request = indexedDB.open(dbName, 1);

request.onerror = (event) => console.log("Database error:", event.target.error);

request.onsuccess = (event) => {
    db = event.target.result;
    loadLoans();
};

request.onupgradeneeded = (event) => {
    db = event.target.result;
    db.createObjectStore("activeLoans", { keyPath: "id", autoIncrement: true });
    db.createObjectStore("settledLoans", { keyPath: "id", autoIncrement: true });
};

function addLoan(loan, storeName = "activeLoans") {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.add(loan);
}

function getAllLoans(storeName, callback) {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => callback(request.result);
}

function deleteLoan(id, storeName) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.delete(id);
}

function updateLoan(id, updatedLoan, storeName) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.put({ ...updatedLoan, id });
}

function clearStore(storeName) {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.clear();
}