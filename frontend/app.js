
const API = "/api";
const tokenKey = "campusFindToken";
const userKey = "campusFindUser";

let token = localStorage.getItem(tokenKey);
let currentUser = JSON.parse(localStorage.getItem(userKey) || "null");
let authMode = "login";

const $ = (selector) => document.querySelector(selector);

const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

async function request(path, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData) && options.body) {
        headers["Content-Type"] = "application/json";
    }

    const response = await fetch(API + path, {
        ...options,
        headers
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.message || "Request failed");
    }

    return data;
}

// AUTHENTICATION UI
function updateAuthUI() {
    $("#authButton").classList.toggle("hidden", !!currentUser);
    $("#logoutButton").classList.toggle("hidden", !currentUser);

    $("#dashboardContent").innerHTML = currentUser
        ? `
            <p>
                Signed in as
                <strong>${escapeHTML(currentUser.name)}</strong>
                (${escapeHTML(currentUser.email)}).
            </p>
            <div id="myListings"></div>
            <h3>My claims</h3>
            <div id="myClaims"></div>
        `
        : "<p>Login to view your reports and claims.</p>";

    $("#adminPanel").classList.toggle(
        "hidden",
        currentUser?.role !== "admin"
    );

    if (currentUser) {
        loadDashboard();
    }

    if (currentUser?.role === "admin") {
        loadAdmin();
    }
}

// LOAD ITEMS
async function loadItems() {
    const params = new URLSearchParams();

    if ($("#searchInput").value.trim()) {
        params.set("search", $("#searchInput").value.trim());
    }

    if ($("#categoryFilter").value) {
        params.set("category", $("#categoryFilter").value);
    }

    if ($("#locationFilter").value.trim()) {
        params.set("location", $("#locationFilter").value.trim());
    }

    if ($("#typeFilter").value) {
        params.set("type", $("#typeFilter").value);
    }

    params.set("sort", $("#sortFilter").value);

    try {
        const items = await request(`/items?${params}`);

        $("#itemsGrid").innerHTML = items.length
            ? items.map(itemCard).join("")
            : '<p class="empty">No matching items found.</p>';

        $("#totalItems").textContent = items.length;

        $("#lostItems").textContent =
            items.filter(i => i.type === "lost").length;

        $("#foundItems").textContent =
            items.filter(i => i.type === "found").length;

        $("#returnedItems").textContent =
            items.filter(i => i.status === "returned").length;

    } catch (err) {
        $("#itemsGrid").textContent = err.message;
    }
}

// ITEM CARD
function itemCard(item) {
    const reportedById =
        item.reportedBy?._id || item.reportedBy;

    const currentUserId =
        currentUser?._id || currentUser?.id;

    return `
        <article class="item-card">

            ${item.image
                ? `<img src="${escapeHTML(item.image)}"
                    alt="${escapeHTML(item.title)}">`
                : ""
            }

            <span class="pill ${escapeHTML(item.type)}">
                ${escapeHTML(item.type).toUpperCase()}
            </span>

            <span class="pill">
                ${escapeHTML(item.category)}
            </span>

            <h3>${escapeHTML(item.title)}</h3>

            <p>${escapeHTML(item.description)}</p>

            <div class="item-meta">
                <span>⌖ ${escapeHTML(item.location)}</span>
                <span>◷ ${new Date(item.date).toLocaleDateString()}</span>
            </div>

            <p>
                Status:
                <strong>${escapeHTML(item.status)}</strong>
            </p>

            ${currentUser && String(reportedById) !== String(currentUserId)
                ? `<button class="btn"
                    onclick="submitClaim('${item._id}')">
                    Submit claim
                   </button>`
                : ""
            }

        </article>
    `;
}

// SUBMIT CLAIM
window.submitClaim = async (itemId) => {
    if (!currentUser) {
        return alert("Please login before submitting a claim.");
    }

    const message = prompt(
        "Describe how you can identify or prove this item belongs to you:"
    );

    if (!message || !message.trim()) return;

    try {
        await request("/claims", {
            method: "POST",
            body: JSON.stringify({
                itemId,
                message: message.trim()
            })
        });

        alert("Claim submitted for review.");

        loadDashboard();

    } catch (err) {
        alert(err.message);
    }
};

// LOAD USER DASHBOARD
async function loadDashboard() {
    try {
        const [items, claims] = await Promise.all([
            request("/items/mine"),
            request("/claims/mine")
        ]);

        $("#myListings").innerHTML =
            `<h3>My reports (${items.length})</h3>` +

            (items.length
                ? `
                    <table>
                        <tr>
                            <th>Item</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>

                        ${items.map(i => `
                            <tr>
                                <td>${escapeHTML(i.title)}</td>
                                <td>${escapeHTML(i.type)}</td>
                                <td>${escapeHTML(i.status)}</td>
                                <td>
                                    <button class="btn btn-outline"
                                        onclick="updateItemStatus('${i._id}','returned')">
                                        Mark returned
                                    </button>
                                </td>
                            </tr>
                        `).join("")}

                    </table>
                `
                : '<p class="empty">No reports yet.</p>'
            );

        $("#myClaims").innerHTML = claims.length
            ? `
                <table>
                    <tr>
                        <th>Item</th>
                        <th>Claim status</th>
                    </tr>

                    ${claims.map(c => `
                        <tr>
                            <td>${escapeHTML(c.item?.title || "Deleted item")}</td>
                            <td>${escapeHTML(c.status)}</td>
                        </tr>
                    `).join("")}

                </table>
            `
            : '<p class="empty">No claims yet.</p>';

    } catch (err) {
        $("#dashboardContent").textContent = err.message;
    }
}

// UPDATE ITEM STATUS
window.updateItemStatus = async (id, status) => {
    try {
        await request(`/items/${id}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        loadDashboard();
        loadItems();

    } catch (err) {
        alert(err.message);
    }
};

// ADMIN DASHBOARD
async function loadAdmin() {
    try {
        const [items, claims] = await Promise.all([
            request("/items/admin/all"),
            request("/claims/admin/all")
        ]);

        $("#adminContent").innerHTML = `
            <p>
                <strong>${items.length}</strong> listings ·
                <strong>${claims.length}</strong> claims ·
                <strong>${claims.filter(c => c.status === "pending").length}</strong>
                pending claims
            </p>

            <h3>All claims</h3>

            ${
                claims.length
                    ? `
                        <table>
                            <tr>
                                <th>Item</th>
                                <th>Claimant</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Review</th>
                            </tr>

                            ${claims.map(c => `
                                <tr>
                                    <td>${escapeHTML(c.item?.title || "Deleted")}</td>
                                    <td>${escapeHTML(c.claimant?.name || "")}</td>
                                    <td>${escapeHTML(c.message)}</td>
                                    <td>${escapeHTML(c.status)}</td>
                                    <td>
                                        ${
                                            c.status === "pending"
                                                ? `
                                                    <button class="btn"
                                                        onclick="reviewClaim('${c._id}','approved')">
                                                        Approve
                                                    </button>

                                                    <button class="btn btn-outline"
                                                        onclick="reviewClaim('${c._id}','rejected')">
                                                        Reject
                                                    </button>
                                                `
                                                : "—"
                                        }
                                    </td>
                                </tr>
                            `).join("")}

                        </table>
                    `
                    : "<p>No claims.</p>"
            }

            <h3>All listings</h3>

            <p>
                ${items.map(i =>
                    escapeHTML(i.title) + " (" + escapeHTML(i.status) + ")"
                ).join(" · ")}
            </p>
        `;

    } catch (err) {
        $("#adminContent").textContent = err.message;
    }
}

// REVIEW CLAIM
window.reviewClaim = async (id, status) => {
    try {
        await request(`/claims/${id}`, {
            method: "PATCH",
            body: JSON.stringify({ status })
        });

        loadAdmin();
        loadItems();

    } catch (err) {
        alert(err.message);
    }
};

// OPEN LOGIN
$("#authButton").addEventListener("click", () => {
    authMode = "login";
    setAuthMode();
    $("#authDialog").showModal();
});

// LOGOUT
$("#logoutButton").addEventListener("click", () => {
    token = null;
    currentUser = null;

    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);

    updateAuthUI();
    loadItems();
});

// LOGIN / REGISTER SWITCH
$("#showLogin").addEventListener("click", () => {
    authMode = "login";
    setAuthMode();
});

$("#showRegister").addEventListener("click", () => {
    authMode = "register";
    setAuthMode();
});

// SET AUTH MODE
function setAuthMode() {
    $("#authTitle").textContent =
        authMode === "login"
            ? "Welcome back"
            : "Create your account";

    $("#nameLabel").classList.toggle(
        "hidden",
        authMode === "login"
    );

    $("#showLogin").classList.toggle(
        "active",
        authMode === "login"
    );

    $("#showRegister").classList.toggle(
        "active",
        authMode === "register"
    );

    $("#authMessage").textContent = "";
}

// LOGIN / REGISTER FORM
$("#authForm").addEventListener("submit", async (event) => {
    event.preventDefault();

    // Save form reference before async request
    const formElement = event.currentTarget;

    const form = new FormData(formElement);
    const body = Object.fromEntries(form.entries());

    try {
        const data = await request(`/auth/${authMode}`, {
            method: "POST",
            body: JSON.stringify(body)
        });

        if (!data.token || !data.user) {
            throw new Error(
                "Login response is missing token or user information. Check backend authentication."
            );
        }

        token = data.token;
        currentUser = data.user;

        localStorage.setItem(tokenKey, token);
        localStorage.setItem(userKey, JSON.stringify(currentUser));

        $("#authDialog").close();

        // Reset using saved form reference
        formElement.reset();

        updateAuthUI();
        loadItems();

    } catch (err) {
        $("#authMessage").textContent = err.message;
    }
});

// REPORT SUBMISSION
const reportForm = $("#reportForm");

if (reportForm) {
    reportForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        // Save form reference before async request
        const formElement = event.currentTarget;

        if (!currentUser || !token) {
            alert("Please login first.");
            $("#authDialog").showModal();
            return;
        }

        const form = new FormData(formElement);

        try {
            await request("/items", {
                method: "POST",
                body: form
            });

            $("#reportMessage").textContent =
                "Your report was submitted successfully.";

            // Reset using saved form reference
            formElement.reset();

            loadItems();
            loadDashboard();

        } catch (err) {
            $("#reportMessage").textContent = err.message;
        }
    });
}

// SEARCH
$("#searchButton").addEventListener("click", loadItems);

$("#sortFilter").addEventListener("change", loadItems);

["searchInput", "locationFilter"].forEach(id => {
    $("#" + id).addEventListener("keydown", e => {
        if (e.key === "Enter") {
            loadItems();
        }
    });
});

$("#categoryFilter").addEventListener("change", loadItems);
$("#typeFilter").addEventListener("change", loadItems);

// INITIAL LOAD
updateAuthUI();
loadItems();
